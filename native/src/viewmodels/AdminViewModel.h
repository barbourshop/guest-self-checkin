#pragma once

#include "BaseViewModel.h"
#include <QObject>
#include <QString>
#include <QDateTime>
#include <memory>
#include "../services/ExportService.h"
#include "../services/CheckInService.h"
#include "../services/GoogleSheetsService.h"
#include "../services/MembershipService.h"

/**
 * ViewModel for the admin/settings screen.
 * Handles reports, data export, sync, and settings.
 */
class AdminViewModel : public BaseViewModel {
    Q_OBJECT
    
    Q_PROPERTY(bool isSyncing READ isSyncing NOTIFY isSyncingChanged)
    Q_PROPERTY(int pendingSyncCount READ pendingSyncCount NOTIFY pendingSyncCountChanged)
    Q_PROPERTY(bool isGoogleSheetsAuthorized READ isGoogleSheetsAuthorized NOTIFY googleSheetsAuthChanged)
    Q_PROPERTY(QString cacheAge READ cacheAge NOTIFY cacheAgeChanged)
    Q_PROPERTY(bool cacheNeedsRefresh READ cacheNeedsRefresh NOTIFY cacheAgeChanged)
    
public:
    explicit AdminViewModel(
        std::shared_ptr<ExportService> export_service,
        std::shared_ptr<CheckInService> checkin_service,
        std::shared_ptr<GoogleSheetsService> sheets_service,
        std::shared_ptr<MembershipService> membership_service,
        QObject* parent = nullptr
    );
    ~AdminViewModel() override;
    
    bool isSyncing() const { return is_syncing_; }
    int pendingSyncCount() const { return pending_sync_count_; }
    bool isGoogleSheetsAuthorized() const;
    QString cacheAge() const;
    bool cacheNeedsRefresh() const;
    
public slots:
    void exportToday();
    void exportDateRange(const QDateTime& start, const QDateTime& end);
    void exportMonth(int year, int month);
    
    void syncToGoogleSheets();
    void authorizeGoogleSheets();
    void testGoogleSheetsConnection();
    void clearGoogleSheetsAuth();
    
    void refreshMembershipCache();
    void loadPendingSyncCount();
    
signals:
    void isSyncingChanged();
    void pendingSyncCountChanged();
    void googleSheetsAuthChanged();
    void cacheAgeChanged();
    
    void exportStarted();
    void exportCompleted(const QString& filepath);
    void exportFailed(const QString& error);
    
    void syncCompleted(int count);
    void syncFailed(const QString& error);
    
    void cacheRefreshCompleted();
    void cacheRefreshFailed(const QString& error);
    
private:
    std::shared_ptr<ExportService> export_service_;
    std::shared_ptr<CheckInService> checkin_service_;
    std::shared_ptr<GoogleSheetsService> sheets_service_;
    std::shared_ptr<MembershipService> membership_service_;
    
    bool is_syncing_{false};
    int pending_sync_count_{0};
};
