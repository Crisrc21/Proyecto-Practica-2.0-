import { useState, type FormEvent } from "react";
import { ArrowRight, Check, CheckCircle2, Clock3, FileCheck2, Plus, Search, Trash2 } from "lucide-react";
import type { FacturaCalculada } from "../../accounts-receivable/types";
import type { DataState, EdpCondition, Milestone, ProgressReport, Project, StageKey } from "../types";
import { amount, createProjectRecordId, emptyMilestone, shortDate, todayISO } from "../data/project-calculations";
import { activeStages, advancePayment, isAdvanceMilestone, latestReport, metricLabels, metricValue, natures, physicalPercent, stages, workflowAtCutoff } from "../data/project-workflow";
import { Editor, SaveFooter } from "./project-forms";
import { HistoryLine, ProgressChart, ProgressHistory, type HistoryEvent } from "./project-history";
import { edpPayments } from "../data/project-history";

const number = (value: number | null | undefined) => value == null ? "—" : new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 }).format(value);
type Save = (p: Project, reason: string) => Promise<void>;
export function PotentialContracts({ projects, busy, onEdit, onSign, onAdd }: { projects: Project[]; busy: boolean; onEdit: (p: Project) => void; onSign: (p: Project) => void; onAdd: () => void }) {
  return <section className="project-panel"><div className="project-panel-heading"><div><span className="project-eyebrow">PASO 0</span><h2>Contratos potenciales</h2><p>Agrega un nombre. Completa la ficha cuando el contrato esté firmado.</p></div><button className="project-button primary" onClick={onAdd}><Plus size={16} />Agregar potencial</button></div>
    {!projects.length && <div className="project-empty"><FileCheck2 size={28} /><h2>Tu próximo proyecto comienza aquí</h2><p>Usa «Agregar potencial» para registrar el nombre del contrato.</p></div>}
    {projects.map(p => <article className="project-potential-row" key={p.id}><div><span className="project-badge neutral">Pendiente de firma</span><h3><button className="project-text-link" onClick={() => onEdit(p)}>{p.name}</button></h3></div><div className="project-potential-actions"><button className="project-button" onClick={() => onEdit(p)}>Editar nombre</button><button className="project-button primary" disabled={busy} onClick={() => onSign(p)}><CheckCircle2 size={16} />Contrato firmado</button><small>Fecha de firma: {p.signedDate ? shortDate(p.signedDate) : "hoy"}</small></div></article>)}
  </section>;
}

