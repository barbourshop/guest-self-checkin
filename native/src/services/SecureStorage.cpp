#include "SecureStorage.h"
#include "../utils/Logger.h"
#include <QFile>
#include <QDir>
#include <QStandardPaths>
#include <QJsonDocument>
#include <QJsonObject>
#include <QCryptographicHash>

#ifdef _WIN32
#include <windows.h>
#include <wincred.h>
#pragma comment(lib, "crypt32.lib")
#elif defined(__APPLE__)
#include <Security/Security.h>
#endif

SecureStorage& SecureStorage::instance() {
    static SecureStorage instance;
    return instance;
}

SecureStorage::SecureStorage() {
    Logger::info("SecureStorage initialized");
}

SecureStorage::~SecureStorage() {
    cache_.clear();
}

Result<void> SecureStorage::set(const QString& key, const QString& value) {
#ifdef _WIN32
    return set_windows(key, value);
#elif defined(__APPLE__)
    return set_macos(key, value);
#else
    return set_file(key, value);
#endif
}

Result<QString> SecureStorage::get(const QString& key) const {
#ifdef _WIN32
    return get_windows(key);
#elif defined(__APPLE__)
    return get_macos(key);
#else
    return get_file(key);
#endif
}

Result<void> SecureStorage::remove(const QString& key) {
#ifdef _WIN32
    return remove_windows(key);
#elif defined(__APPLE__)
    return remove_macos(key);
#else
    return remove_file(key);
#endif
}

bool SecureStorage::contains(const QString& key) const {
    auto result = get(key);
    return result.is_ok();
}

Result<void> SecureStorage::clear_all() {
    Logger::warn("Clearing all secure storage");
    
    auto key_list = keys();
    for (const auto& key : key_list) {
        auto result = remove(key);
        if (result.is_error()) {
            Logger::error("Failed to remove key {}: {}", 
                         key.toStdString(), result.error());
        }
    }
    
    cache_.clear();
    return Result<void>::ok();
}

QStringList SecureStorage::keys() const {
#ifdef _WIN32
    // Windows doesn't provide easy enumeration
    // Return known keys from cache
    return cache_.keys();
#elif defined(__APPLE__)
    // macOS keychain doesn't provide easy enumeration
    // Return known keys from cache
    return cache_.keys();
#else
    // For file-based storage, read from file
    QString storage_path = get_storage_path();
    QFile file(storage_path);
    
    if (!file.exists()) {
        return QStringList();
    }
    
    if (!file.open(QIODevice::ReadOnly)) {
        return QStringList();
    }
    
    QByteArray data = file.readAll();
    file.close();
    
    QJsonDocument doc = QJsonDocument::fromJson(data);
    if (!doc.isObject()) {
        return QStringList();
    }
    
    return doc.object().keys();
#endif
}

// Platform-specific implementations

#ifdef _WIN32

Result<void> SecureStorage::set_windows(const QString& key, const QString& value) {
    std::wstring target_name = L"FrontDeskApp_" + key.toStdWString();
    std::wstring credential_data = value.toStdWString();
    
    CREDENTIALW credential = {};
    credential.Type = CRED_TYPE_GENERIC;
    credential.TargetName = const_cast<LPWSTR>(target_name.c_str());
    credential.CredentialBlobSize = static_cast<DWORD>(credential_data.size() * sizeof(wchar_t));
    credential.CredentialBlob = reinterpret_cast<LPBYTE>(const_cast<wchar_t*>(credential_data.c_str()));
    credential.Persist = CRED_PERSIST_LOCAL_MACHINE;
    
    if (!CredWriteW(&credential, 0)) {
        std::string error = "Failed to write credential: " + std::to_string(GetLastError());
        Logger::error(error);
        return Result<void>::error(error);
    }
    
    cache_[key] = value;
    Logger::debug("Stored credential in Windows Credential Manager: {}", key.toStdString());
    
    return Result<void>::ok();
}

