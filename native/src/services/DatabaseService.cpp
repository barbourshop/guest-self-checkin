#include "DatabaseService.h"
#include "../utils/Logger.h"
#include <QSqlError>
#include <QSqlRecord>
#include <QDateTime>
#include <QJsonDocument>
#include <QJsonArray>
#include <QFile>
#include <QDir>
#include <sstream>
#include <iomanip>

int DatabaseService::connection_counter_ = 0;

DatabaseService::~DatabaseService() {
    close();
}

Result<void> DatabaseService::initialize(const std::filesystem::path& db_path) {
    db_path_ = db_path;
    
    // Ensure directory exists
    std::filesystem::path dir = db_path.parent_path();
    if (!dir.empty() && !std::filesystem::exists(dir)) {
        try {
            std::filesystem::create_directories(dir);
        } catch (const std::exception& e) {
            Logger::error("Failed to create database directory: {}", e.what());
            return Result<void>::error("Failed to create database directory");
        }
    }
    
    // Create unique connection name
    connection_name_ = QString("db_connection_%1").arg(++connection_counter_);
    
    // Initialize Qt SQL database
    db_ = QSqlDatabase::addDatabase("QSQLITE", connection_name_);
    db_.setDatabaseName(QString::fromStdString(db_path.string()));
    
    if (!db_.open()) {
        QString error = db_.lastError().text();
        Logger::error("Failed to open database: {}", error.toStdString());
        return Result<void>::error("Failed to open database: " + error.toStdString());
    }
    
    Logger::info("Database opened: {}", db_path.string());
    
    // Enable foreign keys
    auto pragma_result = execute_sql("PRAGMA foreign_keys = ON");
    if (pragma_result.is_error()) {
        return pragma_result;
    }
    
    // Create tables
    auto create_result = create_tables();
    if (create_result.is_error()) {
        return create_result;
    }
    
    Logger::info("Database initialized successfully");
    return Result<void>::ok();
}

Result<void> DatabaseService::close() {
    if (db_.isOpen()) {
        db_.close();
        QSqlDatabase::removeDatabase(connection_name_);
        Logger::info("Database closed");
    }
    return Result<void>::ok();
}

bool DatabaseService::is_open() const {
    return db_.isOpen();
}

Result<void> DatabaseService::create_tables() {
    // Read schema SQL file
    QFile schema_file(":/services/schema.sql");
    if (!schema_file.open(QIODevice::ReadOnly | QIODevice::Text)) {
        // Fallback: embedded schema
        Logger::warn("Could not open schema.sql, using embedded schema");
        // Execute embedded schema (we'll add this as a resource later)
    }
    
    QString schema = schema_file.readAll();
    schema_file.close();
    
    // Split into individual statements and execute
    QStringList statements = schema.split(';', Qt::SkipEmptyParts);
    
    for (const QString& stmt : statements) {
        QString trimmed = stmt.trimmed();
        if (trimmed.isEmpty() || trimmed.startsWith("--")) {
            continue;
        }
        
        auto result = execute_sql(trimmed);
        if (result.is_error()) {
            Logger::error("Failed to execute schema statement: {}", result.error());
            return result;
        }
    }
    
    Logger::info("Database tables created/verified");
    return Result<void>::ok();
}

Result<int> DatabaseService::get_schema_version() {
    auto version_opt = get_config("schema_version");
    if (version_opt.is_error() || !version_opt.value().has_value()) {
        return Result<int>::ok(1);  // Default version
    }
    
    try {
        int version = std::stoi(version_opt.value().value());
        return Result<int>::ok(version);
    } catch (...) {
        return Result<int>::ok(1);
    }
}

Result<void> DatabaseService::set_schema_version(int version) {
    return set_config("schema_version", std::to_string(version));
}

// Transaction implementation
DatabaseService::Transaction::Transaction(DatabaseService& db) 
    : db_(db) {
    if (!db_.db_.transaction()) {
        Logger::error("Failed to begin transaction");
    }
}

DatabaseService::Transaction::~Transaction() {
    if (!committed_ && !rolled_back_) {
        // Auto-rollback if not explicitly committed
        db_.db_.rollback();
        Logger::warn("Transaction auto-rolled back (not committed)");
    }
}

Result<void> DatabaseService::Transaction::commit() {
    if (committed_) {
        return Result<void>::error("Transaction already committed");
    }
    if (rolled_back_) {
        return Result<void>::error("Transaction already rolled back");
    }
    
    if (!db_.db_.commit()) {
        QString error = db_.db_.lastError().text();
        return Result<void>::error("Failed to commit transaction: " + error.toStdString());
    }
    
    committed_ = true;
    return Result<void>::ok();
}

Result<void> DatabaseService::Transaction::rollback() {
    if (committed_) {
        return Result<void>::error("Transaction already committed");
    }
    if (rolled_back_) {
        return Result<void>::error("Transaction already rolled back");
    }
    
    if (!db_.db_.rollback()) {
        QString error = db_.db_.lastError().text();
        return Result<void>::error("Failed to rollback transaction: " + error.toStdString());
    }
    
    rolled_back_ = true;
    return Result<void>::ok();
}

