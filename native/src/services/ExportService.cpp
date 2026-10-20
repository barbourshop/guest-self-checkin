#include "ExportService.h"
#include "../utils/Logger.h"
#include <QtConcurrent>
#include <QDir>
#include <QStandardPaths>
#include <xlsxwriter.h>
#include <iomanip>
#include <sstream>

ExportService::ExportService(
    std::shared_ptr<DatabaseService> database_service,
    QObject* parent
)
    : QObject(parent)
    , database_service_(database_service)
{
    Logger::info("ExportService initialized");
}

ExportService::~ExportService() {
    Logger::info("ExportService destroyed");
}

QFuture<Result<QString>> ExportService::export_checkins_to_excel(
    const std::chrono::system_clock::time_point& start_date,
    const std::chrono::system_clock::time_point& end_date,
    const QString& output_path
) {
    return QtConcurrent::run([this, start_date, end_date, output_path]() -> Result<QString> {
        emit export_started();
        
        Logger::info("Exporting check-ins to Excel");
        
        // Get check-ins
        auto checkins_result = database_service_->get_checkins_for_range(start_date, end_date);
        
        if (checkins_result.is_error()) {
            emit export_failed(QString::fromStdString(checkins_result.error()));
            return Result<QString>::error(checkins_result.error());
        }
        
        auto checkins = checkins_result.value();
        Logger::info("Exporting {} check-ins", checkins.size());
        
        // Generate filepath
        QString filepath = output_path.isEmpty() 
            ? generate_default_filepath(start_date, end_date)
            : output_path;
        
        // Create workbook
        lxw_workbook* workbook = workbook_new(filepath.toUtf8().constData());
        if (!workbook) {
            std::string error = "Failed to create Excel workbook";
            Logger::error(error);
            emit export_failed(QString::fromStdString(error));
            return Result<QString>::error(error);
        }
        
        lxw_worksheet* worksheet = workbook_add_worksheet(workbook, "Check-ins");
        
        // Create formats
        lxw_format* header_format = workbook_add_format(workbook);
        format_set_bold(header_format);
        format_set_bg_color(header_format, 0xD3D3D3);
        format_set_border(header_format, LXW_BORDER_THIN);
        
        lxw_format* cell_format = workbook_add_format(workbook);
        format_set_border(cell_format, LXW_BORDER_THIN);
        
        lxw_format* date_format = workbook_add_format(workbook);
        format_set_num_format(date_format, "yyyy-mm-dd hh:mm:ss");
        format_set_border(date_format, LXW_BORDER_THIN);
        
        // Write headers
        const char* headers[] = {
            "Timestamp", "Customer ID", "Customer Name", "Lot Number",
            "Membership Types", "Guest Count", "Check-in Type", "Location"
        };
        
        for (int col = 0; col < 8; col++) {
            worksheet_write_string(worksheet, 0, col, headers[col], header_format);
        }
        
        // Set column widths
        worksheet_set_column(worksheet, 0, 0, 20, nullptr);  // Timestamp
        worksheet_set_column(worksheet, 1, 1, 15, nullptr);  // Customer ID
        worksheet_set_column(worksheet, 2, 2, 20, nullptr);  // Customer Name
        worksheet_set_column(worksheet, 3, 3, 12, nullptr);  // Lot Number
        worksheet_set_column(worksheet, 4, 4, 30, nullptr);  // Membership Types
        worksheet_set_column(worksheet, 5, 5, 12, nullptr);  // Guest Count
        worksheet_set_column(worksheet, 6, 6, 15, nullptr);  // Check-in Type
        worksheet_set_column(worksheet, 7, 7, 15, nullptr);  // Location
        
        // Write data
        int row = 1;
        for (const auto& checkin : checkins) {
            // Timestamp
            auto time_t = std::chrono::system_clock::to_time_t(checkin.timestamp);
            std::tm tm = *std::localtime(&time_t);
            
            std::ostringstream timestamp_stream;
            timestamp_stream << std::put_time(&tm, "%Y-%m-%d %H:%M:%S");
            
            worksheet_write_string(worksheet, row, 0, 
                                  timestamp_stream.str().c_str(), cell_format);
            
            // Customer ID
            worksheet_write_string(worksheet, row, 1, 
                                  checkin.customer_id.c_str(), cell_format);
            
            // Customer Name
            worksheet_write_string(worksheet, row, 2, 
                                  checkin.customer_name.c_str(), cell_format);
            
            // Lot Number
            if (checkin.lot_number.has_value()) {
                worksheet_write_string(worksheet, row, 3, 
                                      checkin.lot_number.value().c_str(), cell_format);
            } else {
                worksheet_write_string(worksheet, row, 3, "", cell_format);
            }
            
            // Membership Types
            if (checkin.membership_display_names.has_value()) {
                worksheet_write_string(worksheet, row, 4, 
                                      checkin.membership_display_names.value().c_str(), 
                                      cell_format);
            } else {
                worksheet_write_string(worksheet, row, 4, "", cell_format);
            }
            
            // Guest Count
            worksheet_write_number(worksheet, row, 5, 
                                  checkin.guest_count, cell_format);
            
            // Check-in Type
            worksheet_write_string(worksheet, row, 6, 
                                  checkin.checkin_type.c_str(), cell_format);
            
            // Location
            worksheet_write_string(worksheet, row, 7, 
                                  checkin.location.c_str(), cell_format);
            
            row++;
        }
        
        // Add summary row
        row++;
        worksheet_write_string(worksheet, row, 0, "TOTAL:", header_format);
        
        // Calculate totals
        int total_member = 0;
        int total_daypass = 0;
        int total_guests = 0;
        
        for (const auto& checkin : checkins) {
            if (checkin.checkin_type == "member") total_member++;
            else if (checkin.checkin_type == "daypass") total_daypass++;
            total_guests += checkin.guest_count;
        }
        
        worksheet_write_number(worksheet, row, 5, total_guests, header_format);
        
        row++;
        worksheet_write_string(worksheet, row, 0, "Member Check-ins:", cell_format);
        worksheet_write_number(worksheet, row, 1, total_member, cell_format);
        
        row++;
        worksheet_write_string(worksheet, row, 0, "Day-pass Check-ins:", cell_format);
        worksheet_write_number(worksheet, row, 1, total_daypass, cell_format);
        
        // Close workbook
        lxw_error error = workbook_close(workbook);
        
        if (error != LXW_NO_ERROR) {
            std::string error_msg = "Failed to write Excel file: " + std::to_string(error);
            Logger::error(error_msg);
            emit export_failed(QString::fromStdString(error_msg));
            return Result<QString>::error(error_msg);
        }
        
        Logger::info("Excel export complete: {}", filepath.toStdString());
        emit export_completed(filepath);
        
        return Result<QString>::ok(filepath);
    });
}

