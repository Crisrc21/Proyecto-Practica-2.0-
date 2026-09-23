import { HttpError } from "../../../shared/errors/http-error.js";
import { activeStages, stageMetrics, stages } from "./project-workflow.js";

const types = ["Contrato", "Anticipo", "EDP", "Recepción", "Retenciones", "Otro", "Etapa"];
const scopes = ["Anticipo", "Fabricación", "Despacho", "Fundaciones", "Montaje", "Urbanización Interior", "Urbanización Exterior", "General", "Obra civil", "Viviendas", "Urba interior", "Urba exterior", "TGM"];
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
function fail(message) { throw new HttpError(400, message); }
function text(value, name, max = 4000, required = false) {
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) fail(`Revisa ${name}.`);
  return value.trim();
}
function date(value, name) {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !datePattern.test(value)) fail(`Revisa la fecha de ${name}.`);
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) fail(`Fecha inválida en ${name}.`);
  return value;
}
function number(value, name, nullable = false) {
  if (nullable && value === null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1e15) fail(`Revisa ${name}.`);
  return value;
}
export function validateProject(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) fail("Proyecto inválido.");
  const p = {
    id: text(input.id, "identificador", 100, true),
    name: text(input.name, "nombre del proyecto", 180, true),
    customer: text(input.customer ?? "", "cliente", 200),
    customerRut: text(input.customerRut, "RUT", 30),
    location: text(input.location, "ubicación", 250),
    owner: text(input.owner, "responsable", 150),
    units: number(input.units, "cantidad de viviendas"),
    lifecycle: input.lifecycle ?? "Firmado",
    nature: input.nature ?? null,
    areaM2: number(input.areaM2 ?? null, "superficie total contratada", true),
    progressReports: [],
    excludedStages: input.excludedStages ?? [],
    milestoneOrder: input.milestoneOrder ?? [],
    contractType: text(input.contractType, "tipo de contrato", 100),
    currency: input.currency,
    contractAmount: number(input.contractAmount, "monto contractual", true),
    signedDate: date(input.signedDate, "firma"),
    startDate: date(input.startDate, "inicio"),
    endDate: date(input.endDate, "término contractual"),
    ufValue: number(input.ufValue, "UF de proyección", true),
    approvedFolder: text(input.approvedFolder, "carpeta de aprobados", 2000),
    paymentTerms: text(input.paymentTerms, "condiciones de pago"),
    notes: text(input.notes, "observaciones", 10000),
    scopes: input.scopes,
    sources: input.sources,
    issues: input.issues,
    milestones: [],
    invoiceLinks: []
  };
  if (!/^[a-zA-Z0-9_-]+$/.test(p.id)) fail("Identificador de proyecto inválido.");
  if (!Number.isInteger(p.units)) fail("La cantidad de viviendas debe ser entera.");
  if (!["Potencial", "Firmado"].includes(p.lifecycle)) fail("Estado contractual inválido.");
  if (p.nature !== null && ![1, 2, 3, 4].includes(p.nature)) fail("Naturaleza contractual inválida.");
  if (!Array.isArray(p.excludedStages) || p.excludedStages.some(key => key === "firma" || !stages.some(([stage]) => stage === key))) fail("Hitos excluidos inválidos. La firma del contrato se conserva.");
  p.excludedStages = [...new Set(p.excludedStages)];
  if (!Array.isArray(p.milestoneOrder) || p.milestoneOrder.length > 500 || p.milestoneOrder.some(id => typeof id !== "string" || !id || id.length > 100) || new Set(p.milestoneOrder).size !== p.milestoneOrder.length) fail("Orden de hitos inválido.");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  if (p.signedDate && p.signedDate > today) fail("La fecha de firma no puede estar en el futuro.");
  const reports = input.progressReports ?? [];
  if (!Array.isArray(reports) || reports.length > 3000) fail("Avances inválidos (máximo 3.000 cortes).");
  const reportIds = new Set();
  for (const r of reports) {
    if (!r || typeof r !== "object") fail("Corte de avance inválido.");
    const next = { id: text(r.id, "identificador del avance", 100, true), stageKey: r.stageKey,
      date: date(r.date, "corte de avance"), evidence: text(r.evidence, "evidencia del avance", 2000, true),
      quantity: number(r.quantity, "cantidad acumulada", true), completedUnits: number(r.completedUnits, "casas terminadas", true), percent: number(r.percent, "avance porcentual", true) };
    if (reportIds.has(next.id)) fail("Hay cortes de avance repetidos.");
    reportIds.add(next.id);
    if (!["fabricacion", "despachos", "fundaciones", "montaje", "interior", "exterior", "total"].includes(next.stageKey)) fail("Etapa de avance inválida.");
    if (!next.date || next.date > today || p.signedDate && next.date < p.signedDate) fail("El avance debe tener una fecha entre la firma y hoy.");
    if ([next.quantity, next.completedUnits, next.percent].every(v => v === null)) fail("Registra al menos una medición de avance.");
    if (next.percent !== null && next.percent > 100) fail("El avance no puede superar el 100%.");
    if (next.completedUnits !== null && (!Number.isInteger(next.completedUnits) || next.completedUnits > p.units)) fail("Las casas terminadas deben ser enteras y no superar las contratadas.");
    if (next.quantity !== null) {
      if (next.stageKey === "fabricacion" && p.areaM2 !== null && next.quantity > p.areaM2) fail("Los m² fabricados superan la superficie contratada.");
      if (["despachos", "fundaciones", "montaje"].includes(next.stageKey) && (!Number.isInteger(next.quantity) || next.quantity > p.units)) fail("La cantidad de casas debe ser entera y no superar las contratadas.");
    }
    if (["interior", "exterior", "total"].includes(next.stageKey) && (next.quantity !== null || next.completedUnits !== null || next.percent === null)) fail("Esta etapa se mide por porcentaje.");
    if (next.stageKey !== "fabricacion" && next.completedUnits !== null) fail("Las casas terminadas se registran en fabricación.");
    if (["fabricacion", "despachos", "montaje"].includes(next.stageKey) && next.percent !== null) fail("El porcentaje de esta etapa se calcula desde sus cantidades.");
    p.progressReports.push(next);
  }
  if (!["UF", "CLP"].includes(p.currency)) fail("Moneda inválida.");
  if (p.ufValue !== null && p.ufValue <= 0) fail("La UF debe ser mayor que cero.");
  if (p.startDate && p.endDate && p.endDate < p.startDate) fail("El término debe ser posterior al inicio.");
  if (p.approvedFolder && !/^https:\/\//i.test(p.approvedFolder)) fail("La carpeta debe ser un enlace HTTPS de Microsoft 365.");
  if (!Array.isArray(p.scopes) || p.scopes.some(s => !scopes.includes(s))) fail("Alcances inválidos.");
  p.scopes = [...new Set(p.scopes)];
  if (!Array.isArray(p.sources) || p.sources.length > 100) fail("Fuentes inválidas.");
  p.sources = p.sources.map(s => ({ name: text(s.name, "fuente", 250, true), reference: text(s.reference, "referencia", 2000, true) }));
  if (!Array.isArray(p.issues) || p.issues.length > 100) fail("Pendientes inválidos.");
  p.issues = p.issues.map(i => ({ id: text(i.id, "pendiente", 100, true), text: text(i.text, "detalle del pendiente", 2000, true), resolved: i.resolved === true }));
  if (!Array.isArray(input.milestones) || input.milestones.length > 500) fail("Hitos inválidos (máximo 500).");
  const ids = new Set();
  const stageKeys = new Set();
  for (const m of input.milestones) {
    const next = {
      id: text(m.id, "identificador del hito", 100, true),
      name: text(m.name, "nombre del hito", 200, true),
      type: m.type,
      scope: m.scope,
      startDate: date(m.startDate, "inicio del hito"),
      baselineDate: date(m.baselineDate, "base del hito"),
      forecastDate: date(m.forecastDate, "previsión del hito"),
      actualDate: date(m.actualDate, "cumplimiento del hito"),
      baselineApproved: m.baselineApproved === true,
      state: m.state,
      evidence: text(m.evidence, "evidencia", 2000),
      notes: text(m.notes, "observaciones del hito", 4000),
      source: text(m.source, "fuente del hito", 2000),
      invoicingComplete: m.invoicingComplete === true,
      cashAmount: number(m.cashAmount, "cobro previsto", true),
      baselineCashAmount: number(m.baselineCashAmount, "cobro base", true),
      cashDate: date(m.cashDate, "cobro previsto"),
      baselineCashDate: date(m.baselineCashDate, "cobro base")
    };
    if (m.stageKey !== undefined) {
      if (!stages.some(([key]) => key === m.stageKey) || stageKeys.has(m.stageKey)) fail("Etapa contractual inválida o repetida.");
      if (m.edp || !["Etapa", "Contrato"].includes(m.type)) fail("Las etapas físicas se separan de sus EDP.");
      if (next.cashAmount !== null || next.baselineCashAmount !== null) fail("Programa el cobro en el EDP de la etapa.");
      stageKeys.add(m.stageKey); next.stageKey = m.stageKey;
    }
    if (m.edp !== undefined) {
      const e = m.edp;
      if (!e || !["EDP", "Anticipo"].includes(m.type) || !p.nature || !activeStages(p.nature).some(([key]) => key === e.stageKey) || !stageMetrics[e.stageKey]?.includes(e.metric)) fail("Condición del EDP incompatible con la naturaleza o etapa.");
      next.edp = { stageKey: e.stageKey, metric: e.metric, threshold: number(e.threshold, "umbral del EDP"), status: e.status,
        triggeredDate: date(e.triggeredDate ?? null, "habilitación"), presentedDate: date(e.presentedDate ?? null, "presentación"), approvedDate: date(e.approvedDate ?? null, "aprobación"), approvalEvidence: text(e.approvalEvidence ?? "", "evidencia de aprobación", 2000) };
      if (!["Previsto", "Preparado", "Presentado", "Aprobado"].includes(e.status)) fail("Estado de EDP inválido.");
      if (next.edp.threshold <= 0 || e.metric.endsWith("Pct") && next.edp.threshold > 100 || e.metric === "firma" && next.edp.threshold !== 1) fail("Umbral del EDP inválido.");
      if (["terminadas", "despachadas", "fundaciones", "montadas"].includes(e.metric) && (!Number.isInteger(e.threshold) || e.threshold > p.units)) fail("El umbral debe ser una cantidad entera dentro de las viviendas contratadas.");
      if (e.metric === "m2" && p.areaM2 !== null && e.threshold > p.areaM2) fail("El umbral supera los m² contratados.");
      if ([next.edp.presentedDate, next.edp.approvedDate].some(d => d && d > today)) fail("Las fechas documentales no pueden estar en el futuro.");
      if (e.stageKey === "anticipo" && m.type !== "Anticipo" || e.stageKey !== "anticipo" && m.type !== "EDP") fail("Tipo de EDP incompatible con su etapa.");
    }
    if (ids.has(next.id)) fail("Hay hitos con identificadores repetidos.");
    ids.add(next.id);
    if (!types.includes(next.type) || !scopes.includes(next.scope)) fail("Tipo o alcance de hito inválido.");
    if (!["Pendiente", "En curso", "Observado"].includes(next.state)) fail("Estado de hito inválido.");
    if (next.actualDate && !next.evidence) fail("Agrega evidencia para registrar un hito cumplido.");
    if (next.actualDate && next.actualDate > today) fail("La fecha efectiva no puede estar en el futuro.");
    if (next.baselineApproved && !next.baselineDate) fail("Indica una fecha base antes de confirmar el hito.");
    if (next.startDate && next.forecastDate && next.startDate > next.forecastDate) fail("El inicio del hito no puede ser posterior a su fecha prevista.");
    p.milestones.push(next);
  }
  if (!Array.isArray(input.invoiceLinks) || input.invoiceLinks.length > 2000) fail("Asociaciones de facturas inválidas.");
  const invoices = new Set();
  p.invoiceLinks = input.invoiceLinks.map(link => {
    const invoiceId = text(link.invoiceId, "factura", 200, true);
    const milestoneId = text(link.milestoneId, "hito de la factura", 100, true);
    if (!ids.has(milestoneId)) fail("El hito de la factura no existe.");
    if (invoices.has(invoiceId)) fail("Una factura no puede contarse dos veces en el proyecto.");
    invoices.add(invoiceId);
    return { invoiceId, milestoneId };
  });
  return p;
}

export function preserveBaselines(previous, next) {
  if (!previous) return;
  if (previous.currency !== next.currency && previous.milestones.some(m => m.baselineApproved && m.baselineCashAmount !== null)) {
    fail("No puedes cambiar la moneda de un plan base con importes confirmados.");
  }
  for (const m of previous.milestones.filter(m => m.baselineApproved)) {
    const updated = next.milestones.find(item => item.id === m.id);
    if (!updated || !updated.baselineApproved || ["baselineDate", "baselineCashDate", "baselineCashAmount"].some(key => updated[key] !== m[key])) {
      fail("El plan base confirmado se conserva. Modifica la fecha o el monto previsto para reprogramar.");
    }
  }
}
