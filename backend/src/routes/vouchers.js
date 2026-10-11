const router = require('express').Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { upload, removeFile } = require('../middleware/upload');

router.use(authenticate);

const STATUSES = ['Draft', 'Submitted', 'Pending Approval', 'Approved', 'Rejected'];
const SORTABLE = {
  voucher_number: 'v.voucher_number',
  employee_name: 'v.employee_name',
  department: 'v.department',
  category: 'v.category',
  amount: 'v.amount',
  status: 'v.status',
  expense_date: 'v.expense_date',
  created_at: 'v.created_at',
  updated_at: 'v.updated_at',
};

const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);

const log = (voucherId, action, user, note = null) =>
  db
    .prepare('INSERT INTO voucher_history (voucher_id,action,actor_id,actor_name,note,created_at) VALUES (?,?,?,?,?,?)')
    .run(voucherId, action, user.id, user.name, note, now());

const fail = (res, status, message, errors) => res.status(status).json({ message, errors });

// ---------- access helpers ----------
function loadVoucher(req, res) {
  const v = db.prepare('SELECT * FROM vouchers WHERE id = ?').get(req.params.id);
  if (!v) return fail(res, 404, 'Voucher not found'), null;
  if (req.user.role === 'employee' && v.user_id !== req.user.id)
    return fail(res, 404, 'Voucher not found'), null; // do not reveal other users' vouchers
  // Director & Accounts only see vouchers that have left Draft
  if (req.user.role !== 'employee' && v.status === 'Draft') return fail(res, 404, 'Voucher not found'), null;
  return v;
}

function validateFields(body) {
  const errors = {};
  const department = (body.department || '').trim();
  const title = (body.title || '').trim();
  const expenseDate = (body.expense_date || '').trim();
  const amount = Number(body.amount);

  if (!department) errors.department = 'Department is required';
  if (!title) errors.title = 'Expense title is required';
  if (!expenseDate || Number.isNaN(Date.parse(expenseDate))) errors.expense_date = 'A valid expense date is required';
  if (body.amount === undefined || body.amount === '' || Number.isNaN(amount))
    errors.amount = 'Amount is required';
  else if (amount <= 0) errors.amount = 'Amount must be greater than zero';

  return {
    errors,
    values: {
      department,
      title,
      expense_date: expenseDate,
      category: (body.category || '').trim() || null,
      description: (body.description || '').trim() || null,
      amount: Math.round(amount * 100) / 100,
    },
  };
}

