// Offline regression tests: no network, no credentials, no real writes.
// node --test tests/task-shift.test.cjs
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createHash, webcrypto } = require('node:crypto');
const source = fs.readFileSync(path.join(__dirname, '..', 'ft_loader.js'), 'utf8');
const clone = x => JSON.parse(JSON.stringify(x));
const sha = text => createHash('sha1').update('blob ' + Buffer.byteLength(text) + '\0').update(text).digest('hex');
const isoDays = ['01-01','04-03','04-06','05-01','05-08','07-05','07-06','09-28','10-28','11-17','12-24','12-25','12-26'];
const holidays = (year = 2026) => isoDays.map(d => {
  if (year === 2027 && d === '04-03') d = '03-26';
  if (year === 2027 && d === '04-06') d = '03-29';
  const iso = `${year}-${d}`;
  return { id: `*SPA-HOL-${iso}*`, plannedDate: iso, owner: 'A', coOwners: ['B'] };
});
const task = (fields = {}) => ({ id: 'TEST', title: 'Testovací úkol', owner: 'A', plannedDate: '2026-09-25', durationDays: 1, state: 'Nový', ...fields });
const database = (fields = {}) => ({ tasks: [task(), ...holidays(), ...holidays(2027)], opakovaci: [], vyjimky: [], dokonceni: [], auta: [], auta_rezervace: [], resitele: [], ...fields });
const response = (value, status = 200) => new Response(typeof value === 'string' ? value : JSON.stringify(value), { status, headers: { etag: 'mock' } });
function deferred() { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; }

function harness(db = database(), options = {}) {
  const memory = new Map([['ftUserVerified','true'],['ftUserRole',options.role || 'planovac'],['ftResolvedUser','TESTER'],['ftGithubToken','mock-token']]);
  const server = { db: clone(db), writes: [], requests: [], history: [], large: false, beforeWrite: null, rawHandler: null, lostReply: false, failGet: false };
  const storageListeners = [];
  const context = {
    TextEncoder, TextDecoder, Uint8Array, Date, JSON, Map, Set, WeakMap, Object, Array,
    atob, btoa, crypto: webcrypto, navigator: {}, setTimeout, clearTimeout, setInterval: () => 1, clearInterval() {},
    console: { error() {}, warn() {}, log() {} },
    window: { addEventListener(name, fn) { if (name === 'storage') storageListeners.push(fn); } },
    localStorage: {
      getItem: k => memory.get(k) ?? null,
      setItem(k,v) { if (server.quota && k === 'ftWorkbookData') throw Error('quota'); memory.set(k,v); },
      removeItem: k => memory.delete(k)
    },
    fetch: async (url, init = {}) => {
      server.requests.push({url,method:init.method || 'GET'});
      if (String(url).includes('/history/')) {
        if (init.method === 'PUT') {
          const body = JSON.parse(init.body);
          server.history.push(JSON.parse(Buffer.from(body.content,'base64').toString('utf8')));
          return response({content:{sha:'history-sha'}});
        }
        return response({},404);
      }
      if (init.method === 'PUT') {
        const body = JSON.parse(init.body);
        if (body.sha === '0'.repeat(40)) return response({}, options.role === 'nahlizec' ? 403 : 409);
        server.writes.push(body);
        if (server.beforeWrite) await server.beforeWrite(body);
        if (body.sha !== sha(JSON.stringify(server.db))) return response({},409);
        server.db = JSON.parse(Buffer.from(body.content,'base64').toString('utf8'));
        if (server.lostReply) { server.lostReply = false; throw new Error('connection lost after commit'); }
        return response({content:{sha:sha(JSON.stringify(server.db))}});
      }
      if (server.failGet) throw Error('offline');
      if (init.headers?.Accept?.includes('raw')) {
        if (server.rawHandler) return server.rawHandler();
        return response(JSON.stringify(server.db));
      }
      const text = JSON.stringify(server.db);
      return response({sha:sha(text),content:server.large ? undefined : Buffer.from(text).toString('base64')});
    }
  };
  vm.createContext(context);
  // Test-only access to pure parser / strict reads; production exports unchanged.
  vm.runInContext(source.replace('    init, reload, saveToGitHub, getRawJson,',
    '    __parse: parseDatabase, __load: fetchFromGitHub, __storage: initStorageSync, init, reload, saveToGitHub, getRawJson,') + '\nglobalThis.loader = FTLoader;',context);
  const api = context.loader;
  return {api,server,memory,context,storageListeners,load:()=>api.__load(false,{force:true,strict:true}),plan:()=>api.getTaskShiftPlan(server.db.tasks[0])};
}

