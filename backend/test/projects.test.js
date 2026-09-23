import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createProjectsRepository } from "../src/modules/projects/infrastructure/local-projects-repository.js";
import { createProjectsService } from "../src/modules/projects/application/projects-service.js";
import { validateProject } from "../src/modules/projects/domain/project-validation.js";

function milestone(overrides={}) {
  return { id: "edp1", name: "EDP enero", type: "EDP", scope: "General", startDate: "2026-01-01", baselineDate: "2026-01-31", forecastDate: "2026-01-31", actualDate: null, baselineApproved: true, state: "Pendiente", evidence: "", source: "Contrato", notes: "", cashAmount: 100, baselineCashAmount: 100, cashDate: "2026-02-20", baselineCashDate: "2026-02-20", ...overrides };
}
function project(overrides={}) {
  return { id:"test-project", name:"Proyecto de prueba", customer:"Cliente de prueba", customerRut:"", location:"", owner:"", units:10, contractType:"Suma alzada", currency:"UF", contractAmount:1000, signedDate:"2026-01-01", startDate:"2026-01-01", endDate:"2026-12-31", ufValue:null, approvedFolder:"", paymentTerms:"", notes:"", scopes:[], sources:[], issues:[], milestones:[milestone()], invoiceLinks:[], ...overrides };
}
async function setup(t) {
  const folder = await mkdtemp(join(tmpdir(),"cxc-projects-test-"));
  t.after(()=>rm(folder,{recursive:true,force:true,maxRetries:4,retryDelay:100}));
  const repo = createProjectsRepository({dataPrivatePath:folder});
  return {folder, repo, service:createProjectsService(repo)};
}
test("project saves persist across repository instances and preserve history",async t=>{
  const {folder,service}=await setup(t);
  const p=await service.save({project:project(),expectedRevision:0,reason:"Alta"});
  assert.equal(p.revision,1);
  const next=await service.save({project:{...p,milestones:[{...p.milestones[0],forecastDate:"2026-02-05"}]},expectedRevision:1,reason:"Cambio de programación"});
  assert.equal(next.milestones[0].baselineDate,"2026-01-31");
  assert.equal(next.history.length,2);
  assert(next.history[1].changes.some(c=>c.includes("2026-01-31 → 2026-02-05")));
  const stored=await createProjectsRepository({dataPrivatePath:folder}).read();
  assert.equal(stored.projects[0].milestones[0].forecastDate,"2026-02-05");
  assert.equal(JSON.parse(await readFile(join(folder,"projects.json"),"utf8")).schemaVersion,1);
});
test("concurrent updates cannot overwrite a more recent revision",async t=>{
  const {service}=await setup(t);
  const p=await service.save({project:project(),expectedRevision:0,reason:"Alta"});
  const results=await Promise.allSettled([service.save({project:{...p,owner:"A"},expectedRevision:1,reason:"A"}),service.save({project:{...p,owner:"B"},expectedRevision:1,reason:"B"})]);
  assert.equal(results.filter(r=>r.status==="fulfilled").length,1);
  assert.equal(results.find(r=>r.status==="rejected").reason.statusCode,409);
});
test("confirmed baseline and its cash assumptions cannot be overwritten",async t=>{
  const {service}=await setup(t);
  const p=await service.save({project:project(),expectedRevision:0,reason:"Alta"});
  for(const patch of [{baselineDate:"2026-02-01"},{baselineApproved:false},{baselineCashAmount:200},{baselineCashDate:"2026-03-01"}]) {
    await assert.rejects(service.save({project:{...p,milestones:[{...p.milestones[0],...patch}]},expectedRevision:1,reason:"Intento"}),e=>e.statusCode===400);
  }
});
test("invoices cannot be counted in multiple projects or twice in one project",async t=>{
  const {service}=await setup(t);
  await service.save({project:project({invoiceLinks:[{invoiceId:"inv1",milestoneId:"edp1"}]}),expectedRevision:0,reason:"Alta"});
  await assert.rejects(service.save({project:project({id:"second",invoiceLinks:[{invoiceId:"inv1",milestoneId:"edp1"}]}),expectedRevision:0,reason:"Alta"}),e=>e.statusCode===409);
  assert.throws(()=>validateProject(project({invoiceLinks:[{invoiceId:"inv2",milestoneId:"edp1"},{invoiceId:"inv2",milestoneId:"edp1"}]})),/dos veces/);
});
test("completion requires evidence and a valid non-future date",()=>{
  assert.throws(()=>validateProject(project({milestones:[milestone({actualDate:"2026-02-05"})]})),/evidencia/);
  assert.throws(()=>validateProject(project({milestones:[milestone({forecastDate:"2026-02-30"})]})),/Fecha inválida/);
  assert.throws(()=>validateProject(project({milestones:[milestone({actualDate:"2099-01-01",evidence:"Acta"})]})),/futuro/);
});
test("zero is a valid projected amount; empty amounts remain unknown",()=>{
  assert.equal(validateProject(project({milestones:[milestone({cashAmount:0})]})).milestones[0].cashAmount,0);
  assert.equal(validateProject(project({milestones:[milestone({cashAmount:null})]})).milestones[0].cashAmount,null);
});

