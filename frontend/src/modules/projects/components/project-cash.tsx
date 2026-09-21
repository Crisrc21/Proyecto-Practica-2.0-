import { useMemo, useState } from "react";
import { Link2, Unlink } from "lucide-react";
import type { FacturaCalculada } from "../../accounts-receivable/types";
import type { DataState, Project } from "../types";
import { amount, monthlyCash } from "../data/project-calculations";
import { AppLink } from "../../../shared/components/app-link";

const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
function millions(n: number | null) { return n === null ? "—" : new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 }).format(n / 1e6); }
export function ProjectCash({ projects, allProjects, invoices, dataState, cutoff, year, onSave }: { projects: Project[]; allProjects: Project[]; invoices: FacturaCalculada[]; dataState: DataState; cutoff: string; year: number; onSave: (p: Project, reason: string) => Promise<void> }) {
  const [version, setVersion] = useState<"base" | "current">("base");
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [invoiceId, setInvoiceId] = useState(""); const [milestoneId, setMilestoneId] = useState("");
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const reports = useMemo(() => projects.map(p => ({ project: p, ...monthlyCash(p, invoices, dataState, year, cutoff, version) })), [projects, invoices, dataState, year, cutoff, version]);
  const project = projects.length === 1 ? projects[0] : null;
  const assigned = new Set(allProjects.flatMap(p => p.invoiceLinks.map(l => l.invoiceId)));
  const rut = (value: string) => value.replace(/[^\dkK]/g, "").toUpperCase();
  const candidates = project ? invoices.filter(i => !assigned.has(i.id) && !i.anulada && (!project.customerRut || rut(i.cliente?.rut || i.clienteId) === rut(project.customerRut))) : [];
  const unassignedTotal = invoices.filter(i => !assigned.has(i.id)).reduce((sum, i) => sum + i.pagos.filter(p => p.fechaPago.startsWith(String(year)) && p.fechaPago <= cutoff).reduce((s, p) => s + p.monto, 0), 0);
  async function associate() {
    if (!project || !invoiceId || !milestoneId) return;
    if (!project.milestones.some(m => m.id === milestoneId)) { setError("Selecciona un hito del contrato actual."); return; }
    setBusy(true); setError("");
    try { await onSave({ ...project, invoiceLinks: [...project.invoiceLinks, { invoiceId, milestoneId }] }, "Factura vinculada a su proyecto e hito"); setInvoiceId(""); setMilestoneId(""); }
    catch (err) { setError(err instanceof Error ? err.message : "No se pudo vincular."); }
    finally { setBusy(false); }
  }
  async function removeLink(id: string) {
    if (!project) return; setBusy(true); setError("");
    try { await onSave({ ...project, invoiceLinks: project.invoiceLinks.filter(l => l.invoiceId !== id) }, "Asociación de factura corregida"); }
    catch (err) { setError(err instanceof Error ? err.message : "No se pudo desvincular."); }
    finally { setBusy(false); }
  }
  return <div className="project-stack">
    <section className="project-panel">
      <div className="project-panel-heading"><div><h2>Real vs. proyectado</h2><p>Millones de pesos · cobros por fecha de pago o abono</p></div><label className="project-field compact">Comparar con<select value={version} onChange={e => setVersion(e.target.value as "base" | "current")}><option value="base">Plan base confirmado</option><option value="current">Proyección vigente</option></select></label></div>
      <div className="project-table-scroll"><table className="project-cash-table"><thead><tr><th rowSpan={2}>Proyecto</th>{months.map((m, i) => <th key={m} colSpan={3}><button className="project-month-button" onClick={() => setSelectedMonth(i)} aria-label={`Ver detalle de ${m} ${year}`}>{m} {year}</button></th>)}</tr><tr>{months.map(m => <ReactColumns key={m} />)}</tr></thead><tbody>
        {reports.map(r => <tr key={r.project.id}><th>{r.project.name}</th>{r.data.map(m => <CashCells key={m.month} planned={m.planned} actual={m.actual} variance={m.variance} partial={!m.complete} />)}</tr>)}
        {reports.length > 1 && <tr className="project-total"><th>Total comparable</th>{months.map((_, i) => {
          const values = reports.map(r => r.data[i]);
          const planned = values.every(v => v.planned !== null && v.complete) ? values.reduce((s, v) => s + v.planned!, 0) : null;
          const actual = values.every(v => v.actual !== null) ? values.reduce((s, v) => s + v.actual!, 0) : null;
          const variance = values.every(v => v.variance !== null) ? values.reduce((s, v) => s + v.variance!, 0) : null;
          return <CashCells key={i} planned={planned} actual={actual} variance={variance} partial={false} />;
        })}</tr>}
      </tbody></table></div>
      <p className="project-footnote">Δ = real − proyectado, solo en meses cerrados con planificación completa. «—» indica datos faltantes o un mes futuro. * Proyección parcial. En la proyección vigente se conserva el remanente no facturado y se descuenta lo cobrado. Cuando CDG confirma la facturación completa del hito, se utiliza el saldo de sus facturas.</p>
      {reports.map(r => <div className="project-data-note" key={r.project.id}><strong>{r.project.name}:</strong> {r.source.reason}.{!r.hasPlan && " Sin cobros programados en esta versión."}{r.unplanned > 0 && ` ${r.unplanned} hitos sin monto o fecha de cobro.`}{r.missingUf && " Falta definir el supuesto UF para expresar la proyección en pesos."}</div>)}
      {dataState === "ready" && <div className="project-data-note">Cobros de {year} aún sin asignar a proyectos: <strong>{amount(unassignedTotal)}</strong>. Se mantienen visibles en CxC.</div>}
      {selectedMonth !== null && <div className="project-cash-detail" aria-live="polite"><h3>Detalle de {months[selectedMonth]} {year}</h3>{projects.map(p => {
        const prefix = `${year}-${String(selectedMonth + 1).padStart(2, "0")}`;
        const milestones = p.milestones.filter(m => (version === "base" ? m.baselineApproved && m.baselineCashDate : m.cashDate)?.toString().startsWith(prefix));
        const links = p.invoiceLinks.map(l => invoices.find(i => i.id === l.invoiceId)).filter((i): i is FacturaCalculada => Boolean(i));
        const payments = links.flatMap(i => i.pagos.filter(pay => pay.fechaPago.startsWith(prefix) && pay.fechaPago <= cutoff).map(pay => ({ invoice: i, pay })));
        return <div key={p.id}><h4>{p.name}</h4>{milestones.map(m => <p key={m.id}>Proyección · {m.name} · {amount(version === "base" ? m.baselineCashAmount : m.cashAmount, p.currency)}</p>)}{payments.map(({ invoice, pay }, i) => <p key={`${invoice.id}-${i}`}><AppLink href={`/trazabilidad?factura=${encodeURIComponent(invoice.id)}`}>Factura {invoice.numero}</AppLink> · {pay.fechaPago} · {amount(pay.monto)}</p>)}{!milestones.length && !payments.length && <p>No hay movimientos vinculados ni hitos programados para este mes.</p>}</div>;
      })}</div>}
    </section>
    {project && <section className="project-panel"><div className="project-panel-heading"><div><h2>Vincular facturas con hitos</h2><p>Una factura se asigna completa a un proyecto e hito. Sus pagos se consultan desde CxC.</p></div><Link2 size={20} aria-hidden="true" /></div>
      <div className="project-link-form"><label className="project-field">Factura del cliente<select value={invoiceId} onChange={e => setInvoiceId(e.target.value)} disabled={dataState !== "ready"}><option value="">Selecciona una factura</option>{candidates.map(i => <option key={i.id} value={i.id}>{i.numero} · {i.cliente?.nombre} · {amount(i.monto)}</option>)}</select></label><label className="project-field">Hito asociado<select value={milestoneId} onChange={e => setMilestoneId(e.target.value)}><option value="">Selecciona un hito</option>{project.milestones.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label><button type="button" className="project-button primary" disabled={busy || !invoiceId || !milestoneId} onClick={associate}>Vincular factura</button></div>
      {!project.milestones.length && <p className="project-footnote">Este contrato aún no tiene hitos. Completa su naturaleza en la ficha o agrega un hito desde Líneas de tiempo.</p>}
      {error && <p className="project-error" role="alert">{error}</p>}
      {!candidates.length && <p className="project-footnote">{dataState !== "ready" ? "Las facturas se podrán vincular cuando la fuente de CxC esté disponible." : "No hay facturas pendientes de vincular para el RUT indicado en la ficha."}</p>}
      {project.invoiceLinks.map(l => { const i = invoices.find(inv => inv.id === l.invoiceId); return <div className="project-invoice-row" key={l.invoiceId}><div>{i ? <AppLink href={`/trazabilidad?factura=${encodeURIComponent(i.id)}`}>Factura {i.numero}</AppLink> : "Factura vinculada no disponible"}<small>{project.milestones.find(m => m.id === l.milestoneId)?.name}</small></div><span>{i ? amount(i.monto) : "Sin dato"}</span><button type="button" className="project-button" disabled={busy} aria-label={`Desvincular factura ${i?.numero || l.invoiceId}`} onClick={() => removeLink(l.invoiceId)}><Unlink size={14} />Desvincular</button></div>; })}
    </section>}
  </div>;
}
function ReactColumns() { return <><th className="project-number">Proy.</th><th className="project-number">Real</th><th className="project-number">Δ</th></>; }
function CashCells({ planned, actual, variance, partial }: { planned: number | null; actual: number | null; variance: number | null; partial: boolean }) {
  return <><td className="project-number">{millions(planned)}{partial && planned !== null ? "*" : ""}</td><td className="project-number project-real">{millions(actual)}</td><td className={`project-number ${variance !== null && variance < 0 ? "project-negative" : ""}`}>{millions(variance)}</td></>;
}