Result<DatabaseService::Transaction> DatabaseService::begin_transaction() {
    return Result<Transaction>::ok(Transaction(*this));
}

// Check-in operations
Result<int> DatabaseService::create_checkin(const CheckIn& checkin) {
    auto query_result = prepare_query(
        "INSERT INTO checkin_log ("
        "  customer_id, order_id, guest_count, timestamp, checkin_type, "
        "  synced_to_square, customer_name, email_address, phone_number, "
        "  lot_number, membership_types, location_id"
        ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    
    if (query_result.is_error()) {
        return Result<int>::error(query_result.error());
    }
    
    QSqlQuery query = query_result.value();
    query.addBindValue(QString::fromStdString(checkin.customer_id));
    query.addBindValue(checkin.order_id.has_value() ? 
        QString::fromStdString(checkin.order_id.value()) : QVariant());
    query.addBindValue(checkin.guest_count);
    query.addBindValue(to_iso_string(checkin.timestamp));
    query.addBindValue(QString::fromStdString(checkin.checkin_type));
    query.addBindValue(checkin.synced_to_square ? 1 : 0);
    query.addBindValue(checkin.customer_name.has_value() ?
        QString::fromStdString(checkin.customer_name.value()) : QVariant());
    query.addBindValue(checkin.email_address.has_value() ?
        QString::fromStdString(checkin.email_address.value()) : QVariant());
    query.addBindValue(checkin.phone_number.has_value() ?
        QString::fromStdString(checkin.phone_number.value()) : QVariant());
    query.addBindValue(checkin.lot_number.has_value() ?
        QString::fromStdString(checkin.lot_number.value()) : QVariant());
    query.addBindValue(QString::fromStdString(checkin.membership_types_string()));
    query.addBindValue(checkin.location_id.has_value() ?
        QString::fromStdString(checkin.location_id.value()) : QVariant());
    
    if (!query.exec()) {
        QString error = query.lastError().text();
        Logger::error("Failed to create check-in: {}", error.toStdString());
        return Result<int>::error("Failed to create check-in: " + error.toStdString());
    }
    
    int id = query.lastInsertId().toInt();
    Logger::info("Check-in created: id={}, customer={}, guests={}", 
                 id, checkin.customer_id, checkin.guest_count);
    
    return Result<int>::ok(id);
}

Result<std::vector<CheckIn>> DatabaseService::get_checkins_for_date(
    const std::chrono::system_clock::time_point& date
) {
    auto start_of_day = std::chrono::time_point_cast<std::chrono::days>(date);
    auto end_of_day = start_of_day + std::chrono::hours(24);
    
    auto query_result = prepare_query(
        "SELECT * FROM checkin_log "
        "WHERE timestamp >= ? AND timestamp < ? "
        "ORDER BY timestamp DESC"
    );
    
    if (query_result.is_error()) {
        return Result<std::vector<CheckIn>>::error(query_result.error());
    }
    
    QSqlQuery query = query_result.value();
    query.addBindValue(to_iso_string(start_of_day));
    query.addBindValue(to_iso_string(end_of_day));
    
    if (!query.exec()) {
        QString error = query.lastError().text();
        return Result<std::vector<CheckIn>>::error("Query failed: " + error.toStdString());
    }
    
    std::vector<CheckIn> checkins;
    while (query.next()) {
        checkins.push_back(checkin_from_query(query));
    }
    
    return Result<std::vector<CheckIn>>::ok(checkins);
}

Result<std::vector<CheckIn>> DatabaseService::get_all_checkins(
    const std::optional<std::string>& filter,
    int limit,
    int offset
) {
    QString sql = "SELECT * FROM checkin_log ";
    
    if (filter.has_value() && !filter.value().empty()) {
        sql += "WHERE customer_id LIKE :filter "
               "OR customer_name LIKE :filter "
               "OR email_address LIKE :filter "
               "OR phone_number LIKE :filter "
               "OR lot_number LIKE :filter "
               "OR order_id LIKE :filter ";
    }
    
    sql += "ORDER BY timestamp DESC ";
    
    if (limit > 0) {
        sql += QString("LIMIT %1 ").arg(limit);
    }
    if (offset > 0) {
        sql += QString("OFFSET %1 ").arg(offset);
    }
    
    auto query_result = prepare_query(sql);
    if (query_result.is_error()) {
        return Result<std::vector<CheckIn>>::error(query_result.error());
    }
    
    QSqlQuery query = query_result.value();
    
    if (filter.has_value() && !filter.value().empty()) {
        QString filter_pattern = QString("%%1%").arg(QString::fromStdString(filter.value()));
        query.bindValue(":filter", filter_pattern);
    }
    
    if (!query.exec()) {
        QString error = query.lastError().text();
        return Result<std::vector<CheckIn>>::error("Query failed: " + error.toStdString());
    }
    
    std::vector<CheckIn> checkins;
    while (query.next()) {
        checkins.push_back(checkin_from_query(query));
    }
    
    return Result<std::vector<CheckIn>>::ok(checkins);
}

Result<int> DatabaseService::count_checkins(const std::optional<std::string>& filter) {
    QString sql = "SELECT COUNT(*) FROM checkin_log";
    
    if (filter.has_value() && !filter.value().empty()) {
        sql += " WHERE customer_id LIKE :filter "
               "OR customer_name LIKE :filter "
               "OR email_address LIKE :filter "
               "OR phone_number LIKE :filter "
               "OR lot_number LIKE :filter";
    }
    
    auto query_result = prepare_query(sql);
    if (query_result.is_error()) {
        return Result<int>::error(query_result.error());
    }
    
    QSqlQuery query = query_result.value();
    
    if (filter.has_value() && !filter.value().empty()) {
        QString filter_pattern = QString("%%1%").arg(QString::fromStdString(filter.value()));
        query.bindValue(":filter", filter_pattern);
    }
    
    if (!query.exec() || !query.next()) {
        return Result<int>::error("Count query failed");
    }
    
    return Result<int>::ok(query.value(0).toInt());
}

// Membership cache operations
Result<void> DatabaseService::upsert_cached_customer(const Customer& customer) {
    auto query_result = prepare_query(
        "INSERT OR REPLACE INTO membership_cache ("
        "  customer_id, has_membership, segment_ids, group_ids, last_verified_at, "
        "  given_name, family_name, email_address, phone_number, reference_id, "
        "  address_line_1, locality, postal_code"
        ") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    
    if (query_result.is_error()) {
        return Result<void>::error(query_result.error());
    }
    
    QSqlQuery query = query_result.value();
    query.addBindValue(QString::fromStdString(customer.id));
    query.addBindValue(!customer.segment_ids.empty() || !customer.group_ids.empty() ? 1 : 0);
    query.addBindValue(to_json_array(customer.segment_ids));
    query.addBindValue(to_json_array(customer.group_ids));
    query.addBindValue(customer.last_verified_at.has_value() ?
        to_iso_string(customer.last_verified_at.value()) :
        to_iso_string(std::chrono::system_clock::now()));
    query.addBindValue(QString::fromStdString(customer.given_name));
    query.addBindValue(QString::fromStdString(customer.family_name));
    query.addBindValue(customer.email_address.has_value() ?
        QString::fromStdString(customer.email_address.value()) : QVariant());
    query.addBindValue(customer.phone_number.has_value() ?
        QString::fromStdString(customer.phone_number.value()) : QVariant());
    query.addBindValue(customer.reference_id.has_value() ?
        QString::fromStdString(customer.reference_id.value()) : QVariant());
    query.addBindValue(customer.address_line_1.has_value() ?
        QString::fromStdString(customer.address_line_1.value()) : QVariant());
    query.addBindValue(customer.locality.has_value() ?
        QString::fromStdString(customer.locality.value()) : QVariant());
    query.addBindValue(customer.postal_code.has_value() ?
        QString::fromStdString(customer.postal_code.value()) : QVariant());
    
    if (!query.exec()) {
        QString error = query.lastError().text();
        return Result<void>::error("Failed to upsert customer: " + error.toStdString());
    }
    
    return Result<void>::ok();
}

Result<void> DatabaseService::upsert_cached_customers(const std::vector<Customer>& customers) {
    auto txn = begin_transaction();
    if (txn.is_error()) {
        return Result<void>::error(txn.error());
    }
    
    for (const auto& customer : customers) {
        auto result = upsert_cached_customer(customer);
        if (result.is_error()) {
            txn.value().rollback();
            return result;
        }
    }
    
    return txn.value().commit();
}

Result<void> DatabaseService::clear_cache() {
    auto result = execute_sql("DELETE FROM membership_cache");
    if (result.is_ok()) {
        Logger::info("Membership cache cleared");
    }
    return result;
}

Result<std::vector<Customer>> DatabaseService::get_cached_customers() {
    auto query_result = prepare_query("SELECT * FROM membership_cache ORDER BY given_name, family_name");
    if (query_result.is_error()) {
        return Result<std::vector<Customer>>::error(query_result.error());
    }
    
    QSqlQuery query = query_result.value();
    if (!query.exec()) {
        QString error = query.lastError().text();
        return Result<std::vector<Customer>>::error("Query failed: " + error.toStdString());
    }
    
    std::vector<Customer> customers;
    while (query.next()) {
        customers.push_back(customer_from_query(query));
    }
    
    return Result<std::vector<Customer>>::ok(customers);
}

Result<std::optional<Customer>> DatabaseService::get_cached_customer(const std::string& customer_id) {
    auto query_result = prepare_query("SELECT * FROM membership_cache WHERE customer_id = ?");
    if (query_result.is_error()) {
        return Result<std::optional<Customer>>::error(query_result.error());
    }
    
    QSqlQuery query = query_result.value();
    query.addBindValue(QString::fromStdString(customer_id));
    
    if (!query.exec()) {
        QString error = query.lastError().text();
        return Result<std::optional<Customer>>::error("Query failed: " + error.toStdString());
    }
    
    if (query.next()) {
        return Result<std::optional<Customer>>::ok(customer_from_query(query));
    }
    
    return Result<std::optional<Customer>>::ok(std::nullopt);
}

// Segment operations
Result<void> DatabaseService::upsert_segment(const Segment& segment) {
    auto query_result = prepare_query(
        "INSERT OR REPLACE INTO customer_segments (segment_id, display_name, sort_order, enabled) "
        "VALUES (?, ?, ?, ?)"
    );
    
    if (query_result.is_error()) {
        return Result<void>::error(query_result.error());
    }
    
    QSqlQuery query = query_result.value();
    query.addBindValue(QString::fromStdString(segment.id));
    query.addBindValue(QString::fromStdString(segment.effective_display_name()));
    query.addBindValue(segment.sort_order);
    query.addBindValue(segment.enabled ? 1 : 0);
    
    if (!query.exec()) {
        QString error = query.lastError().text();
        return Result<void>::error("Failed to upsert segment: " + error.toStdString());
    }
    
    return Result<void>::ok();
}

Result<void> DatabaseService::delete_segment(const std::string& segment_id) {
    auto query_result = prepare_query("DELETE FROM customer_segments WHERE segment_id = ?");
    if (query_result.is_error()) {
        return Result<void>::error(query_result.error());
    }
    
    QSqlQuery query = query_result.value();
    query.addBindValue(QString::fromStdString(segment_id));
    
    if (!query.exec()) {
        QString error = query.lastError().text();
        return Result<void>::error("Failed to delete segment: " + error.toStdString());
    }
    
    return Result<void>::ok();
}

Result<std::vector<Segment>> DatabaseService::get_segments() {
    auto query_result = prepare_query("SELECT * FROM customer_segments ORDER BY sort_order");
    if (query_result.is_error()) {
        return Result<std::vector<Segment>>::error(query_result.error());
    }
    
    QSqlQuery query = query_result.value();
    if (!query.exec()) {
        QString error = query.lastError().text();
        return Result<std::vector<Segment>>::error("Query failed: " + error.toStdString());
    }
    
    std::vector<Segment> segments;
    while (query.next()) {
        segments.push_back(segment_from_query(query));
    }
    
    return Result<std::vector<Segment>>::ok(segments);
}

Result<std::vector<Segment>> DatabaseService::get_enabled_segments() {
    auto query_result = prepare_query(
        "SELECT * FROM customer_segments WHERE enabled = 1 ORDER BY sort_order"
    );
    if (query_result.is_error()) {
        return Result<std::vector<Segment>>::error(query_result.error());
    }
    
    QSqlQuery query = query_result.value();
    if (!query.exec()) {
        QString error = query.lastError().text();
        return Result<std::vector<Segment>>::error("Query failed: " + error.toStdString());
    }
    
    std::vector<Segment> segments;
    while (query.next()) {
        segments.push_back(segment_from_query(query));
    }
    
    return Result<std::vector<Segment>>::ok(segments);
}

// Group operations (similar to segments)
Result<void> DatabaseService::upsert_group(const Group& group) {
    auto query_result = prepare_query(
        "INSERT OR REPLACE INTO customer_groups (group_id, display_name, sort_order, enabled) "
        "VALUES (?, ?, ?, ?)"
    );
    
    if (query_result.is_error()) {
        return Result<void>::error(query_result.error());
    }
    
    QSqlQuery query = query_result.value();
    query.addBindValue(QString::fromStdString(group.id));
    query.addBindValue(QString::fromStdString(group.effective_display_name()));
    query.addBindValue(group.sort_order);
    query.addBindValue(group.enabled ? 1 : 0);
    
    if (!query.exec()) {
        QString error = query.lastError().text();
        return Result<void>::error("Failed to upsert group: " + error.toStdString());
    }
    
    return Result<void>::ok();
}

Result<std::vector<Group>> DatabaseService::get_groups() {
    auto query_result = prepare_query("SELECT * FROM customer_groups ORDER BY sort_order");
    if (query_result.is_error()) {
        return Result<std::vector<Group>>::error(query_result.error());
    }
    
    QSqlQuery query = query_result.value();
    if (!query.exec()) {
        QString error = query.lastError().text();
        return Result<std::vector<Group>>::error("Query failed: " + error.toStdString());
    }
    
    std::vector<Group> groups;
    while (query.next()) {
        groups.push_back(group_from_query(query));
    }
    
    return Result<std::vector<Group>>::ok(groups);
}

Result<std::vector<Group>> DatabaseService::get_enabled_groups() {
    auto query_result = prepare_query(
        "SELECT * FROM customer_groups WHERE enabled = 1 ORDER BY sort_order"
    );
    if (query_result.is_error()) {
        return Result<std::vector<Group>>::error(query_result.error());
    }
    
    QSqlQuery query = query_result.value();
    if (!query.exec()) {
        QString error = query.lastError().text();
        return Result<std::vector<Group>>::error("Query failed: " + error.toStdString());
    }
    
    std::vector<Group> groups;
    while (query.next()) {
        groups.push_back(group_from_query(query));
    }
    
    return Result<std::vector<Group>>::ok(groups);
}

// Check-in queue operations
Result<int> DatabaseService::enqueue_checkin(const CheckIn& checkin) {
    auto query_result = prepare_query(
        "INSERT INTO checkin_queue ("
        "  customer_id, order_id, guest_count, checkin_type, status, created_at, retry_count"
        ") VALUES (?, ?, ?, ?, 'pending', ?, 0)"
    );
    
    if (query_result.is_error()) {
        return Result<int>::error(query_result.error());
    }
    
    QSqlQuery query = query_result.value();
    query.addBindValue(QString::fromStdString(checkin.customer_id));
    query.addBindValue(checkin.order_id.has_value() ? 
        QString::fromStdString(checkin.order_id.value()) : QVariant());
    query.addBindValue(checkin.guest_count);
    query.addBindValue(QString::fromStdString(checkin.checkin_type));
    query.addBindValue(to_iso_string(checkin.timestamp));
    
    if (!query.exec()) {
        QString error = query.lastError().text();
        return Result<int>::error("Failed to enqueue check-in: " + error.toStdString());
    }
    
    return Result<int>::ok(query.lastInsertId().toInt());
}

Result<std::vector<CheckIn>> DatabaseService::get_pending_queue_items(int limit) {
    auto query_result = prepare_query(
        "SELECT * FROM checkin_queue WHERE status = 'pending' "
        "ORDER BY created_at LIMIT ?"
    );
    
    if (query_result.is_error()) {
        return Result<std::vector<CheckIn>>::error(query_result.error());
    }
    
    QSqlQuery query = query_result.value();
    query.addBindValue(limit);
    
    if (!query.exec()) {
        QString error = query.lastError().text();
        return Result<std::vector<CheckIn>>::error("Query failed: " + error.toStdString());
    }
    
    std::vector<CheckIn> checkins;
    while (query.next()) {
        CheckIn checkin;
        checkin.id = query.value("id").toInt();
        checkin.customer_id = query.value("customer_id").toString().toStdString();
        
        if (!query.value("order_id").isNull()) {
            checkin.order_id = query.value("order_id").toString().toStdString();
        }
        
        checkin.guest_count = query.value("guest_count").toInt();
        checkin.checkin_type = query.value("checkin_type").toString().toStdString();
        checkin.timestamp = from_iso_string(query.value("created_at").toString());
        
        checkins.push_back(checkin);
    }
    
    return Result<std::vector<CheckIn>>::ok(checkins);
}

Result<void> DatabaseService::mark_queue_item_synced(int queue_id) {
    auto query_result = prepare_query(
        "UPDATE checkin_queue SET status = 'synced', synced_at = ? WHERE id = ?"
    );
    
    if (query_result.is_error()) {
        return Result<void>::error(query_result.error());
    }
    
    QSqlQuery query = query_result.value();
    query.addBindValue(to_iso_string(std::chrono::system_clock::now()));
    query.addBindValue(queue_id);
    
    if (!query.exec()) {
        QString error = query.lastError().text();
        return Result<void>::error("Failed to mark synced: " + error.toStdString());
    }
    
    return Result<void>::ok();
}

Result<void> DatabaseService::mark_queue_item_failed(int queue_id, const std::string& error) {
    auto query_result = prepare_query(
        "UPDATE checkin_queue SET retry_count = retry_count + 1, last_error = ? WHERE id = ?"
    );
    
    if (query_result.is_error()) {
        return Result<void>::error(query_result.error());
    }
    
    QSqlQuery query = query_result.value();
    query.addBindValue(QString::fromStdString(error));
    query.addBindValue(queue_id);
    
    if (!query.exec()) {
        QString error_msg = query.lastError().text();
        return Result<void>::error("Failed to mark failed: " + error_msg.toStdString());
    }
    
    return Result<void>::ok();
}

Result<int> DatabaseService::get_pending_queue_count() {
    auto query_result = prepare_query("SELECT COUNT(*) FROM checkin_queue WHERE status = 'pending'");
    if (query_result.is_error()) {
        return Result<int>::error(query_result.error());
    }
    
    QSqlQuery query = query_result.value();
    if (!query.exec() || !query.next()) {
        return Result<int>::error("Count query failed");
    }
    
    return Result<int>::ok(query.value(0).toInt());
}

Result<void> DatabaseService::clear_synced_queue_items() {
    return execute_sql("DELETE FROM checkin_queue WHERE status = 'synced'");
}

Result<int> DatabaseService::count_cached_customers() {
    auto query_result = prepare_query("SELECT COUNT(*) FROM membership_cache");
    if (query_result.is_error()) {
        return Result<int>::error(query_result.error());
    }
    
    QSqlQuery query = query_result.value();
    if (!query.exec() || !query.next()) {
        return Result<int>::error("Count query failed");
    }
    
    return Result<int>::ok(query.value(0).toInt());
}

Result<std::optional<std::chrono::system_clock::time_point>> DatabaseService::get_cache_last_refresh() {
    auto result = get_config("cache_last_refresh");
    if (result.is_error() || !result.value().has_value()) {
        return Result<std::optional<std::chrono::system_clock::time_point>>::ok(std::nullopt);
    }
    
    try {
        auto timestamp = from_iso_string(QString::fromStdString(result.value().value()));
        return Result<std::optional<std::chrono::system_clock::time_point>>::ok(timestamp);
    } catch (...) {
        return Result<std::optional<std::chrono::system_clock::time_point>>::ok(std::nullopt);
    }
}

Result<void> DatabaseService::set_cache_last_refresh(const std::chrono::system_clock::time_point& timestamp) {
    return set_config("cache_last_refresh", to_iso_string(timestamp).toStdString());
}

Result<int> DatabaseService::count_checkins_for_date(const std::chrono::system_clock::time_point& date) {
    auto start_of_day = std::chrono::time_point_cast<std::chrono::days>(date);
    auto end_of_day = start_of_day + std::chrono::hours(24);
    
    auto query_result = prepare_query(
        "SELECT COUNT(*) FROM checkin_log WHERE timestamp >= ? AND timestamp < ?"
    );
    
    if (query_result.is_error()) {
        return Result<int>::error(query_result.error());
    }
    
    QSqlQuery query = query_result.value();
    query.addBindValue(to_iso_string(start_of_day));
    query.addBindValue(to_iso_string(end_of_day));
    
    if (!query.exec() || !query.next()) {
        return Result<int>::error("Count query failed");
    }
    
    return Result<int>::ok(query.value(0).toInt());
}

Result<std::optional<Segment>> DatabaseService::get_segment(const std::string& segment_id) {
    auto query_result = prepare_query("SELECT * FROM customer_segments WHERE segment_id = ?");
    if (query_result.is_error()) {
        return Result<std::optional<Segment>>::error(query_result.error());
    }
    
    QSqlQuery query = query_result.value();
    query.addBindValue(QString::fromStdString(segment_id));
    
    if (!query.exec()) {
        QString error = query.lastError().text();
        return Result<std::optional<Segment>>::error("Query failed: " + error.toStdString());
    }
    
    if (query.next()) {
        return Result<std::optional<Segment>>::ok(segment_from_query(query));
    }
    
    return Result<std::optional<Segment>>::ok(std::nullopt);
}

Result<void> DatabaseService::delete_group(const std::string& group_id) {
    auto query_result = prepare_query("DELETE FROM customer_groups WHERE group_id = ?");
    if (query_result.is_error()) {
        return Result<void>::error(query_result.error());
    }
    
    QSqlQuery query = query_result.value();
    query.addBindValue(QString::fromStdString(group_id));
    
    if (!query.exec()) {
        QString error = query.lastError().text();
        return Result<void>::error("Failed to delete group: " + error.toStdString());
    }
    
    return Result<void>::ok();
}

Result<std::optional<Group>> DatabaseService::get_group(const std::string& group_id) {
    auto query_result = prepare_query("SELECT * FROM customer_groups WHERE group_id = ?");
    if (query_result.is_error()) {
        return Result<std::optional<Group>>::error(query_result.error());
    }
    
    QSqlQuery query = query_result.value();
    query.addBindValue(QString::fromStdString(group_id));
    
    if (!query.exec()) {
        QString error = query.lastError().text();
        return Result<std::optional<Group>>::error("Query failed: " + error.toStdString());
    }
    
    if (query.next()) {
        return Result<std::optional<Group>>::ok(group_from_query(query));
    }
    
    return Result<std::optional<Group>>::ok(std::nullopt);
}

Result<void> DatabaseService::delete_config(const std::string& key) {
    auto query_result = prepare_query("DELETE FROM app_config WHERE key = ?");
    if (query_result.is_error()) {
        return Result<void>::error(query_result.error());
    }
    
    QSqlQuery query = query_result.value();
    query.addBindValue(QString::fromStdString(key));
    
    if (!query.exec()) {
        QString error = query.lastError().text();
        return Result<void>::error("Failed to delete config: " + error.toStdString());
    }
    
    return Result<void>::ok();
}

Result<void> DatabaseService::analyze() {
    Logger::info("Running ANALYZE on database");
    return execute_sql("ANALYZE");
}

Result<DatabaseService::Statistics> DatabaseService::get_statistics() {
    Statistics stats;
    
    // Total check-ins
    auto total_result = count_checkins();
    if (total_result.is_ok()) {
        stats.total_checkins = total_result.value();
    }
    
    // Today's check-ins
    auto today = std::chrono::floor<std::chrono::days>(std::chrono::system_clock::now());
    auto today_result = count_checkins_for_date(today);
    if (today_result.is_ok()) {
        stats.today_checkins = today_result.value();
    }
    
    // Member vs daypass counts
    auto member_query = prepare_query("SELECT COUNT(*) FROM checkin_log WHERE checkin_type = 'member'");
    if (member_query.is_ok()) {
        QSqlQuery query = member_query.value();
        if (query.exec() && query.next()) {
            stats.member_checkins = query.value(0).toInt();
        }
    }
    
    auto daypass_query = prepare_query("SELECT COUNT(*) FROM checkin_log WHERE checkin_type = 'daypass'");
    if (daypass_query.is_ok()) {
        QSqlQuery query = daypass_query.value();
        if (query.exec() && query.next()) {
            stats.daypass_checkins = query.value(0).toInt();
        }
    }
    
    // Cached customers
    auto cache_count = count_cached_customers();
    if (cache_count.is_ok()) {
        stats.cached_customers = cache_count.value();
    }
    
    // Pending queue
    auto queue_count = get_pending_queue_count();
    if (queue_count.is_ok()) {
        stats.pending_queue_items = queue_count.value();
    }
    
    // Cache last refresh
    auto last_refresh = get_cache_last_refresh();
    if (last_refresh.is_ok()) {
        stats.cache_last_refresh = last_refresh.value();
    }
    
    return Result<Statistics>::ok(stats);
}

// Configuration operations
Result<void> DatabaseService::set_config(const std::string& key, const std::string& value) {
    auto query_result = prepare_query(
        "INSERT OR REPLACE INTO app_config (key, value, updated_at) VALUES (?, ?, ?)"
    );
    
    if (query_result.is_error()) {
        return Result<void>::error(query_result.error());
    }
    
    QSqlQuery query = query_result.value();
    query.addBindValue(QString::fromStdString(key));
    query.addBindValue(QString::fromStdString(value));
    query.addBindValue(to_iso_string(std::chrono::system_clock::now()));
    
    if (!query.exec()) {
        QString error = query.lastError().text();
        return Result<void>::error("Failed to set config: " + error.toStdString());
    }
    
    return Result<void>::ok();
}

Result<std::optional<std::string>> DatabaseService::get_config(const std::string& key) {
    auto query_result = prepare_query("SELECT value FROM app_config WHERE key = ?");
    if (query_result.is_error()) {
        return Result<std::optional<std::string>>::error(query_result.error());
    }
    
    QSqlQuery query = query_result.value();
    query.addBindValue(QString::fromStdString(key));
    
    if (!query.exec()) {
        QString error = query.lastError().text();
        return Result<std::optional<std::string>>::error("Query failed: " + error.toStdString());
    }
    
    if (query.next()) {
        return Result<std::optional<std::string>>::ok(query.value(0).toString().toStdString());
    }
    
    return Result<std::optional<std::string>>::ok(std::nullopt);
}

// Maintenance operations
Result<void> DatabaseService::vacuum() {
    Logger::info("Running VACUUM on database");
    return execute_sql("VACUUM");
}

Result<void> DatabaseService::backup(const std::filesystem::path& backup_path) {
    try {
        // Close current connection
        close();
        
        // Copy database file
        std::filesystem::copy_file(
            db_path_,
            backup_path,
            std::filesystem::copy_options::overwrite_existing
        );
        
        // Reopen connection
        auto result = initialize(db_path_);
        if (result.is_error()) {
            return result;
        }
        
        Logger::info("Database backed up to: {}", backup_path.string());
        return Result<void>::ok();
        
    } catch (const std::exception& e) {
        Logger::error("Backup failed: {}", e.what());
        return Result<void>::error(std::string("Backup failed: ") + e.what());
    }
}

// Helper methods
QString DatabaseService::to_iso_string(const std::chrono::system_clock::time_point& time) {
    auto time_t = std::chrono::system_clock::to_time_t(time);
    std::tm tm = *std::gmtime(&time_t);
    std::ostringstream oss;
    oss << std::put_time(&tm, "%Y-%m-%dT%H:%M:%SZ");
    return QString::fromStdString(oss.str());
}

std::chrono::system_clock::time_point DatabaseService::from_iso_string(const QString& iso) {
    QDateTime dt = QDateTime::fromString(iso, Qt::ISODate);
    return std::chrono::system_clock::from_time_t(dt.toSecsSinceEpoch());
}

QString DatabaseService::to_json_array(const std::vector<std::string>& items) {
    QJsonArray array;
    for (const auto& item : items) {
        array.append(QString::fromStdString(item));
    }
    return QJsonDocument(array).toJson(QJsonDocument::Compact);
}

std::vector<std::string> DatabaseService::from_json_array(const QString& json) {
    if (json.isEmpty()) {
        return {};
    }
    
    QJsonDocument doc = QJsonDocument::fromJson(json.toUtf8());
    if (!doc.isArray()) {
        return {};
    }
    
    std::vector<std::string> items;
    QJsonArray array = doc.array();
    for (const auto& value : array) {
        if (value.isString()) {
            items.push_back(value.toString().toStdString());
        }
    }
    
    return items;
}

CheckIn DatabaseService::checkin_from_query(QSqlQuery& query) {
    CheckIn checkin;
    checkin.id = query.value("id").toInt();
    checkin.customer_id = query.value("customer_id").toString().toStdString();
    
    if (!query.value("order_id").isNull()) {
        checkin.order_id = query.value("order_id").toString().toStdString();
    }
    
    checkin.guest_count = query.value("guest_count").toInt();
    checkin.timestamp = from_iso_string(query.value("timestamp").toString());
    checkin.checkin_type = query.value("checkin_type").toString().toStdString();
    checkin.synced_to_square = query.value("synced_to_square").toInt() == 1;
    
    if (!query.value("customer_name").isNull()) {
        checkin.customer_name = query.value("customer_name").toString().toStdString();
    }
    if (!query.value("email_address").isNull()) {
        checkin.email_address = query.value("email_address").toString().toStdString();
    }
    if (!query.value("phone_number").isNull()) {
        checkin.phone_number = query.value("phone_number").toString().toStdString();
    }
    if (!query.value("lot_number").isNull()) {
        checkin.lot_number = query.value("lot_number").toString().toStdString();
    }
    if (!query.value("location_id").isNull()) {
        checkin.location_id = query.value("location_id").toString().toStdString();
    }
    
    // Parse membership_types (comma-separated string)
    QString types_str = query.value("membership_types").toString();
    if (!types_str.isEmpty()) {
        QStringList types = types_str.split(',', Qt::SkipEmptyParts);
        for (const auto& type : types) {
            checkin.membership_types.push_back(type.trimmed().toStdString());
        }
    }
    
    return checkin;
}

Customer DatabaseService::customer_from_query(QSqlQuery& query) {
    Customer customer;
    customer.id = query.value("customer_id").toString().toStdString();
    customer.given_name = query.value("given_name").toString().toStdString();
    customer.family_name = query.value("family_name").toString().toStdString();
    
    if (!query.value("email_address").isNull()) {
        customer.email_address = query.value("email_address").toString().toStdString();
    }
    if (!query.value("phone_number").isNull()) {
        customer.phone_number = query.value("phone_number").toString().toStdString();
    }
    if (!query.value("reference_id").isNull()) {
        customer.reference_id = query.value("reference_id").toString().toStdString();
    }
    if (!query.value("address_line_1").isNull()) {
        customer.address_line_1 = query.value("address_line_1").toString().toStdString();
    }
    if (!query.value("locality").isNull()) {
        customer.locality = query.value("locality").toString().toStdString();
    }
    if (!query.value("postal_code").isNull()) {
        customer.postal_code = query.value("postal_code").toString().toStdString();
    }
    
    customer.segment_ids = from_json_array(query.value("segment_ids").toString());
    customer.group_ids = from_json_array(query.value("group_ids").toString());
    customer.last_verified_at = from_iso_string(query.value("last_verified_at").toString());
    
    return customer;
}

Segment DatabaseService::segment_from_query(QSqlQuery& query) {
    Segment segment;
    segment.id = query.value("segment_id").toString().toStdString();
    segment.display_name = query.value("display_name").toString().toStdString();
    segment.sort_order = query.value("sort_order").toInt();
    segment.enabled = query.value("enabled").toInt() == 1;
    return segment;
}

Group DatabaseService::group_from_query(QSqlQuery& query) {
    Group group;
    group.id = query.value("group_id").toString().toStdString();
    group.display_name = query.value("display_name").toString().toStdString();
    group.sort_order = query.value("sort_order").toInt();
    group.enabled = query.value("enabled").toInt() == 1;
    return group;
}

Result<void> DatabaseService::execute_sql(const QString& sql) {
    QSqlQuery query(db_);
    if (!query.exec(sql)) {
        QString error = query.lastError().text();
        return Result<void>::error("SQL execution failed: " + error.toStdString());
    }
    return Result<void>::ok();
}

Result<QSqlQuery> DatabaseService::prepare_query(const QString& sql) {
    QSqlQuery query(db_);
    if (!query.prepare(sql)) {
        QString error = query.lastError().text();
        return Result<QSqlQuery>::error("Query preparation failed: " + error.toStdString());
    }
    return Result<QSqlQuery>::ok(std::move(query));
}