function potential(overrides={}) { return project({ lifecycle:"Potencial", nature:1, areaM2:1000, signedDate:null, milestones:[], progressReports:[], ...overrides }); }
function progress(overrides={}) { return { id:"cut-1", stageKey:"fabricacion", date:"2026-02-01", evidence:"Informe de producción 1", quantity:100, completedUnits:1, percent:null, ...overrides }; }
function edp(overrides={}) { return milestone({ id:"edp-progress", name:"EDP por fabricación", baselineApproved:false, actualDate:null, edp:{ stageKey:"fabricacion", metric:"m2", threshold:100, status:"Previsto", triggeredDate:null, presentedDate:null, approvedDate:null, approvalEvidence:"" }, ...overrides }); }
async function activate(service, nature=1) {
  const draft=await service.save({project:potential({nature}),expectedRevision:0,reason:"Potencial"});
  return service.save({project:{...draft,lifecycle:"Firmado",signedDate:"2026-01-01"},expectedRevision:1,reason:"Contrato firmado"});
}
async function update(service,p,patch) { return service.save({project:{...p,...patch},expectedRevision:p.revision,reason:"Seguimiento"}); }

test("editing assembly increments recalculates subsequent totals and preserves correction audit",async t=>{
  const {service,repo}=await setup(t); let p=await activate(service);
  const first={id:"assembly1",stageKey:"montaje",date:"2026-02-01",quantity:1,completedUnits:null,percent:null,evidence:"Informe 1"};
  const second={...first,id:"assembly2",date:"2026-02-02",quantity:3,evidence:"Informe 2"};
  p=await update(service,p,{progressReports:[first,second]});
  const saved=await service.editProgress({projectId:p.id,expectedRevision:p.revision,report:{...first,quantity:2,evidence:"Informe corregido"}});
  assert.deepEqual(saved.progressReports.map(r=>r.quantity),[2,4]);
  assert.equal(saved.revision,p.revision+1);
  assert.equal(saved.history.at(-1).reason,"Avance corregido");
  assert.deepEqual((await repo.read()).progressCorrections[0].before,[first,second]);
  await assert.rejects(service.editProgress({projectId:p.id,expectedRevision:p.revision,report:first}),/otra sesión/);
  await assert.rejects(service.editProgress({projectId:p.id,expectedRevision:saved.revision,report:{...first,quantity:99999}}),/contratadas/);
  const moved=await service.editProgress({projectId:p.id,expectedRevision:saved.revision,report:{...first,date:"2026-02-03",quantity:2}});
  assert.equal(moved.progressReports.find(r=>r.id===second.id).quantity,2);
  assert.equal(moved.progressReports.find(r=>r.id===first.id).quantity,4);
});

