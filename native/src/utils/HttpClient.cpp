#include "HttpClient.h"
#include "Logger.h"
#include <QUrlQuery>
#include <QJsonDocument>
#include <QJsonObject>
#include <QTimer>
#include <QEventLoop>

HttpClient::HttpClient(const Config& config, QObject* parent)
    : QObject(parent)
    , config_(config)
    , manager_(new QNetworkAccessManager(this))
{
    Logger::info("HttpClient initialized: {}", config_.base_url.toString().toStdString());
}

HttpClient::~HttpClient() {
    Logger::info("HttpClient destroyed. Stats: {} requests, {} successful, {} failed, {} retries",
                 stats_.total_requests, stats_.successful_requests, 
                 stats_.failed_requests, stats_.retries);
}

QFuture<Result<json>> HttpClient::get(const QString& path, 
                                       const QMap<QString, QString>& params) {
    auto ctx = std::make_shared<RequestContext>();
    ctx->method = "GET";
    ctx->url = build_url(path, params);
    ctx->headers = config_.default_headers;
    ctx->start_time = std::chrono::steady_clock::now();
    ctx->promise = QPromise<Result<json>>();
    ctx->promise.start();
    
    execute_request(ctx);
    
    return ctx->promise.future();
}

QFuture<Result<json>> HttpClient::post(const QString& path, 
                                        const json& body,
                                        const QMap<QString, QString>& extra_headers) {
    auto ctx = std::make_shared<RequestContext>();
    ctx->method = "POST";
    ctx->url = build_url(path, {});
    ctx->body = body;
    ctx->headers = config_.default_headers;
    
    // Merge extra headers
    for (auto it = extra_headers.begin(); it != extra_headers.end(); ++it) {
        ctx->headers[it.key()] = it.value();
    }
    
    // Ensure Content-Type is set
    if (!ctx->headers.contains("Content-Type")) {
        ctx->headers["Content-Type"] = "application/json";
    }
    
    ctx->start_time = std::chrono::steady_clock::now();
    ctx->promise = QPromise<Result<json>>();
    ctx->promise.start();
    
    execute_request(ctx);
    
    return ctx->promise.future();
}

QFuture<Result<json>> HttpClient::put(const QString& path, 
                                       const json& body,
                                       const QMap<QString, QString>& extra_headers) {
    auto ctx = std::make_shared<RequestContext>();
    ctx->method = "PUT";
    ctx->url = build_url(path, {});
    ctx->body = body;
    ctx->headers = config_.default_headers;
    
    for (auto it = extra_headers.begin(); it != extra_headers.end(); ++it) {
        ctx->headers[it.key()] = it.value();
    }
    
    if (!ctx->headers.contains("Content-Type")) {
        ctx->headers["Content-Type"] = "application/json";
    }
    
    ctx->start_time = std::chrono::steady_clock::now();
    ctx->promise = QPromise<Result<json>>();
    ctx->promise.start();
    
    execute_request(ctx);
    
    return ctx->promise.future();
}

QFuture<Result<json>> HttpClient::del(const QString& path) {
    auto ctx = std::make_shared<RequestContext>();
    ctx->method = "DELETE";
    ctx->url = build_url(path, {});
    ctx->headers = config_.default_headers;
    ctx->start_time = std::chrono::steady_clock::now();
    ctx->promise = QPromise<Result<json>>();
    ctx->promise.start();
    
    execute_request(ctx);
    
    return ctx->promise.future();
}

