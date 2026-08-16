const express = require('express');
const bcrypt = require('bcryptjs');
const { queryOne, queryAll, run, getSetting, logAudit, createNotification, generateTransactionId, saveDatabase } = require('../db');
const { authenticateToken, requireAdmin, requireTeller } = require('../middleware/auth');
const { sanitizeInput, validateAmount } = require('../middleware/validation');

const router = express.Router();

async function verifyPin(userId, pin) {
  if (!pin) return false;
  const user = queryOne('SELECT pin FROM users WHERE id = ?', [userId]);
  if (!user || !user.pin) return false;
  return bcrypt.compare(pin, user.pin);
}

function isStaff(user) {
  return ['super_admin', 'branch_manager', 'manager', 'teller', 'customer_service', 'accountant', 'ict_staff'].includes(user.role);
}

function buildReceipt(txn, account, customerName, processedByName) {
  return {
    transaction_id: txn.transaction_id,
    type: txn.type,
    amount: txn.amount,
    fee: txn.fee || 0,
    total: txn.type === 'transfer' ? txn.amount + (txn.fee || 0) : txn.amount,
    description: txn.description,
    status: txn.status,
    account_number: account.account_number,
    account_type: account.account_type,
    customer_name: customerName,
    processed_by: processedByName,
    created_at: txn.created_at,
  };
}

