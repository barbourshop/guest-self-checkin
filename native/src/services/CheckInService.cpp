#include "CheckInService.h"
#include "../utils/Logger.h"
#include "../utils/ConfigService.h"
#include <QtConcurrent>
#include <QFile>
#include <QTextStream>
#include <QDir>
#include <QStandardPaths>
#include <iomanip>
#include <sstream>

CheckInService::CheckInService(
    std::shared_ptr<DatabaseService> database_service,
    QObject* parent
)
    : QObject(parent)
    , database_service_(database_service)
{
    Logger::info("CheckInService initialized");
}

CheckInService::~CheckInService() {
    Logger::info("CheckInService destroyed");
}

QFuture<Result<CheckIn>> CheckInService::record_member_checkin(
    const Customer& customer,
    const MembershipStatus& membership,
    int guest_count
) {
    return QtConcurrent::run([this, customer, membership, guest_count]() -> Result<CheckIn> {
        Logger::info("Recording member check-in for: {}", customer.display_name());
        
        // Check daily limit
        auto now = std::chrono::system_clock::now();
        auto limit_result = check_daily_limit(QString::fromStdString(customer.id), now);
        
        if (limit_result.is_error()) {
            return Result<CheckIn>::error(limit_result.error());
        }
        
        auto [has_checked_in, count] = limit_result.value();
        
        if (has_checked_in) {
            Logger::warn("Customer {} has already checked in today", customer.display_name());
            emit daily_limit_exceeded(QString::fromStdString(customer.id));
            return Result<CheckIn>::error("Customer has already checked in today");
        }
        
        // Create check-in record
        CheckIn checkin;
        checkin.customer_id = customer.id;
        checkin.customer_name = customer.display_name();
        checkin.lot_number = customer.reference_id;
        checkin.membership_display_names = membership.format_display_names();
        checkin.guest_count = guest_count;
        checkin.timestamp = now;
        checkin.checkin_type = "member";
        
        auto& config = ConfigService::instance();
        checkin.location = config.get_location_name();
        
        // Save to database
        auto result = database_service_->create_checkin(checkin);
        
        if (result.is_error()) {
            Logger::error("Failed to save check-in: {}", result.error());
            return Result<CheckIn>::error(result.error());
        }
        
        checkin.id = result.value();
        
        Logger::info("Check-in recorded: ID={}, customer={}, guests={}",
                    checkin.id, checkin.customer_name, checkin.guest_count);
        
        emit checkin_recorded(checkin);
        
        return Result<CheckIn>::ok(checkin);
    });
}

QFuture<Result<CheckIn>> CheckInService::record_daypass_checkin(
    const Customer& customer,
    int guest_count
) {
    return QtConcurrent::run([this, customer, guest_count]() -> Result<CheckIn> {
        Logger::info("Recording day-pass check-in for: {}", customer.display_name());
        
        // Check daily limit
        auto now = std::chrono::system_clock::now();
        auto limit_result = check_daily_limit(QString::fromStdString(customer.id), now);
        
        if (limit_result.is_error()) {
            return Result<CheckIn>::error(limit_result.error());
        }
        
        auto [has_checked_in, count] = limit_result.value();
        
        if (has_checked_in) {
            Logger::warn("Customer {} has already checked in today", customer.display_name());
            emit daily_limit_exceeded(QString::fromStdString(customer.id));
            return Result<CheckIn>::error("Customer has already checked in today");
        }
        
        // Create check-in record
        CheckIn checkin;
        checkin.customer_id = customer.id;
        checkin.customer_name = customer.display_name();
        checkin.lot_number = customer.reference_id;
        checkin.membership_display_names = std::nullopt;
        checkin.guest_count = guest_count;
        checkin.timestamp = now;
        checkin.checkin_type = "daypass";
        
        auto& config = ConfigService::instance();
        checkin.location = config.get_location_name();
        
        // Save to database
        auto result = database_service_->create_checkin(checkin);
        
        if (result.is_error()) {
            Logger::error("Failed to save check-in: {}", result.error());
            return Result<CheckIn>::error(result.error());
        }
        
        checkin.id = result.value();
        
        Logger::info("Day-pass check-in recorded: ID={}, customer={}, guests={}",
                    checkin.id, checkin.customer_name, checkin.guest_count);
        
        emit checkin_recorded(checkin);
        
        return Result<CheckIn>::ok(checkin);
    });
}

