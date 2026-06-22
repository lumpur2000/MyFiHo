// dataLayer.js — единственный слой доступа к данным.
// Интерфейс приложения вызывает ТОЛЬКО функции отсюда и не знает про Supabase.
// Режимы: 'supabase' (если задан URL+ключ) или 'demo' (локальные данные в браузере).

import { uid } from './finance.js';

const CFG_KEY = 'hm_supabase_cfg';
const DEMO_KEY = 'hm_demo_db_v3';

// ---- Конфиг подключения (хранится в localStorage, не в коде) ----
export function getConfig() {
  try {
    return JSON.parse(localStorage.getItem(CFG_KEY) || 'null');
  } catch (e) {
    return null;
  }
}
export function setConfig(url, key) {
  if (!url || !key) {
    localStorage.removeItem(CFG_KEY);
    _client = null;
    return;
  }
  localStorage.setItem(CFG_KEY, JSON.stringify({ url: url.trim(), key: key.trim() }));
  _client = null;
}
export function mode() {
  return getConfig() ? 'supabase' : 'demo';
}

let _client = null;
function client() {
  const cfg = getConfig();
  if (!cfg) return null;
  if (_client) return _client;
  if (!window.supabase || !window.supabase.createClient) {
    throw new Error('Библиотека supabase-js ещё не загрузилась. Обновите страницу.');
  }
  _client = window.supabase.createClient(cfg.url, cfg.key);
  return _client;
}

// =====================================================================
//  ДЕМО-ХРАНИЛИЩЕ
// =====================================================================
function readDemo() {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  const db = seedDemo();
  localStorage.setItem(DEMO_KEY, JSON.stringify(db));
  return db;
}
function writeDemo(db) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(db));
}