test("explicit EDP deletion removes confirmed plans and links while preserving archive and other milestones",async t=>{
  const {service,repo}=await setup(t); let p=await activate(service);
  p=await update(service,p,{milestones:[...p.milestones,edp({baselineApproved:true})]});
  const target=p.milestones.find(m=>m.edp);
  p=await update(service,p,{invoiceLinks:[{invoiceId:"bill",milestoneId:target.id}]});
  const result=await service.removeEdp({projectId:p.id,milestoneId:target.id,expectedRevision:p.revision});
  assert.deepEqual(result.milestones,p.milestones.filter(m=>m.id!==target.id));
  assert.equal(result.invoiceLinks.length,0);
  assert.equal(result.revision,p.revision+1);
  assert.match(result.history.at(-1).reason,/EDP eliminado/);
  assert.deepEqual((await repo.read()).deletedEdps[0].milestone,target);
  assert.equal((await service.list()).projects[0].milestones.some(m=>m.id===target.id),false);
  await assert.rejects(service.removeEdp({projectId:p.id,milestoneId:target.id,expectedRevision:p.revision}),/otra sesión/);
  await assert.rejects(service.removeEdp({projectId:p.id,milestoneId:result.milestones[0].id,expectedRevision:result.revision}),/no es un EDP/);
});

test("deleting a signed project persists, archives its data and releases invoice links",async t=>{
  const {service,repo,folder}=await setup(t);
  const p=await service.save({project:project({invoiceLinks:[{invoiceId:"bill",milestoneId:"edp1"}]}),expectedRevision:0});
  const other=await service.save({project:project({id:"other"}),expectedRevision:0});
  await service.remove({projectId:p.id,expectedRevision:p.revision});
  const fresh=createProjectsService(createProjectsRepository({dataPrivatePath:folder}));
  assert.deepEqual((await fresh.list()).projects.map(p=>p.id),[other.id]);
  const archived=(await repo.read()).deletedProjects[0];
  assert.deepEqual(archived.milestones,p.milestones);
  assert.deepEqual(archived.history,p.history);
  assert(archived.deletedAt);
  const linked=await update(fresh,other,{invoiceLinks:[{invoiceId:"bill",milestoneId:"edp1"}]});
  assert.equal(linked.invoiceLinks[0].invoiceId,"bill");
  await assert.rejects(fresh.save({project:p,expectedRevision:0}),/eliminado/);
});

test("deleting potentials validates revision and rejects duplicate or missing requests",async t=>{
  const {service}=await setup(t);
  const p=await service.save({project:potential(),expectedRevision:0});
  const changed=await update(service,p,{name:"Nombre actualizado"});
  await assert.rejects(service.remove({projectId:p.id,expectedRevision:p.revision}),/otra sesión/);
  assert.equal((await service.list()).projects.length,1);
  await assert.rejects(service.remove({projectId:p.id}),/versión/);
  await service.remove({projectId:p.id,expectedRevision:changed.revision});
  assert.equal((await service.list()).projects.length,0);
  await assert.rejects(service.remove({projectId:p.id,expectedRevision:changed.revision}),/ya no existe/);
});

test("workflow order persists without modifying milestone data",async t=>{
  const {service}=await setup(t); let p=await activate(service);
  const before=p.milestones;
  const order=before.map(m=>m.id).reverse();
  p=await update(service,p,{milestoneOrder:order});
  assert.deepEqual((await service.list()).projects[0].milestoneOrder,order);
  assert.deepEqual(p.milestones,before);
  assert(p.history.at(-1).changes.includes("Orden de los hitos actualizado"));
  await assert.rejects(update(service,p,{milestoneOrder:[order[0],order[0]]}),/Orden de hitos inválido/);
});

test("contract stages can be removed persistently and restored without affecting other contracts",async t=>{
  const {service}=await setup(t); let p=await activate(service);
  const target=p.milestones.find(m=>m.stageKey==="montaje");
  p=await update(service,p,{milestones:p.milestones.filter(m=>m.id!==target.id),excludedStages:["montaje"]});
  assert(!p.milestones.some(m=>m.stageKey==="montaje"));
  assert(p.history.at(-1).changes.includes(`Hito eliminado: ${target.name}`));
  p=await update(service,p,{notes:"Otra actualización"});
  const loaded=(await service.list()).projects.find(item=>item.id===p.id);
  assert.deepEqual(loaded.excludedStages,["montaje"]);
  assert(!loaded.milestones.some(m=>m.stageKey==="montaje"));
  p=await update(service,p,{excludedStages:[]});
  assert.equal(p.milestones.filter(m=>m.stageKey==="montaje").length,1);
});

