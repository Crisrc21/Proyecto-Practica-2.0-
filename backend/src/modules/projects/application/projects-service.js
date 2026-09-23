import { randomUUID } from "node:crypto";
import { HttpError } from "../../../shared/errors/http-error.js";
import { preserveBaselines, validateProject } from "../domain/project-validation.js";
import { applyWorkflow } from "../domain/project-workflow.js";

function changes(previous, next) {
  if (!previous) return ["Proyecto creado"];
  const result = [];
  if (JSON.stringify(previous.milestoneOrder || []) !== JSON.stringify(next.milestoneOrder || [])) result.push("Orden de los hitos actualizado");
  for (const m of previous.milestones) {
    if (!next.milestones.some(item => item.id === m.id)) result.push(`Hito eliminado: ${m.name}`);
  }
  for (const [key, label] of Object.entries({ lifecycle: "Estado contractual", nature: "Naturaleza", areaM2: "Superficie contratada (m²)", signedDate: "Fecha de firma" })) {
    if (previous[key] !== next[key]) result.push(`${label}: ${previous[key] ?? "sin dato"} → ${next[key] ?? "sin dato"}`);
  }
  for (const r of next.progressReports || []) {
    if (!(previous.progressReports || []).some(old => old.id === r.id)) result.push(`Avance ${r.stageKey} al ${r.date}: cantidad ${r.quantity ?? "—"}, casas terminadas ${r.completedUnits ?? "—"}, porcentaje ${r.percent ?? "—"}. Evidencia: ${r.evidence}`);
  }
  for (const [key, label] of Object.entries({ name: "Nombre", customer: "Cliente", units: "Viviendas", contractAmount: "Monto contractual", startDate: "Inicio", endDate: "Término", ufValue: "UF de proyección", approvedFolder: "Carpeta de aprobados", paymentTerms: "Condiciones de pago", notes: "Observaciones" })) {
    if (previous[key] !== next[key]) result.push(`${label}: ${previous[key] ?? "sin dato"} → ${next[key] ?? "sin dato"}`);
  }
  for (const m of next.milestones) {
    const old = previous.milestones.find(item => item.id === m.id);
    if (!old) { result.push(`Nuevo hito: ${m.name}`); continue; }
    if (JSON.stringify(old.edp) !== JSON.stringify(m.edp)) result.push(`${m.name}: EDP ${old.edp?.status ?? "sin condición"} → ${m.edp?.status ?? "sin condición"}; condición ${m.edp?.metric ?? "—"} ≥ ${m.edp?.threshold ?? "—"}; presentación ${m.edp?.presentedDate ?? "—"}; aprobación ${m.edp?.approvedDate ?? "—"}`);
    for (const [key, label] of Object.entries({ forecastDate: "fecha prevista", actualDate: "fecha efectiva", cashDate: "fecha de cobro", cashAmount: "monto de cobro", state: "estado", evidence: "evidencia", baselineApproved: "base confirmada", invoicingComplete: "facturación completa", name: "nombre", scope: "alcance", type: "tipo", startDate: "inicio", source: "fuente", notes: "observaciones" })) {
      if (old[key] !== m[key]) result.push(`${m.name}, ${label}: ${old[key] ?? "sin dato"} → ${m[key] ?? "sin dato"}`);
    }
  }
  if (JSON.stringify(previous.invoiceLinks) !== JSON.stringify(next.invoiceLinks)) result.push("Asociaciones de facturas actualizadas");
  if (JSON.stringify(previous.issues) !== JSON.stringify(next.issues)) result.push("Pendientes de revisión actualizados");
  return result.length ? result : ["Ficha actualizada"];
}

