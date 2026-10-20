#pragma once

#include <spdlog/spdlog.h>
#include <spdlog/sinks/rotating_file_sink.h>
#include <spdlog/sinks/stdout_color_sinks.h>
#include <memory>
#include <string>

/**
 * Logging utility wrapper around spdlog.
 * Provides application-wide logging with file rotation.
 */
class Logger {
public:
    enum class Level {
        Trace,
        Debug,
        Info,
        Warn,
        Error,
        Critical
    };
    
    // Initialize logger with configuration
    static void initialize(const std::string& log_file_path, 
                          Level level = Level::Info,
                          size_t max_file_size_mb = 10,
                          size_t max_files = 5,
                          bool log_to_console = false);
    
    // Get the application logger
    static std::shared_ptr<spdlog::logger> get();
    
    // Set log level
    static void set_level(Level level);
    
    // Convenience methods
    template<typename... Args>
    static void trace(Args&&... args) {
        get()->trace(std::forward<Args>(args)...);
    }
    
    template<typename... Args>
    static void debug(Args&&... args) {
        get()->debug(std::forward<Args>(args)...);
    }
    
    template<typename... Args>
    static void info(Args&&... args) {
        get()->info(std::forward<Args>(args)...);
    }
    
    template<typename... Args>
    static void warn(Args&&... args) {
        get()->warn(std::forward<Args>(args)...);
    }
    
    template<typename... Args>
    static void error(Args&&... args) {
        get()->error(std::forward<Args>(args)...);
    }
    
    template<typename... Args>
    static void critical(Args&&... args) {
        get()->critical(std::forward<Args>(args)...);
    }
    
    // Flush logs to disk
    static void flush();
    
private:
    static std::shared_ptr<spdlog::logger> logger_;
    
    static spdlog::level::level_enum to_spdlog_level(Level level);
};
