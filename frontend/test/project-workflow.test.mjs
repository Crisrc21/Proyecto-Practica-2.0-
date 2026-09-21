import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";
const source=await readFile(new URL("../src/modules/projects/data/project-workflow.ts",import.meta.url),"utf8");
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {activeStages,physicalPercent,metricValue,advancePayment,workflowAtCutoff,isAdvanceMilestone}=await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);
const p={units:10,areaM2:1000,signedDate:"2026-01-01",milestones:[],invoiceLinks:[],progressReports:[
  {id:"r1",stageKey:"fabricacion",date:"2026-02-01",quantity:500,completedUnits:3,percent:null,evidence:"Informe"},
  {id:"r2",stageKey:"fabricacion",date:"2026-03-01",quantity:1000,completedUnits:10,percent:null,evidence:"Informe"}
]};
test("the four natures always include signature through assembly and only the applicable urbanizations",()=>{
  assert.deepEqual([1,2,3,4].map(n=>activeStages(n).map(s=>s.key).filter(k=>["interior","exterior"].includes(k))),[[],["interior"],["interior","exterior"],["exterior"]]);
  for(const nature of [1,2,3,4]) assert.deepEqual(activeStages(nature).slice(0,6).map(s=>s.key),["firma","anticipo","fabricacion","despachos","fundaciones","montaje"]);
});
test("m2 progress and completed homes stay separate and historical cutoff excludes later reports",()=>{
  assert.equal(physicalPercent(p,"fabricacion","2026-02-28"),50);
  assert.equal(metricValue(p,{stageKey:"fabricacion",metric:"terminadas"},"2026-02-28"),3);
  assert.equal(physicalPercent(p,"fabricacion","2026-03-31"),100);
  assert.equal(physicalPercent({...p,areaM2:null},"fabricacion","2026-02-28"),null);
  assert.equal(physicalPercent(p,"total","2026-02-28"),null,"total progress is not an invented average");
});
const advance={id:"advance",type:"Anticipo",invoicingComplete:true};
const bill={id:"inv",monto:1000,anulada:false,pagos:[{fechaPago:"2026-02-05",monto:400},{fechaPago:"2026-03-05",monto:600}],notasCredito:[],notasDebito:[]};
const financed={...p,milestones:[advance,{id:"stage",stageKey:"anticipo"},{id:"factory",stageKey:"fabricacion"}],invoiceLinks:[{invoiceId:"inv",milestoneId:"advance"}]};

test("invoices linked directly to the advance stage populate amounts and completion at cutoff",()=>{
  const stage={id:"stage",type:"Etapa",stageKey:"anticipo",scope:"General",invoicingComplete:true};
  const direct={...p,milestones:[stage],invoiceLinks:[{invoiceId:"inv",milestoneId:"stage"}]};
  assert.deepEqual(advancePayment(direct,[bill],"ready","2026-02-28"),{paid:400,billed:1000,percent:40,status:"Pendiente",label:"Anticipo parcialmente pagado"});
  assert.equal(workflowAtCutoff(direct,[bill],"ready","2026-03-31").milestones[0].actualDate,"2026-03-05");
  assert.equal(workflowAtCutoff(direct,[bill],"ready","2026-02-28").milestones[0].actualDate,null);
  const partial=advancePayment({...direct,milestones:[{...stage,invoicingComplete:false}]},[bill],"ready","2026-03-31");
  assert.equal(partial.paid,1000);
  assert.equal(partial.percent,null);
  assert.equal(advancePayment(direct,[],"ready","2026-03-31").label,"Información de cobros incompleta");
});

