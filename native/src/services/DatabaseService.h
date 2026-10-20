#pragma once

#include <QSqlDatabase>
#include <QSqlQuery>
#include <QString>
#include <QVariant>
#include <filesystem>
#include <memory>
#include <vector>
#include <optional>
#include <chrono>
#include "../utils/Result.h"
#include "../models/Customer.h"
#include "../models/CheckIn.h"
#include "../models/Segment.h"
#include "../models/Group.h"

/**
 * Database service for SQLite operations using Qt SQL.
 * Manages check-ins, membership cache, and configurations.
 */
class DatabaseService {
public:
    DatabaseService() = default;
    ~DatabaseService();
    
    // Prevent copying
    DatabaseService(const DatabaseService&) = delete;
    DatabaseService& operator=(const DatabaseService&) = delete;
    
    // Connection management
    Result<void> initialize(const std::filesystem::path& db_path);
    Result<void> close();
    bool is_open() const;
    
    // Schema management
    Result<void> create_tables();
    Result<int> get_schema_version();
    Result<void> set_schema_version(int version);
    
    // Transaction support (RAII)
    class Transaction {
    public:
        explicit Transaction(DatabaseService& db);
        ~Transaction();
        
        Result<void> commit();
        Result<void> rollback();
        
    private:
        DatabaseService& db_;
        bool committed_ = false;
        bool rolled_back_ = false;
    };
    
    Result<Transaction> begin_transaction();
    
    // Check-in operations
    Result<int> create_checkin(const CheckIn& checkin);
    Result<std::vector<CheckIn>> get_checkins_for_date(
        const std::chrono::system_clock::time_point& date
    );
    Result<std::vector<CheckIn>> get_all_checkins(
        const std::optional<std::string>& filter = std::nullopt,
        int limit = -1,
        int offset = 0
    );
    Result<int> count_checkins(const std::optional<std::string>& filter = std::nullopt);
    Result<int> count_checkins_for_date(const std::chrono::system_clock::time_point& date);
    
    // Check-in queue operations (for cloud sync)
    Result<int> enqueue_checkin(const CheckIn& checkin);
    Result<std::vector<CheckIn>> get_pending_queue_items(int limit = 100);
    Result<void> mark_queue_item_synced(int queue_id);
    Result<void> mark_queue_item_failed(int queue_id, const std::string& error);
    Result<int> get_pending_queue_count();
    Result<void> clear_synced_queue_items();
    
    // Membership cache operations
    Result<void> upsert_cached_customer(const Customer& customer);
    Result<void> upsert_cached_customers(const std::vector<Customer>& customers);
    Result<void> clear_cache();
    Result<std::vector<Customer>> get_cached_customers();
    Result<std::optional<Customer>> get_cached_customer(const std::string& customer_id);
    Result<int> count_cached_customers();
    Result<std::optional<std::chrono::system_clock::time_point>> get_cache_last_refresh();
    Result<void> set_cache_last_refresh(const std::chrono::system_clock::time_point& timestamp);
    
    // Segment operations
    Result<void> upsert_segment(const Segment& segment);
    Result<void> delete_segment(const std::string& segment_id);
    Result<std::vector<Segment>> get_segments();
    Result<std::vector<Segment>> get_enabled_segments();
    Result<std::optional<Segment>> get_segment(const std::string& segment_id);
    
    // Group operations (NEW)
    Result<void> upsert_group(const Group& group);
    Result<void> delete_group(const std::string& group_id);
    Result<std::vector<Group>> get_groups();
    Result<std::vector<Group>> get_enabled_groups();
    Result<std::optional<Group>> get_group(const std::string& group_id);
    
    // App configuration
    Result<void> set_config(const std::string& key, const std::string& value);
    Result<std::optional<std::string>> get_config(const std::string& key);
    Result<void> delete_config(const std::string& key);
    
    // Maintenance operations
    Result<void> vacuum();
    Result<void> backup(const std::filesystem::path& backup_path);
    Result<void> analyze();
    
    // Statistics
    struct Statistics {
        int total_checkins;
        int today_checkins;
        int member_checkins;
        int daypass_checkins;
        int cached_customers;
        int pending_queue_items;
        std::optional<std::chrono::system_clock::time_point> cache_last_refresh;
    };
    Result<Statistics> get_statistics();
    
private:
    // Helper methods
    QString to_iso_string(const std::chrono::system_clock::time_point& time);
    std::chrono::system_clock::time_point from_iso_string(const QString& iso);
    QString to_json_array(const std::vector<std::string>& items);
    std::vector<std::string> from_json_array(const QString& json);
    
    CheckIn checkin_from_query(QSqlQuery& query);
    Customer customer_from_query(QSqlQuery& query);
    Segment segment_from_query(QSqlQuery& query);
    Group group_from_query(QSqlQuery& query);
    
    Result<void> execute_sql(const QString& sql);
    Result<QSqlQuery> prepare_query(const QString& sql);
    
    QSqlDatabase db_;
    QString connection_name_;
    std::filesystem::path db_path_;
    
    static int connection_counter_;
};