Result<QString> SecureStorage::get_windows(const QString& key) const {
    // Check cache first
    if (cache_.contains(key)) {
        return Result<QString>::ok(cache_[key]);
    }
    
    std::wstring target_name = L"FrontDeskApp_" + key.toStdWString();
    PCREDENTIALW credential = nullptr;
    
    if (!CredReadW(target_name.c_str(), CRED_TYPE_GENERIC, 0, &credential)) {
        DWORD error = GetLastError();
        if (error == ERROR_NOT_FOUND) {
            return Result<QString>::error("Key not found");
        }
        return Result<QString>::error("Failed to read credential: " + std::to_string(error));
    }
    
    QString value = QString::fromWCharArray(
        reinterpret_cast<wchar_t*>(credential->CredentialBlob),
        credential->CredentialBlobSize / sizeof(wchar_t)
    );
    
    CredFree(credential);
    
    cache_[key] = value;
    return Result<QString>::ok(value);
}

Result<void> SecureStorage::remove_windows(const QString& key) {
    std::wstring target_name = L"FrontDeskApp_" + key.toStdWString();
    
    if (!CredDeleteW(target_name.c_str(), CRED_TYPE_GENERIC, 0)) {
        DWORD error = GetLastError();
        if (error != ERROR_NOT_FOUND) {
            return Result<void>::error("Failed to delete credential: " + std::to_string(error));
        }
    }
    
    cache_.remove(key);
    Logger::debug("Removed credential from Windows Credential Manager: {}", key.toStdString());
    
    return Result<void>::ok();
}

#elif defined(__APPLE__)

Result<void> SecureStorage::set_macos(const QString& key, const QString& value) {
    std::string service = "FrontDeskApp";
    std::string account = key.toStdString();
    std::string password = value.toStdString();
    
    // Delete existing item first
    SecKeychainItemRef item = nullptr;
    OSStatus status = SecKeychainFindGenericPassword(
        nullptr,
        static_cast<UInt32>(service.length()),
        service.c_str(),
        static_cast<UInt32>(account.length()),
        account.c_str(),
        nullptr,
        nullptr,
        &item
    );
    
    if (status == errSecSuccess && item != nullptr) {
        SecKeychainItemDelete(item);
        CFRelease(item);
    }
    
    // Add new item
    status = SecKeychainAddGenericPassword(
        nullptr,
        static_cast<UInt32>(service.length()),
        service.c_str(),
        static_cast<UInt32>(account.length()),
        account.c_str(),
        static_cast<UInt32>(password.length()),
        password.c_str(),
        nullptr
    );
    
    if (status != errSecSuccess) {
        std::string error = "Failed to store in Keychain: " + std::to_string(status);
        Logger::error(error);
        return Result<void>::error(error);
    }
    
    cache_[key] = value;
    Logger::debug("Stored credential in macOS Keychain: {}", key.toStdString());
    
    return Result<void>::ok();
}

Result<QString> SecureStorage::get_macos(const QString& key) const {
    // Check cache first
    if (cache_.contains(key)) {
        return Result<QString>::ok(cache_[key]);
    }
    
    std::string service = "FrontDeskApp";
    std::string account = key.toStdString();
    
    void* password_data = nullptr;
    UInt32 password_length = 0;
    
    OSStatus status = SecKeychainFindGenericPassword(
        nullptr,
        static_cast<UInt32>(service.length()),
        service.c_str(),
        static_cast<UInt32>(account.length()),
        account.c_str(),
        &password_length,
        &password_data,
        nullptr
    );
    
    if (status == errSecItemNotFound) {
        return Result<QString>::error("Key not found");
    }
    
    if (status != errSecSuccess) {
        return Result<QString>::error("Failed to read from Keychain: " + std::to_string(status));
    }
    
    QString value = QString::fromUtf8(
        static_cast<const char*>(password_data),
        password_length
    );
    
    SecKeychainItemFreeContent(nullptr, password_data);
    
    cache_[key] = value;
    return Result<QString>::ok(value);
}