test("custom milestones can be added and removed while linked or confirmed milestones are protected",async t=>{
  const {service}=await setup(t); let p=await activate(service);
  const custom=milestone({id:"custom-contract",name:"Entrega de documentación",type:"Otro",baselineApproved:false});
  p=await update(service,p,{milestones:[...p.milestones,custom]});
  assert(p.milestones.some(m=>m.id===custom.id));
  p=await update(service,p,{milestones:p.milestones.filter(m=>m.id!==custom.id)});
  assert(!p.milestones.some(m=>m.id===custom.id));
  p=await update(service,p,{milestones:[...p.milestones,custom],invoiceLinks:[{invoiceId:"custom-bill",milestoneId:custom.id}]});
  await assert.rejects(update(service,p,{milestones:p.milestones.filter(m=>m.id!==custom.id),invoiceLinks:[]}),/facturas vinculadas/);
  const signed=p.milestones.find(m=>m.stageKey==="firma");
  await assert.rejects(update(service,p,{milestones:p.milestones.filter(m=>m.id!==signed.id)}),/No puedes eliminar/);
  await assert.rejects(update(service,p,{excludedStages:["firma"]}),/firma del contrato/);
});

test("stages with progress or EDP dependencies cannot be removed",async t=>{
  const {service}=await setup(t); let p=await activate(service);
  p=await update(service,p,{milestones:[...p.milestones,edp()]});
  await assert.rejects(update(service,p,{milestones:p.milestones.filter(m=>m.stageKey!=="fabricacion"),excludedStages:["fabricacion"]}),/EDP asociados/);
  p=await update(service,p,{progressReports:[progress({quantity:50})]});
  await assert.rejects(update(service,p,{milestones:p.milestones.filter(m=>m.stageKey!=="fabricacion"),excludedStages:["fabricacion"]}),/No puedes eliminar/);
});

test("advance links invoices directly and cannot be planned as an EDP",async t=>{
  const {service}=await setup(t);
  let p=await activate(service);
  const advance=p.milestones.find(m=>m.stageKey==="anticipo");
  p=await update(service,p,{invoiceLinks:[{invoiceId:"advance-invoice",milestoneId:advance.id}]});
  assert.equal(p.invoiceLinks[0].milestoneId,advance.id);
  assert.equal(p.milestones.find(m=>m.id===advance.id).edp,undefined);
  const invalid=edp({type:"Anticipo",scope:"Anticipo",edp:{...edp().edp,stageKey:"anticipo",metric:"firma",threshold:1}});
  await assert.rejects(update(service,p,{milestones:[...p.milestones,invalid]}),/sin EDP/);
  const saved=await update(service,p,{milestones:p.milestones.map(m=>m.id===advance.id?{...m,invoicingComplete:true}:m)});
  assert.equal(saved.invoiceLinks[0].invoiceId,"advance-invoice");
});

