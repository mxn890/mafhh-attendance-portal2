'use client';
import { useEffect, useState } from 'react';
import ManagerNav from '../../components/ManagerNav';
import { parseShift } from '../../lib/attendance-policy';
import { downloadCSV } from '../../lib/csv';
const blank = { name: '', department: '', employeeId: '', shiftStart: '09:00', shiftEnd: '18:00', assignedLocation: 'either' };
export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]), [error, setError] = useState(''), [busy, setBusy] = useState(false), [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState(null), [editing, setEditing] = useState(false), [result, setResult] = useState(null), [query, setQuery] = useState('');
  const [resetOpen, setResetOpen] = useState(false), [confirmText, setConfirmText] = useState(''), [reset, setReset] = useState(null), [batchId, setBatchId] = useState('');
  useEffect(() => { setBatchId(sessionStorage.getItem('mafhh-attendance-reset') || ''); load(); }, []);
  async function api(path, options) {
    const response = await fetch(path, { cache: 'no-store', ...options });
    if (response.status === 401) { window.location.href = '/login'; throw Error('Sign in again.'); }
    const body = await response.json();
    if (!response.ok) throw Error(body.error || 'Request failed.');
    return body;
  }
  async function load() { try { const b = await api('/api/manager/employees'); setEmployees(b.employees); setLoaded(true); setError(''); } catch (e) { setError(e.message); } }
  async function save(e) {
    e.preventDefault(); if (busy) return; setBusy(true); setError('');
    try {
      const b = await api('/api/manager/employees', { method: editing ? 'PATCH' : 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(form) });
      setForm(null); if (!editing) setResult(b); await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  async function changeStatus(e) {
    const action = e.status === 'active' ? 'deactivate' : 'reactivate';
    if (busy || !confirm(`${action === 'deactivate' ? 'Remove' : 'Restore'} ${e.name}? ${action === 'deactivate' ? 'Login will stop. Attendance history will be kept.' : ''}`)) return;
    setBusy(true);
    try { await api('/api/manager/employees', { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({employeeId: e.employeeId, action}) }); await load(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  function edit(e) {
    // Existing free-text schedules are shown; manager supplies explicit start/end if needed.
    const shift = parseShift(e);
    const clock = n => String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
    setEditing(true); setForm({ ...blank, ...e, shiftStart: e.shiftStart || (shift ? clock(shift.start) : ''), shiftEnd: e.shiftEnd || (shift ? clock(shift.end) : '') }); setError('');
  }
  async function runReset(resume = false) {
    if (busy || (!resume && confirmText !== 'RESET EMPLOYEES')) return;
    let id = resume ? batchId : crypto.randomUUID();
    if (!id) return;
    sessionStorage.setItem('mafhh-attendance-reset', id); setBatchId(id); setBusy(true); setError('');
    try {
      const b = await api('/api/manager/reset-all-credentials', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({batchId: id, confirm: 'RESET EMPLOYEES'})});
      setReset(b); setResetOpen(false); setConfirmText(''); await load();
    } catch (e) { setError(e.message + ' Your request ID is saved; use Resume reset.'); } finally { setBusy(false); }
  }
  async function recover() {
    if (!batchId || busy) return; setBusy(true);
    try { setReset(await api('/api/manager/reset-all-credentials?batchId=' + encodeURIComponent(batchId))); setError(''); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  const filtered = employees.filter(e => [e.name, e.department, e.employeeId].some(v => String(v || '').toLowerCase().includes(query.toLowerCase())));
  function credentialCSV() { downloadCSV('mafhh-employee-logins.csv', [['Employee ID','Name','Temporary password','Reset status'], ...reset.rows.map(e => [e.employeeId,e.name,e.tempPassword || '',e.state])]); }
  return <div className="min-h-screen bg-mist"><ManagerNav /><main className="container mx-auto px-4 py-8">
    <h1 className="font-display text-2xl font-semibold text-ink">Employees</h1><p className="text-sm text-slate mb-6">Add staff, edit shifts and remove access. Removed staff keep their attendance history.</p>
    {error && <p role="alert" className="text-signal mb-4">{error}</p>}
    <div className="flex flex-wrap gap-3 mb-5"><button className="btn-primary" disabled={busy} onClick={() => {setEditing(false);setForm({...blank});setError('');}}>Add employee</button><button className="btn-secondary" disabled={busy || !loaded} onClick={() => setResetOpen(true)}>Reset employee passwords &amp; selfies</button>{batchId && <><button disabled={busy} className="btn-secondary" onClick={recover}>Recover login list</button><button disabled={busy} className="btn-secondary" onClick={() => runReset(true)}>Resume reset</button></>}<button className="btn-secondary" disabled={busy} onClick={load}>Refresh</button></div>
    <input className="border border-line bg-paper px-3 py-2 mb-4 w-full sm:w-80" type="search" aria-label="Search employees" placeholder="Search name, department or ID" value={query} onChange={e => setQuery(e.target.value)} />
    {!loaded && !error && <p role="status">Loading employees…</p>}
    <div className="overflow-x-auto bg-paper border border-line"><table className="w-full text-sm"><thead className="bg-mist"><tr>{['Employee','Department','Shift','Location','Account','Actions'].map(v => <th key={v} className="p-3 text-left">{v}</th>)}</tr></thead><tbody className="divide-y divide-line">{filtered.map(e => <tr key={e.employeeId}><td className="p-3 font-medium">{e.name}<span className="block text-xs text-slate">{e.employeeId}</span></td><td className="p-3">{e.department}</td><td className="p-3 whitespace-nowrap">{e.shift_timing || 'Not set'}</td><td className="p-3">{e.assignedLocation === 'either' ? 'Anywhere' : e.assignedLocation}</td><td className="p-3">{e.status === 'active' ? 'Active' : 'Removed'}</td><td className="p-3">{e.attendanceRole === 'manager' || e.employeeId === 'CEO' ? <span className="text-slate">Manager account</span> : <div className="flex gap-3"><button disabled={busy} className="underline" onClick={() => edit(e)}>Edit</button><button disabled={busy} className="underline text-signal" onClick={() => changeStatus(e)}>{e.status === 'active' ? 'Remove' : 'Restore'}</button></div>}</td></tr>)}</tbody></table></div>
    {form && <div role="dialog" aria-modal="true" aria-label={editing ? 'Edit employee' : 'Add employee'} className="fixed inset-0 bg-ink/40 z-50 flex items-center justify-center p-4"><form className="bg-paper p-6 max-w-lg w-full max-h-[90vh] overflow-auto" onSubmit={save}><h2 className="font-display text-xl mb-4">{editing ? 'Edit employee' : 'Add employee'}</h2><div className="grid sm:grid-cols-2 gap-4">{[['name','Full name'],['department','Department'],['employeeId',editing ? 'Employee ID' : 'Employee ID (blank = automatic)']].map(([k,label]) => <label key={k} className="text-sm">{label}<input className="block border border-line p-2 w-full mt-1" value={form[k]} required={k !== 'employeeId'} disabled={busy || (editing && k === 'employeeId')} maxLength={120} onChange={e => setForm({...form,[k]:e.target.value})} /></label>)}{[['shiftStart','Shift starts'],['shiftEnd','Shift ends']].map(([k,label]) => <label key={k} className="text-sm">{label}<input required type="time" className="block border border-line p-2 w-full mt-1" value={form[k]} onChange={e => setForm({...form,[k]:e.target.value})} /></label>)}<label className="text-sm">Attendance location<select className="block border border-line p-2 w-full mt-1" value={form.assignedLocation} onChange={e => setForm({...form,assignedLocation:e.target.value})}><option value="either">Anywhere (Either)</option><option value="office">Office — within 1 km</option><option value="airport">Airport — within 1 km</option></select></label></div><p className="text-xs text-slate mt-4">Each shift has a 30-minute check-in grace period. Night shifts are supported.</p>{error && <p role="alert" className="text-signal mt-3">{error}</p>}<div className="flex gap-3 mt-5"><button disabled={busy} className="btn-primary">{busy ? 'Saving…' : 'Save employee'}</button><button type="button" disabled={busy} className="btn-secondary" onClick={() => setForm(null)}>Cancel</button></div></form></div>}
    {result && <div role="dialog" aria-modal="true" aria-label="New employee login" className="fixed inset-0 bg-ink/40 flex items-center justify-center p-4 z-50"><div className="bg-paper p-6 max-w-md w-full"><h2 className="font-display text-xl">Employee added</h2><p className="mt-3">{result.name} · {result.employeeId}</p><p className="font-tabular text-xl bg-mist p-3 my-4">{result.tempPassword}</p><p className="text-sm text-slate mb-4">Share this temporary password with this employee. First login requires a new password and selfie enrollment.</p><button className="btn-primary mr-3" onClick={() => downloadCSV('new-employee-login.csv', [['Employee ID','Name','Temporary password'],[result.employeeId,result.name,result.tempPassword]])}>Download login</button><button className="btn-secondary" onClick={() => setResult(null)}>Done</button></div></div>}
    {resetOpen && <div role="dialog" aria-modal="true" aria-label="Reset employee credentials" className="fixed inset-0 bg-ink/40 p-4 flex items-center justify-center z-50"><div className="bg-paper p-6 max-w-lg w-full"><h2 className="font-display text-xl mb-3">Reset employee passwords &amp; selfies</h2><p className="text-sm text-slate">Active employee accounts receive new temporary passwords. Saved enrollment selfies are cleared and previous sessions stop working. Attendance history and its check-in photos stay intact. CEO and manager accounts are excluded.</p><label className="block text-sm mt-4">Type RESET EMPLOYEES<input className="border border-line p-2 w-full mt-1" value={confirmText} onChange={e => setConfirmText(e.target.value)} /></label><div className="flex gap-3 mt-4"><button disabled={busy || confirmText !== 'RESET EMPLOYEES'} className="btn-primary" onClick={() => runReset(false)}>{busy ? 'Resetting…' : 'Reset and verify'}</button><button disabled={busy} className="btn-secondary" onClick={() => setResetOpen(false)}>Cancel</button></div></div></div>}
    {reset && <div role="dialog" aria-modal="true" aria-label="Verified employee logins" className="fixed inset-0 bg-ink/40 p-4 flex items-center justify-center z-50"><div className="bg-paper p-6 max-w-2xl w-full max-h-[85vh] overflow-auto"><h2 className="font-display text-xl">Employee reset results</h2><p className="text-sm my-3">{reset.verified}/{reset.total} passwords verified. {reset.complete ? 'Reset complete.' : 'Some accounts need review; use Resume reset.'}</p><p className="text-xs text-slate mb-4">Download the list now. Recovery is available for 24 hours; staff must change the temporary password and enroll again.</p><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className="text-left p-2">Employee</th><th className="text-left p-2">Temporary password</th><th className="text-left p-2">Status</th></tr></thead><tbody>{reset.rows.map(e => <tr key={e.employeeId}><td className="p-2">{e.name}<span className="block text-xs">{e.employeeId}</span></td><td className="p-2 font-tabular">{e.tempPassword || '—'}</td><td className="p-2">{e.state}</td></tr>)}</tbody></table></div><div className="flex gap-3 mt-5"><button className="btn-primary" onClick={credentialCSV}>Download login list</button><button className="btn-secondary" onClick={() => setReset(null)}>Close</button></div></div></div>}
  </main></div>;
}
