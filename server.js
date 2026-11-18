const path = require('path');
const { openDb, seedIfEmpty } = require('./db');
const { createApp } = require('./app');

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'expenses.db');

const db = openDb(DB_PATH);
seedIfEmpty(db);

const app = createApp(db);

app.listen(PORT, () => {
  console.log(`Expense tracker đang chạy tại http://localhost:${PORT}`);
});