test("advance scope and mixed stage/EDP links use the same classification without double counting",()=>{
  const scoped={id:"scoped",type:"Otro",scope:"Anticipo",invoicingComplete:true};
  assert.equal(isAdvanceMilestone(scoped),true);
  assert.equal(isAdvanceMilestone({type:"Etapa",stageKey:"fabricacion",scope:"Fabricación"}),false);
  const mixed={...p,milestones:[advance,scoped,{id:"stage",type:"Etapa",stageKey:"anticipo",invoicingComplete:true}],invoiceLinks:[{invoiceId:"inv",milestoneId:"stage"},{invoiceId:"other",milestoneId:"advance"},{invoiceId:"third",milestoneId:"scoped"}]};
  const result=advancePayment(mixed,[bill,{...bill,id:"other"},{...bill,id:"third"}],"ready","2026-02-28");
  assert.equal(result.billed,3000);
  assert.equal(result.paid,1200);
  assert.equal(result.percent,40);
});
test("advance is only paid using linked CxC receipts and respects partial payments and cutoff",()=>{
  assert.equal(advancePayment(financed,[bill],"ready","2026-02-28").percent,40);
  assert.equal(advancePayment(financed,[bill],"ready","2026-03-31").label,"Anticipo pagado");
  assert.equal(advancePayment(financed,[bill],"error","2026-03-31").paid,null);
  assert.equal(advancePayment(financed,[],"ready","2026-03-31").paid,null);
  const partial={...financed,milestones:[{...advance,invoicingComplete:false}]};
  assert.equal(advancePayment(partial,[bill],"ready","2026-03-31").percent,null,"paid invoice does not imply entire advance has been billed");
});
test("timeline derives advance receipt date and physical evidence without modifying stored project",()=>{
  const shown=workflowAtCutoff(financed,[bill],"ready","2026-03-31");
  assert.equal(shown.milestones.find(m=>m.id==="stage").actualDate,"2026-03-05");
  assert.equal(shown.milestones.find(m=>m.id==="factory").actualDate,"2026-03-01");
  const earlier=workflowAtCutoff(financed,[bill],"ready","2026-02-28");
  assert.equal(earlier.milestones.find(m=>m.id==="stage").actualDate,null);
  assert.equal(earlier.milestones.find(m=>m.id==="factory").actualDate,null);
  assert.equal(financed.milestones[1].actualDate,undefined);
});
test("credit notes without money do not mark an advance as paid",()=>{
  const credited={...bill,pagos:[],notasCredito:[{fecha:"2026-02-01",monto:1000}]};
  assert.equal(advancePayment(financed,[credited],"ready","2026-03-31").paid,0);
  assert.equal(advancePayment(financed,[credited],"ready","2026-03-31").percent,null);
});

test("advance invoice status follows outstanding balance and due date at cutoff",()=>{
  const invoice={...bill,fechaVencimiento:"2026-02-28"};
  assert.equal(advancePayment(financed,[invoice],"ready","2026-02-28").status,"Pendiente");
  assert.equal(advancePayment(financed,[invoice],"ready","2026-03-01").status,"Vencido");
  assert.equal(advancePayment(financed,[invoice],"ready","2026-03-05").status,"Pagado");
  assert.equal(advancePayment(financed,[invoice],"error","2026-03-05").status,"Sin datos");
  assert.equal(advancePayment(financed,[],"ready","2026-03-05").status,"Sin datos");
  const adjusted={...invoice,pagos:[],notasCredito:[{fecha:"2026-03-02",monto:1000}]};
  assert.equal(advancePayment(financed,[adjusted],"ready","2026-03-01").status,"Vencido");
  assert.equal(advancePayment(financed,[adjusted],"ready","2026-03-02").status,"Pagado");
  assert.equal(advancePayment(financed,[adjusted],"ready","2026-03-02").percent,null);
});

test("an overpaid invoice cannot hide another overdue advance invoice",()=>{
  const project={...financed,invoiceLinks:[...financed.invoiceLinks,{invoiceId:"second",milestoneId:"advance"}]};
  const invoices=[{...bill,fechaVencimiento:"2026-02-01",pagos:[{fechaPago:"2026-02-01",monto:2000}]},{...bill,id:"second",fechaVencimiento:"2026-02-01",pagos:[]}];
  assert.equal(advancePayment(project,invoices,"ready","2026-02-28").status,"Vencido");
});
test("repeated full-completion reports retain the date first reached",()=>{
  const repeated={...financed,progressReports:[...p.progressReports,{...p.progressReports[1],id:"r3",date:"2026-04-01"}]};
  assert.equal(workflowAtCutoff(repeated,[bill],"ready","2026-04-30").milestones.find(m=>m.id==="factory").actualDate,"2026-03-01");
});
