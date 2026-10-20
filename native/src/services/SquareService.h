#pragma once

#include <QObject>
#include <QFuture>
#include <QString>
#include <memory>
#include "../utils/HttpClient.h"
#include "../utils/Result.h"
#include "../models/Customer.h"
#include "../models/Segment.h"
#include "../models/Group.h"

/**
 * Service for interacting with Square API.
 * Handles customer search, segments, and groups.
 */
class SquareService : public QObject {
    Q_OBJECT
    
public:
    struct Config {
        QString api_url = "https://connect.squareup.com/v2";
        QString api_version = "2026-01-22";
        QString access_token;
        std::chrono::seconds timeout{30};
        int retry_attempts{3};
    };
    
    explicit SquareService(const Config& config, QObject* parent = nullptr);
    ~SquareService() override;
    
    // Customer operations
    QFuture<Result<std::vector<Customer>>> search_customers(
        const QString& query,
        const QString& type,  // "email", "phone", "lot", "name", "address", "customer_id"
        bool fuzzy = true,
        int limit = 50
    );
    
    QFuture<Result<Customer>> get_customer(const QString& customer_id);
    
    QFuture<Result<std::vector<Customer>>> get_customers_by_ids(
        const std::vector<QString>& customer_ids
    );
    
    // Segment operations
    QFuture<Result<std::vector<Segment>>> list_segments();
    
    QFuture<Result<std::vector<Customer>>> get_segment_members(
        const QString& segment_id,
        int limit = 100
    );
    
    // Group operations
    QFuture<Result<std::vector<Group>>> list_groups();
    
    QFuture<Result<std::vector<QString>>> get_group_member_ids(
        const QString& group_id,
        int limit = 100
    );
    
    // Test connection
    QFuture<Result<void>> test_connection();
    
    // Update configuration
    void set_access_token(const QString& token);
    
private:
    json build_search_query(const QString& query, const QString& type, bool fuzzy);
    Customer parse_customer(const json& customer_json);
    Segment parse_segment(const json& segment_json);
    Group parse_group(const json& group_json);
    
    std::shared_ptr<HttpClient> http_client_;
    Config config_;
};