for (const [from,to] of [
  ['2026-09-25','2026-09-29'],['2026-04-02','2026-04-07'],['2026-12-23','2026-12-28'],
  ['2026-12-31','2027-01-04'],['2026-10-06','2026-10-07'],['2026-09-26','2026-09-29']
]) test(`date from SPA: ${from} → ${to}`,async()=>{
  const h=harness(database({tasks:[task({plannedDate:from}),...holidays(),...holidays(2027)]}));
  await h.load(); assert.equal(h.plan().to,to); await h.api.shiftSingleDayTask(h.plan());
  assert.equal(h.server.db.tasks[0].plannedDate,to); assert.equal(h.server.writes.length,1);
});

test('holiday source is imported data, independent of owner, completion and filters',async()=>{
  const days=holidays();const changed=days.find(x=>x.plannedDate==='2026-10-28');
  Object.assign(changed,{id:'*SPA-HOL-2026-10-07*',plannedDate:'2026-10-07',owner:'hidden',cancelled:true});
  const h=harness(database({tasks:[task({plannedDate:'2026-10-06'}),...days]}));await h.load();assert.equal(h.plan().to,'2026-10-08');
});

for(const mutate of [d=>d.tasks.splice(1,1),d=>d.tasks.push({...d.tasks[1]}),d=>d.tasks[1].plannedDate='2026-01-02']) {
  test('missing/mismatched holiday records fail safely; duplicates cannot replace a missing date',async()=>{
    const d=database();mutate(d); if(d.tasks.length>27)d.tasks.splice(2,1);
    const h=harness(d);await h.load();assert.match(h.plan().error,/seznam svátků/);
    await assert.rejects(h.api.shiftSingleDayTask(h.plan()),/seznam svátků/);assert.equal(h.server.writes.length,0);
  });
}
test('uncovered next year blocks the move',async()=>{
  const h=harness(database({tasks:[task({plannedDate:'2027-12-31'}),...holidays(2027)]}));await h.load();assert.match(h.plan().error,/2028/);
});

for(const fields of [
  {durationDays:2},{durationDays:0},{durationDays:'bad'},{cancelled:true},{state:'Dokončeno'},
  {id:'*SPA14*'},{plannedDate:''},{plannedDate:'2026-02-30'},{recurring:true},
  {vyroba:{druh:'projekt'}},{completedDays:['2026-09-25']}
]) test('unsupported task hidden: '+JSON.stringify(fields),async()=>{
  const h=harness(database({tasks:[task(fields),...holidays()]}));await h.load();assert.equal(h.plan().eligible,false);
});
test('recurrence substitutes, duplicates and generated occurrences are excluded',async()=>{
  for(const d of [database({opakovaci:[{id:'TEST',aktivni:false}]}),database({tasks:[task(),task(),...holidays()]})]){
    const h=harness(d);await h.load();assert.equal(h.plan().eligible,false);
  }
  const h=harness();await h.load();assert.equal(h.api.getTaskShiftPlan(task({recurring:true})).eligible,false);
});

test('co-owner copy shifts original once; other fields and other records survive',async()=>{
  const d=database();Object.assign(d.tasks[0],{coOwners:['B'],auto:'CAR',dueDate:'2026-09-28',vyroba:{druh:'podukol',projekt:'P',polozky:[{text:'Keep me'}]},custom:{future:42}});
  d.tasks.push({id:'P',vyroba:{druh:'projekt'},dueDate:'2026-09-28'});
  const h=harness(d);await h.load();const p=h.api.getTaskShiftPlan({...d.tasks[0],owner:'B',primaryOwner:'A',isCoOwnerCopy:true});
  const r=await h.api.shiftSingleDayTask(p);assert.equal(r.warnings.length,2);
  const expected=clone(d);expected.tasks[0].plannedDate=r.to;expected.tasks[0].lastUpdated=h.server.db.tasks[0].lastUpdated;
  delete h.server.db.updatedAt;delete h.server.db.updatedBy;assert.deepEqual(h.server.db,expected);
  assert.equal(h.api.__parse(h.api.getRawJson()).tasks.filter(t=>t.id==='TEST'&&t.plannedDate===r.to).length,2);
});

