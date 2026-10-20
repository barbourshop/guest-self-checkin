#include "OAuth2Flow.h"
#include "Logger.h"
#include <QtConcurrent>
#include <QUrlQuery>
#include <QDesktopServices>
#include <QTcpServer>
#include <QTcpSocket>
#include <QCryptographicHash>
#include <QRandomGenerator>
#include <QEventLoop>
#include <QTimer>

OAuth2Flow::OAuth2Flow(const Config& config, QObject* parent)
    : QObject(parent)
    , config_(config)
{
    // Create HTTP client for token exchange
    HttpClient::Config http_config;
    http_config.base_url = QUrl(config_.token_url).adjusted(QUrl::RemoveFilename);
    http_config.timeout = std::chrono::seconds(30);
    
    http_client_ = std::make_shared<HttpClient>(http_config, this);
    
    Logger::info("OAuth2Flow initialized for client: {}", 
                 config_.client_id.toStdString());
}

OAuth2Flow::~OAuth2Flow() {
    Logger::info("OAuth2Flow destroyed");
}

QFuture<Result<QString>> OAuth2Flow::start_authorization() {
    return QtConcurrent::run([this]() -> Result<QString> {
        Logger::info("Starting OAuth2 authorization flow");
        
        // Generate PKCE code verifier and challenge
        code_verifier_ = generate_code_verifier();
        QString code_challenge = generate_code_challenge(code_verifier_);
        
        // Build authorization URL
        QUrl auth_url = build_authorization_url(code_challenge);
        
        Logger::info("Authorization URL: {}", auth_url.toString().toStdString());
        emit authorization_started(auth_url.toString());
        
        // Start local HTTP server to receive callback
        QTcpServer server;
        if (!server.listen(QHostAddress::LocalHost, 8080)) {
            std::string error = "Failed to start local server: " + 
                               server.errorString().toStdString();
            Logger::error(error);
            emit authorization_failed(QString::fromStdString(error));
            return Result<QString>::error(error);
        }
        
        Logger::info("Local callback server listening on port 8080");
        
        // Open browser
        if (!QDesktopServices::openUrl(auth_url)) {
            Logger::warn("Failed to open browser automatically");
        }
        
        // Wait for callback (with timeout)
        QEventLoop loop;
        QTimer timeout_timer;
        timeout_timer.setSingleShot(true);
        timeout_timer.setInterval(300000);  // 5 minutes
        
        QString auth_code;
        QString error_message;
        bool timeout_occurred = false;
        
        connect(&timeout_timer, &QTimer::timeout, [&]() {
            timeout_occurred = true;
            loop.quit();
        });
        
        connect(&server, &QTcpServer::newConnection, [&]() {
            QTcpSocket* socket = server.nextPendingConnection();
            
            connect(socket, &QTcpSocket::readyRead, [&, socket]() {
                QByteArray request_data = socket->readAll();
                QString request = QString::fromUtf8(request_data);
                
                Logger::debug("Received OAuth callback");
                
                // Parse request
                QStringList lines = request.split("\r\n");
                if (lines.isEmpty()) {
                    socket->close();
                    return;
                }
                
                QString request_line = lines[0];
                QStringList parts = request_line.split(" ");
                if (parts.size() < 2) {
                    socket->close();
                    return;
                }
                
                QString path = parts[1];
                QUrl url("http://localhost" + path);
                QUrlQuery query(url);
                
                if (query.hasQueryItem("code")) {
                    auth_code = query.queryItemValue("code");
                    
                    // Send success response
                    QString response = 
                        "HTTP/1.1 200 OK\r\n"
                        "Content-Type: text/html\r\n"
                        "\r\n"
                        "<html><body>"
                        "<h1>Authorization Successful!</h1>"
                        "<p>You can close this window and return to the application.</p>"
                        "</body></html>";
                    
                    socket->write(response.toUtf8());
                    socket->flush();
                    socket->close();
                    
                    loop.quit();
                } else if (query.hasQueryItem("error")) {
                    error_message = query.queryItemValue("error");
                    
                    // Send error response
                    QString response = 
                        "HTTP/1.1 400 Bad Request\r\n"
                        "Content-Type: text/html\r\n"
                        "\r\n"
                        "<html><body>"
                        "<h1>Authorization Failed</h1>"
                        "<p>Error: " + error_message + "</p>"
                        "</body></html>";
                    
                    socket->write(response.toUtf8());
                    socket->flush();
                    socket->close();
                    
                    loop.quit();
                }
            });
        });
        
        timeout_timer.start();
        loop.exec();
        
        server.close();
        
        if (timeout_occurred) {
            std::string error = "Authorization timeout";
            Logger::error(error);
            emit authorization_failed(QString::fromStdString(error));
            return Result<QString>::error(error);
        }
        
        if (!error_message.isEmpty()) {
            Logger::error("Authorization error: {}", error_message.toStdString());
            emit authorization_failed(error_message);
            return Result<QString>::error(error_message.toStdString());
        }
        
        if (auth_code.isEmpty()) {
            std::string error = "No authorization code received";
            Logger::error(error);
            emit authorization_failed(QString::fromStdString(error));
            return Result<QString>::error(error);
        }
        
        Logger::info("Authorization code received");
        emit authorization_completed(auth_code);
        
        return Result<QString>::ok(auth_code);
    });
}

