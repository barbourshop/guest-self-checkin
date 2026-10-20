#pragma once

#include <QObject>
#include <QQmlApplicationEngine>
#include <memory>
#include "../services/DatabaseService.h"
#include "../services/SquareService.h"
#include "../services/MembershipService.h"
#include "../services/CheckInService.h"
#include "../services/ExportService.h"
#include "../services/GoogleSheetsService.h"
#include "../viewmodels/CheckInViewModel.h"
#include "../viewmodels/AdminViewModel.h"
#include "../utils/ConfigService.h"

/**
 * Main application class.
 * Initializes all services and ViewModels, manages application lifecycle.
 */
class Application : public QObject {
    Q_OBJECT
    
public:
    explicit Application(QObject* parent = nullptr);
    ~Application() override;
    
    /**
     * Initialize application.
     * Returns false if initialization fails.
     */
    bool initialize();
    
    /**
     * Start the UI.
     */
    bool startUI();
    
    /**
     * Get QML engine.
     */
    QQmlApplicationEngine* engine() { return engine_.get(); }
    
private:
    bool initializeServices();
    bool initializeViewModels();
    void registerQmlTypes();
    void exposeViewModelsToQml();
    
    // Services
    std::shared_ptr<DatabaseService> database_service_;
    std::shared_ptr<SquareService> square_service_;
    std::shared_ptr<MembershipService> membership_service_;
    std::shared_ptr<CheckInService> checkin_service_;
    std::shared_ptr<ExportService> export_service_;
    std::shared_ptr<GoogleSheetsService> sheets_service_;
    
    // ViewModels
    std::shared_ptr<CheckInViewModel> checkin_viewmodel_;
    std::shared_ptr<AdminViewModel> admin_viewmodel_;
    
    // UI
    std::unique_ptr<QQmlApplicationEngine> engine_;
};
