#include "AdminViewModel.h"
#include "../utils/Logger.h"
#include <QDesktopServices>
#include <QUrl>

AdminViewModel::AdminViewModel(
    std::shared_ptr<ExportService> export_service,
    std::shared_ptr<CheckInService> checkin_service,
    std::shared_ptr<GoogleSheetsService> sheets_service,
    std::shared_ptr<MembershipService> membership_service,
    QObject* parent
)
    : BaseViewModel(parent)
    , export_service_(export_service)
    , checkin_service_(checkin_service)
    , sheets_service_(sheets_service)
    , membership_service_(membership_service)
{
    Logger::info("AdminViewModel created");
    
    // Connect signals
    connect(sheets_service_.get(), &GoogleSheetsService::authorization_completed,
            this, &AdminViewModel::googleSheetsAuthChanged);
    connect(sheets_service_.get(), &GoogleSheetsService::authorization_failed,
            this, [this](const QString& error) {
                setError(error);
            });
    
    loadPendingSyncCount();
}

AdminViewModel::~AdminViewModel() {
    Logger::info("AdminViewModel destroyed");
}

bool AdminViewModel::isGoogleSheetsAuthorized() const {
    return sheets_service_->is_authorized();
}

QString AdminViewModel::cacheAge() const {
    auto age = membership_service_->get_cache_age();
    
    if (age.count() == 0) {
        return "Never refreshed";
    }
    
    int hours = age.count() / 3600;
    int minutes = (age.count() % 3600) / 60;
    
    if (hours > 0) {
        return QString("%1h %2m ago").arg(hours).arg(minutes);
    } else {
        return QString("%1m ago").arg(minutes);
    }
}

bool AdminViewModel::cacheNeedsRefresh() const {
    return membership_service_->cache_needs_refresh();
}

void AdminViewModel::exportToday() {
    Logger::info("Exporting today's check-ins");
    setLoading(true);
    clearError();
    
    emit exportStarted();
    
    auto future = export_service_->export_today_to_excel();
    
    auto* watcher = new QFutureWatcher<Result<QString>>(this);
    connect(watcher, &QFutureWatcherBase::finished, this, [this, watcher]() {
        auto result = watcher->result();
        watcher->deleteLater();
        
        setLoading(false);
        
        if (result.is_error()) {
            Logger::error("Export failed: {}", result.error());
            setError(QString::fromStdString(result.error()));
            emit exportFailed(QString::fromStdString(result.error()));
            return;
        }
        
        QString filepath = result.value();
        Logger::info("Export completed: {}", filepath.toStdString());
        emit exportCompleted(filepath);
        
        // Open file
        QDesktopServices::openUrl(QUrl::fromLocalFile(filepath));
    });
    
    watcher->setFuture(future);
}

void AdminViewModel::exportDateRange(const QDateTime& start, const QDateTime& end) {
    Logger::info("Exporting date range");
    setLoading(true);
    clearError();
    
    emit exportStarted();
    
    auto start_tp = std::chrono::system_clock::from_time_t(start.toSecsSinceEpoch());
    auto end_tp = std::chrono::system_clock::from_time_t(end.toSecsSinceEpoch());
    
    auto future = export_service_->export_checkins_to_excel(start_tp, end_tp);
    
    auto* watcher = new QFutureWatcher<Result<QString>>(this);
    connect(watcher, &QFutureWatcherBase::finished, this, [this, watcher]() {
        auto result = watcher->result();
        watcher->deleteLater();
        
        setLoading(false);
        
        if (result.is_error()) {
            Logger::error("Export failed: {}", result.error());
            setError(QString::fromStdString(result.error()));
            emit exportFailed(QString::fromStdString(result.error()));
            return;
        }
        
        QString filepath = result.value();
        Logger::info("Export completed: {}", filepath.toStdString());
        emit exportCompleted(filepath);
        
        QDesktopServices::openUrl(QUrl::fromLocalFile(filepath));
    });
    
    watcher->setFuture(future);
}

void AdminViewModel::exportMonth(int year, int month) {
    Logger::info("Exporting month: {}/{}", year, month);
    setLoading(true);
    clearError();
    
    emit exportStarted();
    
    auto future = export_service_->export_month_to_excel(year, month);
    
    auto* watcher = new QFutureWatcher<Result<QString>>(this);
    connect(watcher, &QFutureWatcherBase::finished, this, [this, watcher]() {
        auto result = watcher->result();
        watcher->deleteLater();
        
        setLoading(false);
        
        if (result.is_error()) {
            Logger::error("Export failed: {}", result.error());
            setError(QString::fromStdString(result.error()));
            emit exportFailed(QString::fromStdString(result.error()));
            return;
        }
        
        QString filepath = result.value();
        Logger::info("Export completed: {}", filepath.toStdString());
        emit exportCompleted(filepath);
        
        QDesktopServices::openUrl(QUrl::fromLocalFile(filepath));
    });
    
    watcher->setFuture(future);
}

