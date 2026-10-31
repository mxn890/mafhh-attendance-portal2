'use client';
import { useEffect, useRef, useState } from 'react';
import ManagerNav from '../../components/ManagerNav';
import { downloadCSV } from '../../lib/csv';
const labels = { OnTime: 'On time', Late: 'Late', HalfDay: 'Half day', Absent: 'Absent', Leave: 'Leave' };
function time(v) { return v ? new Date(v).toLocaleTimeString('en-GB',{timeZone:'Asia/Karachi',hour:'2-digit',minute:'2-digit'}) : '—'; }
export default function ReportsPage() {
  const [period,setPeriod]=useState('7'),[month,setMonth]=useState(''),[employee,setEmployee]=useState(''),[employees,setEmployees]=useState([]),[data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(true);
  const sequence=useRef(0);
  useEffect(() => {
    setMonth(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Karachi',year:'numeric',month:'2-digit'}).format(new Date()));
    const selected=new URLSearchParams(window.location.search).get('employeeId');if(selected)setEmployee(selected);
    fetch('/api/manager/employees',{cache:'no-store'}).then(async r=>{const b=await r.json();if(r.ok)setEmployees(b.employees);}).catch(()=>{});
  },[]);
  useEffect(()=>{load();},[period,month,employee]);
  async function load() {
    if(period==='month'&&!month)return;
    const id=++sequence.current;setBusy(true);setError('');
    const q=new URLSearchParams(period==='month'?{month}:{days:period});if(employee)q.set('employeeId',employee);
    try {
      const r=await fetch('/api/manager/reports?'+q,{cache:'no-store'});
      if(r.status===401){window.location.href='/login';return;}
      const b=await r.json();if(!r.ok)throw Error(b.error||'Could not load report.');
      if(id===sequence.current)setData(b);
    }catch(e){if(id===sequence.current){setData(null);setError(e.message);}}
    finally{if(id===sequence.current)setBusy(false);}
  }
  function csv(){downloadCSV('mafhh-attendance-'+data.range.start+'.csv',[['Date','Employee ID','Name','Department','Check-in (PKT)','Check-out (PKT)','Status'],...data.rows.map(r=>[r.date,r.employeeId,r.name,r.department,time(r.checkInTime),time(r.checkOutTime),labels[r.status]||r.status])]);}
  return <div className="min-h-screen bg-mist"><div className="no-print"><ManagerNav /></div><main className="container mx-auto px-4 py-8 attendance-report">
    <h1 className="font-display text-2xl font-semibold text-ink">Attendance report</h1><p className="text-sm text-slate mb-6">MAFHH Aviation · Pakistan time</p>
    <div className="no-print flex flex-wrap gap-3 items-end mb-6"><label className="text-sm">Period<select className="block border border-line bg-paper p-2 mt-1" value={period} onChange={e=>setPeriod(e.target.value)}><option value="7">Last 7 days</option><option value="14">Last 14 days</option><option value="30">Last 30 days</option><option value="month">Calendar month</option></select></label>{period==='month'&&<label className="text-sm">Month<input type="month" className="block border border-line bg-paper p-2 mt-1" value={month} onChange={e=>setMonth(e.target.value)}/></label>}<label className="text-sm">Employee<select className="block border border-line bg-paper p-2 mt-1 max-w-full" value={employee} onChange={e=>setEmployee(e.target.value)}><option value="">All employees</option>{employees.map(e=><option key={e.employeeId} value={e.employeeId}>{e.name} · {e.employeeId}{e.status==='inactive'?' (removed)':''}</option>)}</select></label><button disabled={busy} className="btn-secondary" onClick={load}>Refresh</button><button disabled={busy||!data} className="btn-primary" onClick={()=>window.print()}>Print / Save PDF</button><button disabled={busy||!data} className="btn-secondary" onClick={csv}>Download CSV</button></div>
    {error&&<p role="alert" className="text-signal">{error}</p>}{busy&&<p role="status" className="no-print">Loading report…</p>}
    {data&&!busy&&<><div className="mb-4"><p className="font-medium">{data.range.label} · {data.range.start} to {new Date(Date.parse(data.range.end+'T00:00:00Z')-86400000).toISOString().slice(0,10)}</p><p className="text-sm text-slate">{employee ? employees.find(e=>e.employeeId===employee)?.name || employee : 'All employees'} · {data.rows.length} recorded entries</p></div><div className="grid grid-cols-5 gap-px bg-line mb-5">{Object.entries(data.summary).map(([k,v])=><div key={k} className="bg-paper p-3 text-center"><p className="text-xs">{labels[k]}</p><p className="text-xl font-tabular">{v}</p></div>)}</div><div className="overflow-x-auto report-table-wrap"><table className="w-full text-sm bg-paper border border-line"><thead><tr>{['Date','Employee','Department','Check-in','Check-out','Status'].map(h=><th key={h} className="p-3 text-left border-b border-line">{h}</th>)}</tr></thead><tbody>{data.rows.map(r=><tr key={r.employeeId+':'+r.date}><td className="p-3 whitespace-nowrap">{r.date}</td><td className="p-3">{r.name}<span className="block text-xs text-slate">{r.employeeId}</span></td><td className="p-3">{r.department}</td><td className="p-3 whitespace-nowrap">{time(r.checkInTime)}</td><td className="p-3 whitespace-nowrap">{time(r.checkOutTime)}</td><td className="p-3">{labels[r.status]||r.status}</td></tr>)}{!data.rows.length&&<tr><td colSpan="6" className="p-6 text-center">No attendance recorded in this period.</td></tr>}</tbody></table></div><p className="text-xs text-slate mt-4">{data.note}</p><p className="text-xs text-slate mt-2">Generated: {new Date(data.generatedAt).toLocaleString('en-GB',{timeZone:'Asia/Karachi'})} PKT</p></>}
  </main></div>;
}