export function createProjectsService(repository) {
  return {
    async list() {
      const data = await repository.read();
      return { projects: data.projects, integration: { provider: "Microsoft 365", status: "not_connected" } };
    },
    async remove(payload) {
      if (!payload || typeof payload.projectId !== "string" || !Number.isInteger(payload.expectedRevision) || payload.expectedRevision < 1) throw new HttpError(400, "Indica el proyecto y su versión para eliminarlo.");
      return repository.transaction(data => {
        const project = data.projects.find(p => p.id === payload.projectId);
        if (!project) throw new HttpError(404, "El proyecto ya no existe.");
        if (project.revision !== payload.expectedRevision) throw new HttpError(409, "El proyecto cambió en otra sesión. Actualiza antes de eliminarlo.");
        data.deletedProjects ??= [];
        data.deletedProjects.push({ ...project, deletedAt: new Date().toISOString() });
        data.projects = data.projects.filter(p => p.id !== project.id);
        return { projectId: project.id };
      });
    },
    async editProgress(payload) {
      if (!payload || typeof payload.projectId !== "string" || !payload.report || !Number.isInteger(payload.expectedRevision)) throw new HttpError(400, "Indica el avance y la versión del contrato.");
      return repository.transaction(data => {
        const previous = data.projects.find(p => p.id === payload.projectId);
        if (!previous) throw new HttpError(404, "El proyecto ya no existe.");
        if (previous.revision !== payload.expectedRevision) throw new HttpError(409, "El proyecto cambió en otra sesión. Actualiza antes de editar.");
        const old = previous.progressReports.find(r => r.id === payload.report.id);
        if (!old || old.stageKey !== payload.report.stageKey) throw new HttpError(400, "El avance no pertenece a esta etapa del contrato.");
        let reports = previous.progressReports.map(r => r.id === old.id ? { ...payload.report } : { ...r });
        if (old.stageKey === "montaje") {
          if (!Number.isInteger(payload.report.quantity) || payload.report.quantity < 0) throw new HttpError(400, "Ingresa una cantidad entera de casas mayor o igual a cero.");
          let accumulated = 0;
          const increments = new Map();
          for (const r of previous.progressReports.filter(r => r.stageKey === "montaje").sort((a,b) => a.date.localeCompare(b.date))) {
            increments.set(r.id, (r.quantity ?? 0) - accumulated); accumulated = r.quantity ?? 0;
          }
          increments.set(old.id, payload.report.quantity);
          accumulated = 0;
          for (const r of reports.filter(r => r.stageKey === "montaje").sort((a,b) => a.date.localeCompare(b.date))) {
            accumulated += increments.get(r.id); r.quantity = accumulated;
          }
        }
        const project = validateProject({ ...previous, progressReports: reports });
        applyWorkflow({ ...previous, progressReports: project.progressReports }, project);
        preserveBaselines(previous, project);
        const at = new Date().toISOString();
        data.progressCorrections ??= [];
        data.progressCorrections.push({ projectId: project.id, at, before: previous.progressReports, after: project.progressReports });
        const saved = { ...project, revision: previous.revision + 1, updatedAt: at, history: [...previous.history, { id: randomUUID(), at, reason: "Avance corregido", changes: [`Avance ${old.stageKey}: ${old.date} → ${payload.report.date}.`, `Registro anterior: ${JSON.stringify(old)}`, `Registro corregido: ${JSON.stringify(project.progressReports.find(r => r.id === old.id))}`, "Acumulados y condiciones de EDP recalculados." ] }] };
        data.projects[data.projects.indexOf(previous)] = saved;
        return saved;
      });
    },
    async removeEdp(payload) {
      if (!payload || typeof payload.projectId !== "string" || typeof payload.milestoneId !== "string" || !Number.isInteger(payload.expectedRevision) || payload.expectedRevision < 1) throw new HttpError(400, "Indica el contrato, el EDP y su versión.");
      return repository.transaction(data => {
        const project = data.projects.find(p => p.id === payload.projectId);
        if (!project) throw new HttpError(404, "El proyecto ya no existe.");
        if (project.revision !== payload.expectedRevision) throw new HttpError(409, "El proyecto cambió en otra sesión. Actualiza antes de eliminar el EDP.");
        const edp = project.milestones.find(m => m.id === payload.milestoneId);
        if (!edp) throw new HttpError(404, "El EDP ya no existe.");
        if (edp.stageKey || !["EDP", "Retenciones"].includes(edp.type) || edp.scope === "Anticipo" || edp.edp?.stageKey === "anticipo") throw new HttpError(400, "El hito seleccionado no es un EDP.");
        const at = new Date().toISOString();
        const links = project.invoiceLinks.filter(l => l.milestoneId === edp.id);
        data.deletedEdps ??= [];
        data.deletedEdps.push({ projectId: project.id, milestone: edp, invoiceLinks: links, deletedAt: at });
        const saved = { ...project, milestones: project.milestones.filter(m => m.id !== edp.id), invoiceLinks: project.invoiceLinks.filter(l => l.milestoneId !== edp.id), milestoneOrder: (project.milestoneOrder || []).filter(id => id !== edp.id), revision: project.revision + 1, updatedAt: at,
          history: [...project.history, { id: randomUUID(), at, reason: `EDP eliminado: ${edp.name}`, changes: [`Se eliminó el EDP «${edp.name}» (${edp.edp?.status || "Sin condición"}).`, `Se liberaron ${links.length} asociaciones de facturas; los documentos y pagos de CxC se conservan.`] }] };
        data.projects[data.projects.indexOf(project)] = saved;
        return saved;
      });
    },
    async save(payload) {
      if (!payload || !Number.isInteger(payload.expectedRevision) || payload.expectedRevision < 0) throw new HttpError(400, "Falta la versión del proyecto.");
      const project = validateProject(payload.project);
      const reason = typeof payload.reason === "string" ? payload.reason.trim() : "";
      if (reason.length > 1000) throw new HttpError(400, "El detalle del registro supera los 1.000 caracteres.");
      return repository.transaction(data => {
        const previous = data.projects.find(item => item.id === project.id);
        if (data.deletedProjects?.some(p => p.id === project.id)) throw new HttpError(409, "Este proyecto fue eliminado. Actualiza la lista.");
        if ((previous?.revision ?? 0) !== payload.expectedRevision) throw new HttpError(409, "El proyecto cambió en otra sesión. Recarga los datos antes de guardar.");
        applyWorkflow(previous, project);
        project.milestoneOrder = project.milestoneOrder.filter(id => project.milestones.some(m => m.id === id));
        preserveBaselines(previous, project);
        for (const other of data.projects.filter(item => item.id !== project.id)) {
          if (other.invoiceLinks.some(link => project.invoiceLinks.some(item => item.invoiceId === link.invoiceId))) {
            throw new HttpError(409, `Una factura ya está asociada al proyecto ${other.name}.`);
          }
        }
        const now = new Date().toISOString();
        const saved = {
          ...project,
          revision: (previous?.revision ?? 0) + 1,
          updatedAt: now,
          history: [...(previous?.history ?? []), { id: randomUUID(), at: now, reason: reason || (!previous ? project.lifecycle === "Potencial" ? "Contrato potencial agregado" : "Proyecto creado" : "Actualización del proyecto"), changes: changes(previous, project) }]
        };
        if (previous) data.projects[data.projects.indexOf(previous)] = saved;
        else data.projects.push(saved);
        return saved;
      });
    }
  };
}
