#include "ConfigService.h"
#include "Logger.h"
#include <fstream>
#include <QStandardPaths>

ConfigService& ConfigService::instance() {
    static ConfigService instance;
    return instance;
}

Result<void> ConfigService::load(const std::filesystem::path& config_path) {
    config_path_ = config_path;
    
    // Check if file exists
    if (!std::filesystem::exists(config_path)) {
        Logger::error("Configuration file not found: {}", config_path.string());
        return Result<void>::error("Configuration file not found: " + config_path.string());
    }
    
    // Read JSON file
    try {
        std::ifstream file(config_path);
        if (!file.is_open()) {
            return Result<void>::error("Failed to open configuration file");
        }
        
        config_json_ = json::parse(file);
        Logger::info("Configuration loaded from: {}", config_path.string());
        
    } catch (const json::parse_error& e) {
        Logger::error("JSON parse error: {}", e.what());
        return Result<void>::error(std::string("JSON parse error: ") + e.what());
    } catch (const std::exception& e) {
        Logger::error("Failed to load configuration: {}", e.what());
        return Result<void>::error(std::string("Failed to load configuration: ") + e.what());
    }
    
    // Parse configuration
    parse_config();
    
    // Validate
    if (!validate()) {
        auto errors = get_validation_errors();
        std::string error_msg = "Configuration validation failed:\n";
        for (const auto& err : errors) {
            error_msg += "  - " + err + "\n";
        }
        Logger::warn(error_msg);
        // Don't fail, just warn - use defaults for invalid values
    }
    
    return Result<void>::ok();
}

Result<void> ConfigService::save() {
    if (config_path_.empty()) {
        return Result<void>::error("No configuration path set");
    }
    
    try {
        // Ensure directory exists
        std::filesystem::create_directories(config_path_.parent_path());
        
        // Write JSON file with pretty formatting
        std::ofstream file(config_path_);
        if (!file.is_open()) {
            return Result<void>::error("Failed to open configuration file for writing");
        }
        
        file << config_json_.dump(2);  // 2-space indentation
        Logger::info("Configuration saved to: {}", config_path_.string());
        
        return Result<void>::ok();
        
    } catch (const std::exception& e) {
        Logger::error("Failed to save configuration: {}", e.what());
        return Result<void>::error(std::string("Failed to save configuration: ") + e.what());
    }
}

Result<void> ConfigService::reload() {
    return load(config_path_);
}

