// finance.js — чистые функции расчётов. Без зависимостей, без доступа к БД.
// Всё, что считает балансы, конвертацию и аналитику — здесь.

export function baseCurrency(currencies) {
  return currencies.find((c) => c.is_base) || currencies[0] || null;
}

export function findCurrency(id, currencies) {
  return currencies.find((c) => c.id === id) || null;
}

export function rateToBase(id, currencies) {
  const c = findCurrency(id, currencies);
  return c ? Number(c.rate_to_base) : 1;
}

// Конвертация суммы из валюты `id` в основную валюту.
export function toBase(amount, id, currencies) {
  return Number(amount || 0) * rateToBase(id, currencies);
}

export function formatNum(n, digits) {
  return Number(n || 0).toLocaleString('ru-RU', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

// Деньги с символом валюты. Крипта — больше знаков.
export function formatMoney(amount, currency) {
  let digits = 2;
  if (currency && currency.is_crypto) digits = Math.abs(Number(amount)) < 1 ? 6 : 4;
  const sym = currency ? currency.symbol || currency.code : '';
  return formatNum(amount, digits) + (sym ? ' ' + sym : '');
}

export function formatBase(amount, currencies) {
  return formatMoney(amount, baseCurrency(currencies));
}

// Остаток конкретной (счёт × валюта) с учётом операций, опционально до даты включительно.
export function pairBalance(accountId, currencyId, opening, operations, upToDate) {
  let bal = Number(opening || 0);
  for (const op of operations) {
    if (upToDate && op.op_date > upToDate) continue;
    if (op.type === 'expense') {
      if (op.account_id === accountId && op.currency_id === currencyId) bal -= Number(op.amount || 0);
    } else if (op.type === 'income') {
      if (op.account_id === accountId && op.currency_id === currencyId) bal += Number(op.amount || 0);
    } else if (op.type === 'transfer') {
      if (op.from_account_id === accountId && op.from_currency_id === currencyId) bal -= Number(op.from_amount || 0);
      if (op.to_account_id === accountId && op.to_currency_id === currencyId) bal += Number(op.to_amount || 0);
    }
  }
  return bal;
}

// Балансы счёта по всем его валютам + сумма в основной валюте.
export function accountBalances(account, accountCurrencies, operations, currencies, upToDate) {
  const acs = accountCurrencies.filter((ac) => ac.account_id === account.id);
  let totalBase = 0;
  const perCur = [];
  for (const ac of acs) {
    const bal = pairBalance(account.id, ac.currency_id, ac.opening_balance, operations, upToDate);
    perCur.push({ currency_id: ac.currency_id, balance: bal });
    totalBase += toBase(bal, ac.currency_id, currencies);
  }
  return { totalBase, perCur };
}

// Общий баланс по всем счетам, которые учитываются в общем балансе.
export function grandTotal(accounts, accountCurrencies, operations, currencies, upToDate) {
  let total = 0;
  for (const a of accounts) {
    if (!a.include_in_total) continue;
    total += accountBalances(a, accountCurrencies, operations, currencies, upToDate).totalBase;
  }
  return total;
}

// Топ-уровневая категория для операции (для аналитики «по категориям»).
export function topCategoryId(categoryId, categories) {
  const c = categories.find((x) => x.id === categoryId);
  if (!c) return null;
  return c.parent_id || c.id;
}

export function categoryName(categoryId, categories) {
  const c = categories.find((x) => x.id === categoryId);
  if (!c) return '—';
  if (c.parent_id) {
    const p = categories.find((x) => x.id === c.parent_id);
    return (p ? p.name + ' / ' : '') + c.name;
  }
  return c.name;
}

// Сумма операции в основной валюте (со знаком смысла: расход/доход — модуль).
export function opAmountBase(op, currencies) {
  if (op.type === 'expense' || op.type === 'income') return toBase(op.amount, op.currency_id, currencies);
  return 0; // переводы не влияют на доход/расход
}

const MONTHS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
export function monthLabels() {
  return MONTHS.slice();
}

function opYear(op) {
  return Number(op.op_date.slice(0, 4));
}
function opMonth(op) {
  return Number(op.op_date.slice(5, 7)) - 1; // 0..11
}

// «Денежный поток» за год: строки = топ-категории (доходы и расходы), столбцы = 12 месяцев.
export function cashFlow(year, operations, categories, currencies, hideEmpty) {
  const build = (kind) => {
    const cats = categories.filter((c) => c.kind === kind && !c.parent_id);
    const rows = cats.map((cat) => {
      const months = new Array(12).fill(0);
      let total = 0;
      for (const op of operations) {
        if (op.type !== kind) continue;
        if (opYear(op) !== year) continue;
        if (topCategoryId(op.category_id, categories) !== cat.id) continue;
        const v = opAmountBase(op, currencies);
        months[opMonth(op)] += v;
        total += v;
      }
      return { id: cat.id, name: cat.name, months, total };
    });
    // строка без категории
    const uncMonths = new Array(12).fill(0);
    let uncTotal = 0;
    for (const op of operations) {
      if (op.type !== kind) continue;
      if (opYear(op) !== year) continue;
      if (op.category_id) continue;
      const v = opAmountBase(op, currencies);
      uncMonths[opMonth(op)] += v;
      uncTotal += v;
    }
    if (uncTotal > 0) rows.push({ id: 'none', name: 'Без категории', months: uncMonths, total: uncTotal });
    const totals = new Array(12).fill(0);
    let grand = 0;
    rows.forEach((r) => r.months.forEach((m, i) => (totals[i] += m)));
    rows.forEach((r) => (grand += r.total));
    const visible = hideEmpty ? rows.filter((r) => r.total > 0) : rows;
    return { rows: visible, totals, grand };
  };
  return { income: build('income'), expense: build('expense') };
}

// «Годовой баланс»: строки = счета (по группам), столбцы = остаток на конец каждого месяца в основной валюте.
export function annualBalance(year, accounts, accountCurrencies, operations, currencies, groups) {
  function endOfMonth(m) {
    const next = new Date(Date.UTC(year, m + 1, 1));
    next.setUTCDate(0); // последний день месяца m
    return next.toISOString().slice(0, 10);
  }
  const monthEnds = [];
  for (let m = 0; m < 12; m++) monthEnds.push(endOfMonth(m));

  const groupBlocks = groups.map((g) => {
    const accs = accounts.filter((a) => a.group_id === g.id);
    const accRows = accs.map((a) => {
      const months = monthEnds.map((d) => accountBalances(a, accountCurrencies, operations, currencies, d).totalBase);
      return { id: a.id, name: a.name, months };
    });
    const subtotal = new Array(12).fill(0);
    accRows.forEach((r) => r.months.forEach((m, i) => (subtotal[i] += m)));
    return { id: g.id, name: g.name, accounts: accRows, subtotal };
  });
  // счета без группы
  const ungrouped = accounts.filter((a) => !a.group_id || !groups.some((g) => g.id === a.group_id));
  if (ungrouped.length) {
    const accRows = ungrouped.map((a) => {
      const months = monthEnds.map((d) => accountBalances(a, accountCurrencies, operations, currencies, d).totalBase);
      return { id: a.id, name: a.name, months };
    });
    const subtotal = new Array(12).fill(0);
    accRows.forEach((r) => r.months.forEach((m, i) => (subtotal[i] += m)));
    groupBlocks.push({ id: 'none', name: 'Без группы', accounts: accRows, subtotal });
  }
  const totals = new Array(12).fill(0);
  groupBlocks.forEach((b) => b.subtotal.forEach((m, i) => (totals[i] += m)));
  return { groups: groupBlocks, totals };
}

// Данные для графиков за период [from..to].
export function expenseByCategory(operations, categories, currencies, from, to) {
  const map = {};
  for (const op of operations) {
    if (op.type !== 'expense') continue;
    if (from && op.op_date < from) continue;
    if (to && op.op_date > to) continue;
    const top = topCategoryId(op.category_id, categories) || 'none';
    map[top] = (map[top] || 0) + opAmountBase(op, currencies);
  }
  const arr = Object.keys(map).map((id) => {
    const c = categories.find((x) => x.id === id);
    return { id, name: c ? c.name : 'Без категории', value: map[id] };
  });
  arr.sort((a, b) => b.value - a.value);
  return arr;
}

export function monthlyTotals(year, operations, currencies) {
  const income = new Array(12).fill(0);
  const expense = new Array(12).fill(0);
  for (const op of operations) {
    if (opYear(op) !== year) continue;
    if (op.type === 'income') income[opMonth(op)] += opAmountBase(op, currencies);
    else if (op.type === 'expense') expense[opMonth(op)] += opAmountBase(op, currencies);
  }
  return { income, expense };
}

export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'id_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
