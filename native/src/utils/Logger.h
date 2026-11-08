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
    
    // Convenience methods using runtime format strings
    template<typename... Args>
    static void trace(const std::string& fmt, Args&&... args) {
        get()->trace(spdlog::fmt_runtime(fmt), std::forward<Args>(args)...);
    }
    
    template<typename... Args>
    static void debug(const std::string& fmt, Args&&... args) {
        get()->debug(spdlog::fmt_runtime(fmt), std::forward<Args>(args)...);
    }
    
    template<typename... Args>
    static void info(const std::string& fmt, Args&&... args) {
        get()->info(spdlog::fmt_runtime(fmt), std::forward<Args>(args)...);
    }
    
    template<typename... Args>
    static void warn(const std::string& fmt, Args&&... args) {
        get()->warn(spdlog::fmt_runtime(fmt), std::forward<Args>(args)...);
    }
    
    template<typename... Args>
    static void error(const std::string& fmt, Args&&... args) {
        get()->error(spdlog::fmt_runtime(fmt), std::forward<Args>(args)...);
    }
    
    template<typename... Args>
    static void critical(const std::string& fmt, Args&&... args) {
        get()->critical(spdlog::fmt_runtime(fmt), std::forward<Args>(args)...);
    }
    
    // Flush logs to disk
    static void flush();
    
private:
    static std::shared_ptr<spdlog::logger> logger_;
    
    static spdlog::level::level_enum to_spdlog_level(Level level);
};
