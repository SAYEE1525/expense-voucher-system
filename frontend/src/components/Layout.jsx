import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';

const ROLE_LABEL = { employee: 'Employee', director: 'Director', accounts: 'Accounts Team' };

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const links = [{ to: '/', label: 'Dashboard', end: true }];
  if (user.role === 'employee') {
    links.push({ to: '/vouchers', label: 'My vouchers', end: true }, { to: '/vouchers/new', label: 'New voucher' });
  } else if (user.role === 'director') {
    links.push({ to: '/pending', label: 'Pending approvals' }, { to: '/vouchers', label: 'All vouchers', end: true });
  } else {
    links.push({ to: '/vouchers', label: 'All vouchers', end: true });
  }

  return (
    <div className="shell">
      <header className="topbar no-print">
        <div className="brand">ABC Vouchers</div>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>{l.label}</NavLink>
          ))}
        </nav>
        <div className="who">
          <span>{user.name}<small>{ROLE_LABEL[user.role]}</small></span>
          <button className="btn ghost" onClick={() => { logout(); nav('/login'); }}>Sign out</button>
        </div>
      </header>
      <main className="page"><Outlet /></main>
    </div>
  );
}