test("potential contracts remain separate and signing creates the exact ordered stages for each nature",async t=>{
  for (const nature of [1,2,3,4]) {
    const {service}=await setup(t); const p=await activate(service,nature);
    const expected=["firma","anticipo","fabricacion","despachos","fundaciones","montaje",...([2,3].includes(nature)?["interior"]:[]),...([3,4].includes(nature)?["exterior"]:[]),"total"];
    assert.deepEqual(p.milestones.map(m=>m.stageKey),expected);
    assert.equal(p.milestones[0].actualDate,"2026-01-01");
    const repeated=await update(service,p,{});
    assert.equal(repeated.milestones.length,expected.length,"repeated saves do not duplicate stages");
    await assert.rejects(update(service,repeated,{lifecycle:"Potencial"}),/no puede volver/);
  }
});
test("potential contracts cannot receive milestones; signing allows classification in the next step",async t=>{
  const {service}=await setup(t);
  await assert.rejects(service.save({project:potential({milestones:[milestone()]}),expectedRevision:0,reason:"Intento"}),/Firma el contrato/);
  const p=await service.save({project:potential({nature:null}),expectedRevision:0,reason:"Potencial"});
  const signed=await update(service,p,{lifecycle:"Firmado",signedDate:"2026-01-01"});
  assert.equal(signed.lifecycle,"Firmado");
  assert.equal(signed.milestones.length,0);
  const classified=await update(service,signed,{nature:4});
  assert(classified.milestones.some(m=>m.stageKey==="exterior"));
});
test("cumulative progress prepares an EDP once and leaves its planned money and baseline intact",async t=>{
  const {service}=await setup(t); let p=await activate(service);
  p=await update(service,p,{milestones:[...p.milestones,edp({baselineApproved:true})]});
  assert.equal(p.milestones.at(-1).edp.status,"Previsto");
  p=await update(service,p,{progressReports:[progress({quantity:90})]});
  assert.equal(p.milestones.at(-1).edp.status,"Previsto");
  p=await update(service,p,{progressReports:[...p.progressReports,progress({id:"cut-2",date:"2026-02-02"})]});
  assert.equal(p.milestones.at(-1).edp.status,"Preparado");
  assert.equal(p.milestones.at(-1).actualDate,null,"prepared EDP is not approved");
  assert.equal(p.milestones.at(-1).cashAmount,100);
  assert.equal(p.milestones.at(-1).baselineCashAmount,100);
  const count=p.milestones.length;
  p=await update(service,p,{});
  assert.equal(p.milestones.length,count);
  assert.equal(p.milestones.at(-1).edp.triggeredDate,"2026-02-02");
  assert.equal(p.invoiceLinks.length,0,"physical progress never fabricates accounting records");
});
test("backdated reports use chronological cuts and revisions preserve all prior evidence",async t=>{
  const {service}=await setup(t); let p=await activate(service);
  p=await update(service,p,{milestones:[...p.milestones,edp()],progressReports:[progress({quantity:1000,completedUnits:10})]});
  assert.equal(p.milestones.find(m=>m.stageKey==="fabricacion").actualDate,"2026-02-01");
  p=await update(service,p,{progressReports:[...p.progressReports,progress({id:"backdated",date:"2026-01-15",quantity:10})]});
  assert.equal(p.milestones.at(-1).edp.status,"Preparado");
  await assert.rejects(update(service,p,{progressReports:[]}),/se conservan/);
  p=await update(service,p,{progressReports:[...p.progressReports,progress({id:"correction",date:"2026-02-03",quantity:50})]});
  assert.equal(p.milestones.at(-1).edp.status,"Previsto");
  assert.equal(p.milestones.find(m=>m.stageKey==="fabricacion").actualDate,null);
  assert.equal(p.progressReports.length,3);
  assert(p.history.at(-1).changes.some(c=>c.includes("Avance fabricacion")));
});
test("EDP presentation and approval require achieved condition and dated documentary evidence",async t=>{
  const {service}=await setup(t); let p=await activate(service);
  p=await update(service,p,{milestones:[...p.milestones,edp()]});
  const setEdp=patch=>p.milestones.map(m=>m.edp?{...m,edp:{...m.edp,...patch}}:m);
  await assert.rejects(update(service,p,{milestones:setEdp({status:"Presentado",presentedDate:"2026-02-03"})}),/avance/);
  p=await update(service,p,{progressReports:[progress()]});
  await assert.rejects(update(service,p,{milestones:setEdp({status:"Aprobado",presentedDate:"2026-02-02",approvedDate:"2026-02-04"})}),/referencia/);
  await assert.rejects(update(service,p,{milestones:setEdp({status:"Presentado",presentedDate:"2026-01-15"})}),/anterior al avance/);
  p=await update(service,p,{milestones:setEdp({status:"Aprobado",presentedDate:"2026-02-02",approvedDate:"2026-02-04",approvalEvidence:"Carpeta Aprobados / EDP 1"})});
  assert.equal(p.milestones.at(-1).actualDate,"2026-02-04");
  assert.equal(p.milestones.at(-1).evidence,"Carpeta Aprobados / EDP 1");
  await assert.rejects(update(service,p,{milestones:setEdp({status:"Previsto"})}),/conserva su estado/);
  await assert.rejects(update(service,p,{milestones:setEdp({threshold:200})}),/condición.*conserva/);
});
test("nature changes cannot discard urbanization evidence or confirmed commitments",async t=>{
  const {service}=await setup(t); let p=await activate(service,3);
  p=await update(service,p,{progressReports:[progress({stageKey:"interior",quantity:null,completedUnits:null,percent:20})]});
  await assert.rejects(update(service,p,{nature:4}),/avances registrados/);
  p=await update(service,p,{nature:2});
  assert(!p.milestones.some(m=>m.stageKey==="exterior"));
  assert(p.milestones.some(m=>m.stageKey==="fundaciones"));
});
test("invalid quantities, future dates and incompatible EDP conditions are rejected",()=>{
  const base=potential({lifecycle:"Firmado",signedDate:"2026-01-01"});
  for(const patch of [{quantity:1001},{completedUnits:11},{date:"2099-01-01"},{evidence:""},{stageKey:"montaje",quantity:1.5,completedUnits:null},{stageKey:"interior",quantity:null,completedUnits:null,percent:101}]) {
    assert.throws(()=>validateProject({...base,progressReports:[progress(patch)]}));
  }
  assert.throws(()=>validateProject({...base,milestones:[edp({edp:{...edp().edp,stageKey:"exterior",metric:"exteriorPct",threshold:25}})]}),/incompatible/);
  assert.throws(()=>validateProject({...base,milestones:[edp({edp:{...edp().edp,metric:"terminadas",threshold:20}})]}),/umbral/);
});
test("existing project plans survive classification without creating extra cash forecasts",async t=>{
  const {service}=await setup(t);
  let p=await service.save({project:project(),expectedRevision:0,reason:"Plan existente"});
  p=await update(service,p,{nature:3,areaM2:1000});
  assert.equal(p.milestones.filter(m=>m.type==="EDP").length,1);
  assert.equal(p.milestones.find(m=>m.id==="edp1").baselineCashAmount,100);
  assert.equal(p.milestones.filter(m=>m.stageKey).length,9);
});
test("later reports confirming the same completion do not move the achieved date or EDP trigger",async t=>{
  const {service}=await setup(t); let p=await activate(service);
  p=await update(service,p,{milestones:[...p.milestones,edp()],progressReports:[progress({quantity:1000,completedUnits:10})]});
  p=await update(service,p,{progressReports:[...p.progressReports,progress({id:"later",date:"2026-03-01",quantity:1000,completedUnits:10})]});
  assert.equal(p.milestones.find(m=>m.stageKey==="fabricacion").actualDate,"2026-02-01");
  assert.equal(p.milestones.find(m=>m.edp).edp.triggeredDate,"2026-02-01");
  p=await update(service,p,{milestones:p.milestones.map(m=>m.edp?{...m,edp:{...m.edp,status:"Presentado",presentedDate:"2026-02-05"}}:m)});
  assert.equal(p.milestones.find(m=>m.edp).edp.status,"Presentado");
});