Result<std::pair<bool, int>> CheckInService::check_daily_limit(
    const QString& customer_id,
    const std::chrono::system_clock::time_point& date
) const {
    auto count_result = database_service_->count_checkins_for_date(customer_id, date);
    
    if (count_result.is_error()) {
        return Result<std::pair<bool, int>>::error(count_result.error());
    }
    
    int count = count_result.value();
    bool has_checked_in = count > 0;
    
    return Result<std::pair<bool, int>>::ok({has_checked_in, count});
}

Result<std::vector<CheckIn>> CheckInService::get_checkins_for_date(
    const std::chrono::system_clock::time_point& date
) const {
    return database_service_->get_checkins_for_date(date);
}

Result<std::vector<CheckIn>> CheckInService::get_checkins_for_range(
    const std::chrono::system_clock::time_point& start_date,
    const std::chrono::system_clock::time_point& end_date
) const {
    return database_service_->get_checkins_for_range(start_date, end_date);
}

Result<QString> CheckInService::generate_daily_backup_csv(
    const std::chrono::system_clock::time_point& date
) {
    Logger::info("Generating daily backup CSV");
    
    // Get check-ins for date
    auto checkins_result = get_checkins_for_date(date);
    
    if (checkins_result.is_error()) {
        return Result<QString>::error(checkins_result.error());
    }
    
    auto checkins = checkins_result.value();
    
    // Generate filename
    auto time_t = std::chrono::system_clock::to_time_t(date);
    std::tm tm = *std::localtime(&time_t);
    
    std::ostringstream filename_stream;
    filename_stream << "checkins_" 
                   << std::put_time(&tm, "%Y-%m-%d")
                   << ".csv";
    
    QString data_dir = QStandardPaths::writableLocation(QStandardPaths::AppDataLocation);
    QDir dir(data_dir);
    if (!dir.exists("backups")) {
        dir.mkpath("backups");
    }
    
    QString filepath = dir.filePath("backups/" + QString::fromStdString(filename_stream.str()));
    
    // Write CSV
    QFile file(filepath);
    if (!file.open(QIODevice::WriteOnly | QIODevice::Text)) {
        std::string error = "Failed to open CSV file: " + filepath.toStdString();
        Logger::error(error);
        return Result<QString>::error(error);
    }
    
    QTextStream out(&file);
    
    // Write header
    out << "timestamp,customer_id,customer_name,lot_number,membership_types,guest_count,checkin_type,location\n";
    
    // Write data
    for (const auto& checkin : checkins) {
        out << format_csv_row(checkin).toUtf8() << "\n";
    }
    
    file.close();
    
    Logger::info("Daily backup CSV generated: {} ({} records)", 
                filepath.toStdString(), checkins.size());
    
    return Result<QString>::ok(filepath);
}

Result<CheckInService::TodayStats> CheckInService::get_today_stats() const {
    auto now = std::chrono::system_clock::now();
    auto checkins_result = get_checkins_for_date(now);
    
    if (checkins_result.is_error()) {
        return Result<TodayStats>::error(checkins_result.error());
    }
    
    auto checkins = checkins_result.value();
    
    TodayStats stats;
    stats.total_checkins = checkins.size();
    
    for (const auto& checkin : checkins) {
        if (checkin.checkin_type == "member") {
            stats.member_checkins++;
        } else if (checkin.checkin_type == "daypass") {
            stats.daypass_checkins++;
        }
        stats.total_guests += checkin.guest_count;
    }
    
    return Result<TodayStats>::ok(stats);
}

QString CheckInService::format_csv_row(const CheckIn& checkin) const {
    // Format timestamp as ISO 8601
    auto time_t = std::chrono::system_clock::to_time_t(checkin.timestamp);
    std::tm tm = *std::localtime(&time_t);
    
    std::ostringstream timestamp_stream;
    timestamp_stream << std::put_time(&tm, "%Y-%m-%dT%H:%M:%S");
    
    QString row;
    QTextStream stream(&row);
    
    stream << QString::fromStdString(timestamp_stream.str()) << ",";
    stream << QString::fromStdString(checkin.customer_id) << ",";
    stream << "\"" << QString::fromStdString(checkin.customer_name) << "\",";
    stream << (checkin.lot_number.has_value() 
               ? QString::fromStdString(checkin.lot_number.value()) 
               : "") << ",";
    stream << (checkin.membership_display_names.has_value() 
               ? "\"" + QString::fromStdString(checkin.membership_display_names.value()) + "\""
               : "") << ",";
    stream << checkin.guest_count << ",";
    stream << QString::fromStdString(checkin.checkin_type) << ",";
    stream << QString::fromStdString(checkin.location);
    
    return row;
}
