# Expense Tracker (Quản lý chi tiêu cá nhân)

Demo app quản lý chi tiêu cá nhân, 1 người dùng, không cần đăng nhập.
Stack: Node.js + Express + SQLite (better-sqlite3), frontend HTML/CSS/vanilla JS tĩnh, chart Chart.js (CDN).

## Cài và chạy
```bash
npm install
npm start              # cổng 3000
PORT=5001 npm start    # cổng tuỳ chọn
```
DB: `data/expenses.db` (đổi bằng biến `DB_PATH`). Lần đầu chạy với bảng rỗng sẽ tự seed 15 khoản mẫu trong 3 tháng gần nhất.

## API
- `GET /api/expenses?month=YYYY-MM`, `POST /api/expenses` `{date, amount, category, note}`
- `PUT /api/expenses/:id`, `DELETE /api/expenses/:id`
- `GET /api/summary?month=YYYY-MM` → `{total, byCategory}`
- category: `an_uong`, `di_chuyen`, `giai_tri`, `hoa_don`, `khac`. Input sai → 400.

## Test
```bash
npm test   # node:test + supertest, dùng DB in-memory, không đụng data/expenses.db
```
