#pragma once

#include <QObject>
#include <QFuture>
#include <memory>
#include "../utils/Result.h"
#include "../utils/HttpClient.h"
#include "../utils/OAuth2Flow.h"
#include "../models/CheckIn.h"
#include "DatabaseService.h"
#include "SecureStorage.h"

/**
 * Service for syncing check-in data to Google Sheets.
 * Handles OAuth2 authentication and sheet operations.
 */
class GoogleSheetsService : public QObject {
    Q_OBJECT
    
public:
    struct Config {
        QString client_id;
        QString client_secret;
        QString spreadsheet_id;
        QString sheet_name = "Check-ins";
        bool include_customer_id = true;
        bool include_email = false;
        bool include_phone = false;
        bool include_address = false;
    };
    
    explicit GoogleSheetsService(
        const Config& config,
        std::shared_ptr<DatabaseService> database_service,
        QObject* parent = nullptr
    );
    ~GoogleSheetsService() override;
    
    /**
     * Initialize OAuth2 authentication.
     * Returns true if already authenticated, false if auth needed.
     */
    QFuture<Result<bool>> initialize_auth();
    
    /**
     * Start OAuth2 authorization flow.
     */
    QFuture<Result<void>> authorize();
    
    /**
     * Check if authorized.
     */
    bool is_authorized() const;
    
    /**
     * Sync pending check-ins from queue to Google Sheets.
     * Returns number of items synced.
     */
    QFuture<Result<int>> sync_pending_checkins();
    
    /**
     * Manually append a check-in to the sheet.
     */
    QFuture<Result<void>> append_checkin(const CheckIn& checkin);
    
    /**
     * Test connection and permissions.
     */
    QFuture<Result<void>> test_connection();
    
    /**
     * Clear all stored credentials.
     */
    Result<void> clear_credentials();
    
signals:
    void authorization_required();
    void authorization_completed();
    void authorization_failed(const QString& error);
    void sync_started(int pending_count);
    void sync_progress(int synced, int total);
    void sync_completed(int synced_count);
    void sync_failed(const QString& error);
    
private:
    Result<void> refresh_access_token();
    QFuture<Result<void>> append_rows(const std::vector<std::vector<QString>>& rows);
    std::vector<QString> checkin_to_row(const CheckIn& checkin) const;
    
    Config config_;
    std::shared_ptr<DatabaseService> database_service_;
    std::shared_ptr<HttpClient> http_client_;
    std::unique_ptr<OAuth2Flow> oauth2_flow_;
    
    QString access_token_;
    QString refresh_token_;
    std::chrono::system_clock::time_point token_expires_at_;
    
    static constexpr const char* ACCESS_TOKEN_KEY = "google_sheets_access_token";
    static constexpr const char* REFRESH_TOKEN_KEY = "google_sheets_refresh_token";
    static constexpr const char* TOKEN_EXPIRY_KEY = "google_sheets_token_expiry";
};
