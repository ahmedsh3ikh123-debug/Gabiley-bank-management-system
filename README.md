# Gabiley Bank Management System (GBMS)

A full-stack banking management system built with Next.js 14, Express 5, and SQLite.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui, Recharts
- **Backend**: Express 5, Node.js, SQLite (sql.js), JWT Authentication
- **Features**: Dark/Light mode, Multi-language (English, Somali, Arabic), Offline support

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd bank-management-system

# Install dependencies
npm install
cd server && npm install
cd ../client && npm install
cd ..
```

### Running

```bash
npm run dev
```

This starts both server (port 5000) and client (port 3000) concurrently.

### Seeding Data

```bash
# Seed admin + sample data
cd server
node seed-admin.js

# Or seed full demo data
node seed.js
```

Default credentials after seeding:
- **Admin**: `admin` / `admin123`
- **Employee**: `employee` / `employee123`

## Features

### Authentication
- JWT Access + Refresh tokens
- Role-based access control (7 roles)
- Transaction PIN verification
- Password reset flow
- Session management

### Admin Dashboard
- Total users, accounts, balance, transactions
- Today's deposits/withdrawals
- Pending loans
- Charts and analytics

### Customer Management
- View, search, block/unblock customers
- View customer accounts and transactions
- KYC document management

### Employee Management
- CRUD operations with department filtering
- Role assignment
- Status management

### Bank Accounts
- Savings, Current, Fixed Deposit accounts
- Account number auto-generation
- Block/unblock accounts

### Transactions
- Deposit, Withdrawal, Transfer
- Fee calculation
- Transaction history
- PIN verification for security

### Loans
- Customer application
- Admin review/approve/reject
- Loan calculator (EMI)

### Reports
- Daily, Monthly, Analytics views
- Export to CSV
- Charts and visualizations

### Settings
- Bank configuration
- Financial settings (fees, limits, rates)
- Maintenance mode
- Database backup/restore

### Security
- JWT with strong secret
- Password hashing (bcrypt, 12 rounds)
- Rate limiting (general + auth-specific)
- Helmet security headers
- Input validation
- Audit logging
- Token revocation on password change

## API Endpoints

### Auth
- `POST /api/auth/register` - Register customer
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh-token` - Refresh JWT
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update profile
- `POST /api/auth/change-password` - Change password
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `POST /api/auth/set-pin` - Set transaction PIN

### Accounts
- `GET /api/accounts` - List own accounts
- `GET /api/accounts/all` - List all accounts (admin)
- `POST /api/accounts` - Create account

### Transactions
- `GET /api/transactions` - List transactions
- `POST /api/transactions/deposit` - Deposit
- `POST /api/transactions/withdraw` - Withdraw
- `POST /api/transactions/transfer` - Transfer

### Loans
- `GET /api/loans` - List loans
- `POST /api/loans` - Apply for loan
- `GET /api/loans/calculator` - Loan calculator

### Admin
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/users` - List users
- `GET /api/admin/users/:id` - User details
- `PUT /api/admin/users/:id/role` - Change role
- `PUT /api/admin/users/:id/block` - Block user
- `PUT /api/admin/users/:id/unblock` - Unblock user
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/employees` - List employees
- `POST /api/admin/employees` - Create employee
- `PUT /api/admin/employees/:id` - Update employee
- `DELETE /api/admin/employees/:id` - Delete employee
- `GET /api/admin/loans` - List all loans
- `PUT /api/admin/loans/:id/approve` - Approve loan
- `PUT /api/admin/loans/:id/reject` - Reject loan
- `GET /api/admin/settings` - Get settings
- `PUT /api/admin/settings` - Update settings
- `POST /api/admin/backup` - Create backup
- `POST /api/admin/restore` - Restore backup
- `GET /api/admin/backups` - List backups
- `GET /api/admin/audit-logs` - Audit logs

### Reports
- `GET /api/reports/daily` - Daily report
- `GET /api/reports/monthly` - Monthly report
- `GET /api/reports/analytics` - Analytics data
- `GET /api/reports/export/:type` - Export CSV

### Notifications
- `GET /api/notifications` - List notifications
- `POST /api/notifications/:id/read` - Mark read
- `POST /api/notifications/read-all` - Mark all read
- `DELETE /api/notifications/:id` - Delete notification

## Project Structure

```
bank-management-system/
├── server/
│   ├── index.js           # Express server entry
│   ├── db.js              # SQLite database layer
│   ├── seed.js            # Full seed script
│   ├── seed-admin.js      # Admin seed script
│   ├── middleware/
│   │   ├── auth.js        # JWT authentication
│   │   └── validation.js  # Input validation
│   └── routes/
│       ├── auth.js        # Authentication routes
│       ├── accounts.js    # Account management
│       ├── transactions.js # Transaction processing
│       ├── admin.js       # Admin panel routes
│       ├── loans.js       # Loan management
│       ├── notifications.js
│       ├── reports.js     # Reporting
│       └── sync.js        # Offline sync
├── client/
│   └── src/
│       ├── app/           # Next.js App Router pages
│       ├── components/    # React components
│       ├── contexts/      # React contexts
│       ├── hooks/         # Custom hooks
│       ├── lib/           # Utilities
│       └── types/         # TypeScript types
└── package.json           # Root package with concurrently
```

## License

MIT
