import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, BookOpen, Building2, CalendarDays, CalendarRange, CheckCircle2, CircleAlert, ClipboardList, ExternalLink, History, Plus, RefreshCw, Wallet } from "lucide-react";
import { navigateTo } from "@/app/navigation";
import type { FacturaCalculada } from "@/modules/accounts-receivable/types";
import type { DataState, Milestone, Project } from "../types";
import { loadProjects, saveProject } from "../data/projects-api";
import { amount, compliance, emptyMilestone, emptyProject, milestoneStatus, received, shortDate, todayISO } from "../data/project-calculations";
import { MilestoneForm, PotentialForm, ProjectForm } from "./project-forms";
import { MilestoneBadge, ProjectTimeline } from "./project-timeline";
import { ProjectCash } from "./project-cash";
import { EdpForm, PotentialContracts, ProjectEdps, ProjectWorkflow } from "./project-workflow";
import { ProjectManual } from "./project-manual";
import { natures, physicalPercent, workflowAtCutoff } from "../data/project-workflow";

type View = "resumen" | "lineas" | "cobros" | "historial" | "potenciales" | "avances" | "edps" | "manual";
export function ProjectsView({ search, invoices, dataState, onRefreshAccounts }: { search: string; invoices: FacturaCalculada[]; dataState: DataState; onRefreshAccounts: () => Promise<void> }) {
  const [projects, setProjects] = useState<Project[]>([]); const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(""); const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState(""); const [cutoff, setCutoff] = useState(todayISO());
  const [year, setYear] = useState(Number(todayISO().slice(0,4)));
  const [projectEditor, setProjectEditor] = useState<Project | null>(null);
  const [milestoneEditor, setMilestoneEditor] = useState<Milestone | null>(null);
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const selectedId = params.get("proyecto");
  const selected = projects.find(p => p.id === selectedId);
  const view: View = selected?.lifecycle === "Potencial" ? "potenciales" : ["manual", "lineas", "cobros", ...(selected ? ["historial", "avances", "edps"] : ["potenciales"])].includes(params.get("vista") || "") ? params.get("vista") as View : "resumen";
  const matches = projects.filter(p => `${p.name} ${p.customer} ${p.location}`.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")));
  const filtered = matches.filter(p => p.lifecycle !== "Potencial");
  const potentials = matches.filter(p => p.lifecycle === "Potencial");
  const scope = selected ? [selected] : filtered;
  const displayed = scope.map(p => workflowAtCutoff(p, invoices, dataState, cutoff));
  const displaySelected = selected ? displayed[0] : undefined;
  function changeView(next: View, projectId = selectedId) {
    const q = new URLSearchParams(); if (projectId) q.set("proyecto", projectId); if (next !== "resumen") q.set("vista", next);
    navigateTo(`/proyectos${q.size ? `?${q}` : ""}`, { scroll: false });
    setMessage(""); setActionError("");
  }
  async function reload() {
    setLoading(true); setLoadError("");
    try { const [data] = await Promise.all([loadProjects(), onRefreshAccounts()]); setProjects(data.projects); }
    catch (e) { setLoadError(e instanceof Error ? e.message : "No se pudieron cargar los proyectos."); }
    finally { setLoading(false); }
  }
  useEffect(() => { let active = true; loadProjects().then(data => { if(active) setProjects(data.projects); }).catch(e => { if(active) setLoadError(e.message); }).finally(() => { if(active) setLoading(false); }); return () => { active = false; }; }, []);
  async function persist(project: Project, reason: string) {
    const saved = await saveProject(project, reason);
    setProjects(current => current.some(p => p.id === saved.id) ? current.map(p => p.id === saved.id ? saved : p) : [...current, saved]);
    if (!project.revision) {
      setQuery("");
      changeView(saved.lifecycle === "Potencial" ? "potenciales" : "resumen", saved.lifecycle === "Potencial" ? null : saved.id);
    }
    setMessage(!project.revision && saved.lifecycle === "Potencial"
      ? `Contrato «${saved.name}» agregado. Pulsa «Contrato firmado» para incorporarlo a la cartera y gestionar sus hitos, estados de pago y cobros.`
      : "Cambios guardados. El historial se actualizó automáticamente.");
  }
  async function signContract(project: Project) {
    setBusy(true); setActionError("");
    try {
      await persist({ ...project, lifecycle: "Firmado", signedDate: project.signedDate || todayISO() }, "Contrato firmado confirmado por CDG; ingreso a la cartera de proyectos");
      changeView(project.nature ? "avances" : "resumen", project.id);
      setMessage(project.nature ? "Contrato incorporado. Sus hitos están listos para programar avances y estados de pago." : "Contrato incorporado. Selecciona su naturaleza en «Editar ficha» para habilitar las etapas.");
    } catch (e) { setActionError(e instanceof Error ? e.message : "No se pudo registrar la firma."); }
    finally { setBusy(false); }
  }
  async function resolveIssue(project: Project, issueId: string, resolved: boolean) {
    setBusy(true); setActionError("");
    try { await persist({ ...project, issues: project.issues.map(i => i.id === issueId ? { ...i, resolved } : i) }, resolved ? "CDG marcó el pendiente como revisado" : "CDG reabrió el pendiente"); }
    catch (e) { setActionError(e instanceof Error ? e.message : "No se pudo guardar."); } finally { setBusy(false); }
  }
  async function generateMonthly() {
    if (!selected?.startDate || !selected.endDate) { setActionError("Completa el inicio y término de referencia en la ficha para proponer los cortes mensuales."); return; }
    const first = new Date(`${selected.startDate}T00:00:00Z`);
    const last = new Date(`${selected.endDate}T00:00:00Z`);
    const proposals: Milestone[] = [];
    for (let y=first.getUTCFullYear(), month=first.getUTCMonth(); y < last.getUTCFullYear() || (y === last.getUTCFullYear() && month <= last.getUTCMonth()); month++) {
      if (month === 12) { month = 0; y++; }
      if (y > last.getUTCFullYear() || (y === last.getUTCFullYear() && month > last.getUTCMonth())) break;
      const monthId = `${y}-${String(month+1).padStart(2,"0")}`;
      const id = `edp-${selected.id}-${monthId}`;
      const date = new Date(Date.UTC(y, month+1, 0)).toISOString().slice(0,10);
      if (date <= selected.startDate || selected.milestones.some(m => m.id === id)) continue;
      const label = new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y,month,1)));
      proposals.push({ ...emptyMilestone(), id, name: `Corte EDP · ${label}`, startDate: `${monthId}-01` < selected.startDate ? selected.startDate : `${monthId}-01`, forecastDate: date > selected.endDate ? selected.endDate : date, baselineDate: date > selected.endDate ? selected.endDate : date, source: "Propuesta mensual de CDG según período del proyecto", notes: "Corte de avance propuesto. Completar presentación, aprobación y evento de pago según contrato. Monto y fecha de cobro por definir." });
      if (proposals.length + selected.milestones.length > 500) { setActionError("El período supera el máximo de 500 hitos. Acota la planificación."); return; }
    }
    if (!proposals.length) { setMessage("Los cortes mensuales del período ya están propuestos."); return; }
    setBusy(true); setActionError("");
    try { await persist({ ...selected, milestones: [...selected.milestones, ...proposals] }, "Propuesta de cortes mensuales; fechas pendientes de confirmar por CDG"); }
    catch (e) { setActionError(e instanceof Error ? e.message : "No se pudo guardar."); } finally { setBusy(false); }
  }
  const stats = displayed.map(p => compliance(p, cutoff));
  const due = stats.reduce((s,c) => s+c.due, 0); const onTime = stats.reduce((s,c) => s+c.onTime, 0);
  const missing = stats.reduce((s,c) => s+c.missing, 0);
  const proposed = stats.reduce((s,c) => s+c.proposed, 0);
  const datedYears = [year, Number(todayISO().slice(0,4)), ...scope.flatMap(p => [p.startDate, p.endDate, ...p.milestones.flatMap(m => [m.baselineDate, m.forecastDate, m.actualDate, m.cashDate, m.baselineCashDate])].filter((d): d is string => Boolean(d)).map(d => Number(d.slice(0,4))))];
  const firstYear = Math.min(...datedYears), lastYear = Math.max(...datedYears);
  const yearOptions = Array.from({length:lastYear-firstYear+1},(_,index)=>firstYear+index);
  if (loading) return <div className="projects-module"><div className="project-empty"><RefreshCw size={24} className="animate-spin" /><h1>Cargando proyectos</h1><p>Consultando contratos y planificación guardada.</p></div></div>;
  if (loadError) return <div className="projects-module"><div className="project-empty" role="alert"><CircleAlert size={28} /><h1>No se pudieron cargar los proyectos</h1><p>{loadError}</p><button className="project-button" onClick={reload}>Reintentar</button></div></div>;
  if (selectedId && !selected) return <div className="projects-module"><div className="project-empty"><h1>Proyecto no encontrado</h1><button className="project-button" onClick={() => changeView("resumen", null)}>Volver a proyectos</button></div></div>;
  return <div className="projects-module">
    {selected && <button className="project-back" onClick={() => changeView("resumen", null)}><ArrowLeft size={15} />Todos los proyectos</button>}
    <header className="project-page-heading"><div><span className="project-eyebrow">CONTROL DE GESTIÓN</span><h1>{selected ? selected.name : "Gestión de proyectos"}</h1><p>{selected ? `${selected.customer || "Cliente por definir"} · ${selected.location || "Ubicación por definir"}` : "Desde el compromiso contractual hasta el dinero efectivamente cobrado."}</p></div><div className="project-actions"><button className="project-button" onClick={reload} aria-label="Actualizar proyectos"><RefreshCw size={15} />Actualizar</button>{(selected || (view !== "potenciales" && view !== "manual")) && <button className="project-button primary" onClick={() => setProjectEditor(selected || emptyProject())}>{selected ? <ClipboardList size={16} /> : <Plus size={16} />}{selected ? "Editar ficha" : "Agregar potencial"}</button>}</div></header>
    <div className="project-toolbar"><div className="project-view-tabs" role="group" aria-label="Vistas de proyectos">{([
      ...(!selected ? [["potenciales", `0 · Potenciales (${projects.filter(p => p.lifecycle === "Potencial").length})`, ClipboardList]] : []), ["resumen", selected ? "1 · Vista general" : "Contratos firmados", Building2], ...(selected ? [["avances", "2 · Hitos y avances", CheckCircle2], ["edps", "3 · Estados de pago", ClipboardList]] : []), ["lineas", "Líneas de tiempo", CalendarRange], ["cobros", "Cobros", Wallet], ["manual", "Manual", BookOpen], ...(selected ? [["historial", "Historial", History]] : [])
    ] as const).map(([id,label,Icon]) => <button key={id as string} className={view === id ? "is-active" : ""} onClick={() => changeView(id as View, id === "manual" ? null : selectedId)} aria-pressed={view === id}><Icon size={16} />{label as string}</button>)}</div>{view !== "manual" && <div className="project-cutoff-controls"><label className="project-field compact">Corte de cumplimiento<input type="date" max={todayISO()} value={cutoff} onChange={e => { if (e.target.value) setCutoff(e.target.value); }} /></label>{(view === "lineas" || view === "cobros") && <label className="project-field compact">Año visible<select value={year} onChange={e => setYear(Number(e.target.value))}>{yearOptions.map(y => <option key={y}>{y}</option>)}</select></label>}</div>}</div>
    {message && <div role="status" className="project-feedback"><CheckCircle2 size={17} />{message}</div>}
    {actionError && <p role="alert" className="project-error">{actionError}</p>}
    {!["historial", "potenciales", "avances", "edps"].includes(view) && <div className="project-stats">
      <Stat label={selected ? "Viviendas contratadas" : "Proyectos en cartera"} value={String(selected ? selected.units : scope.length)} context={selected ? selected.contractType : `${scope.reduce((s,p)=>s+p.units,0)} viviendas en total`} icon={Building2} />
      <Stat label="Cumplimiento a tiempo" value={due ? `${Math.round(onTime/due*100)}%` : "—"} context={`${onTime} de ${due} hitos confirmados exigibles al corte`} icon={CheckCircle2} />
      <Stat label="Hitos sin evidencia" value={String(missing)} context="Fecha base cumplida; sin acreditación al corte" icon={CircleAlert} attention={missing > 0} />
      <Stat label="Hitos propuestos" value={String(proposed)} context="Pendientes de confirmar por CDG" icon={CalendarDays} />
    </div>}
    {!selected && view !== "manual" && <div className="project-search-row"><input type="search" aria-label="Buscar proyecto" placeholder="Buscar por proyecto, cliente o ubicación" value={query} onChange={e => setQuery(e.target.value)} /><span>{view === "potenciales" ? potentials.length : filtered.length} proyectos</span></div>}
    {view === "manual" && <ProjectManual />}
    {view === "potenciales" && <PotentialContracts projects={selected ? [selected] : potentials} busy={busy} onEdit={setProjectEditor} onSign={signContract} onAdd={() => setProjectEditor(emptyProject())} />}
    {view === "avances" && selected && <ProjectWorkflow key={selected.id} project={selected} invoices={invoices} dataState={dataState} cutoff={cutoff} onSave={persist} onEditStage={setMilestoneEditor} onEditProject={() => setProjectEditor(selected)} onEdps={() => changeView("edps")} onCash={() => changeView("cobros")} />}
    {view === "edps" && selected && <ProjectEdps key={selected.id} project={selected} cutoff={cutoff} invoices={invoices} dataState={dataState} onEdit={setMilestoneEditor} onCash={() => changeView("cobros")} />}
    {view === "resumen" && !selected && <div className="project-cards">{filtered.map(p => {
      const c = compliance(workflowAtCutoff(p,invoices,dataState,cutoff), cutoff); const next = p.milestones.filter(m => m.forecastDate && m.forecastDate >= cutoff && (!m.actualDate || m.actualDate > cutoff)).sort((a,b) => a.forecastDate!.localeCompare(b.forecastDate!))[0];
      return <article className="project-summary-card" key={p.id}><div className="project-card-head"><span className="project-card-icon"><Building2 size={24} /></span><span className={`project-badge ${c.missing ? "danger" : p.issues.some(i=>!i.resolved) ? "warning" : "neutral"}`}>{c.missing ? `${c.missing} sin evidencia` : p.issues.some(i=>!i.resolved) ? "Datos por validar" : "En seguimiento"}</span></div><h2><button onClick={() => changeView("resumen", p.id)}>{p.name}<ArrowUpRight size={20} /></button></h2><p>{p.customer || "Ficha contractual por completar"}</p><p className="project-card-nature">{p.nature ? `Naturaleza ${p.nature} · avance total ${physicalPercent(p,"total",cutoff) ?? "—"}%` : "Naturaleza por seleccionar"}</p><div className="project-card-facts"><div><span>Viviendas</span><strong>{p.units}</strong></div><div><span>Contrato, IVA incluido</span><strong>{amount(p.contractAmount,p.currency)}</strong></div></div><div className="project-card-deadline"><span>Término contractual</span><strong>{shortDate(p.endDate)}</strong></div><div className="project-compliance-track" role="progressbar" aria-label={`Cumplimiento a tiempo de hitos exigibles de ${p.name}`} aria-valuenow={c.percent ?? 0} aria-valuetext={c.percent === null ? "Sin hitos exigibles" : `${c.onTime} de ${c.due} hitos exigibles a tiempo`} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${c.percent ?? 0}%`}} /></div><div className="project-card-progress"><span>{c.onTime}/{c.due} exigibles a tiempo</span><span>{c.proposed} propuestos</span></div><div className="project-card-next"><CalendarDays size={17} /><div><span>Próximo hito previsto</span><strong>{next?.name || "Sin próximos hitos"}</strong><small>{shortDate(next?.forecastDate || null)}</small></div></div><button className="project-button project-card-action" onClick={() => changeView("lineas",p.id)}>Abrir línea de tiempo<ArrowUpRight size={15} /></button></article>;
    })}{!filtered.length && <div className="project-empty"><Building2 size={28} /><h2>{query ? "No hay proyectos para esta búsqueda" : "Comienza con el primer proyecto"}</h2><p>{query ? "Prueba con otro nombre o cliente." : "Registra el contrato y propone sus hitos de seguimiento."}</p></div>}</div>}
    {view === "resumen" && selected && <div className="project-detail-layout"><div className="project-stack">
      <section className="project-panel"><div className="project-panel-heading"><div><span className="project-eyebrow">PASO 1 · CONTRATO CELEBRADO</span><h2>Ficha contractual</h2><p>Datos generales y condiciones que afectan el calendario de ingresos.</p></div><ClipboardList size={20} /></div><dl className="project-definition-grid"><Field label="Naturaleza" value={selected.nature ? `${selected.nature} · ${natures.find(n => n.id === selected.nature)?.label}` : "Por seleccionar en la ficha"} /><Field label="Superficie contratada" value={selected.areaM2 != null ? `${selected.areaM2.toLocaleString("es-CL")} m²` : "Por definir"} /><Field label="Avance total informado" value={physicalPercent(selected,"total",cutoff) !== null ? `${physicalPercent(selected,"total",cutoff)}%` : "Sin corte de avance"} /><Field label="Tipo de contrato" value={selected.contractType} /><Field label="Monto, IVA incluido" value={amount(selected.contractAmount,selected.currency)} /><Field label="Firma" value={shortDate(selected.signedDate)} /><Field label="Inicio de referencia" value={shortDate(selected.startDate)} /><Field label="Término contractual" value={shortDate(selected.endDate)} /><Field label="Responsable CDG" value={selected.owner || "Por asignar"} /><Field label="Cobrado al corte" value={amount(received(selected,invoices,dataState,cutoff))} /><Field label="UF para proyección" value={selected.ufValue ? amount(selected.ufValue) : "Por definir"} /></dl><div className="project-scope-tags">{selected.scopes.map(s => <span key={s}>{s}</span>)}</div><div className="project-contract-terms"><h3>Condiciones de pago</h3><p>{selected.paymentTerms || "Por completar desde el contrato."}</p></div>{selected.notes && <div className="project-contract-terms"><h3>Observaciones</h3><p>{selected.notes}</p></div>}</section>
      <section className="project-panel"><div className="project-panel-heading"><div><h2>Próximos hitos y compromisos</h2><p>Fechas previstas desde el corte seleccionado.</p></div><button className="project-button" onClick={() => changeView("lineas")}>Ver todos</button></div>{selected.milestones.filter(m => m.forecastDate && m.forecastDate >= cutoff && (!m.actualDate || m.actualDate > cutoff)).sort((a,b)=>a.forecastDate!.localeCompare(b.forecastDate!)).slice(0,5).map(m => <button className="project-upcoming" key={m.id} onClick={() => setMilestoneEditor(m)}><span className="project-upcoming-date">{shortDate(m.forecastDate)}</span><span><strong>{m.name}</strong><small>{m.scope}</small></span><MilestoneBadge milestone={m} cutoff={cutoff} /></button>)}{!selected.milestones.some(m => m.forecastDate && m.forecastDate >= cutoff && (!m.actualDate || m.actualDate > cutoff)) && <p className="project-empty">No hay próximos hitos programados.</p>}</section>
    </div><aside className="project-stack"><section className="project-panel"><div className="project-panel-heading"><div><h2>Revisión de CDG</h2><p>{selected.issues.filter(i=>!i.resolved).length} pendientes de conciliación</p></div><CircleAlert size={20} /></div>{selected.issues.map(i => <label className={`project-issue ${i.resolved ? "resolved" : ""}`} key={i.id}><input type="checkbox" checked={i.resolved} disabled={busy} onChange={e => resolveIssue(selected,i.id,e.target.checked)} /><span>{i.text}</span></label>)}{!selected.issues.length && <p className="project-footnote">Sin pendientes documentales registrados.</p>}</section><section className="project-panel"><div className="project-panel-heading"><div><h2>Documentos y aprobados</h2><p>Referencias utilizadas en la ficha.</p></div></div>{selected.sources.map((s,i)=><div className="project-source" key={i}><strong>{s.name}</strong><small>{s.reference}</small></div>)}{selected.approvedFolder && /^https:\/\//i.test(selected.approvedFolder) && <a className="project-button" href={selected.approvedFolder} target="_blank" rel="noreferrer"><ExternalLink size={14} />Abrir carpeta de aprobados</a>}<p className="project-integration-note">Microsoft 365 pendiente de conexión. En esta versión CDG registra la evidencia; aún no se detectan archivos ni se envían correos automáticamente.</p></section></aside></div>}
    {view === "lineas" && <><div className="project-line-actions"><span>{selected ? `${selected.milestones.length} hitos registrados` : "Plazos contractuales y hitos en una misma escala"}</span>{selected && <div className="project-actions"><button className="project-button" disabled={busy} onClick={generateMonthly}>Proponer EDP mensuales</button><button className="project-button primary" onClick={() => setMilestoneEditor(emptyMilestone())}><Plus size={16} />Agregar hito</button></div>}</div><ProjectTimeline projects={displayed} selected={displaySelected} year={year} cutoff={cutoff} onOpen={p => changeView("lineas",p.id)} onEdit={m => setMilestoneEditor(selected?.milestones.find(item => item.id === m.id) || m)} />{selected && <div className="project-panel project-timeline-summary"><h2>Lectura del cumplimiento</h2><p>{compliance(displaySelected!,cutoff).completed} hitos confirmados acreditados al corte. {displaySelected!.milestones.filter(m=>milestoneStatus(m,cutoff)==="Cumplido con atraso").length} cumplidos fuera de la fecha base. El porcentaje compara hitos confirmados exigibles, no el avance físico de viviendas.</p></div>}</>}
    {view === "cobros" && <ProjectCash key={selected?.id || "all"} projects={scope} allProjects={projects} invoices={invoices} dataState={dataState} cutoff={cutoff} year={year} onSave={persist} />}
    {view === "historial" && selected && <section className="project-panel"><div className="project-panel-heading"><div><h2>Historial de cambios</h2><p>Registro de planificación, fechas efectivas y asociaciones de facturas.</p></div><History size={20} /></div>{[...selected.history].reverse().map(h=><article className="project-history" key={h.id}><time>{new Intl.DateTimeFormat("es-CL",{dateStyle:"medium",timeStyle:"short"}).format(new Date(h.at))}</time><div><h3>{h.reason}</h3><ul>{h.changes.map((c,i)=><li key={i}>{c}</li>)}</ul></div></article>)}</section>}
    {view !== "manual" && <p className="project-page-footnote">Corte: {shortDate(cutoff)}. El corte filtra cumplimiento y pagos; las fechas previstas muestran la última planificación guardada.</p>}
    {projectEditor?.lifecycle === "Potencial" && <PotentialForm project={projectEditor} onClose={()=>setProjectEditor(null)} onSave={persist} />}
    {projectEditor && projectEditor.lifecycle !== "Potencial" && <ProjectForm project={projectEditor} onClose={()=>setProjectEditor(null)} onSave={persist} />}
    {milestoneEditor?.edp && selected && <EdpForm project={selected} milestone={milestoneEditor} onClose={()=>setMilestoneEditor(null)} onSave={(m,reason)=>persist({ ...selected, milestones: selected.milestones.some(item=>item.id===m.id) ? selected.milestones.map(item=>item.id===m.id?m:item) : [...selected.milestones,m] },reason)} />}
    {milestoneEditor && selected && !milestoneEditor.edp && <MilestoneForm milestone={milestoneEditor} currency={selected.currency} onClose={()=>setMilestoneEditor(null)} onSave={(m,reason)=>persist({ ...selected, milestones: selected.milestones.some(item=>item.id===m.id) ? selected.milestones.map(item=>item.id===m.id?m:item) : [...selected.milestones,m] },reason)} />}
  </div>;
}
function Stat({ label, value, context, icon: Icon, attention }: { label: string; value: string; context: string; icon: typeof Building2; attention?: boolean }) { return <div className={`project-stat ${attention ? "attention" : ""}`}><div><span>{label}</span><Icon size={18} /></div><strong>{value}</strong><small>{context}</small></div>; }
function Field({ label, value }: { label: string; value: string }) { return <div><dt>{label}</dt><dd>{value}</dd></div>; }
