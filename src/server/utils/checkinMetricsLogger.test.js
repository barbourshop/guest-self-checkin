const fs = require('fs');
const path = require('path');
const { logCheckInCSV } = require('./checkinMetricsLogger');

const LOG_DIR = path.join(process.cwd(), 'logs', 'checkins');

function getTodayFilename() {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  return `${mm}-${dd}-${yy}-check-ins.csv`;
}

function getTodayFilePath() {
  return path.join(LOG_DIR, getTodayFilename());
}

describe('checkinMetricsLogger', () => {
  const filePath = getTodayFilePath();

  beforeEach(() => {
    // Remove today's file if it exists
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });

  it('should create a CSV file with header and log a check-in row', () => {
    const data = {
      customerId: '12345',
      guestCount: 2,
      firstName: 'John',
      lastName: 'Doe',
      lotNumber: 'A1'
    };

    logCheckInCSV(data);

    expect(fs.existsSync(filePath)).toBe(true);

    const content = fs.readFileSync(filePath, 'utf8').trim().split('\n');
    expect(content[0]).toBe('timestamp,customerId,guestCount,firstName,lastName,lotNumber');
    expect(content.length).toBe(2);

    // Check the row content (timestamp is ISO, so just check the rest)
    const row = content[1].split(',');
    expect(row[1]).toBe(data.customerId);
    expect(row[2]).toBe(data.guestCount.toString());
    expect(row[3]).toBe(`"${data.firstName}"`);
    expect(row[4]).toBe(`"${data.lastName}"`);
    expect(row[5]).toBe(`"${data.lotNumber}"`);
  });
}); 