function seedDemo() {
  const cur = {
    eur: { id: 'cur_eur', code: 'EUR', name: 'Евро', symbol: '€', rate_to_base: 1, is_base: true, is_crypto: false, sort_order: 1 },
    usd: { id: 'cur_usd', code: 'USD', name: 'Доллар США', symbol: '$', rate_to_base: 0.92, is_base: false, is_crypto: false, sort_order: 2 },
    uah: { id: 'cur_uah', code: 'UAH', name: 'Гривна', symbol: '₴', rate_to_base: 0.022, is_base: false, is_crypto: false, sort_order: 3 },
    pln: { id: 'cur_pln', code: 'PLN', name: 'Злотый', symbol: 'zł', rate_to_base: 0.23, is_base: false, is_crypto: false, sort_order: 4 },
    usdt: { id: 'cur_usdt', code: 'USDT', name: 'Tether', symbol: '₮', rate_to_base: 0.92, is_base: false, is_crypto: true, sort_order: 5 },
    btc: { id: 'cur_btc', code: 'BTC', name: 'Биткоин', symbol: '₿', rate_to_base: 62000, is_base: false, is_crypto: true, sort_order: 6 },
  };
  const groups = [
    { id: 'grp_cash', name: 'Наличные', sort_order: 1 },
    { id: 'grp_bank', name: 'Счета в банках', sort_order: 2 },
    { id: 'grp_dep', name: 'Депозиты', sort_order: 3 },
  ];
  const accounts = [
    { id: 'acc_wallet', name: 'Кошелёк', group_id: 'grp_cash', include_in_total: true, show_on_home: true, sort_order: 1 },
    { id: 'acc_case', name: 'Чемодан', group_id: 'grp_cash', include_in_total: true, show_on_home: true, sort_order: 2 },
    { id: 'acc_revolut', name: 'Revolut', group_id: 'grp_bank', include_in_total: true, show_on_home: true, sort_order: 3 },
    { id: 'acc_mono', name: 'Mono', group_id: 'grp_bank', include_in_total: true, show_on_home: true, sort_order: 4 },
    { id: 'acc_crypto', name: 'Крипто-кошелёк', group_id: 'grp_bank', include_in_total: true, show_on_home: true, sort_order: 5 },
    { id: 'acc_dep', name: 'Депозит', group_id: 'grp_dep', include_in_total: true, show_on_home: false, sort_order: 6 },
  ];
  const ac = (account_id, currency_id, opening_balance) => ({ id: uid(), account_id, currency_id, opening_balance });
  const accountCurrencies = [
    ac('acc_wallet', 'cur_eur', 300),
    ac('acc_wallet', 'cur_usd', 60),
    ac('acc_case', 'cur_usd', 1200),
    ac('acc_case', 'cur_eur', 500),
    ac('acc_revolut', 'cur_eur', 1500),
    ac('acc_revolut', 'cur_pln', 600),
    ac('acc_mono', 'cur_uah', 30000),
    ac('acc_crypto', 'cur_usdt', 450),
    ac('acc_crypto', 'cur_btc', 0.05),
    ac('acc_dep', 'cur_eur', 5000),
  ];
  const categories = [
    { id: 'cat_food', kind: 'expense', name: 'Продукты', parent_id: null, sort_order: 1 },
    { id: 'cat_food_super', kind: 'expense', name: 'Супермаркет', parent_id: 'cat_food', sort_order: 1 },
    { id: 'cat_food_cafe', kind: 'expense', name: 'Кафе и рестораны', parent_id: 'cat_food', sort_order: 2 },
    { id: 'cat_transport', kind: 'expense', name: 'Транспорт', parent_id: null, sort_order: 2 },
    { id: 'cat_transport_taxi', kind: 'expense', name: 'Такси', parent_id: 'cat_transport', sort_order: 1 },
    { id: 'cat_transport_fuel', kind: 'expense', name: 'Топливо', parent_id: 'cat_transport', sort_order: 2 },
    { id: 'cat_home', kind: 'expense', name: 'Жильё', parent_id: null, sort_order: 3 },
    { id: 'cat_fun', kind: 'expense', name: 'Развлечения', parent_id: null, sort_order: 4 },
    { id: 'cat_health', kind: 'expense', name: 'Здоровье', parent_id: null, sort_order: 5 },
    { id: 'cat_salary', kind: 'income', name: 'Зарплата', parent_id: null, sort_order: 1 },
    { id: 'cat_freelance', kind: 'income', name: 'Подработка', parent_id: null, sort_order: 2 },
    { id: 'cat_gifts', kind: 'income', name: 'Подарки', parent_id: null, sort_order: 3 },
  ];

  // Операции за 2025 и начало 2026 (детерминированно).
  const ops = [];
  const op = (o) => ops.push(Object.assign({ id: uid(), note: '', created_at: new Date().toISOString() }, o));
  const d = (y, m, day) => `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const months = [];
  for (let m = 1; m <= 12; m++) months.push([2025, m]);
  for (let m = 1; m <= 6; m++) months.push([2026, m]);
  months.forEach(([y, m], i) => {
    const wob = (i % 3) * 50;
    op({ type: 'income', op_date: d(y, m, 5), account_id: 'acc_revolut', currency_id: 'cur_eur', amount: 2500 + wob, category_id: 'cat_salary', note: 'Зарплата' });
    if (i % 2 === 0) op({ type: 'income', op_date: d(y, m, 18), account_id: 'acc_revolut', currency_id: 'cur_eur', amount: 300 + wob, category_id: 'cat_freelance', note: 'Проект' });
    // основные траты с карты
    op({ type: 'expense', op_date: d(y, m, 3), account_id: 'acc_revolut', currency_id: 'cur_eur', amount: 900, category_id: 'cat_home', note: 'Аренда' });
    op({ type: 'expense', op_date: d(y, m, 8), account_id: 'acc_revolut', currency_id: 'cur_eur', amount: 180 + wob, category_id: 'cat_food_super', note: 'Закупка' });
    if (i % 2 === 1) op({ type: 'expense', op_date: d(y, m, 20), account_id: 'acc_revolut', currency_id: 'cur_eur', amount: 45, category_id: 'cat_fun', note: 'Кино' });
    if (i % 4 === 2) op({ type: 'expense', op_date: d(y, m, 22), account_id: 'acc_revolut', currency_id: 'cur_eur', amount: 70, category_id: 'cat_health', note: 'Аптека' });
    // наличные: снятие со счёта в кошелёк + обед
    op({ type: 'transfer', op_date: d(y, m, 6), from_account_id: 'acc_revolut', from_currency_id: 'cur_eur', from_amount: 200, to_account_id: 'acc_wallet', to_currency_id: 'cur_eur', to_amount: 200, note: 'Снятие наличных' });
    op({ type: 'expense', op_date: d(y, m, 15), account_id: 'acc_wallet', currency_id: 'cur_eur', amount: 60 + (i % 4) * 10, category_id: 'cat_food_cafe', note: 'Обед' });
    // такси гривнами
    op({ type: 'expense', op_date: d(y, m, 12), account_id: 'acc_mono', currency_id: 'cur_uah', amount: 600 + (i % 5) * 100, category_id: 'cat_transport_taxi', note: 'Такси' });
  });
  // пара переводов
  op({ type: 'transfer', op_date: d(2026, 2, 10), from_account_id: 'acc_revolut', from_currency_id: 'cur_eur', from_amount: 500, to_account_id: 'acc_case', to_currency_id: 'cur_usd', to_amount: 535, note: 'Снял на поездку' });
  op({ type: 'transfer', op_date: d(2026, 4, 6), from_account_id: 'acc_revolut', from_currency_id: 'cur_eur', from_amount: 1000, to_account_id: 'acc_dep', to_currency_id: 'cur_eur', to_amount: 1000, note: 'Пополнил депозит' });

  return {
    currencies: Object.values(cur),
    account_groups: groups,
    accounts,
    account_currencies: accountCurrencies,
    categories,
    operations: ops,
  };
}

// =====================================================================
//  ЗАГРУЗКА ВСЕГО
// =====================================================================
export async function loadAll() {
  if (mode() === 'demo') {
    const db = readDemo();
    return normalize(db);
  }
  const sb = client();
  const tables = ['currencies', 'account_groups', 'accounts', 'account_currencies', 'categories', 'operations'];
  const out = {};
  for (const t of tables) {
    const rows = await fetchAll(sb, t);
    out[t] = rows;
  }
  return normalize(out);
}

// Постраничная загрузка: Supabase отдаёт максимум 1000 строк за запрос,
// поэтому забираем данные блоками по 1000, пока не кончатся.
async function fetchAll(sb, table) {
  const PAGE = 1000;
  let from = 0;
  const all = [];
  for (;;) {
    const { data, error } = await sb.from(table).select('*').range(from, from + PAGE - 1);
    if (error) throw new Error(`Ошибка загрузки ${table}: ${error.message}`);
    const chunk = data || [];
    all.push(...chunk);
    if (chunk.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

function normalize(db) {
  const currencies = (db.currencies || []).slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const groups = (db.account_groups || []).slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const accounts = (db.accounts || []).slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const categories = (db.categories || []).slice().sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  return {
    currencies,
    groups,
    accounts,
    accountCurrencies: db.account_currencies || [],
    categories,
    operations: (db.operations || []).slice().sort((a, b) => (a.op_date < b.op_date ? 1 : -1)),
  };
}

// =====================================================================
//  CRUD
// =====================================================================
async function demoMutate(fn) {
  const db = readDemo();
  fn(db);
  writeDemo(db);
}

function replaceById(arr, row) {
  const i = arr.findIndex((x) => x.id === row.id);
  if (i >= 0) arr[i] = Object.assign({}, arr[i], row);
  else arr.push(row);
}

// Надёжная замена .upsert() для Supabase: insert для новой строки, update для существующей.
// (.upsert() в нашей конфигурации молча не сохранял строки — см. историю правок.)
async function upsertRow(table, data) {
  const sb = client();
  const existing = await sb.from(table).select('id').eq('id', data.id).maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) {
    const { error } = await sb.from(table).update(data).eq('id', data.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await sb.from(table).insert(data);
    if (error) throw new Error(error.message);
  }
  return data;
}

// ---- Валюты ----
export async function saveCurrency(row) {
  const data = Object.assign({}, row);
  if (!data.id) data.id = uid();
  if (mode() === 'demo') {
    await demoMutate((db) => replaceById(db.currencies, data));
    return data;
  }
  return upsertRow('currencies', data);
}
export async function deleteCurrency(id) {
  if (mode() === 'demo') return demoMutate((db) => (db.currencies = db.currencies.filter((x) => x.id !== id)));
  const { error } = await client().from('currencies').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
// Смена основной валюты: пересчёт всех курсов относительно новой базы.
export async function setBaseCurrency(id) {
  if (mode() === 'demo') {
    return demoMutate((db) => {
      const factor = Number((db.currencies.find((c) => c.id === id) || {}).rate_to_base || 1);
      db.currencies.forEach((c) => {
        c.rate_to_base = c.id === id ? 1 : Number(c.rate_to_base) / factor;
        c.is_base = c.id === id;
      });
    });
  }
  const sb = client();
  const { data: all } = await sb.from('currencies').select('*');
  const factor = Number((all.find((c) => c.id === id) || {}).rate_to_base || 1);
  for (const c of all) {
    await sb.from('currencies').update({ rate_to_base: c.id === id ? 1 : Number(c.rate_to_base) / factor, is_base: c.id === id }).eq('id', c.id);
  }
}

// ---- Группы счетов ----
export async function saveGroup(row) {
  const data = Object.assign({}, row);
  if (!data.id) data.id = uid();
  if (mode() === 'demo') {
    await demoMutate((db) => replaceById(db.account_groups, data));
    return data;
  }
  return upsertRow('account_groups', data);
}
export async function deleteGroup(id) {
  if (mode() === 'demo') return demoMutate((db) => (db.account_groups = db.account_groups.filter((x) => x.id !== id)));
  const { error } = await client().from('account_groups').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---- Счета (+ валютные остатки) ----
export async function saveAccount(account, currencyRows) {
  const data = Object.assign({}, account);
  if (!data.id) data.id = uid();
  const rows = (currencyRows || []).map((r) => ({ id: r.id || uid(), account_id: data.id, currency_id: r.currency_id, opening_balance: Number(r.opening_balance || 0) }));
  if (mode() === 'demo') {
    await demoMutate((db) => {
      replaceById(db.accounts, data);
      db.account_currencies = db.account_currencies.filter((x) => x.account_id !== data.id);
      rows.forEach((r) => db.account_currencies.push(r));
    });
    return data;
  }
  const sb = client();
  await upsertRow('accounts', data);
  await sb.from('account_currencies').delete().eq('account_id', data.id);
  if (rows.length) {
    const err = (await sb.from('account_currencies').insert(rows)).error;
    if (err) throw new Error(err.message);
  }
  return data;
}
export async function deleteAccount(id) {
  if (mode() === 'demo') {
    return demoMutate((db) => {
      db.accounts = db.accounts.filter((x) => x.id !== id);
      db.account_currencies = db.account_currencies.filter((x) => x.account_id !== id);
    });
  }
  const { error } = await client().from('accounts').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---- Категории ----
export async function saveCategory(row) {
  const data = Object.assign({}, row);
  if (!data.id) data.id = uid();
  if (data.parent_id === '') data.parent_id = null;
  if (mode() === 'demo') {
    await demoMutate((db) => replaceById(db.categories, data));
    return data;
  }
  return upsertRow('categories', data);
}
export async function deleteCategory(id) {
  if (mode() === 'demo') {
    return demoMutate((db) => (db.categories = db.categories.filter((x) => x.id !== id && x.parent_id !== id)));
  }
  const { error } = await client().from('categories').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---- Операции ----
export async function saveOperation(row) {
  const data = Object.assign({}, row);
  if (!data.id) data.id = uid();
  if (mode() === 'demo') {
    await demoMutate((db) => replaceById(db.operations, data));
    return data;
  }
  return upsertRow('operations', data);
}
export async function deleteOperation(id) {
  if (mode() === 'demo') return demoMutate((db) => (db.operations = db.operations.filter((x) => x.id !== id)));
  const { error } = await client().from('operations').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// Сброс демо-данных к исходным.
export async function resetDemo() {
  localStorage.setItem(DEMO_KEY, JSON.stringify(seedDemo()));
}

// ===================== ПАРОЛЬ (мягкая защита входа) =====================
// Хэш пароля хранится: в demo — в localStorage; с Supabase — в settings.password_hash.
const PWD_KEY = 'hm_pwd';
export async function hashPassword(pwd) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(pwd)));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
export async function getPasswordHash() {
  if (mode() === 'demo') return localStorage.getItem(PWD_KEY) || null;
  const { data, error } = await client().from('settings').select('password_hash').eq('id', 1).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? (data.password_hash || null) : null;
}
export async function setPasswordHash(hash) {
  if (mode() === 'demo') { if (hash) localStorage.setItem(PWD_KEY, hash); else localStorage.removeItem(PWD_KEY); return; }
  const { error } = await client().from('settings').update({ password_hash: hash }).eq('id', 1);
  if (error) throw new Error(error.message);
}
