import { randomUUID } from "node:crypto";
import { HttpError } from "../../../shared/errors/http-error.js";
import { preserveBaselines, validateProject } from "../domain/project-validation.js";
import { applyWorkflow } from "../domain/project-workflow.js";

function changes(previous, next) {
  if (!previous) return ["Proyecto creado"];
  const result = [];
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
    async save(payload) {
      if (!payload || !Number.isInteger(payload.expectedRevision) || payload.expectedRevision < 0) throw new HttpError(400, "Falta la versión del proyecto.");
      const project = validateProject(payload.project);
      const reason = typeof payload.reason === "string" ? payload.reason.trim() : "";
      if (reason.length > 1000) throw new HttpError(400, "El detalle del registro supera los 1.000 caracteres.");
      return repository.transaction(data => {
        const previous = data.projects.find(item => item.id === project.id);
        if ((previous?.revision ?? 0) !== payload.expectedRevision) throw new HttpError(409, "El proyecto cambió en otra sesión. Recarga los datos antes de guardar.");
        applyWorkflow(previous, project);
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
