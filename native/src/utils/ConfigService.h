#pragma once

#include <nlohmann/json.hpp>
#include <filesystem>
#include <string>
#include <vector>
#include <chrono>
#include <functional>
#include "Result.h"

using json = nlohmann::json;

/**
 * Configuration service for loading and managing app configuration.
 * Singleton pattern for app-wide access.
 */
class ConfigService {
public:
    // Singleton instance
    static ConfigService& instance();
    
    // Prevent copying
    ConfigService(const ConfigService&) = delete;
    ConfigService& operator=(const ConfigService&) = delete;
    
    // Load configuration from file
    Result<void> load(const std::filesystem::path& config_path);
    
    // Save configuration to file
    Result<void> save();
    
    // Reload configuration (hot reload)
    Result<void> reload();
    
    // Validate configuration
    bool validate() const;
    std::vector<std::string> get_validation_errors() const;
    
    // Get configuration file path
    std::filesystem::path get_config_path() const { return config_path_; }
    
    // Configuration structs with strongly-typed accessors
    struct SquareConfig {
        std::string api_url;
        std::string api_version;
        std::chrono::seconds timeout;
        int retry_attempts;
        std::chrono::milliseconds retry_delay;
    };
    
    struct SegmentConfig {
        std::string segment_id;
        std::string display_name;
        bool enabled;
        int sort_order;
    };
    
    struct GroupConfig {
        std::string group_id;
        std::string display_name;
        bool enabled;
        int sort_order;
    };
    
    struct MembershipConfig {
        enum class Mode {
            SegmentsOnly,
            GroupsOnly,
            SegmentsAndGroups
        };
        
        Mode mode;
        std::chrono::hours cache_refresh_interval;
        bool auto_refresh_on_startup;
        std::chrono::hours cache_stale_threshold;
        std::vector<SegmentConfig> segments;
        std::vector<GroupConfig> groups;
    };
    
    struct CheckInConfig {
        int default_guest_count;
        int max_guest_count;
        bool enable_day_pass;
        bool offline_queue_enabled;
        bool daily_backup_enabled;
        int backup_retention_days;
    };
    
    struct SearchConfig {
        bool fuzzy_matching_enabled;
        int min_search_length;
        int max_results;
        std::chrono::seconds search_timeout;
    };
    
    struct UIConfig {
        enum class Theme {
            Auto,
            Light,
            Dark
        };
        
        Theme theme;
        bool show_admin_button;
        std::string admin_password_hash;
        std::chrono::minutes session_timeout;
        std::chrono::seconds confirmation_display;
    };
    
    struct GoogleSheetsConfig {
        bool enabled;
        std::string spreadsheet_id;
        std::string sheet_name;
        std::string credentials_file;
        
        struct Fields {
            bool timestamp;
            bool customer_id;
            bool customer_name;
            bool first_name_only;
            bool lot_number;
            bool membership_types;
            bool guest_count;
            bool checkin_type;
            bool location_id;
            bool email;
            bool phone;
            bool full_address;
        } include_fields;
    };
    
    struct CloudSyncConfig {
        bool enabled;
        bool sync_on_checkin;
        std::chrono::minutes sync_interval;
        int batch_size;
        int retry_attempts;
        std::chrono::seconds retry_delay;
        bool sync_historical_on_startup;
        
        GoogleSheetsConfig google_sheets;
        // Can add OneDriveConfig here later
    };
    
    struct LoggingConfig {
        enum class Level {
            Trace, Debug, Info, Warn, Error, Critical
        };
        
        Level level;
        int max_file_size_mb;
        int max_files;
        bool log_to_console;
    };
    
    struct DatabaseConfig {
        std::string path;
        bool backup_on_startup;
        std::string backup_path;
        bool vacuum_on_startup;
    };
    
    // Accessors
    const SquareConfig& square() const { return square_config_; }
    const MembershipConfig& membership() const { return membership_config_; }
    const CheckInConfig& checkin() const { return checkin_config_; }
    const SearchConfig& search() const { return search_config_; }
    const UIConfig& ui() const { return ui_config_; }
    const CloudSyncConfig& cloud_sync() const { return cloud_sync_config_; }
    const LoggingConfig& logging() const { return logging_config_; }
    const DatabaseConfig& database() const { return database_config_; }
    
    // Modifiers (for runtime configuration changes)
    void set_square_config(const SquareConfig& config);
    void set_membership_segments(const std::vector<SegmentConfig>& segments);
    void set_membership_groups(const std::vector<GroupConfig>& groups);
    void set_cloud_sync_config(const CloudSyncConfig& config);
    
    // Observable for configuration changes
    using ConfigChangedCallback = std::function<void()>;
    void on_config_changed(ConfigChangedCallback callback);
    
    // Get default config path based on platform
    static std::filesystem::path get_default_config_path();
    
private:
    ConfigService() = default;
    
    void parse_config();
    void notify_observers();
    
    json config_json_;
    std::filesystem::path config_path_;
    std::vector<ConfigChangedCallback> callbacks_;
    
    // Parsed configuration
    SquareConfig square_config_;
    MembershipConfig membership_config_;
    CheckInConfig checkin_config_;
    SearchConfig search_config_;
    UIConfig ui_config_;
    CloudSyncConfig cloud_sync_config_;
    LoggingConfig logging_config_;
    DatabaseConfig database_config_;
};