Result<void> SecureStorage::remove_macos(const QString& key) {
    std::string service = "FrontDeskApp";
    std::string account = key.toStdString();
    
    SecKeychainItemRef item = nullptr;
    OSStatus status = SecKeychainFindGenericPassword(
        nullptr,
        static_cast<UInt32>(service.length()),
        service.c_str(),
        static_cast<UInt32>(account.length()),
        account.c_str(),
        nullptr,
        nullptr,
        &item
    );
    
    if (status == errSecSuccess && item != nullptr) {
        SecKeychainItemDelete(item);
        CFRelease(item);
    }
    
    cache_.remove(key);
    Logger::debug("Removed credential from macOS Keychain: {}", key.toStdString());
    
    return Result<void>::ok();
}

#else

// Linux/fallback: File-based storage
QString SecureStorage::get_storage_path() const {
    QString config_dir = QStandardPaths::writableLocation(QStandardPaths::AppConfigLocation);
    QDir dir(config_dir);
    if (!dir.exists()) {
        dir.mkpath(".");
    }
    return dir.filePath("secure_storage.json");
}

Result<void> SecureStorage::set_file(const QString& key, const QString& value) {
    QString storage_path = get_storage_path();
    
    // Load existing data
    QJsonObject obj;
    QFile file(storage_path);
    
    if (file.exists()) {
        if (!file.open(QIODevice::ReadOnly)) {
            return Result<void>::error("Failed to open storage file for reading");
        }
        
        QByteArray data = file.readAll();
        file.close();
        
        QJsonDocument doc = QJsonDocument::fromJson(data);
        if (doc.isObject()) {
            obj = doc.object();
        }
    }
    
    // Update value
    obj[key] = value;
    
    // Write back
    if (!file.open(QIODevice::WriteOnly)) {
        return Result<void>::error("Failed to open storage file for writing");
    }
    
    QJsonDocument doc(obj);
    file.write(doc.toJson());
    file.close();
    
    // Set restrictive permissions (owner read/write only)
    file.setPermissions(QFile::ReadOwner | QFile::WriteOwner);
    
    cache_[key] = value;
    Logger::debug("Stored credential in file storage: {}", key.toStdString());
    
    return Result<void>::ok();
}

Result<QString> SecureStorage::get_file(const QString& key) const {
    // Check cache first
    if (cache_.contains(key)) {
        return Result<QString>::ok(cache_[key]);
    }
    
    QString storage_path = get_storage_path();
    QFile file(storage_path);
    
    if (!file.exists()) {
        return Result<QString>::error("Key not found");
    }
    
    if (!file.open(QIODevice::ReadOnly)) {
        return Result<QString>::error("Failed to open storage file");
    }
    
    QByteArray data = file.readAll();
    file.close();
    
    QJsonDocument doc = QJsonDocument::fromJson(data);
    if (!doc.isObject()) {
        return Result<QString>::error("Invalid storage file format");
    }
    
    QJsonObject obj = doc.object();
    if (!obj.contains(key)) {
        return Result<QString>::error("Key not found");
    }
    
    QString value = obj[key].toString();
    cache_[key] = value;
    
    return Result<QString>::ok(value);
}

Result<void> SecureStorage::remove_file(const QString& key) {
    QString storage_path = get_storage_path();
    QFile file(storage_path);
    
    if (!file.exists()) {
        cache_.remove(key);
        return Result<void>::ok();
    }
    
    if (!file.open(QIODevice::ReadOnly)) {
        return Result<void>::error("Failed to open storage file");
    }
    
    QByteArray data = file.readAll();
    file.close();
    
    QJsonDocument doc = QJsonDocument::fromJson(data);
    if (!doc.isObject()) {
        return Result<void>::error("Invalid storage file format");
    }
    
    QJsonObject obj = doc.object();
    obj.remove(key);
    
    if (!file.open(QIODevice::WriteOnly)) {
        return Result<void>::error("Failed to open storage file for writing");
    }
    
    doc.setObject(obj);
    file.write(doc.toJson());
    file.close();
    
    cache_.remove(key);
    Logger::debug("Removed credential from file storage: {}", key.toStdString());
    
    return Result<void>::ok();
}

#endif
