const { CATEGORIES } = require('./db');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidDate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

function isValidMonth(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}$/.test(value);
}

function validateExpenseInput(body) {
  const errors = [];
  const { date, amount, category, note } = body || {};

  if (!isValidDate(date)) {
    errors.push('date phải đúng định dạng YYYY-MM-DD và là ngày hợp lệ');
  }

  const amountNum = typeof amount === 'number' ? amount : Number(amount);
  if (
    amount === undefined ||
    amount === null ||
    amount === '' ||
    typeof amount === 'boolean' ||
    Number.isNaN(amountNum) ||
    amountNum <= 0
  ) {
    errors.push('amount phải là số dương');
  }

  if (typeof category !== 'string' || !CATEGORIES.includes(category)) {
    errors.push(`category phải là một trong: ${CATEGORIES.join(', ')}`);
  }

  if (note !== undefined && typeof note !== 'string') {
    errors.push('note phải là chuỗi');
  }

  return {
    valid: errors.length === 0,
    errors,
    value: {
      date,
      amount: amountNum,
      category,
      note: typeof note === 'string' ? note : '',
    },
  };
}

module.exports = { isValidDate, isValidMonth, validateExpenseInput };