QFuture<Result<OAuth2Flow::TokenResponse>> OAuth2Flow::exchange_code(const QString& auth_code) {
    return QtConcurrent::run([this, auth_code]() -> Result<TokenResponse> {
        Logger::info("Exchanging authorization code for access token");
        
        json body;
        body["client_id"] = config_.client_id.toStdString();
        body["client_secret"] = config_.client_secret.toStdString();
        body["code"] = auth_code.toStdString();
        body["code_verifier"] = code_verifier_.toStdString();
        body["grant_type"] = "authorization_code";
        body["redirect_uri"] = config_.redirect_uri.toStdString();
        
        auto future = http_client_->post(config_.token_url, body);
        future.waitForFinished();
        auto result = future.result();
        
        if (result.is_error()) {
            Logger::error("Token exchange failed: {}", result.error());
            return Result<TokenResponse>::error(result.error());
        }
        
        auto response = parse_token_response(result.value());
        
        if (response.is_ok()) {
            Logger::info("Access token obtained successfully");
            emit token_refreshed(response.value().access_token);
        }
        
        return response;
    });
}

QFuture<Result<OAuth2Flow::TokenResponse>> OAuth2Flow::refresh_token(const QString& refresh_token) {
    return QtConcurrent::run([this, refresh_token]() -> Result<TokenResponse> {
        Logger::info("Refreshing access token");
        
        json body;
        body["client_id"] = config_.client_id.toStdString();
        body["client_secret"] = config_.client_secret.toStdString();
        body["refresh_token"] = refresh_token.toStdString();
        body["grant_type"] = "refresh_token";
        
        auto future = http_client_->post(config_.token_url, body);
        future.waitForFinished();
        auto result = future.result();
        
        if (result.is_error()) {
            Logger::error("Token refresh failed: {}", result.error());
            return Result<TokenResponse>::error(result.error());
        }
        
        auto response = parse_token_response(result.value());
        
        if (response.is_ok()) {
            Logger::info("Access token refreshed successfully");
            emit token_refreshed(response.value().access_token);
        }
        
        return response;
    });
}

QFuture<Result<void>> OAuth2Flow::revoke_token(const QString& token) {
    return QtConcurrent::run([this, token]() -> Result<void> {
        Logger::info("Revoking token");
        
        QUrl revoke_url("https://oauth2.googleapis.com/revoke");
        QUrlQuery query;
        query.addQueryItem("token", token);
        revoke_url.setQuery(query);
        
        auto future = http_client_->post(revoke_url.toString(), json::object());
        future.waitForFinished();
        auto result = future.result();
        
        if (result.is_error()) {
            Logger::error("Token revocation failed: {}", result.error());
            return Result<void>::error(result.error());
        }
        
        Logger::info("Token revoked successfully");
        return Result<void>::ok();
    });
}

// Private methods

QString OAuth2Flow::generate_code_verifier() {
    // Generate 43-128 character random string
    const int length = 128;
    const QString charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
    
    QString verifier;
    for (int i = 0; i < length; i++) {
        int index = QRandomGenerator::global()->bounded(charset.length());
        verifier.append(charset[index]);
    }
    
    return verifier;
}

QString OAuth2Flow::generate_code_challenge(const QString& verifier) {
    // SHA256 hash of verifier, base64url encoded
    QByteArray hash = QCryptographicHash::hash(verifier.toUtf8(), 
                                               QCryptographicHash::Sha256);
    
    QString base64 = hash.toBase64(QByteArray::Base64UrlEncoding | QByteArray::OmitTrailingEquals);
    return base64;
}

QUrl OAuth2Flow::build_authorization_url(const QString& code_challenge) {
    QUrl url(config_.auth_url);
    QUrlQuery query;
    
    query.addQueryItem("client_id", config_.client_id);
    query.addQueryItem("redirect_uri", config_.redirect_uri);
    query.addQueryItem("response_type", "code");
    query.addQueryItem("scope", config_.scopes.join(" "));
    query.addQueryItem("code_challenge", code_challenge);
    query.addQueryItem("code_challenge_method", "S256");
    query.addQueryItem("access_type", "offline");  // Request refresh token
    query.addQueryItem("prompt", "consent");  // Force consent to get refresh token
    
    url.setQuery(query);
    return url;
}

Result<OAuth2Flow::TokenResponse> OAuth2Flow::parse_token_response(const json& response) {
    try {
        TokenResponse token_response;
        
        if (!response.contains("access_token")) {
            return Result<TokenResponse>::error("Missing access_token in response");
        }
        
        token_response.access_token = QString::fromStdString(response["access_token"]);
        token_response.token_type = QString::fromStdString(
            response.value("token_type", "Bearer")
        );
        token_response.expires_in = response.value("expires_in", 3600);
        
        // Calculate expiration time
        auto now = std::chrono::system_clock::now();
        token_response.expires_at = now + std::chrono::seconds(token_response.expires_in);
        
        // Refresh token (may not always be present)
        if (response.contains("refresh_token")) {
            token_response.refresh_token = QString::fromStdString(response["refresh_token"]);
        }
        
        return Result<TokenResponse>::ok(token_response);
        
    } catch (const std::exception& e) {
        std::string error = std::string("Failed to parse token response: ") + e.what();
        Logger::error(error);
        return Result<TokenResponse>::error(error);
    }
}
