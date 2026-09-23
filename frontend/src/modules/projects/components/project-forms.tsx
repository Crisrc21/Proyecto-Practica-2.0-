import { useEffect, useRef, useState, type ReactNode, type FormEvent } from "react";
import { X } from "lucide-react";
import { milestoneTypes, projectScopes, type Project, type Milestone } from "../types";
import { shortDate, todayISO } from "../data/project-calculations";
import { isAdvanceMilestone } from "../data/project-workflow";

export function Editor({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className="project-dialog" aria-label={title} onCancel={onClose}>
    <div className="project-dialog-heading"><h2>{title}</h2><button type="button" className="project-icon-button" aria-label="Cerrar formulario" onClick={onClose}><X size={19} /></button></div>
    {children}
  </dialog>;
}
export function SaveFooter({ busy, error, onClose, label = "Guardar cambios" }: { busy: boolean; error: string; onClose: () => void; label?: string }) {
  return <>
    {error && <p className="project-error project-full" role="alert">{error}</p>}
    <div className="project-form-actions project-full"><button type="button" className="project-button" onClick={onClose} disabled={busy}>Cancelar</button><button className="project-button primary" disabled={busy}>{busy ? "Guardando…" : label}</button></div></>;
}
export function PotentialForm({ project, onSave, onClose }: { project: Project; onSave: (p: Project, reason: string) => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState(project.name);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault(); if (!name.trim()) { setError("Escribe el nombre del contrato."); return; }
    setBusy(true); setError("");
    try { await onSave({ ...project, name: name.trim() }, project.revision ? "Nombre del potencial actualizado" : "Contrato potencial agregado"); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : "No se pudo guardar el potencial."); } finally { setBusy(false); }
  }
  return <Editor title={project.revision ? "Editar potencial" : "Agregar contrato potencial"} onClose={onClose}><form className="project-form" onSubmit={submit}>
    <label className="project-field project-full">Nombre del contrato<input autoFocus required maxLength={180} value={name} onChange={e => setName(e.target.value)} placeholder="Ej.: Proyecto Los Escritores 2" /></label>
    <p className="project-note project-full">Los demás datos se completan después de confirmar la firma.</p>
    <SaveFooter busy={busy} error={error} onClose={onClose} label={project.revision ? "Guardar nombre" : "Agregar potencial"} />
  </form></Editor>;
}
function scopeForEditor(m: Milestone): Milestone["scope"] {
  if (projectScopes.some(scope => scope === m.scope)) return m.scope;
  const stages: Partial<Record<NonNullable<Milestone["stageKey"]>, Milestone["scope"]>> = { anticipo: "Anticipo", fabricacion: "Fabricación", despachos: "Despacho", fundaciones: "Fundaciones", montaje: "Montaje", interior: "Urbanización Interior", exterior: "Urbanización Exterior" };
  const previous: Partial<Record<Milestone["scope"], Milestone["scope"]>> = { Viviendas: "Fabricación", "Obra civil": "Fundaciones", "Urba interior": "Urbanización Interior", "Urba exterior": "Urbanización Exterior" };
  return (m.stageKey && stages[m.stageKey]) || previous[m.scope] || m.scope;
}
export function ProjectForm({ project, onSave, onClose }: { project: Project; onSave: (p: Project, reason: string) => Promise<void>; onClose: () => void }) {
  const [draft, setDraft] = useState(project);
  const [projectType, setProjectType] = useState(project.nature === 1 ? "tgm" : project.nature ? "completa" : "");
  const [constructionNature, setConstructionNature] = useState<2 | 3 | 4 | null>(project.nature && project.nature !== 1 ? project.nature : null);
  const reason = project.revision ? "Ficha del proyecto actualizada" : "Alta del proyecto";
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const update = <K extends keyof Project>(key: K, value: Project[K]) => setDraft(p => ({ ...p, [key]: value }));
  async function submit(e: FormEvent) { e.preventDefault(); setBusy(true); setError(""); try { await onSave(draft, reason); onClose(); } catch (err) { setError(err instanceof Error ? err.message : "No se pudo guardar."); } finally { setBusy(false); } }
  return <Editor title={project.revision ? "Editar ficha del proyecto" : "Nuevo contrato potencial"} onClose={onClose}><form className="project-form" onSubmit={submit}>
    <p className="project-note project-full">{draft.lifecycle === "Potencial" ? "Este contrato permanecerá en Potenciales hasta pulsar «Contrato firmado». Sus importes no se suman a la proyección de cobros." : "Contrato firmado · la naturaleza define las etapas de seguimiento y sus estados de pago."}</p>
    <label className="project-field project-full">Nombre del proyecto<input required maxLength={180} value={draft.name} onChange={e => update("name", e.target.value)} /></label>
    <label className="project-field">Cliente / mandante<input required maxLength={200} value={draft.customer} onChange={e => update("customer", e.target.value)} /></label>
    <label className="project-field">RUT del cliente<input value={draft.customerRut} onChange={e => update("customerRut", e.target.value)} placeholder="Para sugerir facturas del cliente" /></label>
    <label className="project-field">Ubicación<input value={draft.location} onChange={e => update("location", e.target.value)} /></label>
    <label className="project-field">Responsable CDG<input value={draft.owner} onChange={e => update("owner", e.target.value)} /></label>
    <label className="project-field">Cantidad de viviendas<input type="number" min="0" step="1" required value={draft.units} onChange={e => update("units", Number(e.target.value))} /></label>
    <label className="project-field">Superficie total contratada (m²)<input type="number" min="0" step="any" value={draft.areaM2 ?? ""} onChange={e => update("areaM2", e.target.value === "" ? null : Number(e.target.value))} /></label>
    <label className="project-field project-full">Tipo de proyecto<select value={projectType} required={draft.lifecycle !== "Potencial"} onChange={e => { const type = e.target.value; setProjectType(type); update("nature", type === "tgm" ? 1 : type === "completa" ? constructionNature : null); }}><option value="" disabled>Selecciona el tipo de proyecto</option><option value="tgm">Fabricación y Montaje (TGM)</option><option value="completa">Construcción Completa</option></select></label>
    {projectType === "completa" && <label className="project-field project-full">Composición de la Construcción Completa<select required value={constructionNature ?? ""} onChange={e => { const nature = Number(e.target.value) as 2 | 3 | 4; setConstructionNature(nature); update("nature", nature); }}><option value="" disabled>Selecciona cómo se conforma</option><option value="2">TGM, Urbanización Interior</option><option value="3">TGM, Urbanización Interior y Exterior</option><option value="4">TGM, Urbanización Exterior</option></select></label>}
    <label className="project-field">Tipo de contrato<input value={draft.contractType} onChange={e => update("contractType", e.target.value)} /></label>
    <label className="project-field">Moneda contractual<select value={draft.currency} onChange={e => update("currency", e.target.value as Project["currency"])}><option>UF</option><option>CLP</option></select></label>
    <label className="project-field">Monto contractual, IVA incluido<input type="number" min="0" step="any" value={draft.contractAmount ?? ""} onChange={e => update("contractAmount", e.target.value === "" ? null : Number(e.target.value))} /></label>
    <label className="project-field">Fecha de firma<input type="date" max={todayISO()} value={draft.signedDate ?? ""} onChange={e => update("signedDate", e.target.value || null)} /><span>Si queda vacía, «Contrato firmado» registrará la fecha del día.</span></label>
    <label className="project-field">Inicio de referencia<input type="date" value={draft.startDate ?? ""} onChange={e => update("startDate", e.target.value || null)} /></label>
    <label className="project-field">Término contractual<input type="date" value={draft.endDate ?? ""} onChange={e => update("endDate", e.target.value || null)} /></label>
    <label className="project-field">UF supuesta para proyección en pesos<input type="number" min="0.01" step="any" value={draft.ufValue ?? ""} onChange={e => update("ufValue", e.target.value === "" ? null : Number(e.target.value))} /><span>Supuesto de CDG. Los cobros reales mantienen su valor en pesos.</span></label>
    {!draft.nature && <fieldset className="project-full"><legend>Alcances registrados previamente</legend><div className="project-checks">{projectScopes.map(scope => <label key={scope}><input type="checkbox" checked={draft.scopes.includes(scope)} onChange={e => update("scopes", e.target.checked ? [...draft.scopes, scope] : draft.scopes.filter(s => s !== scope))} />{scope}</label>)}</div></fieldset>}
    <label className="project-field project-full">Carpeta de EDP aprobados<input type="url" value={draft.approvedFolder} onChange={e => update("approvedFolder", e.target.value)} placeholder="https://…sharepoint.com/…" /><span>Guarda el acceso a la carpeta. La detección y el correo automáticos aún requieren conectar Microsoft 365.</span></label>
    <label className="project-field project-full">Condiciones y eventos que habilitan el pago<textarea rows={3} value={draft.paymentTerms} onChange={e => update("paymentTerms", e.target.value)} /></label>
    <label className="project-field project-full">Observaciones / datos pendientes<textarea rows={3} value={draft.notes} onChange={e => update("notes", e.target.value)} /></label>
    <SaveFooter {...{ busy, error, onClose }} />
  </form></Editor>;
}
export function MilestoneForm({ milestone, currency, onSave, onClose }: { milestone: Milestone; currency: string; onSave: (m: Milestone, reason: string) => Promise<void>; onClose: () => void }) {
  const [draft, setDraft] = useState(() => ({ ...milestone, scope: scopeForEditor(milestone) }));
  const reason = milestone.name ? "Hito actualizado" : "Hito agregado";
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const update = <K extends keyof Milestone>(key: K, value: Milestone[K]) => setDraft(m => ({ ...m, [key]: value }));
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    if (!projectScopes.some(s => s === draft.scope)) { setError("Selecciona un alcance para este hito."); setBusy(false); return; }
    const next = !milestone.baselineApproved ? { ...draft, baselineDate: draft.forecastDate, baselineCashDate: draft.cashDate, baselineCashAmount: draft.cashAmount } : draft;
    try { await onSave(next, reason); onClose(); } catch (err) { setError(err instanceof Error ? err.message : "No se pudo guardar."); } finally { setBusy(false); }
  }
  return <Editor title={milestone.name ? "Actualizar hito" : "Agregar hito"} onClose={onClose}><form className="project-form" onSubmit={submit}>
    <label className="project-field project-full">Nombre del hito<input value={draft.name} required maxLength={200} onChange={e => update("name", e.target.value)} /></label>
    <label className="project-field">Tipo<select disabled={Boolean(draft.stageKey)} value={draft.type} onChange={e => update("type", e.target.value as Milestone["type"])}>{milestoneTypes.filter(t => t !== "Etapa" || draft.stageKey).map(t => <option key={t}>{t}</option>)}</select></label>
    <label className="project-field">Alcance<select required value={projectScopes.some(s => s === draft.scope) ? draft.scope : ""} onChange={e => update("scope", e.target.value as Milestone["scope"])}><option value="" disabled hidden>Selecciona un alcance</option>{projectScopes.map(s => <option key={s}>{s}</option>)}</select></label>
    <label className="project-field">Inicio de referencia<input type="date" value={draft.startDate ?? ""} onChange={e => update("startDate", e.target.value || null)} /></label>
    <label className="project-field">Fecha prevista / compromiso vigente<input type="date" value={draft.forecastDate ?? ""} onChange={e => update("forecastDate", e.target.value || null)} /></label>
    <div className="project-note project-full">Base {milestone.baselineApproved ? "confirmada" : "propuesta"}: {shortDate(milestone.baselineDate)}. {milestone.baselineApproved ? "La base se conserva al reprogramar." : "Al confirmar, las fechas e importes previstos quedarán como referencia del cumplimiento."}</div>
    {!milestone.baselineApproved && <label className="project-check project-full"><input type="checkbox" checked={draft.baselineApproved} onChange={e => update("baselineApproved", e.target.checked)} />Confirmar este hito y conservar su plan base</label>}
    {!draft.stageKey && <><label className="project-field">Estado de seguimiento<select value={draft.state} onChange={e => update("state", e.target.value as Milestone["state"])}><option>Pendiente</option><option>En curso</option><option>Observado</option></select></label>
    <label className="project-field">Fecha efectiva de cumplimiento<input type="date" max={todayISO()} value={draft.actualDate ?? ""} onChange={e => update("actualDate", e.target.value || null)} /><span>Se considera cumplido cuando hay fecha y evidencia.</span></label>
    <label className="project-field project-full">Evidencia del cumplimiento<input value={draft.evidence} required={Boolean(draft.actualDate)} onChange={e => update("evidence", e.target.value)} placeholder="Enlace o referencia al EDP aprobado, acta o contrato" /></label></>}
    {draft.stageKey && <p className="project-note project-full">El cumplimiento se obtiene de los cortes en «Hitos y avances». El anticipo se consulta desde los pagos de CxC. Aquí puedes programar las fechas de la etapa.</p>}
    {isAdvanceMilestone(draft) && !["Anticipo", "EDP", "Retenciones"].includes(draft.type) && <label className="project-check project-full"><input type="checkbox" checked={draft.invoicingComplete === true} onChange={e => update("invoicingComplete", e.target.checked)} />Las facturas vinculadas cubren todo este hito de anticipo</label>}
    {["Anticipo", "EDP", "Retenciones"].includes(draft.type) && <>
      <label className="project-field">Monto previsto a cobrar ({currency})<input type="number" min="0" step="any" value={draft.cashAmount ?? ""} onChange={e => update("cashAmount", e.target.value === "" ? null : Number(e.target.value))} /><span>Después de anticipos, retenciones e impuestos aplicables.</span></label>
      <label className="project-field">Fecha esperada de cobro<input type="date" value={draft.cashDate ?? ""} onChange={e => update("cashDate", e.target.value || null)} /><span>Esta fecha no registra un pago real.</span></label>
      <label className="project-check project-full"><input type="checkbox" checked={draft.invoicingComplete === true} onChange={e => update("invoicingComplete", e.target.checked)} />Las facturas vinculadas cubren todo este hito</label>
      <p className="project-note project-full">Mientras la facturación sea parcial, se conserva la proyección del monto total del hito menos lo ya cobrado. Cuando esté completa, se utiliza el saldo de las facturas vinculadas.</p>
    </>}
    <label className="project-field project-full">Regla o fuente del hito<input value={draft.source} onChange={e => update("source", e.target.value)} /></label>
    <label className="project-field project-full">Observaciones y dependencias<textarea rows={3} value={draft.notes} onChange={e => update("notes", e.target.value)} placeholder="Ej.: cobro sujeto al giro bancario, fecha por confirmar" /></label>
    <SaveFooter {...{ busy, error, onClose }} />
  </form></Editor>;
}
