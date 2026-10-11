const TOKEN_KEY = 'voucher_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

async function request(path, { method = 'GET', body, query } = {}) {
  const url = new URL('/api' + path, window.location.origin);
  if (query) Object.entries(query).forEach(([k, v]) => v !== '' && v != null && url.searchParams.set(k, v));

  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload = body;
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  const res = await fetch(url, { method, headers, body: payload });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) {
      setToken(null);
      window.location.href = '/login';
    }
    const err = new Error(data.message || 'Request failed');
    err.errors = data.errors || {};
    throw err;
  }
  return data;
}

export const api = {
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request('/auth/me'),
  dashboard: () => request('/dashboard'),
  list: (query) => request('/vouchers', { query }),
  get: (id) => request(`/vouchers/${id}`),
  create: (fd) => request('/vouchers', { method: 'POST', body: fd }),
  update: (id, fd) => request(`/vouchers/${id}`, { method: 'PUT', body: fd }),
  remove: (id) => request(`/vouchers/${id}`, { method: 'DELETE' }),
  submit: (id) => request(`/vouchers/${id}/submit`, { method: 'POST' }),
  approve: (id, fd) => request(`/vouchers/${id}/approve`, { method: 'POST', body: fd }),
  reject: (id, reason) => request(`/vouchers/${id}/reject`, { method: 'POST', body: { reason } }),
};

export const DEPARTMENTS = ['Engineering', 'Finance', 'HR', 'IT', 'Marketing', 'Operations', 'Sales'];
export const CATEGORIES = ['Travel', 'Food', 'Accommodation', 'Office Supplies', 'Software', 'Communication', 'Training', 'Other'];
export const STATUSES = ['Draft', 'Pending Approval', 'Approved', 'Rejected'];

export const money = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(n) || 0);
export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
export const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
