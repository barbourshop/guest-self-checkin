#include "Application.h"
#include "../utils/Logger.h"
#include <QQmlContext>
#include <QStandardPaths>
#include <QDir>

Application::Application(QObject* parent)
    : QObject(parent)
{
    Logger::info("Application created");
}

Application::~Application() {
    Logger::info("Application destroyed");
}

bool Application::initialize() {
    Logger::info("Initializing application");
    
    // Initialize logger
    QString log_dir = QStandardPaths::writableLocation(QStandardPaths::AppDataLocation);
    QDir().mkpath(log_dir);
    
    // Load configuration
    auto& config = ConfigService::instance();
    QString config_path = QStandardPaths::writableLocation(QStandardPaths::AppConfigLocation) + "/config.json";
    
    auto config_result = config.load_from_file(config_path);
    if (config_result.is_error()) {
        Logger::warn("Failed to load config: {}", config_result.error());
        Logger::info("Using default configuration");
    }
    
    // Initialize services
    if (!initializeServices()) {
        Logger::error("Failed to initialize services");
        return false;
    }
    
    // Initialize ViewModels
    if (!initializeViewModels()) {
        Logger::error("Failed to initialize ViewModels");
        return false;
    }
    
    Logger::info("Application initialization complete");
    return true;
}

bool Application::startUI() {
    Logger::info("Starting UI");
    
    engine_ = std::make_unique<QQmlApplicationEngine>();
    
    // Register QML types
    registerQmlTypes();
    
    // Expose ViewModels to QML
    exposeViewModelsToQml();
    
    // Load main QML file
    const QUrl url(u"qrc:/qt/qml/com/frontdesk/app/ui/main.qml"_qs);
    
    QObject::connect(engine_.get(), &QQmlApplicationEngine::objectCreated,
                     this, [url](QObject* obj, const QUrl& objUrl) {
        if (!obj && url == objUrl) {
            Logger::error("Failed to load main QML file");
            QCoreApplication::exit(-1);
        }
    });
    
    engine_->load(url);
    
    if (engine_->rootObjects().isEmpty()) {
        Logger::error("No root QML objects loaded");
        return false;
    }
    
    Logger::info("UI started successfully");
    return true;
}

bool Application::initializeServices() {
    Logger::info("Initializing services");
    
    auto& config = ConfigService::instance();
    
    // Database Service
    QString data_dir = QStandardPaths::writableLocation(QStandardPaths::AppDataLocation);
    QString db_path = data_dir + "/frontdesk.db";
    
    database_service_ = std::make_shared<DatabaseService>(db_path);
    auto db_result = database_service_->initialize();
    if (db_result.is_error()) {
        Logger::error("Failed to initialize database: {}", db_result.error());
        return false;
    }
    
    // Square Service
    auto square_config = config.get_square_config();
    SquareService::Config sq_config;
    sq_config.access_token = QString::fromStdString(square_config.access_token);
    sq_config.api_url = QString::fromStdString(square_config.api_url);
    
    square_service_ = std::make_shared<SquareService>(sq_config);
    
    // Membership Service
    membership_service_ = std::make_shared<MembershipService>(
        square_service_,
        database_service_
    );
    
    // Check-in Service
    checkin_service_ = std::make_shared<CheckInService>(database_service_);
    
    // Export Service
    export_service_ = std::make_shared<ExportService>(database_service_);
    
    // Google Sheets Service
    auto cloud_sync_config = config.get_cloud_sync_config();
    GoogleSheetsService::Config sheets_config;
    sheets_config.client_id = QString::fromStdString(cloud_sync_config.google_client_id);
    sheets_config.client_secret = QString::fromStdString(cloud_sync_config.google_client_secret);
    sheets_config.spreadsheet_id = QString::fromStdString(cloud_sync_config.google_spreadsheet_id);
    sheets_config.include_customer_id = cloud_sync_config.include_customer_id;
    
    sheets_service_ = std::make_shared<GoogleSheetsService>(
        sheets_config,
        database_service_
    );
    
    Logger::info("Services initialized successfully");
    return true;
}

bool Application::initializeViewModels() {
    Logger::info("Initializing ViewModels");
    
    // Check-in ViewModel
    checkin_viewmodel_ = std::make_shared<CheckInViewModel>(
        square_service_,
        membership_service_,
        checkin_service_
    );
    
    // Admin ViewModel
    admin_viewmodel_ = std::make_shared<AdminViewModel>(
        export_service_,
        checkin_service_,
        sheets_service_,
        membership_service_
    );
    
    Logger::info("ViewModels initialized successfully");
    return true;
}

void Application::registerQmlTypes() {
    // Register C++ types that QML needs to know about
    // For now, we're using context properties instead
    Logger::debug("Registering QML types");
}

void Application::exposeViewModelsToQml() {
    Logger::debug("Exposing ViewModels to QML");
    
    auto* root_context = engine_->rootContext();
    
    root_context->setContextProperty("checkInViewModel", checkin_viewmodel_.get());
    root_context->setContextProperty("adminViewModel", admin_viewmodel_.get());
}