// ───────────────────────────────────────────────
// GET / — List transactions
// ───────────────────────────────────────────────
router.get('/', authenticateToken, (req, res) => {
  try {
    const { search, type, status, from_date, to_date, account_id } = req.query;

    let sql = `
      SELECT t.id, t.transaction_id, t.from_account_id, t.to_account_id, t.type,
             t.amount, t.fee, t.description, t.status, t.processed_by,
             t.sync_status, t.client_id, t.created_at, t.updated_at,
             fa.account_number AS from_account_number,
             ta.account_number AS to_account_number,
             fu.full_name AS from_customer_name,
             tu.full_name AS to_customer_name
      FROM transactions t
      LEFT JOIN accounts fa ON t.from_account_id = fa.id
      LEFT JOIN accounts ta ON t.to_account_id = ta.id
      LEFT JOIN users fu ON fa.user_id = fu.id
      LEFT JOIN users tu ON ta.user_id = tu.id
    `;

    const conditions = [];
    const params = [];

    if (!isStaff(req.user)) {
      conditions.push(`(fa.user_id = ? OR ta.user_id = ?)`);
      params.push(req.user.id, req.user.id);
    }

    if (account_id) {
      conditions.push(`(t.from_account_id = ? OR t.to_account_id = ?)`);
      params.push(account_id, account_id);
    }

    if (search) {
      conditions.push(`(t.transaction_id LIKE ? OR t.description LIKE ? OR fa.account_number LIKE ? OR ta.account_number LIKE ?)`);
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    if (type) {
      conditions.push(`t.type = ?`);
      params.push(type);
    }

    if (status) {
      conditions.push(`t.status = ?`);
      params.push(status);
    }

    if (from_date) {
      conditions.push(`t.created_at >= ?`);
      params.push(from_date);
    }

    if (to_date) {
      conditions.push(`t.created_at <= ?`);
      params.push(to_date + ' 23:59:59');
    }

    if (conditions.length > 0) {
      sql += ` WHERE ` + conditions.join(' AND ');
    }

    sql += ` ORDER BY t.created_at DESC`;

    const transactions = queryAll(sql, params);
    res.json(transactions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ───────────────────────────────────────────────
// POST /deposit — Request deposit (pending approval)
// ───────────────────────────────────────────────
router.post('/deposit', authenticateToken, async (req, res) => {
  try {
    const { account_number, amount, description, pin, client_id } = req.body;

    if (!account_number) return res.status(400).json({ error: 'Account number is required' });
    if (!amount || !validateAmount(amount)) return res.status(400).json({ error: 'Amount must be a positive number' });

    const account = queryOne('SELECT id, user_id, account_number, balance, status, frozen, account_type FROM accounts WHERE account_number = ?', [account_number]);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    if (account.status !== 'active') return res.status(403).json({ error: 'Account is not active' });
    if (account.frozen) return res.status(403).json({ error: 'Account is frozen' });

    if (!isStaff(req.user) && account.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only deposit to your own accounts' });
    }

    const pinValid = await verifyPin(account.user_id, pin);
    if (!pinValid) return res.status(400).json({ error: 'Invalid transaction PIN' });

    if (client_id) {
      const existing = queryOne('SELECT id, transaction_id FROM transactions WHERE client_id = ?', [client_id]);
      if (existing) {
        return res.status(200).json({ message: 'Transaction already processed', transaction_id: existing.transaction_id });
      }
    }

    const transaction_id = generateTransactionId();

    run(
      `INSERT INTO transactions (transaction_id, to_account_id, type, amount, description, processed_by, client_id, sync_status, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [transaction_id, account.id, 'deposit', amount, sanitizeInput(description || 'Cash deposit'), req.user.id, client_id || null, client_id ? 'pending' : 'synced', 'pending']
    );

    logAudit(req.user.id, 'deposit_request', 'transaction', `Deposit requested: $${amount} to account ${account.account_number} (txn: ${transaction_id})`, req.ip);
    createNotification(account.user_id, 'Deposit Pending', `$${amount.toFixed(2)} deposit to account ${account.account_number} is pending approval.`, 'info');

    const customer = queryOne('SELECT full_name FROM users WHERE id = ?', [account.user_id]);
    const txnRecord = queryOne('SELECT * FROM transactions WHERE transaction_id = ?', [transaction_id]);

    res.status(201).json({
      message: 'Deposit request submitted, pending approval',
      transaction_id,
      status: 'pending',
      receipt: buildReceipt(txnRecord, account, customer?.full_name, null),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ───────────────────────────────────────────────
// POST /deposit/approve — Approve deposit (staff only)
// ───────────────────────────────────────────────
router.post('/deposit/approve', authenticateToken, async (req, res) => {
  try {
    const { transaction_id } = req.body;

    if (!transaction_id) return res.status(400).json({ error: 'Transaction ID is required' });

    if (!isStaff(req.user)) {
      return res.status(403).json({ error: 'Only staff can approve deposits' });
    }

    const txn = queryOne('SELECT * FROM transactions WHERE transaction_id = ? AND type = ? AND status = ?', [transaction_id, 'deposit', 'pending']);
    if (!txn) return res.status(404).json({ error: 'Pending deposit not found' });

    const account = queryOne('SELECT id, user_id, account_number, balance, status, frozen FROM accounts WHERE id = ?', [txn.to_account_id]);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    if (account.status !== 'active') return res.status(403).json({ error: 'Account is not active' });
    if (account.frozen) return res.status(403).json({ error: 'Account is frozen' });

    const newBalance = account.balance + txn.amount;

    run('UPDATE accounts SET balance = ?, version = version + 1, updated_at = datetime(\'now\') WHERE id = ?', [newBalance, account.id]);
    run('UPDATE transactions SET status = ?, processed_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['completed', req.user.id, txn.id]);

    logAudit(req.user.id, 'deposit_approved', 'transaction', `Approved deposit: $${txn.amount} to account ${account.account_number} (txn: ${transaction_id})`, req.ip);
    createNotification(account.user_id, 'Deposit Approved', `$${txn.amount.toFixed(2)} has been deposited to your account (${account.account_number}). New balance: $${newBalance.toFixed(2)}`, 'success');

    const customer = queryOne('SELECT full_name FROM users WHERE id = ?', [account.user_id]);
    const processedBy = queryOne('SELECT full_name FROM users WHERE id = ?', [req.user.id]);

    const updatedTxn = queryOne('SELECT * FROM transactions WHERE transaction_id = ?', [transaction_id]);

    res.json({
      message: 'Deposit approved successfully',
      transaction_id,
      new_balance: newBalance,
      receipt: buildReceipt(updatedTxn, account, customer?.full_name, processedBy?.full_name),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ───────────────────────────────────────────────
// POST /deposit/reject — Reject deposit (staff only)
// ───────────────────────────────────────────────
router.post('/deposit/reject', authenticateToken, async (req, res) => {
  try {
    const { transaction_id, reason } = req.body;

    if (!transaction_id) return res.status(400).json({ error: 'Transaction ID is required' });

    if (!isStaff(req.user)) {
      return res.status(403).json({ error: 'Only staff can reject deposits' });
    }

    const txn = queryOne('SELECT * FROM transactions WHERE transaction_id = ? AND type = ? AND status = ?', [transaction_id, 'deposit', 'pending']);
    if (!txn) return res.status(404).json({ error: 'Pending deposit not found' });

    run('UPDATE transactions SET status = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', ['rejected', reason ? `${txn.description} - Rejected: ${reason}` : txn.description, txn.id]);

    const account = queryOne('SELECT user_id, account_number FROM accounts WHERE id = ?', [txn.to_account_id]);

    logAudit(req.user.id, 'deposit_rejected', 'transaction', `Rejected deposit: $${txn.amount} to account ${account?.account_number} (txn: ${transaction_id})`, req.ip);
    createNotification(account?.user_id, 'Deposit Rejected', `$${txn.amount.toFixed(2)} deposit to account ${account?.account_number} was rejected. ${reason || ''}`, 'warning');

    res.json({
      message: 'Deposit rejected',
      transaction_id,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ───────────────────────────────────────────────
// POST /withdraw — Process withdrawal
// ───────────────────────────────────────────────
router.post('/withdraw', authenticateToken, async (req, res) => {
  try {
    const { account_number, amount, description, pin, client_id } = req.body;

    if (!account_number) return res.status(400).json({ error: 'Account number is required' });
    if (!amount || !validateAmount(amount)) return res.status(400).json({ error: 'Amount must be a positive number' });

    const account = queryOne('SELECT id, user_id, account_number, balance, status, frozen, account_type FROM accounts WHERE account_number = ?', [account_number]);
    if (!account) return res.status(404).json({ error: 'Account not found' });
    if (account.status !== 'active') return res.status(403).json({ error: 'Account is not active' });
    if (account.frozen) return res.status(403).json({ error: 'Account is frozen' });

    if (!isStaff(req.user) && account.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only withdraw from your own accounts' });
    }

    const pinValid = await verifyPin(account.user_id, pin);
    if (!pinValid) return res.status(400).json({ error: 'Invalid transaction PIN' });

    if (client_id) {
      const existing = queryOne('SELECT id, transaction_id FROM transactions WHERE client_id = ?', [client_id]);
      if (existing) {
        return res.status(200).json({ message: 'Transaction already processed', transaction_id: existing.transaction_id });
      }
    }

    const minBalance = parseFloat(getSetting('min_balance') || '100');
    if (account.balance < amount) {
      return res.status(400).json({ error: 'Insufficient funds' });
    }
    if (account.balance - amount < minBalance) {
      return res.status(400).json({ error: `Insufficient funds. Minimum balance of $${minBalance} must be maintained` });
    }

    const dailyWithdrawn = queryOne(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM transactions
       WHERE type = 'withdrawal'
         AND status = 'completed'
         AND (from_account_id = ? OR to_account_id = ?)
         AND created_at >= date('now', 'start of day')`,
      [account.id, account.id]
    );
    const dailyLimit = parseFloat(getSetting('daily_transfer_limit') || '200000');
    if ((dailyWithdrawn?.total || 0) + amount > dailyLimit) {
      return res.status(400).json({ error: `Daily withdrawal limit of $${dailyLimit.toLocaleString()} exceeded` });
    }

    const transaction_id = generateTransactionId();
    const newBalance = account.balance - amount;

    run('UPDATE accounts SET balance = ?, version = version + 1, updated_at = datetime(\'now\') WHERE id = ?', [newBalance, account.id]);
    run(
      `INSERT INTO transactions (transaction_id, from_account_id, type, amount, description, processed_by, client_id, sync_status, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [transaction_id, account.id, 'withdrawal', amount, sanitizeInput(description || 'Cash withdrawal'), req.user.id, client_id || null, client_id ? 'pending' : 'synced', 'completed']
    );

    logAudit(req.user.id, 'withdrawal', 'transaction', `Withdrew $${amount} from account ${account.account_number} (txn: ${transaction_id})`, req.ip);
    createNotification(account.user_id, 'Withdrawal Successful', `$${amount.toFixed(2)} has been withdrawn from your account (${account.account_number}). New balance: $${newBalance.toFixed(2)}`, 'info');

    const customer = queryOne('SELECT full_name FROM users WHERE id = ?', [account.user_id]);
    const processedBy = queryOne('SELECT full_name FROM users WHERE id = ?', [req.user.id]);

    const txnRecord = queryOne('SELECT * FROM transactions WHERE transaction_id = ?', [transaction_id]);

    res.status(201).json({
      message: 'Withdrawal successful',
      transaction_id,
      new_balance: newBalance,
      receipt: buildReceipt(txnRecord, account, customer?.full_name, processedBy?.full_name),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ───────────────────────────────────────────────
// POST /transfer — Process transfer
// ───────────────────────────────────────────────
router.post('/transfer', authenticateToken, async (req, res) => {
  try {
    const { from_account_number, to_account_number, amount, description, pin, client_id } = req.body;

    if (!from_account_number) return res.status(400).json({ error: 'Source account number is required' });
    if (!to_account_number) return res.status(400).json({ error: 'Destination account number is required' });
    if (!amount || !validateAmount(amount)) return res.status(400).json({ error: 'Amount must be a positive number' });
    if (from_account_number === to_account_number) return res.status(400).json({ error: 'Cannot transfer to the same account' });

    const maxTransfer = parseFloat(getSetting('max_transfer') || '50000');
    if (amount > maxTransfer) {
      return res.status(400).json({ error: `Transfer exceeds maximum limit of $${maxTransfer.toLocaleString()}` });
    }

    const fromAccount = queryOne('SELECT id, user_id, account_number, balance, status, frozen, account_type FROM accounts WHERE account_number = ?', [from_account_number]);
    if (!fromAccount) return res.status(404).json({ error: 'Source account not found' });
    if (fromAccount.status !== 'active') return res.status(403).json({ error: 'Source account is not active' });
    if (fromAccount.frozen) return res.status(403).json({ error: 'Source account is frozen' });

    if (!isStaff(req.user) && fromAccount.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only transfer from your own accounts' });
    }

    const toAccount = queryOne('SELECT id, user_id, account_number, balance, status, frozen, account_type FROM accounts WHERE account_number = ?', [to_account_number]);
    if (!toAccount) return res.status(404).json({ error: 'Destination account not found' });
    if (toAccount.status !== 'active') return res.status(403).json({ error: 'Destination account is not active' });
    if (toAccount.frozen) return res.status(403).json({ error: 'Destination account is frozen' });

    const pinValid = await verifyPin(fromAccount.user_id, pin);
    if (!pinValid) return res.status(400).json({ error: 'Invalid transaction PIN' });

    if (client_id) {
      const existing = queryOne('SELECT id, transaction_id FROM transactions WHERE client_id = ?', [client_id]);
      if (existing) {
        return res.status(200).json({ message: 'Transaction already processed', transaction_id: existing.transaction_id });
      }
    }

    const feePercent = parseFloat(getSetting('transfer_fee') || '1.5');
    const fee = parseFloat((amount * (feePercent / 100)).toFixed(2));
    const totalDeduction = amount + fee;

    const minBalance = parseFloat(getSetting('min_balance') || '100');
    if (fromAccount.balance < totalDeduction) {
      return res.status(400).json({ error: `Insufficient funds. Required: $${totalDeduction.toFixed(2)} (including $${fee.toFixed(2)} fee)` });
    }
    if (fromAccount.balance - totalDeduction < minBalance) {
      return res.status(400).json({ error: `Transfer would breach minimum balance of $${minBalance}` });
    }

    const dailyTransferred = queryOne(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM transactions
       WHERE type = 'transfer'
         AND status = 'completed'
         AND from_account_id = ?
         AND created_at >= date('now', 'start of day')`,
      [fromAccount.id]
    );
    const dailyLimit = parseFloat(getSetting('daily_transfer_limit') || '200000');
    if ((dailyTransferred?.total || 0) + amount > dailyLimit) {
      return res.status(400).json({ error: `Daily transfer limit of $${dailyLimit.toLocaleString()} exceeded` });
    }

    const transaction_id = generateTransactionId();
    const newFromBalance = fromAccount.balance - totalDeduction;
    const newToBalance = toAccount.balance + amount;

    run('UPDATE accounts SET balance = ?, version = version + 1, updated_at = datetime(\'now\') WHERE id = ?', [newFromBalance, fromAccount.id]);
    run('UPDATE accounts SET balance = ?, version = version + 1, updated_at = datetime(\'now\') WHERE id = ?', [newToBalance, toAccount.id]);
    run(
      `INSERT INTO transactions (transaction_id, from_account_id, to_account_id, type, amount, fee, description, processed_by, client_id, sync_status, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [transaction_id, fromAccount.id, toAccount.id, 'transfer', amount, fee, sanitizeInput(description || 'Account transfer'), req.user.id, client_id || null, client_id ? 'pending' : 'synced', 'completed']
    );

    logAudit(req.user.id, 'transfer', 'transaction', `Transferred $${amount} (fee: $${fee.toFixed(2)}) from ${from_account_number} to ${to_account_number} (txn: ${transaction_id})`, req.ip);
    createNotification(fromAccount.user_id, 'Transfer Successful', `$${amount.toFixed(2)} transferred to ${to_account_number}. Fee: $${fee.toFixed(2)}. New balance: $${newFromBalance.toFixed(2)}`, 'success');
    createNotification(toAccount.user_id, 'Transfer Received', `$${amount.toFixed(2)} received from ${from_account_number}. New balance: $${newToBalance.toFixed(2)}`, 'success');

    const fromCustomer = queryOne('SELECT full_name FROM users WHERE id = ?', [fromAccount.user_id]);
    const processedBy = queryOne('SELECT full_name FROM users WHERE id = ?', [req.user.id]);
    const txnRecord = queryOne('SELECT * FROM transactions WHERE transaction_id = ?', [transaction_id]);

    res.status(201).json({
      message: 'Transfer successful',
      transaction_id,
      fee,
      total_deduction: totalDeduction,
      new_balance: newFromBalance,
      receipt: {
        ...buildReceipt(txnRecord, fromAccount, fromCustomer?.full_name, processedBy?.full_name),
        to_account_number: toAccount.account_number,
        to_account_type: toAccount.account_type,
        breakdown: {
          amount,
          fee_percent: feePercent,
          fee,
          total_deduction: totalDeduction,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ───────────────────────────────────────────────
// POST /balance-inquiry — Balance inquiry
// ───────────────────────────────────────────────
router.post('/balance-inquiry', authenticateToken, async (req, res) => {
  try {
    const { account_number, pin } = req.body;

    if (!account_number) return res.status(400).json({ error: 'Account number is required' });

    const account = queryOne(
      `SELECT a.id, a.user_id, a.account_number, a.account_type, a.balance, a.status, a.frozen, a.currency, a.created_at
       FROM accounts a WHERE a.account_number = ?`,
      [account_number]
    );
    if (!account) return res.status(404).json({ error: 'Account not found' });

    if (!isStaff(req.user) && account.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only check your own accounts' });
    }

    const pinValid = await verifyPin(account.user_id, pin);
    if (!pinValid) return res.status(400).json({ error: 'Invalid transaction PIN' });

    const lastTransaction = queryOne(
      `SELECT t.transaction_id, t.type, t.amount, t.created_at
       FROM transactions t
       WHERE (t.from_account_id = ? OR t.to_account_id = ?)
         AND t.status = 'completed'
       ORDER BY t.created_at DESC LIMIT 1`,
      [account.id, account.id]
    );

    const customer = queryOne('SELECT full_name FROM users WHERE id = ?', [account.user_id]);

    res.json({
      account_number: account.account_number,
      account_type: account.account_type,
      balance: account.balance,
      currency: account.currency,
      status: account.status,
      frozen: account.frozen,
      customer_name: customer?.full_name,
      last_transaction: lastTransaction || null,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ───────────────────────────────────────────────
// POST /verify-pin — Verify customer PIN
// ───────────────────────────────────────────────
router.post('/verify-pin', authenticateToken, async (req, res) => {
  try {
    const { pin, user_id } = req.body;

    if (!pin) return res.status(400).json({ error: 'PIN is required' });

    // Allow staff to verify a customer's PIN
    const targetUserId = (user_id && isStaff(req.user)) ? user_id : req.user.id;
    const valid = await verifyPin(targetUserId, pin);
    res.json({ valid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ───────────────────────────────────────────────
// GET /receipt/:id — Get transaction receipt
// ───────────────────────────────────────────────
router.get('/receipt/:id', authenticateToken, (req, res) => {
  try {
    const txn = queryOne(
      `SELECT t.*, fa.account_number AS from_account_number, fa.account_type AS from_account_type, fa.user_id AS from_user_id,
              ta.account_number AS to_account_number, ta.account_type AS to_account_type, ta.user_id AS to_user_id
       FROM transactions t
       LEFT JOIN accounts fa ON t.from_account_id = fa.id
       LEFT JOIN accounts ta ON t.to_account_id = ta.id
       WHERE t.id = ? OR t.transaction_id = ?`,
      [req.params.id, req.params.id]
    );
    if (!txn) return res.status(404).json({ error: 'Transaction not found' });

    if (!isStaff(req.user)) {
      const fromUser = txn.from_user_id;
      const toUser = txn.to_user_id;
      if (fromUser !== req.user.id && toUser !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const accountId = txn.from_account_id || txn.to_account_id;
    const account = queryOne('SELECT account_number, account_type, user_id FROM accounts WHERE id = ?', [accountId]);
    const customer = account ? queryOne('SELECT full_name FROM users WHERE id = ?', [account.user_id]) : null;
    const processedBy = txn.processed_by ? queryOne('SELECT full_name FROM users WHERE id = ?', [txn.processed_by]) : null;

    res.json({
      transaction_id: txn.transaction_id,
      type: txn.type,
      amount: txn.amount,
      fee: txn.fee || 0,
      description: txn.description,
      status: txn.status,
      from_account_number: txn.from_account_number,
      to_account_number: txn.to_account_number,
      customer_name: customer?.full_name || null,
      processed_by: processedBy?.full_name || null,
      created_at: txn.created_at,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ───────────────────────────────────────────────
// GET /daily-summary — Daily transaction summary
// ───────────────────────────────────────────────
router.get('/daily-summary', authenticateToken, (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];

    const summary = queryAll(
      `SELECT type,
              COUNT(*) AS count,
              COALESCE(SUM(amount), 0) AS total_amount,
              COALESCE(SUM(fee), 0) AS total_fee
       FROM transactions
       WHERE status = 'completed'
         AND date(created_at) = ?
       GROUP BY type`,
      [today]
    );

    const totals = queryOne(
      `SELECT COUNT(*) AS total_count,
              COALESCE(SUM(amount), 0) AS total_amount,
              COALESCE(SUM(fee), 0) AS total_fees
       FROM transactions
       WHERE status = 'completed'
         AND date(created_at) = ?`,
      [today]
    );

    res.json({
      date: today,
      transactions: summary,
      totals: {
        count: totals?.total_count || 0,
        amount: totals?.total_amount || 0,
        fees: totals?.total_fees || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
