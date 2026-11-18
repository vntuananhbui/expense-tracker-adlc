const test = require('node:test');
const assert = require('node:assert/strict');
const { openDb, seedIfEmpty, CATEGORIES } = require('../db');

test('TC8: DB rỗng khi khởi động -> tự seed >=15 bản ghi, trải >=3 tháng, đủ 5 danh mục', () => {
  const db = openDb(':memory:');
  const didSeed = seedIfEmpty(db);
  assert.equal(didSeed, true);

  const rows = db.prepare('SELECT * FROM expenses').all();
  assert.ok(rows.length >= 15, `expected >=15 rows, got ${rows.length}`);

  const months = new Set(rows.map((r) => r.date.slice(0, 7)));
  assert.ok(months.size >= 3, `expected >=3 distinct months, got ${months.size}`);

  const categoriesSeen = new Set(rows.map((r) => r.category));
  CATEGORIES.forEach((cat) => {
    assert.ok(categoriesSeen.has(cat), `missing category ${cat} in seed data`);
  });

  rows.forEach((r) => {
    assert.ok(r.amount > 0, 'seed amount phải dương');
    assert.match(r.date, /^\d{4}-\d{2}-\d{2}$/);
  });
});

test('seedIfEmpty không seed lại khi bảng đã có dữ liệu', () => {
  const db = openDb(':memory:');
  seedIfEmpty(db);
  const countAfterFirst = db.prepare('SELECT COUNT(*) AS c FROM expenses').get().c;

  const didSeedAgain = seedIfEmpty(db);
  assert.equal(didSeedAgain, false);

  const countAfterSecond = db.prepare('SELECT COUNT(*) AS c FROM expenses').get().c;
  assert.equal(countAfterFirst, countAfterSecond);
});
