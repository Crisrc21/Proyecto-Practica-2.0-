export const milestoneTypes = ["Contrato", "Anticipo", "EDP", "Recepción", "Retenciones", "Otro", "Etapa"] as const;
export const projectScopes = ["Anticipo", "Fabricación", "Despacho", "Fundaciones", "Montaje", "Urbanización Interior", "Urbanización Exterior"] as const;
export const legacyScopes = ["General", "Obra civil", "Viviendas", "Urba interior", "Urba exterior", "TGM"] as const;
export type Currency = "UF" | "CLP";
export type StageKey = "firma" | "anticipo" | "fabricacion" | "despachos" | "fundaciones" | "montaje" | "interior" | "exterior" | "total";
export type ProgressMetric = "firma" | "m2" | "terminadas" | "despachadas" | "fundaciones" | "fundacionesPct" | "montadas" | "interiorPct" | "exteriorPct" | "totalPct";
export interface ProgressReport {
  id: string; stageKey: StageKey; date: string; evidence: string;
  quantity: number | null; completedUnits: number | null; percent: number | null;
}
export interface EdpCondition {
  stageKey: StageKey; metric: ProgressMetric; threshold: number;
  status: "Previsto" | "Preparado" | "Presentado" | "Aprobado";
  triggeredDate: string | null; presentedDate: string | null; approvedDate: string | null; approvalEvidence: string;
}
export interface Milestone {
  id: string; name: string; type: typeof milestoneTypes[number]; scope: typeof projectScopes[number] | typeof legacyScopes[number];
  startDate: string | null; baselineDate: string | null; forecastDate: string | null; actualDate: string | null;
  baselineApproved: boolean; state: "Pendiente" | "En curso" | "Observado";
  evidence: string; source: string; notes: string;
  invoicingComplete?: boolean;
  stageKey?: StageKey;
  edp?: EdpCondition;
  cashAmount: number | null; baselineCashAmount: number | null; cashDate: string | null; baselineCashDate: string | null;
}
export interface Project {
  id: string; revision: number; name: string; customer: string; customerRut: string; location: string; owner: string;
  units: number; contractType: string; currency: Currency; contractAmount: number | null;
  lifecycle?: "Potencial" | "Firmado"; nature?: 1 | 2 | 3 | 4 | null; areaM2?: number | null;
  progressReports?: ProgressReport[];
  excludedStages?: StageKey[];
  milestoneOrder?: string[];
  signedDate: string | null; startDate: string | null; endDate: string | null;
  ufValue: number | null; approvedFolder: string; paymentTerms: string; notes: string;
  scopes: string[]; sources: { name: string; reference: string }[];
  issues: { id: string; text: string; resolved: boolean }[];
  milestones: Milestone[]; invoiceLinks: { invoiceId: string; milestoneId: string }[];
  updatedAt: string; history: { id: string; at: string; reason: string; changes: string[] }[];
}
export type DataState = "loading" | "ready" | "error";
export type MilestoneStatus = "Cumplido a tiempo" | "Cumplido con atraso" | "Cumplido" | "Sin evidencia" | "Observado" | "En curso" | "Programado" | "Propuesto" | "Sin fecha";