void AdminViewModel::syncToGoogleSheets() {
    if (!isGoogleSheetsAuthorized()) {
        setError("Not authorized. Please authorize Google Sheets first.");
        return;
    }
    
    Logger::info("Starting Google Sheets sync");
    is_syncing_ = true;
    emit isSyncingChanged();
    clearError();
    
    auto future = sheets_service_->sync_pending_checkins();
    
    auto* watcher = new QFutureWatcher<Result<int>>(this);
    connect(watcher, &QFutureWatcherBase::finished, this, [this, watcher]() {
        auto result = watcher->result();
        watcher->deleteLater();
        
        is_syncing_ = false;
        emit isSyncingChanged();
        
        if (result.is_error()) {
            Logger::error("Sync failed: {}", result.error());
            setError(QString::fromStdString(result.error()));
            emit syncFailed(QString::fromStdString(result.error()));
            return;
        }
        
        int count = result.value();
        Logger::info("Sync completed: {} items", count);
        emit syncCompleted(count);
        
        // Refresh pending count
        loadPendingSyncCount();
    });
    
    watcher->setFuture(future);
}

void AdminViewModel::authorizeGoogleSheets() {
    Logger::info("Starting Google Sheets authorization");
    setLoading(true);
    clearError();
    
    auto future = sheets_service_->authorize();
    
    auto* watcher = new QFutureWatcher<Result<void>>(this);
    connect(watcher, &QFutureWatcherBase::finished, this, [this, watcher]() {
        auto result = watcher->result();
        watcher->deleteLater();
        
        setLoading(false);
        
        if (result.is_error()) {
            Logger::error("Authorization failed: {}", result.error());
            setError(QString::fromStdString(result.error()));
            return;
        }
        
        Logger::info("Authorization successful");
        emit googleSheetsAuthChanged();
    });
    
    watcher->setFuture(future);
}

void AdminViewModel::testGoogleSheetsConnection() {
    if (!isGoogleSheetsAuthorized()) {
        setError("Not authorized");
        return;
    }
    
    Logger::info("Testing Google Sheets connection");
    setLoading(true);
    clearError();
    
    auto future = sheets_service_->test_connection();
    
    auto* watcher = new QFutureWatcher<Result<void>>(this);
    connect(watcher, &QFutureWatcherBase::finished, this, [this, watcher]() {
        auto result = watcher->result();
        watcher->deleteLater();
        
        setLoading(false);
        
        if (result.is_error()) {
            Logger::error("Connection test failed: {}", result.error());
            setError(QString::fromStdString(result.error()));
            return;
        }
        
        Logger::info("Connection test successful");
    });
    
    watcher->setFuture(future);
}

void AdminViewModel::clearGoogleSheetsAuth() {
    Logger::info("Clearing Google Sheets authorization");
    sheets_service_->clear_credentials();
    emit googleSheetsAuthChanged();
}

void AdminViewModel::refreshMembershipCache() {
    Logger::info("Refreshing membership cache");
    setLoading(true);
    clearError();
    
    auto future = membership_service_->refresh_cache();
    
    auto* watcher = new QFutureWatcher<Result<void>>(this);
    connect(watcher, &QFutureWatcherBase::finished, this, [this, watcher]() {
        auto result = watcher->result();
        watcher->deleteLater();
        
        setLoading(false);
        
        if (result.is_error()) {
            Logger::error("Cache refresh failed: {}", result.error());
            setError(QString::fromStdString(result.error()));
            emit cacheRefreshFailed(QString::fromStdString(result.error()));
            return;
        }
        
        Logger::info("Cache refresh completed");
        emit cacheRefreshCompleted();
        emit cacheAgeChanged();
    });
    
    watcher->setFuture(future);
}

void AdminViewModel::loadPendingSyncCount() {
    auto result = checkin_service_->get_today_stats();
    
    if (result.is_ok()) {
        // For now, use total checkins as pending count
        // In real implementation, would query database for pending items
        pending_sync_count_ = result.value().total_checkins;
        emit pendingSyncCountChanged();
    }
}