void ConfigService::parse_config() {
    // Parse Square configuration
    if (config_json_.contains("square")) {
        auto& sq = config_json_["square"];
        square_config_ = {
            .api_url = sq.value("api_url", "https://connect.squareup.com/v2"),
            .api_version = sq.value("api_version", "2026-01-22"),
            .timeout = std::chrono::seconds(sq.value("timeout_seconds", 30)),
            .retry_attempts = sq.value("retry_attempts", 3),
            .retry_delay = std::chrono::milliseconds(sq.value("retry_delay_ms", 1000))
        };
    }
    
    // Parse Membership configuration
    if (config_json_.contains("membership")) {
        auto& mem = config_json_["membership"];
        
        // Parse mode
        MembershipConfig::Mode mode = MembershipConfig::Mode::SegmentsAndGroups;
        std::string mode_str = mem.value("mode", "segments_and_groups");
        if (mode_str == "segments_only") {
            mode = MembershipConfig::Mode::SegmentsOnly;
        } else if (mode_str == "groups_only") {
            mode = MembershipConfig::Mode::GroupsOnly;
        }
        
        membership_config_.mode = mode;
        membership_config_.cache_refresh_interval = 
            std::chrono::hours(mem.value("cache_refresh_interval_hours", 24));
        membership_config_.auto_refresh_on_startup = 
            mem.value("auto_refresh_on_startup", true);
        membership_config_.cache_stale_threshold = 
            std::chrono::hours(mem.value("cache_stale_threshold_hours", 48));
        
        // Parse segments
        if (mem.contains("segments") && mem["segments"].is_array()) {
            for (const auto& seg : mem["segments"]) {
                membership_config_.segments.push_back({
                    .segment_id = seg.value("segment_id", ""),
                    .display_name = seg.value("display_name", ""),
                    .enabled = seg.value("enabled", true),
                    .sort_order = seg.value("sort_order", 0)
                });
            }
        }
        
        // Parse groups
        if (mem.contains("groups") && mem["groups"].is_array()) {
            for (const auto& grp : mem["groups"]) {
                membership_config_.groups.push_back({
                    .group_id = grp.value("group_id", ""),
                    .display_name = grp.value("display_name", ""),
                    .enabled = grp.value("enabled", true),
                    .sort_order = grp.value("sort_order", 0)
                });
            }
        }
    }
    
    // Parse Check-in configuration
    if (config_json_.contains("checkin")) {
        auto& ci = config_json_["checkin"];
        checkin_config_ = {
            .default_guest_count = ci.value("default_guest_count", 1),
            .max_guest_count = ci.value("max_guest_count", 10),
            .enable_day_pass = ci.value("enable_day_pass", true),
            .offline_queue_enabled = ci.value("offline_queue_enabled", true),
            .daily_backup_enabled = ci.value("daily_backup_enabled", true),
            .backup_retention_days = ci.value("backup_retention_days", 90)
        };
    }
    
    // Parse Search configuration
    if (config_json_.contains("search")) {
        auto& s = config_json_["search"];
        search_config_ = {
            .fuzzy_matching_enabled = s.value("fuzzy_matching_enabled", true),
            .min_search_length = s.value("min_search_length", 2),
            .max_results = s.value("max_results", 50),
            .search_timeout = std::chrono::seconds(s.value("search_timeout_seconds", 10))
        };
    }
    
    // Parse UI configuration
    if (config_json_.contains("ui")) {
        auto& ui = config_json_["ui"];
        
        UIConfig::Theme theme = UIConfig::Theme::Auto;
        std::string theme_str = ui.value("theme", "auto");
        if (theme_str == "light") theme = UIConfig::Theme::Light;
        else if (theme_str == "dark") theme = UIConfig::Theme::Dark;
        
        ui_config_ = {
            .theme = theme,
            .show_admin_button = ui.value("show_admin_button", true),
            .admin_password_hash = ui.value("admin_password_hash", ""),
            .session_timeout = std::chrono::minutes(ui.value("session_timeout_minutes", 30)),
            .confirmation_display = std::chrono::seconds(ui.value("confirmation_display_seconds", 3))
        };
    }
    
    // Parse Cloud Sync configuration
    if (config_json_.contains("cloud_sync")) {
        auto& cs = config_json_["cloud_sync"];
        
        cloud_sync_config_.enabled = cs.value("enabled", false);
        
        if (cs.contains("sync_strategy")) {
            auto& strat = cs["sync_strategy"];
            cloud_sync_config_.sync_on_checkin = strat.value("sync_on_checkin", true);
            cloud_sync_config_.sync_interval = 
                std::chrono::minutes(strat.value("sync_interval_minutes", 5));
            cloud_sync_config_.batch_size = strat.value("batch_size", 50);
            cloud_sync_config_.retry_attempts = strat.value("retry_attempts", 3);
            cloud_sync_config_.retry_delay = 
                std::chrono::seconds(strat.value("retry_delay_seconds", 30));
            cloud_sync_config_.sync_historical_on_startup = 
                strat.value("sync_historical_on_startup", false);
        }
        
        // Parse Google Sheets configuration
        if (cs.contains("google_sheets")) {
            auto& gs = cs["google_sheets"];
            auto& fields = gs["include_fields"];
            
            cloud_sync_config_.google_sheets = {
                .enabled = gs.value("enabled", false),
                .spreadsheet_id = gs.value("spreadsheet_id", ""),
                .sheet_name = gs.value("sheet_name", "Check-ins"),
                .credentials_file = gs.value("credentials_file", ""),
                .include_fields = {
                    .timestamp = fields.value("timestamp", true),
                    .customer_id = fields.value("customer_id", true),
                    .customer_name = fields.value("customer_name", true),
                    .first_name_only = fields.value("first_name_only", false),
                    .lot_number = fields.value("lot_number", true),
                    .membership_types = fields.value("membership_types", true),
                    .guest_count = fields.value("guest_count", true),
                    .checkin_type = fields.value("checkin_type", true),
                    .location_id = fields.value("location_id", true),
                    .email = fields.value("email", false),
                    .phone = fields.value("phone", false),
                    .full_address = fields.value("full_address", false)
                }
            };
        }
    }
    
    // Parse Logging configuration
    if (config_json_.contains("logging")) {
        auto& log = config_json_["logging"];
        
        LoggingConfig::Level level = LoggingConfig::Level::Info;
        std::string level_str = log.value("level", "info");
        if (level_str == "trace") level = LoggingConfig::Level::Trace;
        else if (level_str == "debug") level = LoggingConfig::Level::Debug;
        else if (level_str == "warn") level = LoggingConfig::Level::Warn;
        else if (level_str == "error") level = LoggingConfig::Level::Error;
        else if (level_str == "critical") level = LoggingConfig::Level::Critical;
        
        logging_config_ = {
            .level = level,
            .max_file_size_mb = log.value("max_file_size_mb", 10),
            .max_files = log.value("max_files", 5),
            .log_to_console = log.value("log_to_console", false)
        };
    }
    
    // Parse Database configuration
    if (config_json_.contains("database")) {
        auto& db = config_json_["database"];
        database_config_ = {
            .path = db.value("path", ""),
            .backup_on_startup = db.value("backup_on_startup", true),
            .backup_path = db.value("backup_path", ""),
            .vacuum_on_startup = db.value("vacuum_on_startup", false)
        };
    }
}

