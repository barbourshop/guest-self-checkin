#pragma once

#include <QObject>
#include <QFuture>
#include <memory>
#include <chrono>
#include "../utils/Result.h"
#include "../models/CheckIn.h"
#include "DatabaseService.h"

/**
 * Service for exporting data to Excel (.xlsx) files.
 * Uses libxlsxwriter for native Excel generation.
 */
class ExportService : public QObject {
    Q_OBJECT
    
public:
    explicit ExportService(
        std::shared_ptr<DatabaseService> database_service,
        QObject* parent = nullptr
    );
    ~ExportService() override;
    
    /**
     * Export check-ins for a date range to Excel.
     * Returns path to generated file.
     */
    QFuture<Result<QString>> export_checkins_to_excel(
        const std::chrono::system_clock::time_point& start_date,
        const std::chrono::system_clock::time_point& end_date,
        const QString& output_path = QString()
    );
    
    /**
     * Export today's check-ins to Excel.
     * Returns path to generated file.
     */
    QFuture<Result<QString>> export_today_to_excel(
        const QString& output_path = QString()
    );
    
    /**
     * Export this month's check-ins to Excel.
     * Returns path to generated file.
     */
    QFuture<Result<QString>> export_month_to_excel(
        int year,
        int month,
        const QString& output_path = QString()
    );
    
signals:
    void export_started();
    void export_completed(const QString& filepath);
    void export_failed(const QString& error);
    
private:
    QString generate_default_filepath(
        const std::chrono::system_clock::time_point& start_date,
        const std::chrono::system_clock::time_point& end_date
    ) const;
    
    std::shared_ptr<DatabaseService> database_service_;
};