export function ProjectWorkflow({ project, invoices, dataState, cutoff, onSave, onEditStage, onEditProject, onEdps, onCash }: { project: Project; invoices: FacturaCalculada[]; dataState: DataState; cutoff: string; onSave: Save; onEditStage: (m: Milestone) => void; onEditProject: () => void; onEdps: () => void; onCash: () => void }) {
  const [editing, setEditing] = useState<StageKey | null>(null);
  const [customId, setCustomId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Milestone | null>(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [selectedKey, setSelectedKey] = useState<StageKey>("fabricacion");
  const advance = advancePayment(project, invoices, dataState, cutoff);
  if (!project.nature) return <section className="project-panel project-workflow-intro"><h2>Configura la naturaleza del contrato</h2><p>Selecciona una naturaleza para incorporar las etapas de seguimiento y comenzar su historia de avances.</p><button className="project-button primary" onClick={onEditProject}>Seleccionar naturaleza</button></section>;
  const sequence = activeStages(project.nature).filter(s => !(project.excludedStages || []).includes(s.key));
  const customMilestones = project.milestones.filter(m => !m.stageKey && !m.edp);
  const custom = customMilestones.find(m => m.id === customId);
  const stage = sequence.find(s => s.key === selectedKey) || sequence[0];
  const report = latestReport(project, stage.key, cutoff);
  const rawMilestone = project.milestones.find(m => m.stageKey === stage.key);
  const milestone = workflowAtCutoff(project, invoices, dataState, cutoff).milestones.find(m => m.stageKey === stage.key);
  const progress = (key: StageKey) => key === "anticipo" ? advance.percent : physicalPercent(project, key, cutoff);
  const percent = progress(stage.key);
  const stageEdps = project.milestones.filter(m => m.edp?.stageKey === stage.key);
  const cashEvents: HistoryEvent[] = stage.key === "anticipo" ? project.milestones.filter(isAdvanceMilestone).flatMap(m => edpPayments(project, m, invoices, dataState, cutoff).payments.map(p => ({ id: p.id, date: p.date, title: `Pago de anticipo · factura ${p.invoiceNumber}`, detail: amount(p.amount), href: `/trazabilidad?factura=${encodeURIComponent(p.invoiceId)}` }))) : [];
  function deletionReason(m: Milestone) {
    if (m.stageKey === "firma") return "La firma acredita el contrato y debe conservarse.";
    if (project.invoiceLinks.some(l => l.milestoneId === m.id)) return "Este hito tiene facturas vinculadas. Revisa sus asociaciones en Cobros antes de eliminarlo.";
    if (m.baselineApproved) return "Este hito tiene un plan base confirmado que debe conservarse.";
    if (m.actualDate || m.evidence || m.stageKey && project.progressReports?.some(r => r.stageKey === m.stageKey)) return "Este hito tiene evidencia o avances registrados que deben conservarse.";
    if (m.stageKey && project.milestones.some(item => item.edp?.stageKey === m.stageKey)) return "Este hito tiene estados de pago asociados.";
    return "";
  }
  async function removeMilestone() {
    if (!removing || deletionReason(removing)) return;
    setBusy(true); setError("");
    try {
      await onSave({ ...project, milestones: project.milestones.filter(m => m.id !== removing.id), excludedStages: removing.stageKey ? [...new Set([...(project.excludedStages || []), removing.stageKey])] : project.excludedStages }, `Hito eliminado del contrato: ${removing.name}`);
      setRemoving(null); setCustomId(null);
    } catch (err) { setError(err instanceof Error ? err.message : "No se pudo eliminar el hito."); }
    finally { setBusy(false); }
  }
  async function restoreStage(key: StageKey) {
    setBusy(true); setError("");
    try { await onSave({ ...project, excludedStages: (project.excludedStages || []).filter(k => k !== key) }, "Hito reincorporado al contrato"); setSelectedKey(key); setCustomId(null); setAdding(false); }
    catch (err) { setError(err instanceof Error ? err.message : "No se pudo agregar el hito."); }
    finally { setBusy(false); }
  }
  return <div className="project-stack"><section className="project-panel project-workflow-intro"><div className="project-section-intro"><div><span className="project-eyebrow">PASO 2 · SEGUIMIENTO</span><h2>Hitos y avances del contrato</h2><p>Naturaleza {project.nature} · {natures.find(n => n.id === project.nature)?.label}</p></div><span className="project-badge neutral"><Clock3 size={13} />Al {shortDate(cutoff)}</span></div></section>
    <div className="project-workspace"><aside className="project-panel project-stage-navigation"><div className="project-panel-heading"><div><h3>Recorrido del proyecto</h3><p>Selecciona una etapa para ver su evolución.</p></div></div><button className="project-button" onClick={() => { setError(""); setAdding(true); }}><Plus size={15} />Agregar hito</button><ol className="project-stage-rail">{sequence.map((s, index) => {
      const value = progress(s.key);
      return <li key={s.key} className={`${value === 100 ? "is-complete" : ""} ${!custom && stage.key === s.key ? "is-selected" : ""}`}><button aria-pressed={!custom && stage.key === s.key} aria-label={`Ver etapa ${s.label}`} onClick={() => { setSelectedKey(s.key); setCustomId(null); }}><span className="project-rail-dot">{value === 100 ? <Check size={15} /> : index + 1}</span><span className="project-rail-label"><strong>{s.label}</strong><small>{s.key === "anticipo" ? advance.status : value === 100 ? "Cumplido" : value !== null ? "Avance registrado" : "Sin medición"}</small></span><span className="project-rail-value">{number(value)}{value !== null ? "%" : ""}</span></button></li>;
    })}{customMilestones.map((m, index) => <li key={m.id} className={custom?.id === m.id ? "is-selected" : ""}><button aria-pressed={custom?.id === m.id} onClick={() => setCustomId(m.id)}><span className="project-rail-dot">{sequence.length + index + 1}</span><span className="project-rail-label"><strong>{m.name}</strong><small>{m.actualDate && m.actualDate <= cutoff ? "Cumplido" : m.state}</small></span></button></li>)}</ol></aside>
    <div className="project-stage-detail project-stack">{custom ? <section className="project-panel"><div className="project-panel-heading"><div><span className="project-eyebrow">HITO DEL CONTRATO</span><h2>{custom.name}</h2><p>{custom.scope} · {custom.actualDate && custom.actualDate <= cutoff ? "Cumplido" : custom.state}</p></div><div className="project-actions"><button className="project-button" onClick={() => onEditStage(custom)}>Actualizar hito</button><button className="project-button" onClick={() => { setError(""); setRemoving(custom); }}><Trash2 size={15} />Eliminar hito</button></div></div><div className="project-date-strip"><div><span>Compromiso inicial</span><strong>{shortDate(custom.baselineDate)}</strong></div><div><span>Fecha prevista actual</span><strong>{shortDate(custom.forecastDate)}</strong></div><div><span>Cumplimiento efectivo</span><strong>{shortDate(custom.actualDate && custom.actualDate <= cutoff ? custom.actualDate : null)}</strong></div></div>{custom.notes && <p>{custom.notes}</p>}<button className="project-button" onClick={onCash}>Consultar cobros</button></section> : <><section className="project-panel"><div className="project-panel-heading"><div><span className="project-eyebrow">ETAPA {sequence.findIndex(s => s.key === stage.key) + 1} DE {sequence.length}</span><h2>{stage.label}</h2></div><div className="project-actions">{!["firma", "anticipo"].includes(stage.key) && <button className="project-button primary" onClick={() => setEditing(stage.key)}><Plus size={15} />Registrar avance</button>}{stage.key === "firma" && <button className="project-button" onClick={onEditProject}>Ver ficha contractual</button>}{stage.key === "anticipo" && <button className="project-button primary" onClick={onCash}>Consultar cobros</button>}{rawMilestone && stage.key !== "firma" && <button className="project-button" onClick={() => onEditStage(rawMilestone)}>Programar hito</button>}{rawMilestone && <button className="project-button" onClick={() => { setError(""); setRemoving(rawMilestone); }}><Trash2 size={15} />Eliminar hito</button>}</div></div>
      <div className="project-stage-overview"><div className="project-stage-current"><span>Avance al corte</span><strong>{number(percent)}{percent !== null ? "%" : ""}</strong><p>{stage.key === "anticipo" ? advance.label : stage.key === "firma" ? "Firma del contrato" : report ? `Última medición: ${shortDate(report.date)}` : "Registra el primer corte de esta etapa"}</p><div className="project-compliance-track" role="progressbar" aria-label={`Avance de ${stage.label}`} aria-valuenow={percent ?? 0} aria-valuemin={0} aria-valuemax={100} aria-valuetext={percent === null ? "Sin medición suficiente" : `${number(percent)}%`}><span style={{ width: `${percent ?? 0}%` }} /></div></div>
      <dl className="project-stage-measures">
        {stage.key === "fabricacion" && <><Metric label="m² fabricados / contratados" value={`${number(report?.quantity)} / ${number(project.areaM2)}`} /><Metric label="Casas terminadas / contratadas" value={`${number(report?.completedUnits)} / ${project.units}`} /></>}
        {stage.key === "despachos" && <Metric label="Casas despachadas / contratadas" value={`${number(report?.quantity)} / ${project.units}`} />}
        {stage.key === "fundaciones" && <Metric label="Casas con fundación terminada" value={`${number(report?.quantity)} / ${project.units}`} />}
        {stage.key === "montaje" && <Metric label="Casas montadas / contratadas" value={`${number(report?.quantity)} / ${project.units}`} />}
        {stage.key === "anticipo" && <><div><dt>Estado de las facturas del anticipo</dt><dd><span className={`project-badge ${advance.status === "Pagado" ? "success" : advance.status === "Vencido" ? "danger" : advance.status === "Pendiente" ? "warning" : "neutral"}`}>{advance.status}</span></dd></div><Metric label="Dinero cobrado en CxC" value={amount(advance.paid)} /><Metric label="Monto de facturas vinculadas" value={amount(advance.billed)} /></>}
        {stage.key === "total" && <Metric label="Método de medición" value="Avance informado según contrato" />}
        {stage.key !== "anticipo" && <Metric label="EDP de esta etapa" value={String(stageEdps.length)} />}
      </dl></div>
      <div className="project-date-strip"><div><span>Compromiso inicial</span><strong>{shortDate(milestone?.baselineDate || null)}</strong></div><div><span>Fecha prevista actual</span><strong>{shortDate(milestone?.forecastDate || null)}</strong></div><div className={milestone?.actualDate ? "is-achieved" : ""}><span>Cumplimiento efectivo</span><strong>{shortDate(milestone?.actualDate && milestone.actualDate <= cutoff ? milestone.actualDate : null)}</strong></div></div>
      {!["firma", "anticipo"].includes(stage.key) && <ProgressChart project={project} stage={stage.key} cutoff={cutoff} />}
      {stage.key !== "anticipo" && <div className="project-stage-bottom"><span>{stageEdps.filter(m => m.edp?.status === "Preparado").length} EDP preparados para gestionar</span><button className="project-text-link" onClick={onEdps}>Ver estados de pago <ArrowRight size={14} /></button></div>}
    </section>
    {stage.key === "anticipo" ? <section className="project-panel"><div className="project-panel-heading"><div><h3>Historia de cobros del anticipo</h3><p>Pagos y abonos efectivamente registrados en CxC.</p></div></div><HistoryLine key={`cash-${project.id}`} events={cashEvents} empty={advance.label} /></section> : <ProgressHistory key={stage.key} project={project} stage={stage.key} cutoff={cutoff} />}
    </>}</div></div>
    {adding && <Editor title="Agregar hito al contrato" onClose={() => { if (!busy) setAdding(false); }}><div className="project-form"><p className="project-full">Crea un hito con su nombre, alcance y fechas.</p><button className="project-button primary project-full" disabled={busy} onClick={() => { const next = { ...emptyMilestone(), type: "Otro" as const }; setCustomId(next.id); setAdding(false); onEditStage(next); }}><Plus size={15} />Crear nuevo hito</button>{activeStages(project.nature).filter(s => project.excludedStages?.includes(s.key)).map(s => <button key={s.key} className="project-button project-full" disabled={busy} onClick={() => restoreStage(s.key)}>Reincorporar {s.label}</button>)}{error && <p className="project-error project-full" role="alert">{error}</p>}</div></Editor>}
    {removing && <Editor title="Eliminar hito" onClose={() => { if (!busy) setRemoving(null); }}><div className="project-form"><p className="project-full">{deletionReason(removing) || `¿Eliminar «${removing.name}» de este contrato? El cambio quedará registrado en el historial.`}</p>{error && <p className="project-error project-full" role="alert">{error}</p>}<div className="project-form-actions project-full"><button className="project-button" disabled={busy} onClick={() => setRemoving(null)}>Cancelar</button><button className="project-button primary" disabled={busy || Boolean(deletionReason(removing))} onClick={removeMilestone}>{busy ? "Eliminando…" : "Eliminar hito"}</button></div></div></Editor>}
    {editing && <ProgressForm key={editing} project={project} stage={editing} onSave={onSave} onClose={() => setEditing(null)} />}
  </div>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }

function ProgressForm({ project, stage, onSave, onClose }: { project: Project; stage: StageKey; onSave: Save; onClose: () => void }) {
  const previous = latestReport(project, stage, todayISO());
  const [draft, setDraft] = useState<ProgressReport>({ id: createProjectRecordId(), stageKey: stage, date: todayISO(), evidence: "", quantity: previous?.quantity ?? null, completedUnits: previous?.completedUnits ?? null, percent: previous?.percent ?? null });
  const reason = "Actualización de avance acumulado";
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { await onSave({ ...project, progressReports: [...(project.progressReports || []), draft] }, reason); onClose(); }
    catch (err) { setError(err instanceof Error ? err.message : "No se pudo guardar el avance."); } finally { setBusy(false); }
  }
  const quantityLabel = stage === "fabricacion" ? "m² fabricados acumulados" : stage === "despachos" ? "Casas despachadas acumuladas" : stage === "montaje" ? "Casas montadas acumuladas" : "Casas con fundación terminada";
  return <Editor title={`Registrar avance · ${stages.find(s => s.key === stage)?.label}`} onClose={onClose}><form className="project-form" onSubmit={submit}>
    <p className="project-note project-full">Registra el total acumulado, no el incremento del período. Se revisarán las condiciones de los EDP de esta etapa al guardar.</p>
    <label className="project-field">Fecha del corte<input required type="date" min={project.signedDate || undefined} max={todayISO()} value={draft.date} onChange={e => setDraft(d => ({ ...d, date: e.target.value }))} /></label>
    {["fabricacion", "despachos", "fundaciones", "montaje"].includes(stage) && <label className="project-field">{quantityLabel}<input type="number" min="0" step={stage === "fabricacion" ? "any" : "1"} max={stage === "fabricacion" ? project.areaM2 ?? undefined : project.units} value={draft.quantity ?? ""} onChange={e => setDraft(d => ({ ...d, quantity: e.target.value === "" ? null : Number(e.target.value) }))} /></label>}
    {stage === "fabricacion" && <label className="project-field">Casas terminadas acumuladas<input type="number" min="0" max={project.units} step="1" value={draft.completedUnits ?? ""} onChange={e => setDraft(d => ({ ...d, completedUnits: e.target.value === "" ? null : Number(e.target.value) }))} /></label>}
    {["fundaciones", "interior", "exterior", "total"].includes(stage) && <label className="project-field">Avance acumulado (%)<input type="number" min="0" max="100" step="any" value={draft.percent ?? ""} onChange={e => setDraft(d => ({ ...d, percent: e.target.value === "" ? null : Number(e.target.value) }))} /></label>}
    <label className="project-field project-full">Evidencia / referencia del avance<input required maxLength={2000} value={draft.evidence} onChange={e => setDraft(d => ({ ...d, evidence: e.target.value }))} placeholder="Enlace al informe, planilla de producción, guía de despacho o acta" /></label>
    {stage === "total" && <p className="project-note project-full">Utiliza el porcentaje total validado según la ponderación del contrato. El sistema no asigna pesos supuestos a fabricación, montaje y urbanizaciones.</p>}
    <SaveFooter {...{ busy, error, onClose }} />
  </form></Editor>;
}

export function ProjectEdps({ project, cutoff, invoices, dataState, onEdit, onCash }: { project: Project; cutoff: string; invoices: FacturaCalculada[]; dataState: DataState; onEdit: (m: Milestone) => void; onCash: () => void }) {
  const [selectedId, setSelectedId] = useState<string | null>(null), [filter, setFilter] = useState("Todos"), [query, setQuery] = useState("");
  const edps = project.milestones.filter(m => !isAdvanceMilestone(m) && ["EDP", "Retenciones"].includes(m.type));
  const filtered = edps.filter(m => (filter === "Todos" || (m.edp?.status || "Sin condición") === filter) && `${m.name} ${m.scope}`.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")));
  const selected = filtered.find(m => m.id === selectedId) || filtered[0];
  function add() {
    const next: Milestone = { ...emptyMilestone(), name: "", scope: "Fabricación", edp: { stageKey: "fabricacion", metric: "m2", threshold: 1, status: "Previsto", triggeredDate: null, presentedDate: null, approvedDate: null, approvalEvidence: "" } };
    setFilter("Todos"); setQuery(""); setSelectedId(next.id); onEdit(next);
  }
  function canAttach(m: Milestone) { return !m.edp && !m.actualDate && Boolean(project.nature) && m.type === "EDP" && !isAdvanceMilestone(m); }
  function manage(m: Milestone) {
    if (!canAttach(m)) { onEdit(m); return; }
    onEdit({ ...m, edp: { stageKey: "fabricacion", metric: "m2", threshold: 1, status: "Previsto", triggeredDate: null, presentedDate: null, approvedDate: null, approvalEvidence: "" } });
  }
  return <div className="project-stack"><section className="project-panel project-workflow-intro"><div className="project-section-intro"><div><span className="project-eyebrow">PASO 3 · ESTADOS DE PAGO</span><h2>Del avance al cobro</h2><p>Selecciona un EDP para revisar su recorrido y el siguiente paso.</p></div><button className="project-button primary" disabled={!project.nature} onClick={add}><Plus size={16} />Planificar EDP</button></div>{!project.nature && <p>Selecciona la naturaleza en la ficha para habilitar nuevos EDP por avance.</p>}</section>
    <div className="project-edp-filters" role="group" aria-label="Filtrar estados de pago">{["Todos", "Previsto", "Preparado", "Presentado", "Aprobado", ...(edps.some(m => !m.edp) ? ["Sin condición"] : [])].map(state => <button key={state} aria-pressed={filter === state} className={filter === state ? "is-active" : ""} onClick={() => setFilter(state)}><span>{state === "Todos" ? "Todos los EDP" : state === "Previsto" ? "Por habilitar" : state === "Preparado" ? "Preparados" : state === "Presentado" ? "Presentados" : state === "Aprobado" ? "Aprobados" : state}</span><strong>{edps.filter(m => state === "Todos" || (m.edp?.status || "Sin condición") === state).length}</strong></button>)}</div>
    <div className="project-workspace project-edp-workspace"><aside className="project-panel project-edp-navigation"><label className="project-edp-search"><Search size={16} /><input type="search" aria-label="Buscar estado de pago" placeholder="Buscar EDP…" value={query} onChange={e => setQuery(e.target.value)} /></label><div className="project-edp-selector">{filtered.map(m => <button key={m.id} className={selected?.id === m.id ? "is-selected" : ""} aria-pressed={selected?.id === m.id} aria-label={`Ver EDP ${m.name}`} onClick={() => setSelectedId(m.id)}><span className={`project-badge ${m.edp?.status === "Aprobado" ? "success" : m.edp?.status === "Preparado" ? "warning" : "neutral"}`}>{m.edp?.status || "Sin condición"}</span><strong>{m.name}</strong><span>{amount(m.cashAmount, project.currency)}</span><small>Cobro previsto: {shortDate(m.cashDate)}</small></button>)}</div>{!filtered.length && <div className="project-history-empty"><FileCheck2 size={24} /><p>{edps.length ? "No hay EDP para este filtro." : "Planifica tu primer EDP."}</p>{edps.length > 0 && <button className="project-text-link" onClick={() => { setFilter("Todos"); setQuery(""); }}>Limpiar filtros</button>}</div>}</aside>
    {selected ? <EdpDetail key={selected.id} project={project} milestone={selected} cutoff={cutoff} invoices={invoices} dataState={dataState} onEdit={() => manage(selected)} attach={canAttach(selected)} onCash={onCash} /> : <section className="project-panel project-empty"><FileCheck2 size={32} /><h3>{edps.length ? "Selecciona otro filtro" : "Cada EDP tiene su propia historia"}</h3><p>Podrás seguir el avance habilitante, la presentación, la aprobación y los pagos.</p></section>}</div>
  </div>;
}
function EdpDetail({ project, milestone: m, cutoff, invoices, dataState, onEdit, onCash, attach }: { project: Project; milestone: Milestone; cutoff: string; invoices: FacturaCalculada[]; dataState: DataState; onEdit: () => void; onCash: () => void; attach: boolean }) {
  const payments = edpPayments(project, m, invoices, dataState, cutoff), edp = m.edp;
  const value = edp ? metricValue(project, edp, cutoff) : null;
  const occurred = (date: string | null | undefined) => Boolean(date && date <= cutoff);
  const presented = edp && ["Presentado", "Aprobado"].includes(edp.status) ? edp.presentedDate : null;
  const approved = edp ? edp.status === "Aprobado" ? edp.approvedDate : null : m.actualDate;
  const steps = [
    { name: "Planificado", date: null, done: true, detail: m.baselineApproved ? "Base confirmada" : "Base por confirmar" },
    { name: "Preparado", date: edp?.triggeredDate, done: occurred(edp?.triggeredDate), detail: "Según avance" },
    { name: "Presentado", date: presented, done: occurred(presented), detail: "Por presentar" },
    { name: "Aprobado", date: approved, done: occurred(approved), detail: "Por aprobar" },
    { name: payments.completed ? "Cobrado" : payments.paid ? "Cobro parcial" : "Cobro", date: payments.paidDate, done: payments.completed, detail: payments.paid ? amount(payments.paid) : payments.reason }
  ];
  const events: HistoryEvent[] = [];
  if (edp?.triggeredDate && occurred(edp.triggeredDate)) events.push({ id: "trigger", date: edp.triggeredDate, title: "EDP preparado", detail: `${metricLabels[edp.metric]} · umbral ${number(edp.threshold)} alcanzado` });
  if (presented && occurred(presented)) events.push({ id: "presentation", date: presented, title: "EDP presentado", detail: "Enviado para revisión y aprobación" });
  if (approved && occurred(approved)) events.push({ id: "approval", date: approved, title: "EDP aprobado", detail: "Aprobación documental registrada", evidence: edp?.approvalEvidence || m.evidence });
  payments.payments.forEach(p => events.push({ id: `pay-${p.id}`, date: p.date, title: `${p.amount < 0 ? "Ajuste de cobro" : "Pago recibido"} · factura ${p.invoiceNumber}`, detail: amount(p.amount), href: `/trazabilidad?factura=${encodeURIComponent(p.invoiceId)}` }));
  const next = payments.completed ? "El cobro de las facturas vinculadas está completo." : edp?.status === "Aprobado" || (!edp && m.actualDate) ? "Revisa las facturas vinculadas y el dinero recibido en CxC." : edp?.status === "Presentado" ? "Registra la aprobación cuando esté disponible en la carpeta de aprobados." : edp?.status === "Preparado" ? "El avance habilita este EDP. Registra su presentación para continuar." : edp ? "Registra el avance de la etapa para alcanzar la condición acordada." : "Define la condición de avance o completa la planificación de este EDP.";
  return <div className="project-stack project-edp-detail"><section className="project-panel"><div className="project-panel-heading"><div><span className="project-eyebrow">{edp ? stages.find(s => s.key === edp.stageKey)?.label : m.scope}</span><h2>{m.name}</h2></div><button className="project-button primary" onClick={onEdit}>{attach ? "Definir condición" : "Gestionar EDP"}</button></div>
    <ol className="project-edp-journey" aria-label="Recorrido del estado de pago">{steps.map((step, i) => <li key={i} className={step.done ? "is-complete" : ""}><span>{step.done ? <Check size={16} /> : i + 1}</span><strong>{step.name}</strong><small>{step.date && step.done ? shortDate(step.date) : step.detail}</small></li>)}</ol>
    <div className="project-edp-money"><div><span>Proyectado para este EDP</span><strong>{amount(m.cashAmount, project.currency)}</strong><small>{shortDate(m.cashDate)}</small></div><div><span>Dinero cobrado al corte</span><strong>{amount(payments.paid)}</strong><small>{payments.reason}</small></div></div>
    {edp && <div className="project-edp-condition"><div><span>Condición de avance</span><strong>{metricLabels[edp.metric]}</strong></div><strong>{number(value)} <span>/ {number(edp.threshold)}</span></strong><div className="project-compliance-track"><span style={{ width: `${value !== null ? Math.min(100, Math.max(0, value / edp.threshold * 100)) : 0}%` }} /></div></div>}
    {edp && value !== null && value < edp.threshold && ["Presentado", "Aprobado"].includes(edp.status) && <p className="project-footnote project-negative">El avance al corte es inferior a la condición del EDP. Revisa la evidencia y la fecha de corte.</p>}
    <div className="project-next-action"><div><span>Siguiente paso</span><p>{next}</p></div>{(edp?.status === "Aprobado" || payments.available) && <button className="project-button" onClick={onCash}>Ver en Cobros <ArrowRight size={14} /></button>}</div>
  </section><section className="project-panel"><div className="project-panel-heading"><div><h3>Historia del estado de pago</h3><p>Hechos registrados hasta {shortDate(cutoff)}.</p></div></div><HistoryLine events={events} empty="Los avances, aprobaciones y pagos aparecerán aquí cuando se registren." /><div className="project-date-strip"><div><span>Cobro en el plan base</span><strong>{shortDate(m.baselineCashDate)}</strong></div><div><span>Cobro previsto actual</span><strong>{shortDate(m.cashDate)}</strong></div><div><span>Aprobación prevista</span><strong>{shortDate(m.forecastDate)}</strong></div></div></section></div>;
}

export function EdpForm({ project, milestone, onSave, onClose }: { project: Project; milestone: Milestone; onSave: (m: Milestone, reason: string) => Promise<void>; onClose: () => void }) {
  const [draft, setDraft] = useState(milestone);
  const reason = milestone.name ? "Estado de pago actualizado" : "Planificación de EDP según contrato";
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const edp = draft.edp!;
  const locked = ["Presentado", "Aprobado"].includes(milestone.edp!.status);
  const update = (patch: Partial<Milestone>) => setDraft(d => ({ ...d, ...patch }));
  const condition = (patch: Partial<EdpCondition>) => setDraft(d => ({ ...d, edp: { ...d.edp!, ...patch } }));
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    const next = !milestone.baselineApproved ? { ...draft, baselineDate: draft.forecastDate, baselineCashDate: draft.cashDate, baselineCashAmount: draft.cashAmount } : draft;
    try { await onSave(next, reason); onClose(); } catch (err) { setError(err instanceof Error ? err.message : "No se pudo guardar el EDP."); } finally { setBusy(false); }
  }
  return <Editor title={milestone.name ? "Gestionar estado de pago" : "Planificar estado de pago"} onClose={onClose}><form className="project-form" onSubmit={submit}>
    <label className="project-field project-full">Nombre del EDP<input required maxLength={200} value={draft.name} onChange={e => update({ name: e.target.value })} placeholder="Ej.: EDP 1 · fabricación de las primeras 10 casas" /></label>
    <label className="project-field project-full">Hito que habilita el EDP<select disabled={locked} value={edp.stageKey} onChange={e => { const key = e.target.value as StageKey; const metric = stages.find(s => s.key === key)!.metrics[0]; update({ type: "EDP", edp: { ...edp, stageKey: key, metric, threshold: metric.endsWith("Pct") ? 100 : 1 } }); }}>{activeStages(project.nature).filter(s => s.key !== "anticipo" && !(project.excludedStages || []).includes(s.key)).map(s => <option key={s.key} value={s.key}>{s.label}</option>)}</select></label>
    <label className="project-field">Medición requerida<select disabled={locked} value={edp.metric} onChange={e => condition({ metric: e.target.value as EdpCondition["metric"], threshold: e.target.value.endsWith("Pct") ? 100 : 1 })}>{stages.find(s => s.key === edp.stageKey)!.metrics.map(metric => <option key={metric} value={metric}>{metricLabels[metric]}</option>)}</select></label>
    <label className="project-field">Umbral acumulado<input type="number" required disabled={locked || edp.metric === "firma"} min="0.001" max={edp.metric.endsWith("Pct") ? 100 : edp.metric === "m2" ? project.areaM2 ?? undefined : edp.metric === "firma" ? 1 : project.units} step={edp.metric.endsWith("Pct") || edp.metric === "m2" ? "any" : "1"} value={edp.threshold} onChange={e => condition({ threshold: Number(e.target.value) })} /></label>
    <p className="project-note project-full">Cada monto es el cobro de este EDP, no un monto acumulado. Al alcanzar el umbral, el sistema lo marca «Preparado» sin emitir facturas ni registrar dinero recibido.</p>
    <label className="project-field">Fecha prevista de aprobación<input type="date" value={draft.forecastDate ?? ""} onChange={e => update({ forecastDate: e.target.value || null })} /></label>
    <label className="project-field">Monto previsto a cobrar ({project.currency})<input type="number" min="0" step="any" value={draft.cashAmount ?? ""} onChange={e => update({ cashAmount: e.target.value === "" ? null : Number(e.target.value) })} /></label>
    <label className="project-field">Fecha esperada de cobro<input type="date" value={draft.cashDate ?? ""} onChange={e => update({ cashDate: e.target.value || null })} /></label>
    <label className="project-field">Estado documental<select value={edp.status} onChange={e => condition({ status: e.target.value as EdpCondition["status"] })}>{!locked && <option value={edp.status === "Preparado" ? "Preparado" : "Previsto"}>Según avance: {milestone.edp!.status === "Preparado" ? "preparado" : "por habilitar"}</option>}{milestone.edp!.status !== "Aprobado" && <option>Presentado</option>}<option>Aprobado</option></select></label>
    {["Presentado", "Aprobado"].includes(edp.status) && <label className="project-field">Fecha de presentación<input type="date" required max={todayISO()} value={edp.presentedDate ?? ""} onChange={e => condition({ presentedDate: e.target.value || null })} /></label>}
    {edp.status === "Aprobado" && <><label className="project-field">Fecha de aprobación<input type="date" required max={todayISO()} min={edp.presentedDate || undefined} value={edp.approvedDate ?? ""} onChange={e => condition({ approvedDate: e.target.value || null })} /></label><label className="project-field project-full">Evidencia del EDP aprobado<input required value={edp.approvalEvidence} maxLength={2000} onChange={e => condition({ approvalEvidence: e.target.value })} placeholder="Enlace o referencia al archivo de la carpeta de aprobados" /></label></>}
    {!milestone.baselineApproved ? <label className="project-check project-full"><input type="checkbox" checked={draft.baselineApproved} onChange={e => update({ baselineApproved: e.target.checked })} />Confirmar fechas y monto como plan base</label> : <p className="project-note project-full">Plan base conservado: {shortDate(milestone.baselineDate)} · cobro {shortDate(milestone.baselineCashDate)} · {amount(milestone.baselineCashAmount, project.currency)}.</p>}
    <label className="project-check project-full"><input type="checkbox" checked={draft.invoicingComplete === true} onChange={e => update({ invoicingComplete: e.target.checked })} />Las facturas vinculadas cubren todo este EDP</label>
    <label className="project-field project-full">Condición contractual / fuente<input value={draft.source} onChange={e => update({ source: e.target.value })} /></label>
    <label className="project-field project-full">Observaciones<textarea rows={2} value={draft.notes} onChange={e => update({ notes: e.target.value })} /></label>
    <SaveFooter {...{ busy, error, onClose }} />
  </form></Editor>;
}
