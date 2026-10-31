'use strict';
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),bcrypt=require('bcryptjs');
const root=path.resolve(__dirname,'..');let passed=0;
const clone=v=>structuredClone(v),data={employees:[],attendances:[],attendanceconfigs:[]};let cookieToken='';let session={userId:'CEO',role:'manager'},clock='2026-10-31T04:00:00Z';
const value=(o,k)=>k.split('.').reduce((v,p)=>v?.[p],o);
function match(o,q={}) {return Object.entries(q).every(([k,v])=>{
 if(k==='$or')return v.some(a=>match(o,a));
 const a=value(o,k);if(v instanceof RegExp)return v.test(a);
 if(v&&typeof v==='object'&&!Array.isArray(v)&&!(v instanceof Date))return Object.entries(v).every(([op,b])=>({$exists:()=>b?a!==undefined:a===undefined,$ne:()=>a!==b,$gte:()=>a>=b,$gt:()=>a>b,$lte:()=>a<=b,$lt:()=>a<b,$in:()=>b.includes(a),$nin:()=>!b.includes(a),$type:()=>typeof a===b}[op]?.()??false));
 return a===v || (a==null&&v==null);
 });}
function set(o,k,v){const p=k.split('.');let a=o;for(const x of p.slice(0,-1))a=a[x]??={};a[p.at(-1)]=clone(v);}
function update(o,u,insert=false){for(const[k,v]of Object.entries(u.$set||{}))set(o,k,v);if(insert)for(const[k,v]of Object.entries(u.$setOnInsert||{}))set(o,k,v);for(const[k,v]of Object.entries(u.$inc||{}))set(o,k,(value(o,k)||0)+v);for(const[k,v]of Object.entries(u.$max||{}))if(value(o,k)==null||value(o,k)<v)set(o,k,v);}
class Query{constructor(rows,one=false){this.rows=rows;this.one=one;}select(){return this;}sort(spec){this.rows.sort((a,b)=>{for(const[k,v]of Object.entries(spec)){const x=value(a,k),y=value(b,k);if(x<y)return -v;if(x>y)return v;}return 0;});return this;}lean(){return this;}limit(n){this.rows=this.rows.slice(0,n);return this;}then(a,b){return Promise.resolve(clone(this.one?this.rows[0]||null:this.rows)).then(a,b);}}
function collection(name){data[name]??=[];return{
 createIndex:async()=>{},findOne:async q=>clone(data[name].find(o=>match(o,q))||null),
 insertOne:async o=>{if(data[name].some(x=>x._id===o._id))throw Object.assign(Error('duplicate'),{code:11000});data[name].push(clone(o));return{insertedId:o._id};},
 updateOne:async(q,u,opt={})=>{let o=data[name].find(o=>match(o,q)),insert=false;if(!o&&opt.upsert){o=Object.fromEntries(Object.entries(q).filter(([k,v])=>!k.startsWith('$')&&(v==null||typeof v!=='object')));data[name].push(o);insert=true;}if(!o)return{modifiedCount:0};update(o,u,insert);return{modifiedCount:1};},
 deleteOne:async q=>{const i=data[name].findIndex(o=>match(o,q));if(i>=0)data[name].splice(i,1);},
 findOneAndUpdate:async(q,u,opt)=>{let o=data[name].find(o=>match(o,q));if(!o)return{value:null};update(o,u);return{value:clone(o)};}
};}
const models={};for(const[name,col]of Object.entries({Employee:'employees',Attendance:'attendances',AttendanceConfig:'attendanceconfigs',LocationPing:'locationpings'}))models[name]={
 find:q=>new Query(data[col]?.filter(o=>match(o,q))||[]),findOne:q=>new Query(data[col]?.filter(o=>match(o,q))||[],true),
 create:async o=>{data[col]??=[];if(data[col].some(e=>e.employeeId===o.employeeId))throw Object.assign(Error(),{code:11000});data[col].push({...clone(o),_id:crypto.randomUUID()});return o;},
 updateOne:(q,u,opt)=>collection(col).updateOne(q,u,opt),
 findOneAndUpdate:async(q,u,opt={})=>{let o=data[col].find(o=>match(o,q));if(!o&&opt.upsert){if(data[col].some(e=>e.employeeId===q.employeeId&&e.date===q.date))throw Object.assign(Error(),{code:11000});o={_id:crypto.randomUUID()};data[col].push(o);update(o,u,true);}else if(o)update(o,u);return clone(o||null);},
 db:{collection},
};
class FixedDate extends Date{constructor(...a){super(...(a.length?a:[clock]));}static now(){return +new Date(clock);}}
const context=vm.createContext({console,Date:FixedDate,Map,Set,Buffer,process:{env:{JWT_SECRET:'test-secret-with-no-production-value'}},URL,URLSearchParams,TextEncoder});
const cache=new Map();function synthetic(id,values){const mod=new vm.SyntheticModule(Object.keys(values),function(){for(const[k,v]of Object.entries(values))this.setExport(k,v);},{context,identifier:id});return mod;}
async function load(file){file=path.resolve(root,file);if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file});cache.set(file,m);await m.link(async(spec,parent)=>{
 if(spec==='next/server')return synthetic(spec,{NextResponse:{json:(body,opt={})=>({status:opt.status||200,body,headers:opt.headers})}});
 if(spec==='next/headers')return synthetic(spec,{cookies:async()=>({get:()=>cookieToken?{value:cookieToken}:undefined,set:(_,v)=>{cookieToken=v;},delete:()=>{cookieToken='';}})});
 if(spec==='jose'){const jose=await import('jose');return synthetic(spec,{SignJWT:jose.SignJWT,jwtVerify:jose.jwtVerify});}
 if(spec==='bcryptjs')return synthetic(spec,{default:bcrypt});
 if(spec==='node:crypto')return synthetic(spec,Object.fromEntries(['randomInt','createCipheriv','createDecipheriv','createHash','randomBytes'].map(k=>[k,crypto[k]])));
 if(spec.endsWith('/db/connect')||spec==='./db/connect')return synthetic(spec,{default:async()=>{}});
 if(spec.endsWith('/db/models')||spec==='./db/models')return synthetic(spec,models);
 if(spec.endsWith('/auth/jwt'))return synthetic(spec,{getSession:async()=>session,createToken:async()=>'',setAuthCookie:async()=>{}});
 let p=spec.startsWith('@/')?path.join(root,spec.slice(2)):path.resolve(path.dirname(parent.identifier),spec);if(!path.extname(p))p+='.js';return load(p);
 });return m;}
