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
  'Timestamp',
  'Synced to Square'
];

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

function toSpreadsheetRows(entries) {
  return entries.map((item) => {
    const name = item.checkin_type === 'daypass'
      ? 'Day pass'
      : `${item.given_name || ''} ${item.family_name || ''}`.trim() || '-';

    return {
      ID: item.id || '',
      Type: item.checkin_type === 'daypass' ? 'Day pass' : 'Member',
      Name: name,
      Email: item.email_address || '-',
      Phone: item.phone_number || '-',
      Lot: item.reference_id || '-',
      'Customer ID': item.customer_id || '-',
      'Order ID': item.order_id || '-',
      'Guest Count': Number(item.guest_count) || 0,
      Timestamp: item.timestamp ? new Date(item.timestamp).toLocaleString() : '-',
      'Synced to Square': Number(item.synced_to_square) === 1 ? 'Yes' : 'No'
    };
  });
}

function getDailyCheckins(startIso, endIso) {
  const db = initDatabase();
  try {
    return db.prepare(`
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
      WHERE c.timestamp >= ? AND c.timestamp < ?
      ORDER BY c.timestamp DESC
    `).all(startIso, endIso);
  } finally {
    db.close();
  }
}

function buildWorkbookBuffer(rows) {
  // Always write a header row so empty-day files are still valid in Excel.
  const worksheet = XLSX.utils.aoa_to_sheet([REPORT_COLUMNS]);
  if (rows.length > 0) {
    XLSX.utils.sheet_add_json(worksheet, rows, {
      origin: 'A2',
      skipHeader: true
    });
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Daily Check-ins');
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
  const fileBuffer = buildWorkbookBuffer(rows);
  const fileName = `checkin-log-${dateLabel}.xlsx`;

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

module.exports = {
  buildDailyCheckinReport,
  getDailyCheckinReportRows
};