test('car conflicts warn and still save, including hidden multi-day tasks and reservations',async()=>{
  const d=database();d.tasks[0].auto='CAR';d.tasks.push(task({id:'OTHER',plannedDate:'2026-09-28',durationDays:3,auto:'CAR',owner:'hidden'}));
  d.auta_rezervace=[{spz:'CAR',datum:'2026-09-29',stav:'servis'}];
  const h=harness(d);await h.load();const r=await h.api.shiftSingleDayTask(h.plan());assert.match(r.warnings.join(' '),/OTHER/);assert.match(r.warnings.join(' '),/servis/);assert.equal(h.server.writes.length,1);
});
test('free reservation, own task and cancelled tasks do not create false collisions',async()=>{
  const d=database();d.tasks[0].auto='CAR';d.tasks.push(task({id:'CANCEL',plannedDate:'2026-09-29',auto:'CAR',cancelled:true}));
  d.auta_rezervace=[{spz:'CAR',datum:'2026-09-29',stav:'volné'}];
  const h=harness(d);await h.load();const r=await h.api.shiftSingleDayTask(h.plan());assert.equal(r.warnings.length,0);
});
test('permanent car state warns',async()=>{
  const d=database();d.tasks[0].auto='CAR';d.auta=[{spz:'CAR',dostupnost:'servis'}];
  const h=harness(d);await h.load();assert.match((await h.api.shiftSingleDayTask(h.plan())).warnings.join(' '),/trvalý stav/);
});
test('daily free override suppresses permanent car warning',async()=>{
  const d=database();d.tasks[0].auto='CAR';d.auta=[{spz:'CAR',dostupnost:'servis'}];
  d.auta_rezervace=[{spz:'CAR',datum:'2026-09-29',stav:'volné'}];
  const h=harness(d);await h.load();assert.equal((await h.api.shiftSingleDayTask(h.plan())).warnings.length,0);
});
for(const role of ['operator','nahlizec']) test('role denied: '+role,async()=>{
  const h=harness(database(),{role});await h.load();await assert.rejects(h.api.shiftSingleDayTask(h.plan()),/oprávnění/);assert.equal(h.server.writes.length,0);
});
test('changed task after opening detail is never overwritten',async()=>{
  const h=harness();await h.load();const p=h.plan();h.server.db.tasks[0].title='changed by colleague';
  await assert.rejects(h.api.shiftSingleDayTask(p),/mezitím změnil/);assert.equal(h.server.writes.length,0);
});
test('409 retries fresh snapshot, preserves concurrent changes and refreshes car warning',async()=>{
  const d=database();d.tasks[0].auto='CAR';const h=harness(d);await h.load();
  h.server.beforeWrite=()=>{h.server.beforeWrite=null;h.server.db.tasks.push(task({id:'NEW',plannedDate:'2026-09-29',auto:'CAR'}));};
  const r=await h.api.shiftSingleDayTask(h.plan());assert.equal(h.server.writes.length,2);assert.match(r.warnings.join(' '),/NEW/);assert.equal(h.server.db.tasks.filter(t=>t.id==='NEW').length,1);
});
test('409 followed by changed source task stops',async()=>{
  const h=harness();await h.load();h.server.beforeWrite=()=>{h.server.beforeWrite=null;h.server.db.tasks[0].plannedDate='2026-09-30';};
  await assert.rejects(h.api.shiftSingleDayTask(h.plan()),/mezitím změnil/);assert.equal(h.server.writes.length,1);assert.equal(h.server.db.tasks[0].plannedDate,'2026-09-30');
});
test('lost successful response verifies same destination without a second PUT',async()=>{
  const h=harness();await h.load();h.server.lostReply=true;
  const r=await h.api.shiftSingleDayTask(h.plan());assert.equal(r.to,'2026-09-29');assert.equal(h.server.writes.length,1);
});
test('failed fresh read never writes from cache',async()=>{
  const h=harness();await h.load();h.server.failGet=true;await assert.rejects(h.api.shiftSingleDayTask(h.plan()),/offline/);assert.equal(h.server.writes.length,0);
});
test('double click can produce only one move',async()=>{
  const h=harness();await h.load();const p=h.plan();const one=h.api.shiftSingleDayTask(p);await assert.rejects(h.api.shiftSingleDayTask(p),/Právě/);await one;assert.equal(h.server.writes.length,1);
});

