#pragma once

#include <QObject>
#include <QNetworkAccessManager>
#include <QNetworkReply>
#include <QNetworkRequest>
#include <QUrl>
#include <QMap>
#include <QFuture>
#include <QPromise>
#include <nlohmann/json.hpp>
#include <chrono>
#include <memory>
#include "../utils/Result.h"

using json = nlohmann::json;

/**
 * HTTP client wrapper around Qt Network for async operations.
 * Provides retry logic, timeout handling, and JSON support.
 */
class HttpClient : public QObject {
    Q_OBJECT
    
public:
    struct Config {
        QUrl base_url;
        QMap<QString, QString> default_headers;
        std::chrono::seconds timeout{30};
        int retry_attempts{3};
        std::chrono::milliseconds retry_delay{1000};
        bool log_requests{true};
        bool log_responses{false};  // Can be verbose
    };
    
    explicit HttpClient(const Config& config, QObject* parent = nullptr);
    ~HttpClient() override;
    
    // Async HTTP operations returning QFuture
    QFuture<Result<json>> get(const QString& path, 
                               const QMap<QString, QString>& params = {});
    
    QFuture<Result<json>> post(const QString& path, 
                                const json& body,
                                const QMap<QString, QString>& extra_headers = {});
    
    QFuture<Result<json>> put(const QString& path, 
                               const json& body,
                               const QMap<QString, QString>& extra_headers = {});
    
    QFuture<Result<json>> del(const QString& path);
    
    // Update configuration
    void set_base_url(const QUrl& url);
    void set_default_header(const QString& key, const QString& value);
    void remove_default_header(const QString& key);
    
    // Statistics
    struct Statistics {
        int total_requests{0};
        int successful_requests{0};
        int failed_requests{0};
        int retries{0};
        std::chrono::milliseconds total_time{0};
    };
    
    Statistics get_statistics() const { return stats_; }
    void reset_statistics();
    
private:
    struct RequestContext {
        QString method;
        QUrl url;
        json body;
        QMap<QString, QString> headers;
        int attempt{0};
        std::chrono::steady_clock::time_point start_time;
        QPromise<Result<json>> promise;
    };
    
    void execute_request(std::shared_ptr<RequestContext> ctx);
    void handle_reply(QNetworkReply* reply, std::shared_ptr<RequestContext> ctx);
    void retry_request(std::shared_ptr<RequestContext> ctx);
    
    Result<json> parse_json_response(QNetworkReply* reply);
    QNetworkRequest build_request(const QUrl& url, const QMap<QString, QString>& headers);
    QUrl build_url(const QString& path, const QMap<QString, QString>& params);
    
    void log_request(const RequestContext& ctx);
    void log_response(const RequestContext& ctx, const Result<json>& result);
    
    Config config_;
    QNetworkAccessManager* manager_;
    Statistics stats_;
};
