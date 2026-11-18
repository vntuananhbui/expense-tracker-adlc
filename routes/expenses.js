const express = require('express');
const { isValidMonth, validateExpenseInput } = require('../validate');
const { CATEGORIES } = require('../db');

function createExpensesRouter(db) {
  const router = express.Router();

  const selectAll = db.prepare('SELECT * FROM expenses ORDER BY date DESC, id DESC');
  const selectByMonth = db.prepare(
    "SELECT * FROM expenses WHERE strftime('%Y-%m', date) = ? ORDER BY date DESC, id DESC"
  );
  const selectById = db.prepare('SELECT * FROM expenses WHERE id = ?');
  const insertStmt = db.prepare(
    'INSERT INTO expenses (date, amount, category, note) VALUES (?, ?, ?, ?)'
  );
  const updateStmt = db.prepare(
    'UPDATE expenses SET date = ?, amount = ?, category = ?, note = ? WHERE id = ?'
  );
  const deleteStmt = db.prepare('DELETE FROM expenses WHERE id = ?');

  function getSummary(month) {
    const rows = month
      ? selectByMonth.all(month)
      : selectAll.all();
    const byCategory = {};
    let total = 0;
    for (const row of rows) {
      byCategory[row.category] = (byCategory[row.category] || 0) + row.amount;
      total += row.amount;
    }
    return { total, byCategory };
  }

  router.get('/expenses', (req, res) => {
    const { month } = req.query;
    if (month !== undefined && !isValidMonth(month)) {
      return res.status(400).json({ error: 'month phải đúng định dạng YYYY-MM' });
    }
    const rows = month ? selectByMonth.all(month) : selectAll.all();
    res.json(rows);
  });

  router.post('/expenses', (req, res) => {
    const { valid, errors, value } = validateExpenseInput(req.body);
    if (!valid) {
      return res.status(400).json({ error: errors.join('; ') });
    }
    const info = insertStmt.run(value.date, value.amount, value.category, value.note);
    const created = selectById.get(info.lastInsertRowid);
    res.status(201).json(created);
  });

  router.put('/expenses/:id', (req, res) => {
    const id = Number(req.params.id);
    const existing = selectById.get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Không tìm thấy khoản chi tiêu' });
    }
    const { valid, errors, value } = validateExpenseInput(req.body);
    if (!valid) {
      return res.status(400).json({ error: errors.join('; ') });
    }
    updateStmt.run(value.date, value.amount, value.category, value.note, id);
    res.json(selectById.get(id));
  });

  router.delete('/expenses/:id', (req, res) => {
    const id = Number(req.params.id);
    const existing = selectById.get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Không tìm thấy khoản chi tiêu' });
    }
    deleteStmt.run(id);
    res.status(204).end();
  });

  router.get('/summary', (req, res) => {
    const { month } = req.query;
    if (month !== undefined && !isValidMonth(month)) {
      return res.status(400).json({ error: 'month phải đúng định dạng YYYY-MM' });
    }
    res.json(getSummary(month));
  });

  router.get('/categories', (req, res) => {
    res.json(CATEGORIES);
  });

  return router;
}

module.exports = { createExpensesRouter };
