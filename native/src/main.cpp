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
    
    // Create and initialize application
    Application front_desk_app;
    
    if (!front_desk_app.initialize()) {
        Logger::critical("Failed to initialize application");
        return -1;
    }
    
    // Start UI
    if (!front_desk_app.startUI()) {
        Logger::critical("Failed to start UI");
        return -1;
    }
    
    Logger::info("Application started successfully");
    
    // Run application event loop
    int result = app.exec();
    
    Logger::info("Application exiting with code: {}", result);
    Logger::flush();
    
    return result;
}
