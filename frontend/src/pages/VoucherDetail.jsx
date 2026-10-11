import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, money, fmtDate, fmtDateTime } from '../api.js';
import { useAuth } from '../AuthContext.jsx';

const Field = ({ label, children }) => (
  <div className="field"><dt>{label}</dt><dd>{children || '—'}</dd></div>
);
const slug = (s) => s.toLowerCase().replace(/\s+/g, '-');

export default function VoucherDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sigFile, setSigFile] = useState(null);
  const [reason, setReason] = useState('');
  const [panel, setPanel] = useState(null); // 'approve' | 'reject'
  const [errors, setErrors] = useState({});

  const load = () => api.get(id).then(setData).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [id]);

  if (error && !data) return <div className="alert error">{error}. <Link to="/vouchers">Back to vouchers</Link></div>;
  if (!data) return <p className="center-note">Loading…</p>;
  const { voucher: v, history } = data;

  async function run(fn) {
    setBusy(true); setError(''); setErrors({});
    try { await fn(); await load(); setPanel(null); setSigFile(null); setReason(''); }
    catch (e) { setError(e.message); setErrors(e.errors || {}); }
    finally { setBusy(false); }
  }

  const approve = () => {
    if (!sigFile) return setErrors({ signature: 'Upload your signature to approve' });
    const fd = new FormData(); fd.append('signature', sigFile);
    run(() => api.approve(v.id, fd));
  };
  const reject = () => {
    if (!reason.trim()) return setErrors({ reason: 'Enter a rejection reason' });
    run(() => api.reject(v.id, reason));
  };
  const remove = async () => {
    if (!window.confirm('Delete this draft? This cannot be undone.')) return;
    setBusy(true);
    try { await api.remove(v.id); nav('/vouchers'); } catch (e) { setError(e.message); setBusy(false); }
  };

  const isOwnerDraft = user.role === 'employee' && v.status === 'Draft';
  const canDecide = user.role === 'director' && v.status === 'Pending Approval';

  return (
    <>
      <div className="page-head no-print">
        <h1>{v.voucher_number}</h1>
        <div className="actions">
          {isOwnerDraft && (
            <>
              <Link className="btn" to={`/vouchers/${v.id}/edit`}>Edit</Link>
              <button className="btn primary" disabled={busy} onClick={() => run(() => api.submit(v.id))}>Submit for approval</button>
              <button className="btn danger" disabled={busy} onClick={remove}>Delete</button>
            </>
          )}
          {canDecide && (
            <>
              <button className="btn primary" onClick={() => { setPanel('approve'); setErrors({}); }}>Approve</button>
              <button className="btn danger" onClick={() => { setPanel('reject'); setErrors({}); }}>Reject</button>
            </>
          )}
          {user.role === 'accounts' && <button className="btn" onClick={() => window.print()}>Print or save as PDF</button>}
        </div>
      </div>

      {error && <div className="alert error no-print">{error}{Object.values(errors)[0] ? `: ${Object.values(errors)[0]}` : ''}</div>}
      {v.status === 'Rejected' && (
        <div className="alert error"><b>Rejected.</b> Reason: {v.rejection_reason}</div>
      )}

      {canDecide && panel === 'approve' && (
        <section className="panel no-print">
          <h2>Approve voucher</h2>
          <label>Your signature (required)
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setSigFile(e.target.files[0])} />
          </label>
          {errors.signature && <span className="field-error">{errors.signature}</span>}
          <div className="actions">
            <button className="btn primary" disabled={busy} onClick={approve}>Confirm approval</button>
            <button className="btn ghost" onClick={() => setPanel(null)}>Cancel</button>
          </div>
        </section>
      )}
      {canDecide && panel === 'reject' && (
        <section className="panel no-print">
          <h2>Reject voucher</h2>
          <label>Rejection reason (required)
            <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          {errors.reason && <span className="field-error">{errors.reason}</span>}
          <div className="actions">
            <button className="btn danger" disabled={busy} onClick={reject}>Confirm rejection</button>
            <button className="btn ghost" onClick={() => setPanel(null)}>Cancel</button>
          </div>
        </section>
      )}

      <article className="paper">
        <header className="paper-head">
          <div>
            <h2>Expense voucher</h2>
            <p className="muted">ABC Company</p>
          </div>
          <div className={`stamp s-${slug(v.status)}`}>{v.status}</div>
        </header>

        <dl className="fields">
          <Field label="Voucher number">{v.voucher_number}</Field>
          <Field label="Voucher date">{fmtDate(v.voucher_date)}</Field>
          <Field label="Expense date">{fmtDate(v.expense_date)}</Field>
          <Field label="Department">{v.department}</Field>
          <Field label="Expense title">{v.title}</Field>
          <Field label="Category">{v.category}</Field>
          <Field label="Amount"><b className="amount">{money(v.amount)}</b></Field>
          <Field label="Employee">{v.employee_name}</Field>
          <Field label="Employee ID">{v.employee_code}</Field>
          <Field label="Created">{fmtDateTime(v.created_at)}</Field>
          <Field label="Last updated">{fmtDateTime(v.updated_at)}</Field>
          <Field label="Approval date">{fmtDateTime(v.approval_date)}</Field>
        </dl>
        <div className="desc"><dt>Description</dt><dd>{v.description || '—'}</dd></div>

        <div className="signatures">
          <div>
            {v.employee_signature ? <img src={`/uploads/${v.employee_signature}`} alt="Employee signature" /> : <div className="sig-empty">Not signed</div>}
            <span>Employee signature</span>
          </div>
          <div>
            {v.director_signature ? <img src={`/uploads/${v.director_signature}`} alt="Director signature" /> : <div className="sig-empty">Not signed</div>}
            <span>Director signature</span>
          </div>
        </div>
      </article>

      <section className="panel no-print">
        <h2>History</h2>
        <ul className="history">
          {history.map((h) => (
            <li key={h.id}>
              <b>{h.action}</b> by {h.actor_name} <span className="muted">on {fmtDateTime(h.created_at)}</span>
              {h.note && <div className="muted">“{h.note}”</div>}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
