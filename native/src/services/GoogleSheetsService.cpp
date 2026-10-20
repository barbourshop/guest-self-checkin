#include "GoogleSheetsService.h"
#include "../utils/Logger.h"
#include <QtConcurrent>
#include <QUrlQuery>
#include <iomanip>
#include <sstream>

GoogleSheetsService::GoogleSheetsService(
    const Config& config,
    std::shared_ptr<DatabaseService> database_service,
    QObject* parent
)
    : QObject(parent)
    , config_(config)
    , database_service_(database_service)
{
    // Create HTTP client for Google Sheets API
    HttpClient::Config http_config;
    http_config.base_url = QUrl("https://sheets.googleapis.com/v4");
    http_config.timeout = std::chrono::seconds(30);
    
    http_client_ = std::make_shared<HttpClient>(http_config, this);
    
    // Create OAuth2 flow
    OAuth2Flow::Config oauth_config;
    oauth_config.client_id = config_.client_id;
    oauth_config.client_secret = config_.client_secret;
    oauth_config.scopes = {"https://www.googleapis.com/auth/spreadsheets"};
    
    oauth2_flow_ = std::make_unique<OAuth2Flow>(oauth_config, this);
    
    // Connect OAuth2 signals
    connect(oauth2_flow_.get(), &OAuth2Flow::authorization_completed,
            this, [this](const QString& auth_code) {
                Logger::info("OAuth2 authorization completed, exchanging code");
            });
    
    connect(oauth2_flow_.get(), &OAuth2Flow::authorization_failed,
            this, [this](const QString& error) {
                Logger::error("OAuth2 authorization failed: {}", error.toStdString());
                emit authorization_failed(error);
            });
    
    Logger::info("GoogleSheetsService initialized for spreadsheet: {}", 
                 config_.spreadsheet_id.toStdString());
}

GoogleSheetsService::~GoogleSheetsService() {
    Logger::info("GoogleSheetsService destroyed");
}

QFuture<Result<bool>> GoogleSheetsService::initialize_auth() {
    return QtConcurrent::run([this]() -> Result<bool> {
        Logger::info("Initializing Google Sheets authentication");
        
        auto& storage = SecureStorage::instance();
        
        // Try to load tokens from secure storage
        auto access_token_result = storage.get(ACCESS_TOKEN_KEY);
        auto refresh_token_result = storage.get(REFRESH_TOKEN_KEY);
        auto expiry_result = storage.get(TOKEN_EXPIRY_KEY);
        
        if (access_token_result.is_ok() && refresh_token_result.is_ok()) {
            access_token_ = access_token_result.value();
            refresh_token_ = refresh_token_result.value();
            
            if (expiry_result.is_ok()) {
                qint64 expiry_seconds = expiry_result.value().toLongLong();
                token_expires_at_ = std::chrono::system_clock::from_time_t(expiry_seconds);
            }
            
            // Check if token is expired
            auto now = std::chrono::system_clock::now();
            if (now >= token_expires_at_) {
                Logger::info("Access token expired, refreshing");
                auto refresh_result = refresh_access_token();
                if (refresh_result.is_error()) {
                    Logger::warn("Token refresh failed, re-authorization required");
                    emit authorization_required();
                    return Result<bool>::ok(false);
                }
            }
            
            // Update HTTP client authorization header
            http_client_->set_default_header("Authorization", "Bearer " + access_token_);
            
            Logger::info("Authentication initialized from stored credentials");
            return Result<bool>::ok(true);
        }
        
        Logger::info("No stored credentials, authorization required");
        emit authorization_required();
        return Result<bool>::ok(false);
    });
}

