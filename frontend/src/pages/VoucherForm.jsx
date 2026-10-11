import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, DEPARTMENTS, CATEGORIES } from '../api.js';
import { useAuth } from '../AuthContext.jsx';

const MAX_SIZE = 2 * 1024 * 1024;

export default function VoucherForm() {
  const { id } = useParams();
  const editing = !!id;
  const { user } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    department: DEPARTMENTS.includes(user.department) ? user.department : '',
    title: '', expense_date: '', category: '', description: '', amount: '',
  });
  const [file, setFile] = useState(null);
  const [existingSig, setExistingSig] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(editing);

  useEffect(() => {
    if (!editing) return;
    api.get(id).then(({ voucher: v }) => {
      if (v.status !== 'Draft') return nav(`/vouchers/${id}`, { replace: true });
      setForm({
        department: v.department, title: v.title, expense_date: v.expense_date,
        category: v.category || '', description: v.description || '', amount: v.amount,
      });
      setExistingSig(v.employee_signature);
    }).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, [id]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  function validate(forSubmit) {
    const e = {};
    if (!form.department) e.department = 'Select a department';
    if (!form.title.trim()) e.title = 'Enter an expense title';
    if (!form.expense_date) e.expense_date = 'Select the expense date';
    if (form.amount === '') e.amount = 'Enter the amount';
    else if (Number(form.amount) <= 0) e.amount = 'Amount must be greater than zero';
    if (forSubmit && !file && !existingSig) e.signature = 'Upload your signature before submitting';
    return e;
  }

  function onFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(f.type))
      return setErrors((x) => ({ ...x, signature: 'Use a PNG, JPG or WEBP image' }));
    if (f.size > MAX_SIZE) return setErrors((x) => ({ ...x, signature: 'Image must be 2 MB or smaller' }));
    setErrors((x) => ({ ...x, signature: undefined }));
    setFile(f);
  }

  async function save(submit) {
    setError('');
    const e = validate(submit);
    setErrors(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append('signature', file);
      const { voucher } = editing ? await api.update(id, fd) : await api.create(fd);
      if (submit) await api.submit(voucher.id);
      nav(`/vouchers/${voucher.id}`);
    } catch (err) {
      setError(err.message);
      setErrors(err.errors || {});
    } finally { setBusy(false); }
  }

  if (loading) return <p className="center-note">Loading…</p>;
  const preview = file ? URL.createObjectURL(file) : existingSig ? `/uploads/${existingSig}` : null;
  const Err = ({ k }) => (errors[k] ? <span className="field-error">{errors[k]}</span> : null);

  return (
    <>
      <h1>{editing ? 'Edit draft voucher' : 'New voucher'}</h1>
      {error && <div className="alert error">{error}</div>}
      <form className="panel form-grid" onSubmit={(e) => e.preventDefault()} noValidate>
        <label>Employee name<input value={user.name} disabled /></label>
        <label>Employee ID<input value={user.employee_code || ''} disabled /></label>

        <label>Department *
          <select value={form.department} onChange={set('department')}>
            <option value="">Select…</option>
            {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
          </select>
          <Err k="department" />
        </label>
        <label>Expense category
          <select value={form.category} onChange={set('category')}>
            <option value="">Select…</option>
            {CATEGORIES.map((d) => <option key={d}>{d}</option>)}
          </select>
        </label>

        <label className="span2">Expense title *
          <input value={form.title} onChange={set('title')} maxLength={120} />
          <Err k="title" />
        </label>
        <label>Expense date *
          <input type="date" value={form.expense_date} onChange={set('expense_date')} />
          <Err k="expense_date" />
        </label>
        <label>Amount (INR) *
          <input type="number" step="0.01" min="0" value={form.amount} onChange={set('amount')} />
          <Err k="amount" />
        </label>
        <label className="span2">Description
          <textarea rows={4} value={form.description} onChange={set('description')} />
        </label>

        <div className="span2 sig-box">
          <label>Your signature (required to submit)
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onFile} />
          </label>
          <Err k="signature" />
          {preview && <img className="sig-preview" src={preview} alt="Signature preview" />}
        </div>

        <div className="span2 actions">
          <button className="btn" disabled={busy} onClick={() => save(false)}>Save draft</button>
          <button className="btn primary" disabled={busy} onClick={() => save(true)}>Submit for approval</button>
          <button className="btn ghost" onClick={() => nav(-1)}>Cancel</button>
        </div>
      </form>
    </>
  );
}
