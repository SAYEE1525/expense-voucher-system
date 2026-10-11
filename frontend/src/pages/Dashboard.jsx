import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, money, fmtDate } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

const CARDS = {
  employee: [
    ['Total vouchers', 'totalVouchers'], ['Drafts', 'draft'], ['Pending approval', 'pendingApproval'],
    ['Approved', 'approved'], ['Rejected', 'rejected'], ['Total amount claimed', 'totalAmountClaimed', true],
  ],
  director: [
    ['Pending approval', 'pendingApproval'], ['Approved today', 'approvedToday'],
    ['Rejected today', 'rejectedToday'], ['Total pending amount', 'totalPendingAmount', true],
  ],
  accounts: [
    ['Total vouchers', 'totalVouchers'], ['Pending approval', 'pendingApproval'], ['Approved', 'approved'],
    ['Rejected', 'rejected'], ['Total approved amount', 'totalApprovedAmount', true],
  ],
};
const RECENT_TITLE = { employee: 'Recent vouchers', director: 'Recent voucher activity', accounts: 'Recently approved' };

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api.dashboard().then(setData).catch((e) => setError(e.message)); }, []);
  if (error) return <div className="alert error">{error}</div>;
  if (!data) return <p className="center-note">Loading…</p>;

  return (
    <>
      <h1>Hello, {user.name.split(' ')[0]}</h1>
      <div className="stats">
        {CARDS[user.role].map(([label, key, isMoney]) => (
          <div className="stat" key={key}>
            <span className="stat-value">{isMoney ? money(data[key]) : data[key]}</span>
            <span className="stat-label">{label}</span>
          </div>
        ))}
      </div>

      <section className="panel">
        <h2>{RECENT_TITLE[user.role]}</h2>
        {data.recent.length === 0 ? (
          <p className="muted">
            Nothing here yet.{' '}
            {user.role === 'employee' && <Link to="/vouchers/new">Create your first voucher</Link>}
          </p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Voucher</th>{user.role !== 'employee' && <th>Employee</th>}<th>Title</th><th>Amount</th><th>Status</th><th>Updated</th></tr>
              </thead>
              <tbody>
                {data.recent.map((v) => (
                  <tr key={v.id}>
                    <td><Link to={`/vouchers/${v.id}`}>{v.voucher_number}</Link></td>
                    {user.role !== 'employee' && <td>{v.employee_name}</td>}
                    <td>{v.title}</td>
                    <td className="num">{money(v.amount)}</td>
                    <td><StatusBadge status={v.status} /></td>
                    <td>{fmtDate(v.updated_at)}</td>
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