void HttpClient::execute_request(std::shared_ptr<RequestContext> ctx) {
    ctx->attempt++;
    stats_.total_requests++;
    
    if (config_.log_requests) {
        log_request(*ctx);
    }
    
    QNetworkRequest request = build_request(ctx->url, ctx->headers);
    QNetworkReply* reply = nullptr;
    
    if (ctx->method == "GET") {
        reply = manager_->get(request);
    } else if (ctx->method == "POST") {
        QByteArray data = QByteArray::fromStdString(ctx->body.dump());
        reply = manager_->post(request, data);
    } else if (ctx->method == "PUT") {
        QByteArray data = QByteArray::fromStdString(ctx->body.dump());
        reply = manager_->put(request, data);
    } else if (ctx->method == "DELETE") {
        reply = manager_->deleteResource(request);
    } else {
        Logger::error("Unsupported HTTP method: {}", ctx->method.toStdString());
        ctx->promise.addResult(Result<json>::error("Unsupported HTTP method"));
        ctx->promise.finish();
        return;
    }
    
    // Set timeout
    QTimer::singleShot(config_.timeout, reply, [reply]() {
        if (reply->isRunning()) {
            reply->abort();
        }
    });
    
    // Handle response
    connect(reply, &QNetworkReply::finished, this, [this, reply, ctx]() {
        handle_reply(reply, ctx);
    });
}

void HttpClient::handle_reply(QNetworkReply* reply, std::shared_ptr<RequestContext> ctx) {
    reply->deleteLater();
    
    auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::steady_clock::now() - ctx->start_time
    );
    
    stats_.total_time += elapsed;
    
    // Check for network errors
    if (reply->error() != QNetworkReply::NoError) {
        QString error_msg = reply->errorString();
        
        // Timeout errors
        if (reply->error() == QNetworkReply::TimeoutError ||
            reply->error() == QNetworkReply::OperationCanceledError) {
            Logger::warn("Request timeout: {} {} (attempt {}/{})",
                        ctx->method.toStdString(),
                        ctx->url.toString().toStdString(),
                        ctx->attempt, config_.retry_attempts);
            
            if (ctx->attempt < config_.retry_attempts) {
                retry_request(ctx);
                return;
            }
        }
        
        // Network errors that should retry
        if (reply->error() == QNetworkReply::HostNotFoundError ||
            reply->error() == QNetworkReply::ConnectionRefusedError ||
            reply->error() == QNetworkReply::TemporaryNetworkFailureError) {
            
            Logger::warn("Network error: {} (attempt {}/{})",
                        error_msg.toStdString(),
                        ctx->attempt, config_.retry_attempts);
            
            if (ctx->attempt < config_.retry_attempts) {
                retry_request(ctx);
                return;
            }
        }
        
        // Other errors - don't retry
        Logger::error("HTTP request failed: {} - {}",
                     ctx->url.toString().toStdString(),
                     error_msg.toStdString());
        
        stats_.failed_requests++;
        auto result = Result<json>::error(error_msg.toStdString());
        
        if (config_.log_responses) {
            log_response(*ctx, result);
        }
        
        ctx->promise.addResult(result);
        ctx->promise.finish();
        return;
    }
    
    // Parse JSON response
    auto result = parse_json_response(reply);
    
    // Check HTTP status code
    int status_code = reply->attribute(QNetworkRequest::HttpStatusCodeAttribute).toInt();
    
    if (status_code >= 500) {
        // Server errors - retry
        Logger::warn("Server error {}: {} (attempt {}/{})",
                    status_code,
                    ctx->url.toString().toStdString(),
                    ctx->attempt, config_.retry_attempts);
        
        if (ctx->attempt < config_.retry_attempts) {
            retry_request(ctx);
            return;
        }
    }
    
    if (status_code >= 400) {
        // Client errors - don't retry
        std::string error_msg = "HTTP " + std::to_string(status_code);
        
        if (result.is_ok()) {
            // Try to extract error message from response body
            try {
                auto j = result.value();
                if (j.contains("error")) {
                    error_msg += ": " + j["error"].get<std::string>();
                } else if (j.contains("message")) {
                    error_msg += ": " + j["message"].get<std::string>();
                } else if (j.contains("errors") && j["errors"].is_array() && !j["errors"].empty()) {
                    error_msg += ": " + j["errors"][0].get<std::string>();
                }
            } catch (...) {
                // Ignore JSON parsing errors
            }
        }
        
        Logger::error("HTTP error: {} - {}", status_code, error_msg);
        stats_.failed_requests++;
        
        auto error_result = Result<json>::error(error_msg);
        
        if (config_.log_responses) {
            log_response(*ctx, error_result);
        }
        
        ctx->promise.addResult(error_result);
        ctx->promise.finish();
        return;
    }
    
    // Success
    stats_.successful_requests++;
    
    if (config_.log_responses) {
        log_response(*ctx, result);
    }
    
    ctx->promise.addResult(result);
    ctx->promise.finish();
}

