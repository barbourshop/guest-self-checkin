const path = require('path');
const fs = require('fs');
const os = require('os');
const { initDatabase, closeDatabase } = require('../../db/database');
const {
  buildDailyCheckinReport,
  buildFullCheckinLogReport,
  getCheckinLogFromDatabase,
  normalizeCheckinRow
} = require('../checkinReportService');

function seedCheckinDatabase(dbPath) {
  const db = initDatabase(dbPath);

  db.prepare(`
    INSERT INTO membership_cache (
      customer_id, has_membership, segment_ids, last_verified_at,
      given_name, family_name, email_address, phone_number, reference_id
    ) VALUES (?, 1, '[]', ?, 'Ada', 'Member', 'ada@test.com', '555', 'LOT1')
  `).run('CUST1', new Date().toISOString());

  const oldTs = '2020-01-15T18:00:00.000Z';
  const todayMorning = new Date();
  todayMorning.setHours(10, 0, 0, 0);
  const todayIso = todayMorning.toISOString();

  const insert = db.prepare(`
    INSERT INTO checkin_log (customer_id, order_id, guest_count, timestamp, synced_to_square, checkin_type)
    VALUES (?, NULL, 1, ?, 0, 'member')
  `);

  const insertMany = db.transaction((rows) => {
    for (const row of rows) {
      insert.run(row.customerId, row.timestamp);
    }
  });

  const rows = [];
  for (let i = 0; i < 1005; i += 1) {
    rows.push({
      customerId: i === 0 ? 'CUST1' : `CUST_BULK_${i}`,
      timestamp: i === 0 ? oldTs : todayIso
    });
  }
  insertMany(rows);

  db.prepare(`
    INSERT INTO checkin_log (customer_id, order_id, guest_count, timestamp, synced_to_square, checkin_type)
    VALUES ('DAYPASS', NULL, 2, ?, 0, 'daypass')
  `).run(todayIso);

  closeDatabase(db);
}

describe('checkinReportService', () => {
  let tempDir;
  let dbPath;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'checkin-report-test-'));
    dbPath = path.join(tempDir, 'checkin.db');
    process.env.DATABASE_PATH = dbPath;
    process.env.USE_TEST_DB = 'true';
    seedCheckinDatabase(dbPath);
  });

  afterAll(() => {
    delete process.env.DATABASE_PATH;
    delete process.env.USE_TEST_DB;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns more than 1000 rows for full log export (no API cap)', () => {
    const rows = getCheckinLogFromDatabase();
    expect(rows.length).toBeGreaterThan(1000);
  });

  it('labels day-pass rows without membership cache join', () => {
    const dayPass = normalizeCheckinRow({
      customer_id: 'DAYPASS',
      checkin_type: 'daypass'
    });
    expect(dayPass.given_name).toBe('Day pass');
  });

  it('buildFullCheckinLogReport includes all rows in workbook', () => {
    const report = buildFullCheckinLogReport();
    expect(report.rowCount).toBeGreaterThan(1000);
    expect(report.fileName).toMatch(/^checkin-log-full-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(Buffer.isBuffer(report.fileBuffer)).toBe(true);
    expect(report.fileBuffer.length).toBeGreaterThan(100);
  });

  it('buildDailyCheckinReport scopes to local calendar day', () => {
    const report = buildDailyCheckinReport();
    expect(report.rowCount).toBeGreaterThan(0);
    expect(report.fileName).toMatch(/^checkin-log-\d{4}-\d{2}-\d{2}\.xlsx$/);
  });
});

describe('checkinReportService empty day', () => {
  let tempDir;
  let dbPath;

  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'checkin-report-empty-'));
    dbPath = path.join(tempDir, 'checkin.db');
    process.env.DATABASE_PATH = dbPath;
    process.env.USE_TEST_DB = 'true';
    closeDatabase(initDatabase(dbPath));
  });

  afterAll(() => {
    delete process.env.DATABASE_PATH;
    delete process.env.USE_TEST_DB;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('buildDailyCheckinReport allows empty day with headers only', () => {
    const report = buildDailyCheckinReport();
    expect(report.rowCount).toBe(0);
    expect(report.fileBuffer.length).toBeGreaterThan(0);
  });
});
