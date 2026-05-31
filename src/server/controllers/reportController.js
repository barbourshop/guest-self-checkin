const logger = require('../logger');
const {
  buildDailyCheckinReport,
  buildFullCheckinLogReport,
  getDailyCheckinReportRows
} = require('../services/checkinReportService');

class ReportController {
  async getDailyCheckins(req, res) {
    const { date } = req.query;
    const report = getDailyCheckinReportRows({ date });
    logger.info(`Daily check-in rows requested for ${report.date} (${report.rowCount} row(s))`);
    res.json(report);
  }

  async downloadDailyCheckins(req, res) {
    const { date } = req.query;

    const report = buildDailyCheckinReport({ date });

    logger.info(`Daily check-in report requested for ${report.date} (${report.rowCount} row(s))`);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);
    const payload = Buffer.isBuffer(report.fileBuffer)
      ? report.fileBuffer
      : Buffer.from(report.fileBuffer);
    res.setHeader('Content-Length', payload.length);
    res.setHeader('X-Report-Row-Count', String(report.rowCount));
    res.setHeader('X-Report-Date', report.date);
    res.status(200).send(payload);
  }

  async downloadFullCheckinLog(req, res) {
    const report = buildFullCheckinLogReport();

    logger.info(`Full check-in log export (${report.rowCount} row(s))`);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);
    const payload = Buffer.isBuffer(report.fileBuffer)
      ? report.fileBuffer
      : Buffer.from(report.fileBuffer);
    res.setHeader('Content-Length', payload.length);
    res.setHeader('X-Report-Row-Count', String(report.rowCount));
    res.status(200).send(payload);
  }
}

module.exports = new ReportController();

