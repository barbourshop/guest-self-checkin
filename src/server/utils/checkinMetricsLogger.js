const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(process.cwd(), 'logs', 'checkins');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

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

function writeHeaderIfNeeded(filePath) {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
    const header = 'timestamp,customerId,guestCount,firstName,lastName,lotNumber\n';
    fs.appendFileSync(filePath, header);
  }
}

function logCheckInCSV({ customerId, guestCount, firstName, lastName, lotNumber }) {
  const filePath = getTodayFilePath();
  writeHeaderIfNeeded(filePath);

  const timestamp = new Date().toISOString();
  // Escape commas in names if needed
  const safeFirstName = `"${String(firstName).replace(/"/g, '""')}"`;
  const safeLastName = `"${String(lastName).replace(/"/g, '""')}"`;
  const safeLot = lotNumber ? `"${String(lotNumber).replace(/"/g, '""')}"` : '';
  const row = `${timestamp},${customerId},${guestCount},${safeFirstName},${safeLastName},${safeLot}\n`;

  fs.appendFileSync(filePath, row);
}

module.exports = { logCheckInCSV }; 