// ---------- list (search / filter / sort) ----------
router.get('/', (req, res) => {
  const q = req.query;
  const where = [];
  const args = [];

  if (req.user.role === 'employee') {
    where.push('v.user_id = ?');
    args.push(req.user.id);
  } else {
    where.push("v.status <> 'Draft'");
  }

  if (q.search) {
    where.push('(v.voucher_number LIKE ? OR v.employee_name LIKE ? OR v.title LIKE ?)');
    const s = `%${q.search}%`;
    args.push(s, s, s);
  }
  if (q.voucher_number) { where.push('v.voucher_number LIKE ?'); args.push(`%${q.voucher_number}%`); }
  if (q.employee_name) { where.push('v.employee_name LIKE ?'); args.push(`%${q.employee_name}%`); }
  if (q.department) { where.push('v.department = ?'); args.push(q.department); }
  if (q.category) { where.push('v.category = ?'); args.push(q.category); }
  if (q.status && STATUSES.includes(q.status)) { where.push('v.status = ?'); args.push(q.status); }
  if (q.from) { where.push('v.expense_date >= ?'); args.push(q.from); }
  if (q.to) { where.push('v.expense_date <= ?'); args.push(q.to); }
  if (q.minAmount) { where.push('v.amount >= ?'); args.push(Number(q.minAmount)); }
  if (q.maxAmount) { where.push('v.amount <= ?'); args.push(Number(q.maxAmount)); }

  const sortCol = SORTABLE[q.sortBy] || SORTABLE.created_at;
  const order = String(q.order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const rows = db
    .prepare(`SELECT v.* FROM vouchers v WHERE ${where.join(' AND ')} ORDER BY ${sortCol} ${order}, v.id DESC`)
    .all(...args);
  res.json({ vouchers: rows });
});

// ---------- detail ----------
router.get('/:id', (req, res) => {
  const v = loadVoucher(req, res);
  if (!v) return;
  const history = db.prepare('SELECT * FROM voucher_history WHERE voucher_id = ? ORDER BY id').all(v.id);
  res.json({ voucher: v, history });
});

// ---------- create (always Draft) ----------
router.post('/', requireRole('employee'), upload.single('signature'), (req, res) => {
  const { errors, values } = validateFields(req.body);
  if (Object.keys(errors).length) {
    if (req.file) removeFile(req.file.filename);
    return fail(res, 400, 'Validation failed', errors);
  }

  const u = req.user;
  const create = db.transaction(() => {
    const ts = now();
    const info = db
      .prepare(
        `INSERT INTO vouchers
         (voucher_number,voucher_date,expense_date,department,title,category,description,amount,
          user_id,employee_name,employee_code,employee_signature,status,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'Draft',?,?)`
      )
      .run(
        'TMP-' + Date.now(), today(), values.expense_date, values.department, values.title,
        values.category, values.description, values.amount, u.id, u.name, u.employee_code,
        req.file ? req.file.filename : null, ts, ts
      );
    const id = info.lastInsertRowid;
    const number = `VCH-${new Date().getFullYear()}-${String(id).padStart(5, '0')}`;
    db.prepare('UPDATE vouchers SET voucher_number = ? WHERE id = ?').run(number, id);
    log(id, 'Created as Draft', u);
    return id;
  });

  const id = create();
  res.status(201).json({ voucher: db.prepare('SELECT * FROM vouchers WHERE id = ?').get(id) });
});

// ---------- edit draft ----------
router.put('/:id', requireRole('employee'), upload.single('signature'), (req, res) => {
  const v = loadVoucher(req, res);
  if (!v) return req.file && removeFile(req.file.filename);
  if (v.status !== 'Draft') {
    if (req.file) removeFile(req.file.filename);
    return fail(res, 409, 'Only Draft vouchers can be edited');
  }
  const { errors, values } = validateFields(req.body);
  if (Object.keys(errors).length) {
    if (req.file) removeFile(req.file.filename);
    return fail(res, 400, 'Validation failed', errors);
  }

  let sig = v.employee_signature;
  if (req.file) { removeFile(sig); sig = req.file.filename; }

  db.prepare(
    `UPDATE vouchers SET department=?,title=?,expense_date=?,category=?,description=?,amount=?,
     employee_signature=?,updated_at=? WHERE id=?`
  ).run(values.department, values.title, values.expense_date, values.category, values.description,
        values.amount, sig, now(), v.id);
  log(v.id, 'Draft edited', req.user);
  res.json({ voucher: db.prepare('SELECT * FROM vouchers WHERE id = ?').get(v.id) });
});

// ---------- delete draft ----------
router.delete('/:id', requireRole('employee'), (req, res) => {
  const v = loadVoucher(req, res);
  if (!v) return;
  if (v.status !== 'Draft') return fail(res, 409, 'Only Draft vouchers can be deleted');
  db.prepare('DELETE FROM vouchers WHERE id = ?').run(v.id);
  removeFile(v.employee_signature);
  res.json({ message: 'Voucher deleted' });
});

// ---------- submit ----------
router.post('/:id/submit', requireRole('employee'), (req, res) => {
  const v = loadVoucher(req, res);
  if (!v) return;
  if (v.status !== 'Draft') return fail(res, 409, 'Only Draft vouchers can be submitted');
  if (!v.employee_signature)
    return fail(res, 400, 'Validation failed', { signature: 'Employee signature is required before submission' });

  // Draft -> Submitted -> Pending Approval (both transitions are recorded)
  db.transaction(() => {
    db.prepare("UPDATE vouchers SET status='Pending Approval', updated_at=? WHERE id=?").run(now(), v.id);
    log(v.id, 'Submitted', req.user);
    log(v.id, 'Pending Approval', req.user);
  })();
  res.json({ voucher: db.prepare('SELECT * FROM vouchers WHERE id = ?').get(v.id) });
});

// ---------- approve ----------
router.post('/:id/approve', requireRole('director'), upload.single('signature'), (req, res) => {
  const v = loadVoucher(req, res);
  if (!v) return req.file && removeFile(req.file.filename);
  if (v.status !== 'Pending Approval') {
    if (req.file) removeFile(req.file.filename);
    return fail(res, 409, 'Only vouchers pending approval can be approved');
  }
  if (!req.file) return fail(res, 400, 'Validation failed', { signature: 'Director signature is required for approval' });

  const ts = now();
  db.transaction(() => {
    db.prepare(
      `UPDATE vouchers SET status='Approved', director_id=?, director_signature=?, approval_date=?, updated_at=? WHERE id=?`
    ).run(req.user.id, req.file.filename, ts, ts, v.id);
    log(v.id, 'Approved', req.user);
  })();
  res.json({ voucher: db.prepare('SELECT * FROM vouchers WHERE id = ?').get(v.id) });
});

// ---------- reject ----------
router.post('/:id/reject', requireRole('director'), (req, res) => {
  const v = loadVoucher(req, res);
  if (!v) return;
  if (v.status !== 'Pending Approval') return fail(res, 409, 'Only vouchers pending approval can be rejected');
  const reason = (req.body.reason || '').trim();
  if (!reason) return fail(res, 400, 'Validation failed', { reason: 'Rejection reason is required' });

  const ts = now();
  db.transaction(() => {
    db.prepare(
      `UPDATE vouchers SET status='Rejected', director_id=?, rejection_reason=?, rejected_at=?, updated_at=? WHERE id=?`
    ).run(req.user.id, reason, ts, ts, v.id);
    log(v.id, 'Rejected', req.user, reason);
  })();
  res.json({ voucher: db.prepare('SELECT * FROM vouchers WHERE id = ?').get(v.id) });
});

module.exports = router;
