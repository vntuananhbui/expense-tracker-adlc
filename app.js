const path = require('path');
const express = require('express');
const { createExpensesRouter } = require('./routes/expenses');

function createApp(db) {
  const app = express();
  app.use(express.json());
  app.use('/api', createExpensesRouter(db));
  app.use(express.static(path.join(__dirname, 'public')));

  app.use((err, req, res, next) => {
    if (err && err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'JSON body không hợp lệ' });
    }
    res.status(500).json({ error: 'Lỗi máy chủ' });
  });

  return app;
}

module.exports = { createApp };