test('large database read does not publish new SHA before content; stale save gets 409',async()=>{
  const h=harness();await h.load();const old=h.api.getRawJson();h.server.db.tasks[0].title='colleague';h.server.large=true;
  const started=deferred(),finish=deferred();h.server.rawHandler=()=>{started.resolve();return finish.promise;};
  const loading=h.api.__load(true);await started.promise;old.tasks[0].plannedDate='2026-09-29';
  await assert.rejects(h.api.saveToGitHub(old,'test'),/CONFLICT/);assert.equal(h.server.db.tasks[0].title,'colleague');
  finish.resolve(response(JSON.stringify(h.server.db)));await loading;
});
test('raw content from another revision cannot be paired with metadata SHA',async()=>{
  const h=harness();await h.load();const original=clone(h.api.getRawJson());h.server.large=true;
  h.server.rawHandler=()=>{h.server.db.tasks[0].title='different revision';return response(JSON.stringify(h.server.db));};
  await assert.rejects(h.load(),/CONFLICT/);assert.deepEqual(clone(h.api.getRawJson()),original);
});
test('storage quota failure does not return stale data to next save',async()=>{
  const h=harness();await h.load();h.server.quota=true;h.server.db.tasks[0].title='fresh';await h.load();
  const raw=h.api.getRawJson();assert.equal(raw.tasks[0].title,'fresh');raw.tasks[0].note='new note';await h.api.saveToGitHub(raw,'test');assert.equal(h.server.db.tasks[0].title,'fresh');
});
test('old raw object keeps its original SHA even after another load',async()=>{
  const h=harness();await h.load();const old=h.api.getRawJson();h.server.db.tasks[0].title='new';await h.load();old.tasks[0].note='old form';
  await assert.rejects(h.api.saveToGitHub(old,'test'),/CONFLICT/);assert.equal(h.server.db.tasks[0].title,'new');
});
test('history captures date change',async()=>{
  const h=harness();await h.load();await h.api.shiftSingleDayTask(h.plan());
  await new Promise(r=>setTimeout(r,30));
  const events=h.server.history.flatMap(x=>x.events);assert.ok(events.some(e=>e.id==='TEST'&&e.ch?.plannedDate?.[0]==='2026-09-25'&&e.ch.plannedDate[1]==='2026-09-29'));
});

test('regression on real local snapshot (optional, never included in repository)',{skip:!process.env.TOP_SNAPSHOT},async()=>{
  const db=JSON.parse(fs.readFileSync(process.env.TOP_SNAPSHOT,'utf8').replace(/^\uFEFF/,''));
  const h=harness(db);h.server.large=true;await h.load();assert.deepEqual(clone(h.api.getRawJson()),db);
  if(process.env.TOP_BASELINE){
    const old=fs.readFileSync(process.env.TOP_BASELINE,'utf8').replace('    init, reload, saveToGitHub, getRawJson,','    __parse: parseDatabase, init, reload, saveToGitHub, getRawJson,');
    const c={...h.context};vm.createContext(c);vm.runInContext(old+'\nglobalThis.oldLoader=FTLoader;',c);
    assert.deepEqual(clone(h.api.__parse(db)),clone(c.oldLoader.__parse(db)));
  }
  const augmented=clone(db);augmented.tasks=augmented.tasks.filter(t=>!String(t.id).includes('SPA-HOL'));
  augmented.tasks.unshift(task({id:'OFFLINE-REGRESSION'}));augmented.tasks.push(...holidays(),...holidays(2027));
  const g=harness(augmented);await g.load();const before=clone(g.server.db);
  await g.api.shiftSingleDayTask(g.plan());
  assert.equal(g.server.db.tasks.length,before.tasks.length);
  assert.deepEqual(g.server.db.tasks.slice(1),before.tasks.slice(1));
  const counts=list=>list.reduce((m,t)=>(m[t.id]=(m[t.id]||0)+1,m),{});
  assert.deepEqual(counts(g.server.db.tasks),counts(before.tasks));
});

module.exports={harness,database,task,holidays};