void HttpClient::retry_request(std::shared_ptr<RequestContext> ctx) {
    stats_.retries++;
    
    // Calculate delay with exponential backoff
    int delay_ms = config_.retry_delay.count() * (1 << (ctx->attempt - 1));
    
    Logger::info("Retrying request in {}ms (attempt {}/{})",
                delay_ms, ctx->attempt + 1, config_.retry_attempts);
    
    // Schedule retry
    QTimer::singleShot(delay_ms, this, [this, ctx]() {
        execute_request(ctx);
    });
}

Result<json> HttpClient::parse_json_response(QNetworkReply* reply) {
    QByteArray data = reply->readAll();
    
    if (data.isEmpty()) {
        return Result<json>::ok(json::object());
    }
    
    try {
        std::string str = data.toStdString();
        json j = json::parse(str);
        return Result<json>::ok(j);
    } catch (const json::parse_error& e) {
        Logger::error("JSON parse error: {}", e.what());
        return Result<json>::error(std::string("JSON parse error: ") + e.what());
    }
}

QNetworkRequest HttpClient::build_request(const QUrl& url, 
                                          const QMap<QString, QString>& headers) {
    QNetworkRequest request(url);
    
    // Set headers
    for (auto it = headers.begin(); it != headers.end(); ++it) {
        request.setRawHeader(it.key().toUtf8(), it.value().toUtf8());
    }
    
    // Set timeout attribute (Qt 5.15+)
    request.setTransferTimeout(config_.timeout.count() * 1000);
    
    return request;
}

QUrl HttpClient::build_url(const QString& path, const QMap<QString, QString>& params) {
    QString full_path = path;
    if (!full_path.startsWith('/')) {
        full_path = '/' + full_path;
    }
    
    QUrl url = config_.base_url;
    url.setPath(url.path() + full_path);
    
    if (!params.isEmpty()) {
        QUrlQuery query;
        for (auto it = params.begin(); it != params.end(); ++it) {
            query.addQueryItem(it.key(), it.value());
        }
        url.setQuery(query);
    }
    
    return url;
}

void HttpClient::log_request(const RequestContext& ctx) {
    Logger::debug("HTTP {} {} (attempt {})",
                 ctx.method.toStdString(),
                 ctx.url.toString().toStdString(),
                 ctx.attempt);
    
    if (!ctx.body.empty()) {
        Logger::trace("Request body: {}", ctx.body.dump());
    }
}

void HttpClient::log_response(const RequestContext& ctx, const Result<json>& result) {
    auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(
        std::chrono::steady_clock::now() - ctx.start_time
    );
    
    if (result.is_ok()) {
        Logger::debug("HTTP {} {} completed in {}ms",
                     ctx.method.toStdString(),
                     ctx.url.toString().toStdString(),
                     elapsed.count());
        Logger::trace("Response: {}", result.value().dump());
    } else {
        Logger::error("HTTP {} {} failed after {}ms: {}",
                     ctx.method.toStdString(),
                     ctx.url.toString().toStdString(),
                     elapsed.count(),
                     result.error());
    }
}

void HttpClient::set_base_url(const QUrl& url) {
    config_.base_url = url;
    Logger::info("Base URL updated: {}", url.toString().toStdString());
}

void HttpClient::set_default_header(const QString& key, const QString& value) {
    config_.default_headers[key] = value;
}

void HttpClient::remove_default_header(const QString& key) {
    config_.default_headers.remove(key);
}

void HttpClient::reset_statistics() {
    stats_ = Statistics();
}
