const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { openDb } = require('../db');
const { createApp } = require('../app');

function freshApp() {
  const db = openDb(':memory:');
  const app = createApp(db);
  return { app, db };
}

test('TC1: POST /api/expenses hợp lệ -> 201 và xuất hiện trong GET', async () => {
  const { app } = freshApp();
  const res = await request(app).post('/api/expenses').send({
    date: '2026-11-10',
    amount: 50000,
    category: 'an_uong',
    note: 'Ăn trưa',
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.amount, 50000);
  assert.equal(res.body.category, 'an_uong');
  assert.ok(res.body.id);

  const list = await request(app).get('/api/expenses');
  assert.equal(list.status, 200);
  assert.equal(list.body.length, 1);
  assert.equal(list.body[0].id, res.body.id);
});

test('TC2: PUT sửa amount/category -> GET expenses và summary phản ánh đúng', async () => {
  const { app } = freshApp();
  const created = await request(app).post('/api/expenses').send({
    date: '2026-11-05',
    amount: 100000,
    category: 'an_uong',
    note: '',
  });
  const id = created.body.id;

  const updated = await request(app).put(`/api/expenses/${id}`).send({
    date: '2026-11-05',
    amount: 200000,
    category: 'giai_tri',
    note: 'đổi',
  });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.amount, 200000);
  assert.equal(updated.body.category, 'giai_tri');

  const list = await request(app).get('/api/expenses');
  assert.equal(list.body[0].amount, 200000);
  assert.equal(list.body[0].category, 'giai_tri');

  const summary = await request(app).get('/api/summary?month=2026-11');
  assert.equal(summary.body.total, 200000);
  assert.deepEqual(summary.body.byCategory, { giai_tri: 200000 });
});

test('PUT với id không tồn tại -> 404', async () => {
  const { app } = freshApp();
  const res = await request(app).put('/api/expenses/9999').send({
    date: '2026-11-05',
    amount: 1000,
    category: 'khac',
    note: '',
  });
  assert.equal(res.status, 404);
});

test('TC3: DELETE -> biến mất khỏi GET expenses, summary giảm đúng số tiền', async () => {
  const { app } = freshApp();
  const a = await request(app).post('/api/expenses').send({
    date: '2026-11-02',
    amount: 30000,
    category: 'an_uong',
    note: '',
  });
  const b = await request(app).post('/api/expenses').send({
    date: '2026-11-03',
    amount: 70000,
    category: 'di_chuyen',
    note: '',
  });

  let summary = await request(app).get('/api/summary?month=2026-11');
  assert.equal(summary.body.total, 100000);

  const del = await request(app).delete(`/api/expenses/${a.body.id}`);
  assert.equal(del.status, 204);

  const list = await request(app).get('/api/expenses');
  assert.equal(list.body.length, 1);
  assert.equal(list.body[0].id, b.body.id);

  summary = await request(app).get('/api/summary?month=2026-11');
  assert.equal(summary.body.total, 70000);
});

test('DELETE với id không tồn tại -> 404', async () => {
  const { app } = freshApp();
  const res = await request(app).delete('/api/expenses/9999');
  assert.equal(res.status, 404);
});

test('TC4: GET expenses?month lọc đúng tháng, tháng không có dữ liệu trả mảng rỗng', async () => {
  const { app } = freshApp();
  await request(app).post('/api/expenses').send({
    date: '2026-10-15',
    amount: 10000,
    category: 'khac',
    note: '',
  });
  await request(app).post('/api/expenses').send({
    date: '2026-11-15',
    amount: 20000,
    category: 'khac',
    note: '',
  });

  const octRes = await request(app).get('/api/expenses?month=2026-10');
  assert.equal(octRes.body.length, 1);
  assert.equal(octRes.body[0].amount, 10000);

  const novRes = await request(app).get('/api/expenses?month=2026-11');
  assert.equal(novRes.body.length, 1);
  assert.equal(novRes.body[0].amount, 20000);

  const emptyRes = await request(app).get('/api/expenses?month=2025-01');
  assert.deepEqual(emptyRes.body, []);
});

test('TC5: GET summary?month tính total và byCategory khớp tổng tay', async () => {
  const { app } = freshApp();
  await request(app).post('/api/expenses').send({
    date: '2026-11-01',
    amount: 15000,
    category: 'an_uong',
    note: '',
  });
  await request(app).post('/api/expenses').send({
    date: '2026-11-02',
    amount: 25000,
    category: 'an_uong',
    note: '',
  });
  await request(app).post('/api/expenses').send({
    date: '2026-11-03',
    amount: 40000,
    category: 'di_chuyen',
    note: '',
  });

  const summary = await request(app).get('/api/summary?month=2026-11');
  assert.equal(summary.status, 200);
  assert.equal(summary.body.total, 80000);
  assert.deepEqual(summary.body.byCategory, { an_uong: 40000, di_chuyen: 40000 });
});

test('TC10: amount âm -> 400, không crash, request khác vẫn chạy', async () => {
  const { app } = freshApp();
  const res = await request(app).post('/api/expenses').send({
    date: '2026-11-10',
    amount: -5000,
    category: 'an_uong',
    note: '',
  });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /amount/);

  const health = await request(app).get('/api/expenses');
  assert.equal(health.status, 200);
});

test('TC10: amount là chữ -> 400', async () => {
  const { app } = freshApp();
  const res = await request(app).post('/api/expenses').send({
    date: '2026-11-10',
    amount: 'abc',
    category: 'an_uong',
    note: '',
  });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /amount/);
});

test('TC10: category không hợp lệ -> 400', async () => {
  const { app } = freshApp();
  const res = await request(app).post('/api/expenses').send({
    date: '2026-11-10',
    amount: 1000,
    category: 'not_a_category',
    note: '',
  });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /category/);
});

test('TC10: date sai định dạng -> 400', async () => {
  const { app } = freshApp();
  const res = await request(app).post('/api/expenses').send({
    date: '10-11-2026',
    amount: 1000,
    category: 'khac',
    note: '',
  });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /date/);
});

test('TC10: ngày không tồn tại (2026-02-30) -> 400', async () => {
  const { app } = freshApp();
  const res = await request(app).post('/api/expenses').send({
    date: '2026-02-30',
    amount: 1000,
    category: 'khac',
    note: '',
  });
  assert.equal(res.status, 400);
  assert.match(res.body.error, /date/);
});

test('TC10: PUT với dữ liệu sai cũng trả 400, app không sập', async () => {
  const { app } = freshApp();
  const created = await request(app).post('/api/expenses').send({
    date: '2026-11-10',
    amount: 1000,
    category: 'khac',
    note: '',
  });
  const res = await request(app).put(`/api/expenses/${created.body.id}`).send({
    date: '2026-11-10',
    amount: -1,
    category: 'khac',
    note: '',
  });
  assert.equal(res.status, 400);

  const after = await request(app).get('/api/expenses');
  assert.equal(after.status, 200);
  assert.equal(after.body.length, 1);
  assert.equal(after.body[0].amount, 1000);
});

test('POST với JSON body hỏng -> 400, không crash', async () => {
  const { app } = freshApp();
  const res = await request(app)
    .post('/api/expenses')
    .set('Content-Type', 'application/json')
    .send('{"date": "2026-11-10", amount: }');
  assert.equal(res.status, 400);

  const health = await request(app).get('/api/expenses');
  assert.equal(health.status, 200);
});
