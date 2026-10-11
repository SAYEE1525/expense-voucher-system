const router = require('express').Router();
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', (req, res) => {
  const { role, id } = req.user;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const since = startOfToday.toISOString();
  const one = (sql, ...a) => db.prepare(sql).get(...a);

  if (role === 'employee') {
    const c = (s) => one('SELECT COUNT(*) n FROM vouchers WHERE user_id=? AND status=?', id, s).n;
    return res.json({
      role,
      totalVouchers: one('SELECT COUNT(*) n FROM vouchers WHERE user_id=?', id).n,
      draft: c('Draft'),
      pendingApproval: c('Pending Approval'),
      approved: c('Approved'),
      rejected: c('Rejected'),
      // amount of all vouchers that have been submitted (i.e. not Draft)
      totalAmountClaimed: one("SELECT COALESCE(SUM(amount),0) n FROM vouchers WHERE user_id=? AND status<>'Draft'", id).n,
      recent: db.prepare('SELECT * FROM vouchers WHERE user_id=? ORDER BY updated_at DESC LIMIT 5').all(id),
    });
  }

  const c = (s) => one('SELECT COUNT(*) n FROM vouchers WHERE status=?', s).n;

  if (role === 'director') {
    return res.json({
      role,
      pendingApproval: c('Pending Approval'),
      approvedToday: one("SELECT COUNT(*) n FROM vouchers WHERE status='Approved' AND approval_date>=?", since).n,
      rejectedToday: one("SELECT COUNT(*) n FROM vouchers WHERE status='Rejected' AND rejected_at>=?", since).n,
      totalPendingAmount: one("SELECT COALESCE(SUM(amount),0) n FROM vouchers WHERE status='Pending Approval'").n,
      recent: db.prepare("SELECT * FROM vouchers WHERE status<>'Draft' ORDER BY updated_at DESC LIMIT 8").all(),
    });
  }

  // accounts
  res.json({
    role,
    totalVouchers: one("SELECT COUNT(*) n FROM vouchers WHERE status<>'Draft'").n,
    pendingApproval: c('Pending Approval'),
    approved: c('Approved'),
    rejected: c('Rejected'),
    totalApprovedAmount: one("SELECT COALESCE(SUM(amount),0) n FROM vouchers WHERE status='Approved'").n,
    recent: db.prepare("SELECT * FROM vouchers WHERE status='Approved' ORDER BY approval_date DESC LIMIT 5").all(),
  });
});

module.exports = router;
