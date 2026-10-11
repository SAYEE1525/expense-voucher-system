# Expense Voucher Management System 
**Made by Sayee Kulkarni**
Full-stack app that digitises expense voucher creation, Director approval and Accounts tracking.

**Stack:** React (Vite) · Node.js + Express · SQLite (better-sqlite3) · JWT auth · Multer (image upload)

## Setup

Requirements: Node.js 18+ (20 or 22 recommended).

```bash
# 1. Backend  (terminal 1)
cd backend
npm install
cp .env.example .env        # Windows: copy .env.example .env
npm start                   # API on http://localhost:5000

# 2. Frontend (terminal 2)
cd frontend
npm install
npm run dev                 # App on http://localhost:5173
```

The database file (`backend/data/vouchers.db`) and demo users are created automatically on first start.

### Demo accounts (password `password123`)
| Role | Email |
|---|---|
| Employee | employee@abc.com (also employee2@abc.com) |
| Director | director@abc.com |
| Accounts | accounts@abc.com |

To reset all data: stop the backend, delete `backend/data/` and `backend/uploads/*`, start again.

## Database schema
Defined in `backend/schema.sql` (applied automatically on startup).

- **users** – id, name, email (unique), password_hash (bcrypt), role (`employee|director|accounts`), employee_code, department
- **vouchers** – voucher_number (unique, auto `VCH-YYYY-00001`), voucher_date, expense_date, department, title, category, description, amount (> 0), user_id (owner), employee_name/code, employee_signature, status (`Draft|Submitted|Pending Approval|Approved|Rejected`), director_id, director_signature, approval_date, rejected_at, rejection_reason, created_at, updated_at
- **voucher_history** – audit trail of each transition (Created, Edited, Submitted, Pending Approval, Approved, Rejected) with actor and note

## API documentation
All routes except login need `Authorization: Bearer <token>`. Errors: `{ "message": "...", "errors": { field: "..." } }`.

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/api/auth/login` | public | `{email,password}` → `{token,user}` |
| GET | `/api/auth/me` | any | Current user |
| GET | `/api/dashboard` | any | Role-specific statistics + recent vouchers |
| GET | `/api/vouchers` | any | List (employee: own only; director/accounts: all non-draft). Query: `search, voucher_number, employee_name, department, category, status, from, to, minAmount, maxAmount, sortBy, order` |
| GET | `/api/vouchers/:id` | any (scoped) | Voucher + history |
| POST | `/api/vouchers` | employee | Create **Draft** (multipart: `department,title,expense_date,amount,category,description,signature?`) |
| PUT | `/api/vouchers/:id` | employee (owner, Draft) | Edit draft (same multipart fields) |
| DELETE | `/api/vouchers/:id` | employee (owner, Draft) | Delete draft |
| POST | `/api/vouchers/:id/submit` | employee (owner, Draft) | Draft → Pending Approval (needs employee signature) |
| POST | `/api/vouchers/:id/approve` | director | multipart `signature` (required) |
| POST | `/api/vouchers/:id/reject` | director | `{reason}` (required) |
| GET | `/uploads/<file>` | public* | Signature images |

`sortBy` accepts: voucher_number, employee_name, department, category, amount, status, expense_date, created_at, updated_at.

## How the business rules are enforced
- Roles are checked in backend middleware (`requireRole`), not just hidden in the UI. Frontend routes are also protected.
- Employees get a 404 for other people's vouchers. Accounts and Director cannot create/edit/delete; Director cannot edit employee data (no such endpoint).
- Edit/delete/submit only when status is Draft; approve/reject only when Pending Approval; approved/rejected vouchers are read-only.
- Validation (department, title, expense date, amount > 0, signatures, rejection reason) runs on both client and server.

## Assumptions
- SQLite is used so the project runs with zero database setup. The schema is plain SQL and ports easily to PostgreSQL/MySQL.
- "Submitted" and "Pending Approval" happen together on submit: both transitions are logged in history, and the voucher is stored as *Pending Approval*.
- Director and Accounts do not see employees' **Draft** vouchers (drafts are private work in progress).
- "Total Amount Claimed" (employee) = sum of all non-draft vouchers.
- Signatures: PNG/JPG/WEBP up to 2 MB, stored on disk with random file names and served from `/uploads` (*not behind auth; names are unguessable). A signature is attached per voucher.
- Currency is INR. Voucher date is the date of creation; Employee ID comes from the user profile.
- Accounts can print / save a voucher as PDF through the browser print dialog.
- Users are seeded; there is no sign-up or user-management screen.