QFuture<Result<QString>> ExportService::export_today_to_excel(const QString& output_path) {
    auto now = std::chrono::system_clock::now();
    return export_checkins_to_excel(now, now, output_path);
}

QFuture<Result<QString>> ExportService::export_month_to_excel(
    int year,
    int month,
    const QString& output_path
) {
    // Calculate first and last day of month
    std::tm start_tm = {};
    start_tm.tm_year = year - 1900;
    start_tm.tm_mon = month - 1;
    start_tm.tm_mday = 1;
    start_tm.tm_hour = 0;
    start_tm.tm_min = 0;
    start_tm.tm_sec = 0;
    
    auto start_date = std::chrono::system_clock::from_time_t(std::mktime(&start_tm));
    
    std::tm end_tm = start_tm;
    end_tm.tm_mon++;  // Next month
    end_tm.tm_mday = 0;  // Last day of current month
    
    auto end_date = std::chrono::system_clock::from_time_t(std::mktime(&end_tm));
    
    return export_checkins_to_excel(start_date, end_date, output_path);
}

QString ExportService::generate_default_filepath(
    const std::chrono::system_clock::time_point& start_date,
    const std::chrono::system_clock::time_point& end_date
) const {
    auto start_time_t = std::chrono::system_clock::to_time_t(start_date);
    auto end_time_t = std::chrono::system_clock::to_time_t(end_date);
    
    std::tm start_tm = *std::localtime(&start_time_t);
    std::tm end_tm = *std::localtime(&end_time_t);
    
    std::ostringstream filename_stream;
    filename_stream << "checkins_"
                   << std::put_time(&start_tm, "%Y-%m-%d")
                   << "_to_"
                   << std::put_time(&end_tm, "%Y-%m-%d")
                   << ".xlsx";
    
    QString data_dir = QStandardPaths::writableLocation(QStandardPaths::AppDataLocation);
    QDir dir(data_dir);
    if (!dir.exists("exports")) {
        dir.mkpath("exports");
    }
    
    return dir.filePath("exports/" + QString::fromStdString(filename_stream.str()));
}
