#include "Logger.h"
#include <filesystem>
#include <iostream>

std::shared_ptr<spdlog::logger> Logger::logger_;

void Logger::initialize(const std::string& log_file_path,
                       Level level,
                       size_t max_file_size_mb,
                       size_t max_files,
                       bool log_to_console) {
    try {
        // Ensure log directory exists
        std::filesystem::path log_path(log_file_path);
        std::filesystem::create_directories(log_path.parent_path());
        
        // Create sinks
        std::vector<spdlog::sink_ptr> sinks;
        
        // Rotating file sink
        auto file_sink = std::make_shared<spdlog::sinks::rotating_file_sink_mt>(
            log_file_path,
            max_file_size_mb * 1024 * 1024,  // Convert MB to bytes
            max_files
        );
        file_sink->set_level(spdlog::level::trace);  // File gets everything
        sinks.push_back(file_sink);
        
        // Console sink (optional)
        if (log_to_console) {
            auto console_sink = std::make_shared<spdlog::sinks::stdout_color_sink_mt>();
            console_sink->set_level(to_spdlog_level(level));
            sinks.push_back(console_sink);
        }
        
        // Create logger
        logger_ = std::make_shared<spdlog::logger>("frontdesk", sinks.begin(), sinks.end());
        logger_->set_level(to_spdlog_level(level));
        logger_->set_pattern("[%Y-%m-%d %H:%M:%S.%e] [%l] [%t] %v");
        logger_->flush_on(spdlog::level::warn);  // Auto-flush on warnings and errors
        
        // Register as default logger
        spdlog::set_default_logger(logger_);
        
        logger_->info("Logger initialized: {}", log_file_path);
        
    } catch (const std::exception& e) {
        std::cerr << "Failed to initialize logger: " << e.what() << std::endl;
        // Create a basic console logger as fallback
        logger_ = spdlog::stdout_color_mt("frontdesk");
        logger_->error("Logger initialization failed, using console fallback: {}", e.what());
    }
}

std::shared_ptr<spdlog::logger> Logger::get() {
    if (!logger_) {
        // Create default console logger if not initialized
        logger_ = spdlog::stdout_color_mt("frontdesk");
        logger_->warn("Logger accessed before initialization, using default console logger");
    }
    return logger_;
}

void Logger::set_level(Level level) {
    if (logger_) {
        logger_->set_level(to_spdlog_level(level));
    }
}

void Logger::flush() {
    if (logger_) {
        logger_->flush();
    }
}

spdlog::level::level_enum Logger::to_spdlog_level(Level level) {
    switch (level) {
        case Level::Trace:    return spdlog::level::trace;
        case Level::Debug:    return spdlog::level::debug;
        case Level::Info:     return spdlog::level::info;
        case Level::Warn:     return spdlog::level::warn;
        case Level::Error:    return spdlog::level::err;
        case Level::Critical: return spdlog::level::critical;
        default:              return spdlog::level::info;
    }
}