QFuture<Result<void>> GoogleSheetsService::authorize() {
    return QtConcurrent::run([this]() -> Result<void> {
        Logger::info("Starting Google Sheets authorization");
        
        // Start authorization flow
        auto auth_future = oauth2_flow_->start_authorization();
        auth_future.waitForFinished();
        auto auth_result = auth_future.result();
        
        if (auth_result.is_error()) {
            emit authorization_failed(QString::fromStdString(auth_result.error()));
            return Result<void>::error(auth_result.error());
        }
        
        QString auth_code = auth_result.value();
        
        // Exchange code for tokens
        auto token_future = oauth2_flow_->exchange_code(auth_code);
        token_future.waitForFinished();
        auto token_result = token_future.result();
        
        if (token_result.is_error()) {
            emit authorization_failed(QString::fromStdString(token_result.error()));
            return Result<void>::error(token_result.error());
        }
        
        auto token_response = token_result.value();
        
        // Store tokens
        access_token_ = token_response.access_token;
        refresh_token_ = token_response.refresh_token;
        token_expires_at_ = token_response.expires_at;
        
        auto& storage = SecureStorage::instance();
        
        storage.set(ACCESS_TOKEN_KEY, access_token_);
        storage.set(REFRESH_TOKEN_KEY, refresh_token_);
        
        qint64 expiry_seconds = std::chrono::system_clock::to_time_t(token_expires_at_);
        storage.set(TOKEN_EXPIRY_KEY, QString::number(expiry_seconds));
        
        // Update HTTP client
        http_client_->set_default_header("Authorization", "Bearer " + access_token_);
        
        Logger::info("Google Sheets authorization successful");
        emit authorization_completed();
        
        return Result<void>::ok();
    });
}

bool GoogleSheetsService::is_authorized() const {
    if (access_token_.isEmpty() || refresh_token_.isEmpty()) {
        return false;
    }
    
    // Check if token is still valid (with 5 minute buffer)
    auto now = std::chrono::system_clock::now();
    auto buffer = std::chrono::minutes(5);
    
    return now < (token_expires_at_ - buffer);
}

QFuture<Result<int>> GoogleSheetsService::sync_pending_checkins() {
    return QtConcurrent::run([this]() -> Result<int> {
        Logger::info("Starting Google Sheets sync");
        
        if (!is_authorized()) {
            std::string error = "Not authorized";
            Logger::error(error);
            emit sync_failed(QString::fromStdString(error));
            return Result<int>::error(error);
        }
        
        // Get pending items from queue
        auto queue_result = database_service_->get_pending_queue_items(100);
        
        if (queue_result.is_error()) {
            emit sync_failed(QString::fromStdString(queue_result.error()));
            return Result<int>::error(queue_result.error());
        }
        
        auto queue_items = queue_result.value();
        
        if (queue_items.empty()) {
            Logger::info("No pending check-ins to sync");
            return Result<int>::ok(0);
        }
        
        emit sync_started(queue_items.size());
        Logger::info("Syncing {} pending check-ins", queue_items.size());
        
        // Convert to rows
        std::vector<std::vector<QString>> rows;
        for (const auto& item : queue_items) {
            rows.push_back(checkin_to_row(item));
        }
        
        // Append to sheet
        auto append_future = append_rows(rows);
        append_future.waitForFinished();
        auto append_result = append_future.result();
        
        if (append_result.is_error()) {
            emit sync_failed(QString::fromStdString(append_result.error()));
            
            // Mark items as failed
            for (const auto& item : queue_items) {
                database_service_->mark_queue_item_failed(
                    item.id, 
                    QString::fromStdString(append_result.error())
                );
            }
            
            return Result<int>::error(append_result.error());
        }
        
        // Mark items as synced
        for (const auto& item : queue_items) {
            auto mark_result = database_service_->mark_queue_item_synced(item.id);
            if (mark_result.is_error()) {
                Logger::warn("Failed to mark item {} as synced: {}", 
                           item.id, mark_result.error());
            }
        }
        
        Logger::info("Successfully synced {} check-ins", queue_items.size());
        emit sync_completed(queue_items.size());
        
        return Result<int>::ok(queue_items.size());
    });
}

QFuture<Result<void>> GoogleSheetsService::append_checkin(const CheckIn& checkin) {
    return QtConcurrent::run([this, checkin]() -> Result<void> {
        if (!is_authorized()) {
            return Result<void>::error("Not authorized");
        }
        
        std::vector<std::vector<QString>> rows = {checkin_to_row(checkin)};
        
        auto future = append_rows(rows);
        future.waitForFinished();
        return future.result();
    });
}

QFuture<Result<void>> GoogleSheetsService::test_connection() {
    return QtConcurrent::run([this]() -> Result<void> {
        Logger::info("Testing Google Sheets connection");
        
        if (!is_authorized()) {
            return Result<void>::error("Not authorized");
        }
        
        // Try to get spreadsheet metadata
        QString path = QString("/spreadsheets/%1").arg(config_.spreadsheet_id);
        
        auto future = http_client_->get(path);
        future.waitForFinished();
        auto result = future.result();
        
        if (result.is_error()) {
            Logger::error("Connection test failed: {}", result.error());
            return Result<void>::error(result.error());
        }
        
        Logger::info("Connection test successful");
        return Result<void>::ok();
    });
}

