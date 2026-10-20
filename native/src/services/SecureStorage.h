#pragma once

#include <QString>
#include <QMap>
#include <memory>
#include "../utils/Result.h"

/**
 * Secure storage for sensitive data like access tokens and credentials.
 * Uses platform-specific secure storage:
 * - Windows: Windows Credential Manager (Crypt32)
 * - macOS: Keychain
 * - Linux: Secret Service API fallback to encrypted file
 */
class SecureStorage {
public:
    static SecureStorage& instance();
    
    /**
     * Store a secure value.
     */
    Result<void> set(const QString& key, const QString& value);
    
    /**
     * Retrieve a secure value.
     */
    Result<QString> get(const QString& key) const;
    
    /**
     * Delete a secure value.
     */
    Result<void> remove(const QString& key);
    
    /**
     * Check if a key exists.
     */
    bool contains(const QString& key) const;
    
    /**
     * Clear all stored values (use with caution).
     */
    Result<void> clear_all();
    
    /**
     * Get all keys (for debugging/admin).
     */
    QStringList keys() const;
    
private:
    SecureStorage();
    ~SecureStorage();
    
    SecureStorage(const SecureStorage&) = delete;
    SecureStorage& operator=(const SecureStorage&) = delete;
    
#ifdef _WIN32
    Result<void> set_windows(const QString& key, const QString& value);
    Result<QString> get_windows(const QString& key) const;
    Result<void> remove_windows(const QString& key);
#elif defined(__APPLE__)
    Result<void> set_macos(const QString& key, const QString& value);
    Result<QString> get_macos(const QString& key) const;
    Result<void> remove_macos(const QString& key);
#else
    // Linux/fallback: encrypted file storage
    Result<void> set_file(const QString& key, const QString& value);
    Result<QString> get_file(const QString& key) const;
    Result<void> remove_file(const QString& key);
    QString get_storage_path() const;
#endif
    
    mutable QMap<QString, QString> cache_;
};