test("a potential needs only its name in the UI and can be signed before filling its customer",async t=>{
  const {service}=await setup(t);
  const p=await service.save({project:potential({name:"Nuevo potencial",customer:"",nature:null,units:0,areaM2:null,contractAmount:null}),expectedRevision:0});
  assert.equal(p.customer,"");
  assert.equal(p.history[0].reason,"Contrato potencial agregado");
  const signed=await service.save({project:{...p,lifecycle:"Firmado",signedDate:"2026-01-01"},expectedRevision:p.revision});
  assert.equal(signed.lifecycle,"Firmado");
  assert.equal(signed.customer,"");
  assert(signed.history.at(-1).changes.some(c=>c.includes("Potencial → Firmado")));
  await assert.rejects(service.save({project:potential({id:"blank",name:"   ",customer:""}),expectedRevision:0}),/nombre/);
});
test("updates require no written reason and record the six new scopes in automatic history",async t=>{
  const {service}=await setup(t);
  let p=await service.save({project:project(),expectedRevision:0});
  for (const scope of ["Fabricación","Despacho","Fundaciones","Montaje","Urbanización Interior","Urbanización Exterior"]) {
    p=await service.save({project:{...p,milestones:p.milestones.map(m=>({...m,scope}))},expectedRevision:p.revision});
    assert.equal(p.milestones[0].scope,scope);
    assert(p.history.at(-1).changes.some(c=>c.includes(`alcance:`) && c.endsWith(scope)));
    assert(p.history.at(-1).reason);
  }
});
