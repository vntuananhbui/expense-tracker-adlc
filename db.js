const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const CATEGORIES = ['an_uong', 'di_chuyen', 'giai_tri', 'hoa_don', 'khac'];

function openDb(dbPath) {
  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      note TEXT NOT NULL DEFAULT ''
    )
  `);
  return db;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function monthsAgo(n, base = new Date()) {
  const d = new Date(base.getFullYear(), base.getMonth() - n, 1);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function buildSeedRows(base = new Date()) {
  const rows = [];
  const months = [monthsAgo(0, base), monthsAgo(1, base), monthsAgo(2, base)];
  const sample = [
    { day: 2, category: 'an_uong', amount: 45000, note: 'Ăn sáng' },
    { day: 4, category: 'di_chuyen', amount: 60000, note: 'Xăng xe' },
    { day: 6, category: 'giai_tri', amount: 120000, note: 'Xem phim' },
    { day: 9, category: 'hoa_don', amount: 350000, note: 'Tiền điện' },
    { day: 12, category: 'khac', amount: 80000, note: 'Mua đồ dùng' },
  ];
  months.forEach(({ year, month }, idx) => {
    sample.forEach((item) => {
      rows.push({
        date: `${year}-${pad2(month)}-${pad2(item.day)}`,
        amount: item.amount + idx * 10000,
        category: item.category,
        note: item.note,
      });
    });
  });
  return rows;
}

function seedIfEmpty(db) {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM expenses').get();
  if (count > 0) return false;
  const insert = db.prepare(
    'INSERT INTO expenses (date, amount, category, note) VALUES (@date, @amount, @category, @note)'
  );
  const insertMany = db.transaction((rows) => {
    rows.forEach((row) => insert.run(row));
  });
  insertMany(buildSeedRows());
  return true;
}

module.exports = { openDb, seedIfEmpty, buildSeedRows, CATEGORIES };