Result<void> GoogleSheetsService::clear_credentials() {
    auto& storage = SecureStorage::instance();
    
    storage.remove(ACCESS_TOKEN_KEY);
    storage.remove(REFRESH_TOKEN_KEY);
    storage.remove(TOKEN_EXPIRY_KEY);
    
    access_token_.clear();
    refresh_token_.clear();
    
    Logger::info("Google Sheets credentials cleared");
    return Result<void>::ok();
}

// Private methods

Result<void> GoogleSheetsService::refresh_access_token() {
    auto future = oauth2_flow_->refresh_token(refresh_token_);
    future.waitForFinished();
    auto result = future.result();
    
    if (result.is_error()) {
        return Result<void>::error(result.error());
    }
    
    auto token_response = result.value();
    
    access_token_ = token_response.access_token;
    token_expires_at_ = token_response.expires_at;
    
    // Update refresh token if provided
    if (!token_response.refresh_token.isEmpty()) {
        refresh_token_ = token_response.refresh_token;
    }
    
    auto& storage = SecureStorage::instance();
    storage.set(ACCESS_TOKEN_KEY, access_token_);
    if (!refresh_token_.isEmpty()) {
        storage.set(REFRESH_TOKEN_KEY, refresh_token_);
    }
    
    qint64 expiry_seconds = std::chrono::system_clock::to_time_t(token_expires_at_);
    storage.set(TOKEN_EXPIRY_KEY, QString::number(expiry_seconds));
    
    http_client_->set_default_header("Authorization", "Bearer " + access_token_);
    
    Logger::info("Access token refreshed");
    return Result<void>::ok();
}

QFuture<Result<void>> GoogleSheetsService::append_rows(
    const std::vector<std::vector<QString>>& rows
) {
    return QtConcurrent::run([this, rows]() -> Result<void> {
        QString range = config_.sheet_name + "!A:Z";
        QString path = QString("/spreadsheets/%1/values/%2:append")
            .arg(config_.spreadsheet_id)
            .arg(range);
        
        QUrlQuery query;
        query.addQueryItem("valueInputOption", "USER_ENTERED");
        query.addQueryItem("insertDataOption", "INSERT_ROWS");
        
        QString url_with_query = path + "?" + query.toString();
        
        // Build request body
        json body;
        body["range"] = range.toStdString();
        body["majorDimension"] = "ROWS";
        
        json values_array = json::array();
        for (const auto& row : rows) {
            json row_array = json::array();
            for (const auto& cell : row) {
                row_array.push_back(cell.toStdString());
            }
            values_array.push_back(row_array);
        }
        body["values"] = values_array;
        
        auto future = http_client_->post(url_with_query, body);
        future.waitForFinished();
        auto result = future.result();
        
        if (result.is_error()) {
            Logger::error("Failed to append rows: {}", result.error());
            return Result<void>::error(result.error());
        }
        
        Logger::debug("Successfully appended {} rows to sheet", rows.size());
        return Result<void>::ok();
    });
}

std::vector<QString> GoogleSheetsService::checkin_to_row(const CheckIn& checkin) const {
    std::vector<QString> row;
    
    // Timestamp
    auto time_t = std::chrono::system_clock::to_time_t(checkin.timestamp);
    std::tm tm = *std::localtime(&time_t);
    std::ostringstream timestamp_stream;
    timestamp_stream << std::put_time(&tm, "%Y-%m-%d %H:%M:%S");
    row.push_back(QString::fromStdString(timestamp_stream.str()));
    
    // Customer ID (always included for linking)
    if (config_.include_customer_id) {
        row.push_back(QString::fromStdString(checkin.customer_id));
    }
    
    // Customer Name (always included)
    row.push_back(QString::fromStdString(checkin.customer_name));
    
    // Lot Number
    row.push_back(checkin.lot_number.has_value() 
                  ? QString::fromStdString(checkin.lot_number.value()) 
                  : QString());
    
    // Membership Types
    row.push_back(checkin.membership_display_names.has_value() 
                  ? QString::fromStdString(checkin.membership_display_names.value()) 
                  : QString());
    
    // Guest Count
    row.push_back(QString::number(checkin.guest_count));
    
    // Check-in Type
    row.push_back(QString::fromStdString(checkin.checkin_type));
    
    // Location
    row.push_back(QString::fromStdString(checkin.location));
    
    return row;
}
