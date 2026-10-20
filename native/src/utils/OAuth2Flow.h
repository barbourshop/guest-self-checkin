#pragma once

#include <QObject>
#include <QString>
#include <QUrl>
#include <QFuture>
#include <memory>
#include "../utils/Result.h"
#include "../utils/HttpClient.h"

/**
 * OAuth2 authentication flow for Google APIs.
 * Handles authorization code flow with PKCE.
 */
class OAuth2Flow : public QObject {
    Q_OBJECT
    
public:
    struct Config {
        QString client_id;
        QString client_secret;
        QString redirect_uri = "http://localhost:8080/oauth2callback";
        QString auth_url = "https://accounts.google.com/o/oauth2/v2/auth";
        QString token_url = "https://oauth2.googleapis.com/token";
        QStringList scopes;
    };
    
    struct TokenResponse {
        QString access_token;
        QString refresh_token;
        QString token_type;
        int expires_in{0};
        std::chrono::system_clock::time_point expires_at;
    };
    
    explicit OAuth2Flow(const Config& config, QObject* parent = nullptr);
    ~OAuth2Flow() override;
    
    /**
     * Start OAuth2 authorization flow.
     * Opens browser for user authentication.
     * Returns authorization code.
     */
    QFuture<Result<QString>> start_authorization();
    
    /**
     * Exchange authorization code for access token.
     */
    QFuture<Result<TokenResponse>> exchange_code(const QString& auth_code);
    
    /**
     * Refresh access token using refresh token.
     */
    QFuture<Result<TokenResponse>> refresh_token(const QString& refresh_token);
    
    /**
     * Revoke token.
     */
    QFuture<Result<void>> revoke_token(const QString& token);
    
signals:
    void authorization_started(const QString& auth_url);
    void authorization_completed(const QString& auth_code);
    void authorization_failed(const QString& error);
    void token_refreshed(const QString& access_token);
    
private:
    QString generate_code_verifier();
    QString generate_code_challenge(const QString& verifier);
    QUrl build_authorization_url(const QString& code_challenge);
    Result<TokenResponse> parse_token_response(const json& response);
    
    Config config_;
    std::shared_ptr<HttpClient> http_client_;
    QString code_verifier_;
};
