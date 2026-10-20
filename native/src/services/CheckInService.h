#pragma once

#include <QObject>
#include <QFuture>
#include <memory>
#include <chrono>
#include "../utils/Result.h"
#include "../models/CheckIn.h"
#include "../models/Customer.h"
#include "../models/MembershipStatus.h"
#include "DatabaseService.h"

/**
 * Service for managing check-ins (member and day-pass).
 * Enforces daily limits and generates backup CSVs.
 */
class CheckInService : public QObject {
    Q_OBJECT
    
public:
    explicit CheckInService(
        std::shared_ptr<DatabaseService> database_service,
        QObject* parent = nullptr
    );
    ~CheckInService() override;
    
    /**
     * Record a member check-in.
     * Validates daily limits before recording.
     */
    QFuture<Result<CheckIn>> record_member_checkin(
        const Customer& customer,
        const MembershipStatus& membership,
        int guest_count = 0
    );
    
    /**
     * Record a day-pass check-in.
     * Validates daily limits before recording.
     */
    QFuture<Result<CheckIn>> record_daypass_checkin(
        const Customer& customer,
        int guest_count = 0
    );
    
    /**
     * Check if customer has reached daily check-in limit.
     * Returns (has_checked_in_today, count_today).
     */
    Result<std::pair<bool, int>> check_daily_limit(
        const QString& customer_id,
        const std::chrono::system_clock::time_point& date
    ) const;
    
    /**
     * Get check-ins for a specific date.
     */
    Result<std::vector<CheckIn>> get_checkins_for_date(
        const std::chrono::system_clock::time_point& date
    ) const;
    
    /**
     * Get check-ins for a date range.
     */
    Result<std::vector<CheckIn>> get_checkins_for_range(
        const std::chrono::system_clock::time_point& start_date,
        const std::chrono::system_clock::time_point& end_date
    ) const;
    
    /**
     * Generate daily backup CSV for a specific date.
     * Returns path to generated CSV file.
     */
    Result<QString> generate_daily_backup_csv(
        const std::chrono::system_clock::time_point& date
    );
    
    /**
     * Get statistics for today.
     */
    struct TodayStats {
        int total_checkins{0};
        int member_checkins{0};
        int daypass_checkins{0};
        int total_guests{0};
    };
    
    Result<TodayStats> get_today_stats() const;
    
signals:
    void checkin_recorded(const CheckIn& checkin);
    void daily_limit_exceeded(const QString& customer_id);
    
private:
    QString format_csv_row(const CheckIn& checkin) const;
    
    std::shared_ptr<DatabaseService> database_service_;
};
