const XLSX = require('xlsx');
const { initDatabase } = require('../db/database');

const REPORT_COLUMNS = [
  'ID',
  'Type',
  'Name',
  'Email',
  'Phone',
  'Lot',
  'Customer ID',
  'Order ID',
  'Guest Count',
  'Timestamp'
];

const CHECKIN_LOG_SELECT_SQL = `
  SELECT
    c.id,
    c.customer_id,
    c.order_id,
    c.guest_count,
    c.timestamp,
    c.synced_to_square,
    c.checkin_type,
    m.given_name,
    m.family_name,
    m.email_address,
    m.phone_number,
    m.reference_id
  FROM checkin_log c
  LEFT JOIN membership_cache m ON m.customer_id = c.customer_id
`;

function getLocalDayBounds(targetDate) {
  const date = targetDate ? new Date(`${targetDate}T00:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) {
    const err = new Error('Invalid date format. Use YYYY-MM-DD.');
    err.statusCode = 400;
    throw err;
  }

  const startLocal = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const endLocal = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1, 0, 0, 0, 0);

  const dateLabel = [
    startLocal.getFullYear(),
    String(startLocal.getMonth() + 1).padStart(2, '0'),
    String(startLocal.getDate()).padStart(2, '0')
  ].join('-');

  return {
    startIso: startLocal.toISOString(),
    endIso: endLocal.toISOString(),
    dateLabel
  };
}

function formatLocalDateLabel(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0')
  ].join('-');
}

/**
 * Normalize a check-in row from SQLite (with optional membership_cache join).
 * Works for existing databases: day-pass rows use checkin_type / DAYPASS customer_id.
 */
function normalizeCheckinRow(item) {
  const isDayPass = item.checkin_type === 'daypass' || item.customer_id === 'DAYPASS';
  if (isDayPass) {
    return {
      ...item,
      given_name: 'Day pass',
      family_name: '',
      email_address: '',
      phone_number: '',
      reference_id: ''
    };
  }
  return {
    ...item,
    given_name: item.given_name || '',
    family_name: item.family_name || '',
    email_address: item.email_address || '',
    phone_number: item.phone_number || '',
    reference_id: item.reference_id || ''
  };
}

function toSpreadsheetRows(entries) {
  return entries.map((item) => {
    const normalized = normalizeCheckinRow(item);
    const name = normalized.checkin_type === 'daypass'
      ? 'Day pass'
      : `${normalized.given_name || ''} ${normalized.family_name || ''}`.trim() || '-';

    return {
      ID: normalized.id || '',
      Type: normalized.checkin_type === 'daypass' ? 'Day pass' : 'Member',
      Name: name,
      Email: normalized.email_address || '-',
      Phone: normalized.phone_number || '-',
      Lot: normalized.reference_id || '-',
      'Customer ID': normalized.customer_id || '-',
      'Order ID': normalized.order_id || '-',
      'Guest Count': Number(normalized.guest_count) || 0,
      Timestamp: normalized.timestamp ? new Date(normalized.timestamp).toLocaleString() : '-'
    };
  });
}

function queryCheckinLog(db, { startIso, endIso } = {}) {
  let sql = CHECKIN_LOG_SELECT_SQL;
  const params = [];
  if (startIso != null && endIso != null) {
    sql += ' WHERE c.timestamp >= ? AND c.timestamp < ?';
    params.push(startIso, endIso);
  }
  sql += ' ORDER BY c.timestamp DESC';
  return db.prepare(sql).all(...params).map(normalizeCheckinRow);
}

function getCheckinLogCount(db) {
  const row = db.prepare('SELECT COUNT(*) AS count FROM checkin_log').get();
  return Number(row?.count) || 0;
}

function getCheckinLogFromDatabase(options = {}) {
  const { startIso, endIso } = options;
  const db = initDatabase();
  try {
    return queryCheckinLog(db, { startIso, endIso });
  } finally {
    db.close();
  }
}

function getDailyCheckins(startIso, endIso) {
  return getCheckinLogFromDatabase({ startIso, endIso });
}

function buildWorkbookBuffer(rows, sheetName) {
  const worksheet = XLSX.utils.aoa_to_sheet([REPORT_COLUMNS]);
  if (rows.length > 0) {
    XLSX.utils.sheet_add_json(worksheet, rows, {
      origin: 'A2',
      skipHeader: true
    });
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
    compression: true
  });
}

function buildDailyCheckinReport(options = {}) {
  const { date } = options;
  const { startIso, endIso, dateLabel } = getLocalDayBounds(date);
  const checkins = getDailyCheckins(startIso, endIso);
  const rows = toSpreadsheetRows(checkins);
  const fileBuffer = buildWorkbookBuffer(rows, 'Daily Check-ins');
  const fileName = `checkin-log-${dateLabel}.xlsx`;

  return {
    fileBuffer,
    fileName,
    rowCount: rows.length,
    date: dateLabel
  };
}

function buildFullCheckinLogReport() {
  const checkins = getCheckinLogFromDatabase();
  const rows = toSpreadsheetRows(checkins);
  const dateLabel = formatLocalDateLabel();
  const fileBuffer = buildWorkbookBuffer(rows, 'Check-in Log');
  const fileName = `checkin-log-full-${dateLabel}.xlsx`;

  return {
    fileBuffer,
    fileName,
    rowCount: rows.length,
    date: dateLabel
  };
}

function getDailyCheckinReportRows(options = {}) {
  const { date } = options;
  const { startIso, endIso, dateLabel } = getLocalDayBounds(date);
  const checkins = getDailyCheckins(startIso, endIso);
  const rows = toSpreadsheetRows(checkins);
  const fileName = `checkin-log-${dateLabel}.xlsx`;

  return {
    rows,
    fileName,
    rowCount: rows.length,
    date: dateLabel
  };
}

/**
 * Load check-in log rows for admin UI (all history, names from membership_cache).
 */
function loadCheckinLogForAdmin(db) {
  return queryCheckinLog(db);
}

/**
 * Load queue rows with membership_cache names (no Square API).
 */
function loadCheckinQueueForAdmin(db) {
  const rows = db.prepare(`
    SELECT
      q.id,
      q.customer_id,
      q.order_id,
      q.guest_count,
      q.status,
      q.created_at,
      q.synced_at,
      m.given_name,
      m.family_name,
      m.email_address,
      m.phone_number,
      m.reference_id,
      m.address_line_1,
      m.locality,
      m.postal_code
    FROM checkin_queue q
    LEFT JOIN membership_cache m ON m.customer_id = q.customer_id
    ORDER BY q.created_at DESC
  `).all();

  return rows.map((row) => ({
    ...row,
    given_name: row.given_name || '',
    family_name: row.family_name || '',
    email_address: row.email_address || '',
    phone_number: row.phone_number || '',
    reference_id: row.reference_id || '',
    address_line_1: row.address_line_1 || '',
    locality: row.locality || '',
    postal_code: row.postal_code || ''
  }));
}

module.exports = {
  REPORT_COLUMNS,
  getLocalDayBounds,
  normalizeCheckinRow,
  toSpreadsheetRows,
  getCheckinLogFromDatabase,
  getCheckinLogCount,
  getDailyCheckins,
  buildDailyCheckinReport,
  buildFullCheckinLogReport,
  getDailyCheckinReportRows,
  loadCheckinLogForAdmin,
  loadCheckinQueueForAdmin,
  queryCheckinLog
};
