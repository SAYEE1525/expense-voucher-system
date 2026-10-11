import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money, fmtDate, DEPARTMENTS, CATEGORIES, STATUSES } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const EMPTY = { search: '', status: '', department: '', category: '', from: '', to: '', minAmount: '', maxAmount: '' };

export default function VoucherList({ mode }) {
  const { user } = useAuth();
  const isEmployee = user.role === 'employee';
  const pendingOnly = mode === 'pending';
  const [filters, setFilters] = useState(EMPTY);
  const [sort, setSort] = useState({ sortBy: 'created_at', order: 'desc' });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { setFilters(EMPTY); }, [mode]);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      const query = { ...filters, ...sort };
      if (pendingOnly) query.status = 'Pending Approval';
      api.list(query).then((r) => { setRows(r.vouchers); setError(''); })
        .catch((e) => setError(e.message)).finally(() => setLoading(false));
    }, 250); // debounce typing
    return () => clearTimeout(t);
  }, [filters, sort, pendingOnly]);

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const toggleSort = (col) =>
    setSort((s) => ({ sortBy: col, order: s.sortBy === col && s.order === 'asc' ? 'desc' : 'asc' }));
  const Th = ({ col, children }) => (
    <th className="sortable" onClick={() => toggleSort(col)}>
      {children}{sort.sortBy === col ? (sort.order === 'asc' ? ' ▲' : ' ▼') : ''}
    </th>
  );

  const title = pendingOnly ? 'Pending approvals' : isEmployee ? 'My vouchers' : 'All vouchers';
  const statusOptions = isEmployee ? STATUSES : STATUSES.filter((s) => s !== 'Draft');

  return (
    <>
      <div className="page-head">
        <h1>{title}</h1>
        {isEmployee && <Link className="btn primary" to="/vouchers/new">New voucher</Link>}
      </div>

      <section className="panel filters">
        <label className="grow">Search
          <input placeholder="Voucher no., employee or title" value={filters.search} onChange={set('search')} />
        </label>
        {!pendingOnly && (
          <label>Status
            <select value={filters.status} onChange={set('status')}>
              <option value="">All</option>
              {statusOptions.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
        )}
        <label>Department
          <select value={filters.department} onChange={set('department')}>
            <option value="">All</option>
            {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
          </select>
        </label>
        <label>Category
          <select value={filters.category} onChange={set('category')}>
            <option value="">All</option>
            {CATEGORIES.map((d) => <option key={d}>{d}</option>)}
          </select>
        </label>
        <label>Expense from<input type="date" value={filters.from} onChange={set('from')} /></label>
        <label>Expense to<input type="date" value={filters.to} onChange={set('to')} /></label>
        <label>Min amount<input type="number" min="0" value={filters.minAmount} onChange={set('minAmount')} /></label>
        <label>Max amount<input type="number" min="0" value={filters.maxAmount} onChange={set('maxAmount')} /></label>
        <button className="btn ghost" onClick={() => setFilters(EMPTY)}>Clear filters</button>
      </section>

      {error && <div className="alert error">{error}</div>}
      <section className="panel">
        {loading ? <p className="muted">Loading…</p> : rows.length === 0 ? (
          <p className="muted">No vouchers match these filters.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <Th col="voucher_number">Voucher</Th>
                  {!isEmployee && <Th col="employee_name">Employee</Th>}
                  <th>Title</th>
                  <Th col="department">Department</Th>
                  <Th col="category">Category</Th>
                  <Th col="expense_date">Expense date</Th>
                  <Th col="amount">Amount</Th>
                  <Th col="status">Status</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((v) => (
                  <tr key={v.id}>
                    <td><Link to={`/vouchers/${v.id}`}>{v.voucher_number}</Link></td>
                    {!isEmployee && <td>{v.employee_name}</td>}
                    <td>{v.title}</td>
                    <td>{v.department}</td>
                    <td>{v.category || '—'}</td>
                    <td>{fmtDate(v.expense_date)}</td>
                    <td className="num">{money(v.amount)}</td>
                    <td><StatusBadge status={v.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