bool ConfigService::validate() const {
    // Basic validation - could be expanded
    if (square_config_.api_url.empty()) return false;
    if (square_config_.timeout.count() <= 0) return false;
    if (checkin_config_.max_guest_count < 1) return false;
    if (checkin_config_.default_guest_count > checkin_config_.max_guest_count) return false;
    
    return true;
}

std::vector<std::string> ConfigService::get_validation_errors() const {
    std::vector<std::string> errors;
    
    if (square_config_.api_url.empty()) {
        errors.push_back("Square API URL is empty");
    }
    
    if (square_config_.timeout.count() <= 0) {
        errors.push_back("Square API timeout must be positive");
    }
    
    if (checkin_config_.max_guest_count < 1) {
        errors.push_back("Max guest count must be at least 1");
    }
    
    if (checkin_config_.default_guest_count > checkin_config_.max_guest_count) {
        errors.push_back("Default guest count cannot exceed max guest count");
    }
    
    return errors;
}

void ConfigService::on_config_changed(ConfigChangedCallback callback) {
    callbacks_.push_back(callback);
}

void ConfigService::notify_observers() {
    for (const auto& callback : callbacks_) {
        callback();
    }
}

std::filesystem::path ConfigService::get_default_config_path() {
    // Use Qt's StandardPaths for cross-platform config location
    QString app_data = QStandardPaths::writableLocation(QStandardPaths::AppDataLocation);
    return std::filesystem::path(app_data.toStdString()) / "config.json";
}

// Modifiers
void ConfigService::set_square_config(const SquareConfig& config) {
    square_config_ = config;
    // Update JSON
    config_json_["square"]["api_url"] = config.api_url;
    config_json_["square"]["api_version"] = config.api_version;
    config_json_["square"]["timeout_seconds"] = config.timeout.count();
    config_json_["square"]["retry_attempts"] = config.retry_attempts;
    config_json_["square"]["retry_delay_ms"] = config.retry_delay.count();
    
    notify_observers();
}

void ConfigService::set_membership_segments(const std::vector<SegmentConfig>& segments) {
    membership_config_.segments = segments;
    
    // Update JSON
    config_json_["membership"]["segments"] = json::array();
    for (const auto& seg : segments) {
        config_json_["membership"]["segments"].push_back({
            {"segment_id", seg.segment_id},
            {"display_name", seg.display_name},
            {"enabled", seg.enabled},
            {"sort_order", seg.sort_order}
        });
    }
    
    notify_observers();
}

void ConfigService::set_membership_groups(const std::vector<GroupConfig>& groups) {
    membership_config_.groups = groups;
    
    // Update JSON
    config_json_["membership"]["groups"] = json::array();
    for (const auto& grp : groups) {
        config_json_["membership"]["groups"].push_back({
            {"group_id", grp.group_id},
            {"display_name", grp.display_name},
            {"enabled", grp.enabled},
            {"sort_order", grp.sort_order}
        });
    }
    
    notify_observers();
}

void ConfigService::set_cloud_sync_config(const CloudSyncConfig& config) {
    cloud_sync_config_ = config;
    
    // Update JSON (abbreviated - would update all fields)
    config_json_["cloud_sync"]["enabled"] = config.enabled;
    config_json_["cloud_sync"]["google_sheets"]["enabled"] = config.google_sheets.enabled;
    config_json_["cloud_sync"]["google_sheets"]["spreadsheet_id"] = config.google_sheets.spreadsheet_id;
    
    notify_observers();
}
