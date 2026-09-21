import { ArrowRight, BookOpen, CheckCircle2, ClipboardCheck, FileText, Link2, Users, WalletCards } from "lucide-react";

const steps = [
  { number: "0", title: "Potencial", text: "Registra solo el nombre del contrato y activa Contrato firmado cuando corresponda." },
  { number: "1", title: "Ficha contractual", text: "Completa naturaleza, viviendas, fechas, monto y condiciones de pago." },
  { number: "2", title: "Hitos y avances", text: "Programa fechas y registra cortes acumulados con evidencia." },
  { number: "3", title: "Estados de pago", text: "Relaciona cada EDP con el hito, su condición, aprobación y cobro." },
  { number: "4", title: "CxC y control", text: "Vincula facturas y compara dinero cobrado contra lo proyectado." }
];

const views = [
  ["Vista general", "Ficha del contrato, próximos compromisos, alertas y documentos."],
  ["Hitos y avances", "Recorrido por etapas, mediciones físicas, historia y gráfico de avance."],
  ["Estados de pago", "Planificación, condición habilitante, aprobación y pagos de cada EDP."],
  ["Líneas de tiempo", "Comparación de fechas base, programación vigente y cumplimiento."],
  ["Cobros", "Matriz mensual de real cobrado, proyección, facturas y saldos pendientes."],
  ["Historial", "Cambios de planificación y asociaciones registradas automáticamente."]
];

export function ProjectManual() {
  return <div className="project-manual">
    <section className="project-panel project-manual-hero">
      <div className="project-manual-title"><span className="project-eyebrow">GUÍA DEL SISTEMA</span><h2>Manual de Gestión de Proyectos</h2><p>Consulta cómo usar cada vista y cómo se conectan los hitos contractuales con los estados de pago, CxC y el dinero efectivamente cobrado.</p></div>
      <div className="project-manual-hero-icon"><BookOpen size={30} /></div>
    </section>

    <section className="project-panel project-manual-flow">
      <div className="project-panel-heading"><div><h2>Recorrido completo</h2><p>El avance de una etapa habilita el siguiente control.</p></div><Link2 size={20} /></div>
      <ol className="project-manual-steps">{steps.map((step, index) => <li key={step.number} className="project-manual-step"><span>{step.number}</span><div><strong>{step.title}</strong><p>{step.text}</p></div>{index < steps.length - 1 && <ArrowRight className="project-manual-arrow" size={17} aria-hidden="true" />}</li>)}</ol>
    </section>

    <div className="project-manual-grid">
      <section className="project-panel project-manual-section"><div className="project-panel-heading"><div><h2>Cómo usarlo</h2><p>Rutina recomendada para CDG.</p></div><ClipboardCheck size={20} /></div><ol className="project-manual-list"><li><strong>Agregar potencial:</strong> escribe el nombre del contrato. Mientras siga pendiente, no afecta la cartera ni las proyecciones.</li><li><strong>Confirmar la firma:</strong> pulsa Contrato firmado y completa la ficha. La naturaleza activa las etapas aplicables.</li><li><strong>Programar:</strong> define fechas base, previsiones y condiciones de pago según el contrato.</li><li><strong>Registrar cortes:</strong> informa mediciones acumuladas y evidencia en Fabricación, Despacho, Fundaciones, Montaje o urbanizaciones.</li><li><strong>Gestionar el EDP:</strong> revisa el umbral alcanzado, registra presentación y aprobación, y guarda la referencia documental.</li><li><strong>Conciliar el cobro:</strong> vincula la factura desde Cobros. El real mensual es dinero efectivamente cobrado.</li></ol></section>

      <section className="project-panel project-manual-section"><div className="project-panel-heading"><div><h2>Qué muestra cada vista</h2><p>Usa las pestañas superiores para cambiar de contexto.</p></div><FileText size={20} /></div><div className="project-manual-view-list">{views.map(([title, text]) => <div key={title}><strong>{title}</strong><p>{text}</p></div>)}</div></section>
    </div>

    <div className="project-manual-grid">
      <section className="project-panel project-manual-section"><div className="project-panel-heading"><div><h2>Reglas que conectan los datos</h2><p>La aplicación calcula el estado sin duplicar importes.</p></div><WalletCards size={20} /></div><ul className="project-manual-bullets"><li><CheckCircle2 size={15} /><span>El avance se registra por cortes con fecha y evidencia; las correcciones agregan una nueva medición.</span></li><li><CheckCircle2 size={15} /><span>Un EDP pasa de Previsto a Preparado cuando se alcanza su condición. Presentado y Aprobado requieren evidencia fechada.</span></li><li><CheckCircle2 size={15} /><span>El cobro real solo proviene de pagos registrados en CxC y vinculados al EDP.</span></li><li><CheckCircle2 size={15} /><span>El corte de cumplimiento filtra lo ocurrido hasta una fecha; la línea base conserva el compromiso original.</span></li><li><CheckCircle2 size={15} /><span>El sistema genera automáticamente la descripción del cambio; no debes ingresar un motivo.</span></li></ul></section>

      <section className="project-panel project-manual-section"><div className="project-panel-heading"><div><h2>Quién interviene</h2><p>El sistema acompaña el flujo actual de cada área.</p></div><Users size={20} /></div><div className="project-manual-role"><strong>CDG</strong><span>Configura contratos, naturaleza, fechas, avances, EDP, evidencias y análisis real vs. proyectado.</span></div><div className="project-manual-role"><strong>Operaciones</strong><span>Mantiene su trabajo en las carpetas de OneDrive o SharePoint y entrega la evidencia disponible.</span></div><div className="project-manual-role"><strong>Contabilidad</strong><span>Continúa facturando y registrando pagos en CxC; el sistema consulta esos cobros.</span></div><div className="project-manual-note">La detección automática de carpetas y el aviso por correo de Microsoft 365 quedan pendientes de conexión.</div></section>
    </div>
  </div>;
}