async function moduleOf(f){const m=await load(f);if(m.status==='linked')await m.evaluate();return m.namespace;}
function test(name,fn){return Promise.resolve().then(fn).then(()=>{passed++;console.log('PASS',name);});}
function req(body={},query=''){return {json:async()=>body,nextUrl:{searchParams:new URLSearchParams(query)}};}
(async()=>{
const P=await moduleOf('app/lib/attendance-policy.js'),geo=await moduleOf('app/lib/geo.js');
await test('Roster free-text formats, including 9-PM night shift',()=>{for(const v of ['9AM - 6PM','10AM – 6:30PM','9-PM - 6AM','8AM - 5PM','7AM - 7PM'])assert.ok(P.parseShift({shift_timing:v}));assert.equal(P.parseShift({shift_timing:'bad'}),null);});
await test('Each employee gets their own 30-minute grace, exact boundary',()=>{const e={shift_timing:'10AM – 6:30PM'};assert.equal(P.checkInStatus(e,{},new Date('2026-10-31T05:30:00Z')),'OnTime');assert.equal(P.checkInStatus(e,{},new Date('2026-10-31T05:30:01Z')),'Late');assert.equal(P.checkInStatus({shift_timing:'8AM - 5PM'},{},new Date('2026-10-31T04:00:00Z')),'Late');});
await test('No automatic HalfDay for arrival after 30-minute grace',()=>assert.equal(P.checkInStatus({shift_timing:'9AM - 6PM'},{},new Date('2026-10-31T07:00:00Z')),'Late'));
await test('Scheduled before shift, pending during shift, absent after shift',()=>{const e={shift_timing:'10AM - 7PM'};assert.equal(P.missingStatus(e,{},new Date('2026-10-31T04:00:00Z')),'Scheduled');assert.equal(P.missingStatus(e,{},new Date('2026-10-31T06:00:00Z')),'Pending');assert.equal(P.missingStatus(e,{},new Date('2026-10-31T14:00:01Z')),'Absent');});
await test('Night attendance belongs to previous shift date',()=>{const e={shift_timing:'9-PM - 6AM'};assert.equal(P.shiftDate(e,{},new Date('2026-10-31T00:30:00Z')),'2026-10-30');assert.equal(P.checkInStatus(e,{},new Date('2026-10-31T00:30:00Z')),'Late');});
await test('7-day and leap-month ranges, reject invalid inputs',()=>{const v=P.reportRange(new URLSearchParams('days=7'),new Date('2026-10-31T04:00Z'));assert.equal(v.start,'2026-10-25');assert.equal(v.end,'2026-11-01');assert.equal(P.reportRange(new URLSearchParams('month=2024-02')).end,'2024-03-01');assert.throws(()=>P.reportRange(new URLSearchParams('days=-1')));assert.throws(()=>P.reportRange(new URLSearchParams('month=2026-13')));});
await test('Reject NaN/nonfinite face vectors and invalid coordinates',()=>{assert.equal(P.validDescriptor(Array(128).fill(NaN)),false);assert.equal(P.faceDistance(Array(128).fill(0),Array(128).fill(Infinity)),Infinity);assert.equal(P.validCoordinates(91,0),false);});
await test('Geofence exactly 1 km regardless of old 3 km DB value',()=>{const cfg={officeLocation:{lat:0,lng:0,radiusMeters:3000}};assert.equal(geo.classifyLocation(0,0.0089,cfg).label,'office');assert.equal(geo.classifyLocation(0,0.0091,cfg).label,'out_of_range');});
await test('Assigned airport not rejected by overlapping office fence',()=>{const cfg={officeLocation:{lat:0,lng:0},airportLocation:{lat:0,lng:0}};assert.equal(geo.classifyAssignedLocation(0,0,cfg,'airport').label,'airport');});
const face=Array(128).fill(0),emp={employeeId:'MAFHH-001',name:'Test Employee',status:'active',attendanceRole:'employee',mustChangePassword:false,isEnrolled:true,faceDescriptor:face,assignedLocation:'either',shift_timing:'9AM - 6PM',_id:'person1'};
data.employees.push(emp);data.attendanceconfigs.push({key:'default',officeLocation:{lat:0,lng:0,radiusMeters:3000}});session={userId:emp.employeeId,role:'employee'};
const checkin=await moduleOf('app/api/checkin/route.js');
const valid={photo:'data:image/jpeg;base64,AA',faceDescriptor:face,lat:50,lng:50};
await test('Either employee may check in far outside all geofences',async()=>{const r=await checkin.POST(req(valid));assert.equal(r.status,200);assert.equal(data.attendances.length,1);});
await test('Repeat check-in preserves original time and status',async()=>{const original=+data.attendances[0].checkIn.time;clock='2026-10-31T06:30:00Z';const r=await checkin.POST(req(valid));assert.equal(r.body.alreadyCheckedIn,true);assert.equal(+data.attendances[0].checkIn.time,original);assert.equal(data.attendances[0].status,'OnTime');});
await test('Simultaneous check-ins create only one original event',async()=>{data.attendances.length=0;await Promise.all([checkin.POST(req(valid)),checkin.POST(req(valid))]);assert.equal(data.attendances.length,1);});
await test('Office employee outside 1 km rejected',async()=>{data.attendances.length=0;emp.assignedLocation='office';assert.equal((await checkin.POST(req(valid))).status,400);emp.assignedLocation='either';});
await test('Invalid face descriptor cannot bypass matching',async()=>{assert.equal((await checkin.POST(req({...valid,faceDescriptor:Array(128).fill(NaN)}))).status,400);});
await test('Reset accounts must complete password and selfie setup',async()=>{emp.mustChangePassword=true;assert.equal((await checkin.POST(req(valid))).status,403);emp.mustChangePassword=false;});
const employees=await moduleOf('app/api/manager/employees/route.js');
await test('Employee cannot access manager roster or add accounts',async()=>{assert.equal((await employees.GET()).status,403);assert.equal((await employees.POST(req({}))).status,403);});
session={userId:'CEO',role:'manager'};
await test('Manager can add employee, password matches real bcrypt',async()=>{const r=await employees.POST(req({employeeId:'MAFHH-999',name:'Added Test',department:'Test',shiftStart:'21:00',shiftEnd:'06:00',assignedLocation:'either'}));assert.equal(r.status,201);const p=data.employees.find(e=>e.employeeId==='MAFHH-999');assert.equal(await bcrypt.compare(r.body.tempPassword,p.password),true);assert.equal(p.mustChangePassword,true);});
await test('Manager cannot add duplicate ID or invalid shift',async()=>{assert.equal((await employees.POST(req({employeeId:'MAFHH-999',name:'A',department:'B',shiftStart:'21:00',shiftEnd:'06:00'}))).status,409);assert.equal((await employees.POST(req({name:'A',department:'B',shiftStart:'99:00',shiftEnd:'06:00'}))).status,400);});
await test('Remove account preserves historical data and increments session version',async()=>{data.attendances.push({employeeId:'MAFHH-999',date:'2026-10-01',status:'Late'});const r=await employees.PATCH(req({employeeId:'MAFHH-999',action:'deactivate'}));assert.equal(r.status,200);const e=data.employees.find(e=>e.employeeId==='MAFHH-999');assert.equal(e.status,'inactive');assert.equal(e.authVersion,1);assert.equal(data.attendances.length,1);});
await test('CEO / manager account cannot be removed through employee manager',async()=>{data.employees.push({_id:'ceo',employeeId:'CEO',attendanceRole:'manager',status:'active'});assert.equal((await employees.PATCH(req({employeeId:'CEO',action:'deactivate'}))).status,403);});
const reports=await moduleOf('app/api/manager/reports/route.js');
await test('Report filters exact date range rather than last N records',async()=>{data.attendances.push({employeeId:emp.employeeId,date:'2026-10-30',status:'Late',checkIn:{time:new Date('2026-10-30T05:00Z')}},{employeeId:emp.employeeId,date:'2026-10-01',status:'OnTime'});const r=await reports.GET(req({},'days=7'));assert.equal(r.status,200);assert.equal(r.body.rows.length,1);assert.equal(r.body.summary.Late,1);assert.equal(r.body.summary.Absent,0);});
await test('Monthly report can include removed employee history',async()=>{const r=await reports.GET(req({},'month=2026-10&employeeId=MAFHH-999'));assert.equal(r.body.rows.length,1);assert.equal(r.body.rows[0].name,'Added Test');});
await test('Report rejects invalid month and unauthorised users',async()=>{assert.equal((await reports.GET(req({},'month=2026-99'))).status,400);session=null;assert.equal((await reports.GET(req({},'days=7'))).status,403);session={userId:'CEO',role:'manager'};});
const reset=await moduleOf('app/lib/credential-reset.js');emp.password=await bcrypt.hash('old-password',10);emp.authVersion=0;
await test('Bulk reset verifies new password, clears enrollment, preserves history and managers',async()=>{const before=data.attendances.length;const b=await reset.resetBatch('11111111-1111-4111-8111-111111111111','CEO');assert.equal(b.verified,1);assert.equal(await bcrypt.compare(b.rows[0].tempPassword,emp.password),true);assert.equal(emp.isEnrolled,false);assert.equal(emp.faceDescriptor,null);assert.equal(emp.authVersion,1);assert.equal(data.attendances.length,before);assert.equal(data.employees.find(e=>e.employeeId==='CEO').password,undefined);assert.ok(!JSON.stringify(data.attendance_credential_resets_v1).includes(b.rows[0].tempPassword));});
await test('Retry same batch does not rotate password twice; interrupted lists recover',async()=>{const hash=emp.password;const b=await reset.resetBatch('11111111-1111-4111-8111-111111111111','CEO');assert.equal(emp.password,hash);assert.equal(emp.authVersion,1);const list=await reset.recoverBatch(b.batchId,'CEO');assert.equal(list.rows[0].tempPassword,b.rows[0].tempPassword);await assert.rejects(()=>reset.recoverBatch(b.batchId,'other-manager'));});
await test('Recovered list never returns password after employee changes it',async()=>{emp.password=await bcrypt.hash('changed-password',10);const b=await reset.recoverBatch('11111111-1111-4111-8111-111111111111','CEO');assert.equal(b.rows[0].tempPassword,undefined);});
const jwt=await moduleOf('app/lib/auth/jwt.js');
await test('Real signed session checks active state and revocation version',async()=>{
 emp.status='active';cookieToken=await jwt.createToken(emp.employeeId,'test@example.invalid','employee',emp.authVersion);assert.equal((await jwt.getSession()).userId,emp.employeeId);
 emp.status='inactive';assert.equal(await jwt.getSession(),null);emp.status='active';emp.authVersion++;assert.equal(await jwt.getSession(),null);
});
const login=await moduleOf('app/api/auth/login/route.js');
await test('Inactive employee login fails even with correct password',async()=>{emp.status='inactive';assert.equal((await login.POST(req({employeeId:emp.employeeId,password:'changed-password'}))).status,401);emp.status='active';});
const checkout=await moduleOf('app/api/checkout/route.js');
await test('Night checkout after midnight updates original attendance date',async()=>{
 clock='2026-10-31T01:15:00Z';emp.isEnrolled=true;emp.mustChangePassword=false;emp.faceDescriptor=face;session={userId:emp.employeeId,role:'employee'};
 data.attendances.length=0;data.attendances.push({_id:'night-record',employeeId:emp.employeeId,date:'2026-10-30',checkIn:{time:new Date('2026-10-30T16:00:00Z')},status:'OnTime'});
 assert.equal((await checkout.POST(req(valid))).status,200);assert.equal(data.attendances[0].date,'2026-10-30');assert.ok(data.attendances[0].checkOut.time);
});
const me=await moduleOf('app/api/me/route.js');
await test('Overtime night employee still sees checkout after scheduled end',async()=>{
 clock='2026-10-31T01:15:00Z';emp.shift_timing='9-PM - 6AM';delete data.attendances[0].checkOut;
 const r=await me.GET();assert.equal(r.body.today.checkedIn,true);assert.equal(r.body.today.checkedOut,false);emp.shift_timing='9AM - 6PM';
});
const today=await moduleOf('app/api/manager/today/route.js');
await test('Manager summary does not mark future shift absent',async()=>{
 session={userId:'CEO',role:'manager'};clock='2026-10-31T02:00:00Z';data.attendances.length=0;const r=await today.GET();const row=r.body.rows.find(e=>e.employeeId===emp.employeeId);assert.equal(row.status,'Scheduled');
});
const csv=await moduleOf('app/lib/csv.js');await test('CSV quotes names and blocks spreadsheet formulas',()=>{assert.equal(csv.csvCell('a,"b"'),'"a,""b"""');assert.equal(csv.csvCell('=SUM(1,2)'),'"\'=SUM(1,2)"');});
console.log('\nATTENDANCE REGRESSION TESTS:',passed,'PASSED (in-memory data store, real handlers/policy/bcrypt; no live records changed).');
})().catch(e=>{console.error(e);process.exitCode=1;});
