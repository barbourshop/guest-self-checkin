#include <QGuiApplication>
#include <QQmlApplicationEngine>
#include <QQmlContext>
#include <QStandardPaths>
#include <filesystem>
#include "app/Application.h"
#include "utils/Logger.h"
#include "utils/ConfigService.h"

int main(int argc, char *argv[]) {
    // Set application metadata
    QCoreApplication::setOrganizationName("FrontDeskApp");
    QCoreApplication::setOrganizationDomain("frontdesk.app");
    QCoreApplication::setApplicationName("Front Desk App");
    QCoreApplication::setApplicationVersion("2026.3.0");
    
    // Create Qt application
    QGuiApplication app(argc, argv);
    
    // Initialize logger
    QString log_dir = QStandardPaths::writableLocation(QStandardPaths::AppDataLocation) + "/logs";
    std::filesystem::create_directories(log_dir.toStdString());
    std::string log_file = (log_dir + "/app.log").toStdString();
    Logger::initialize(log_file, Logger::Level::Info, 10, 5, false);
    
    Logger::info("=== Front Desk App Starting ===");
    Logger::info("Version: {}", QCoreApplication::applicationVersion().toStdString());
    Logger::info("Platform: {}", QSysInfo::prettyProductName().toStdString());
    Logger::info("Log file: {}", log_file);
    
    // Load configuration
    auto& config = ConfigService::instance();
    auto config_path = ConfigService::get_default_config_path();
    Logger::info("Loading configuration from: {}", config_path.string());
    
    auto load_result = config.load(config_path);
    if (load_result.is_error()) {
        Logger::warn("Failed to load configuration: {}", load_result.error());
        Logger::info("Using default configuration");
        // Continue with defaults - setup wizard will run on first launch
    }
    
    // Update logger level from config
    auto log_level = Logger::Level::Info;
    switch (config.logging().level) {
        case ConfigService::LoggingConfig::Level::Trace:
            log_level = Logger::Level::Trace;
            break;
        case ConfigService::LoggingConfig::Level::Debug:
            log_level = Logger::Level::Debug;
            break;
        case ConfigService::LoggingConfig::Level::Warn:
            log_level = Logger::Level::Warn;
            break;
        case ConfigService::LoggingConfig::Level::Error:
            log_level = Logger::Level::Error;
            break;
        case ConfigService::LoggingConfig::Level::Critical:
            log_level = Logger::Level::Critical;
            break;
        default:
            break;
    }
    Logger::set_level(log_level);
    
    // TODO: Initialize services (Database, Square, etc.)
    
    // Create QML engine
    QQmlApplicationEngine engine;
    
    // TODO: Register ViewModels with QML engine
    // qmlRegisterType<CheckInViewModel>("com.frontdesk.viewmodels", 1, 0, "CheckInViewModel");
    
    // Load main QML
    const QUrl url(u"qrc:/com/frontdesk/app/ui/main.qml"_qs);
    QObject::connect(
        &engine,
        &QQmlApplicationEngine::objectCreationFailed,
        &app,
        []() {
            Logger::critical("Failed to load main QML");
            QCoreApplication::exit(-1);
        },
        Qt::QueuedConnection
    );
    
    engine.load(url);
    
    if (engine.rootObjects().isEmpty()) {
        Logger::critical("No root QML objects created");
        return -1;
    }
    
    Logger::info("Application started successfully");
    
    // Run application event loop
    int result = app.exec();
    
    Logger::info("Application exiting with code: {}", result);
    Logger::flush();
    
    return result;
}
