const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, '..', process.env.DB_FILE || 'data/vouchers.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8'));

// Seed demo users the first time the DB is created
if (db.prepare('SELECT COUNT(*) AS c FROM users').get().c === 0) {
  const ins = db.prepare(
    'INSERT INTO users (name,email,password_hash,role,employee_code,department) VALUES (?,?,?,?,?,?)'
  );
  const hash = bcrypt.hashSync('password123', 10);
  ins.run('Riya Sharma', 'employee@abc.com', hash, 'employee', 'EMP001', 'Engineering');
  ins.run('Amit Verma', 'employee2@abc.com', hash, 'employee', 'EMP002', 'Sales');
  ins.run('Dr. Meera Kapoor', 'director@abc.com', hash, 'director', 'DIR001', 'Management');
  ins.run('Accounts Team', 'accounts@abc.com', hash, 'accounts', 'ACC001', 'Finance');
  console.log('Seeded demo users (password: password123)');
}

module.exports = db;
