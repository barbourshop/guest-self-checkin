#include "CheckInViewModel.h"
#include "../utils/Logger.h"
#include <QVariantMap>
#include <QtConcurrent>

CheckInViewModel::CheckInViewModel(
    std::shared_ptr<SquareService> square_service,
    std::shared_ptr<MembershipService> membership_service,
    std::shared_ptr<CheckInService> checkin_service,
    QObject* parent
)
    : BaseViewModel(parent)
    , square_service_(square_service)
    , membership_service_(membership_service)
    , checkin_service_(checkin_service)
{
    Logger::info("CheckInViewModel created");
    loadTodayStats();
}

CheckInViewModel::~CheckInViewModel() {
    Logger::info("CheckInViewModel destroyed");
}

QList<QVariant> CheckInViewModel::searchResults() const {
    QList<QVariant> list;
    
    for (const auto& customer : search_results_) {
        QVariantMap map;
        map["id"] = QString::fromStdString(customer.id);
        map["name"] = QString::fromStdString(customer.display_name());
        map["email"] = customer.email_address.has_value() 
            ? QString::fromStdString(customer.email_address.value()) 
            : QString();
        map["phone"] = customer.phone_number.has_value() 
            ? QString::fromStdString(customer.phone_number.value()) 
            : QString();
        map["lot"] = customer.reference_id.has_value() 
            ? QString::fromStdString(customer.reference_id.value()) 
            : QString();
        
        list.append(map);
    }
    
    return list;
}

QString CheckInViewModel::selectedCustomerName() const {
    if (!selected_customer_.has_value()) return QString();
    return QString::fromStdString(selected_customer_->display_name());
}

QString CheckInViewModel::selectedCustomerLot() const {
    if (!selected_customer_.has_value()) return QString();
    if (!selected_customer_->reference_id.has_value()) return QString();
    return QString::fromStdString(selected_customer_->reference_id.value());
}

bool CheckInViewModel::selectedCustomerIsMember() const {
    return selected_customer_membership_.has_value() && 
           selected_customer_membership_->is_member();
}

QString CheckInViewModel::selectedCustomerMemberships() const {
    if (!selected_customer_membership_.has_value()) return QString();
    return QString::fromStdString(selected_customer_membership_->format_display_names());
}

void CheckInViewModel::setSearchQuery(const QString& query) {
    if (search_query_ != query) {
        search_query_ = query;
        emit searchQueryChanged();
    }
}

void CheckInViewModel::setSearchType(const QString& type) {
    if (search_type_ != type) {
        search_type_ = type;
        emit searchTypeChanged();
    }
}

void CheckInViewModel::setGuestCount(int count) {
    if (guest_count_ != count) {
        guest_count_ = count;
        emit guestCountChanged();
    }
}

void CheckInViewModel::search() {
    if (search_query_.isEmpty()) {
        Logger::warn("Search query is empty");
        return;
    }
    
    updateSearching(true);
    clearError();
    
    Logger::info("Searching for customer: type={}, query={}", 
                search_type_.toStdString(), search_query_.toStdString());
    
    auto future = square_service_->search_customers(search_query_, search_type_);
    
    auto* watcher = new QFutureWatcher<Result<std::vector<Customer>>>(this);
    connect(watcher, &QFutureWatcherBase::finished, this, [this, watcher]() {
        auto result = watcher->result();
        watcher->deleteLater();
        
        updateSearching(false);
        
        if (result.is_error()) {
            Logger::error("Search failed: {}", result.error());
            setError(QString::fromStdString(result.error()));
            search_results_.clear();
            emit hasSearchResultsChanged();
            emit searchResultsChanged();
            return;
        }
        
        search_results_ = result.value();
        Logger::info("Found {} customers", search_results_.size());
        
        emit hasSearchResultsChanged();
        emit searchResultsChanged();
        
        // Auto-select if only one result
        if (search_results_.size() == 1) {
            selectCustomer(0);
        }
    });
    
    watcher->setFuture(future);
}

void CheckInViewModel::selectCustomer(int index) {
    if (index < 0 || index >= static_cast<int>(search_results_.size())) {
        Logger::error("Invalid customer index: {}", index);
        return;
    }
    
    selected_customer_ = search_results_[index];
    Logger::info("Selected customer: {}", selected_customer_->display_name());
    
    // Check membership
    setLoading(true);
    auto future = membership_service_->check_membership(*selected_customer_);
    
    auto* watcher = new QFutureWatcher<Result<MembershipStatus>>(this);
    connect(watcher, &QFutureWatcherBase::finished, this, [this, watcher]() {
        auto result = watcher->result();
        watcher->deleteLater();
        
        setLoading(false);
        
        if (result.is_ok()) {
            selected_customer_membership_ = result.value();
        } else {
            Logger::warn("Failed to check membership: {}", result.error());
            selected_customer_membership_ = MembershipStatus();  // Empty membership
        }
        
        emit hasSelectedCustomerChanged();
        emit selectedCustomerChanged();
    });
    
    watcher->setFuture(future);
}

void CheckInViewModel::clearSelection() {
    selected_customer_.reset();
    selected_customer_membership_.reset();
    guest_count_ = 0;
    
    emit hasSelectedCustomerChanged();
    emit selectedCustomerChanged();
    emit guestCountChanged();
}

void CheckInViewModel::checkInMember() {
    if (!selected_customer_.has_value()) {
        Logger::error("No customer selected");
        return;
    }
    
    if (!selected_customer_membership_.has_value() || 
        !selected_customer_membership_->is_member()) {
        Logger::error("Customer is not a member");
        setError("Customer is not a member");
        return;
    }
    
    setLoading(true);
    clearError();
    
    auto future = checkin_service_->record_member_checkin(
        *selected_customer_,
        *selected_customer_membership_,
        guest_count_
    );
    
    auto* watcher = new QFutureWatcher<Result<CheckIn>>(this);
    connect(watcher, &QFutureWatcherBase::finished, this, [this, watcher]() {
        auto result = watcher->result();
        watcher->deleteLater();
        
        setLoading(false);
        
        if (result.is_error()) {
            Logger::error("Check-in failed: {}", result.error());
            setError(QString::fromStdString(result.error()));
            emit checkInFailed(QString::fromStdString(result.error()));
            return;
        }
        
        auto checkin = result.value();
        Logger::info("Member check-in successful: {}", checkin.customer_name);
        
        QString customer_name = QString::fromStdString(checkin.customer_name);
        emit checkInSuccess(customer_name, true);
        
        // Reset form
        clearSelection();
        search_query_.clear();
        search_results_.clear();
        emit searchQueryChanged();
        emit hasSearchResultsChanged();
        emit searchResultsChanged();
        
        // Refresh stats
        loadTodayStats();
    });
    
    watcher->setFuture(future);
}

void CheckInViewModel::checkInDayPass() {
    if (!selected_customer_.has_value()) {
        Logger::error("No customer selected");
        return;
    }
    
    setLoading(true);
    clearError();
    
    auto future = checkin_service_->record_daypass_checkin(
        *selected_customer_,
        guest_count_
    );
    
    auto* watcher = new QFutureWatcher<Result<CheckIn>>(this);
    connect(watcher, &QFutureWatcherBase::finished, this, [this, watcher]() {
        auto result = watcher->result();
        watcher->deleteLater();
        
        setLoading(false);
        
        if (result.is_error()) {
            Logger::error("Check-in failed: {}", result.error());
            setError(QString::fromStdString(result.error()));
            emit checkInFailed(QString::fromStdString(result.error()));
            return;
        }
        
        auto checkin = result.value();
        Logger::info("Day-pass check-in successful: {}", checkin.customer_name);
        
        QString customer_name = QString::fromStdString(checkin.customer_name);
        emit checkInSuccess(customer_name, false);
        
        // Reset form
        clearSelection();
        search_query_.clear();
        search_results_.clear();
        emit searchQueryChanged();
        emit hasSearchResultsChanged();
        emit searchResultsChanged();
        
        // Refresh stats
        loadTodayStats();
    });
    
    watcher->setFuture(future);
}

void CheckInViewModel::refreshTodayStats() {
    loadTodayStats();
}

void CheckInViewModel::updateSearching(bool searching) {
    if (is_searching_ != searching) {
        is_searching_ = searching;
        emit isSearchingChanged();
    }
}

void CheckInViewModel::loadTodayStats() {
    auto result = checkin_service_->get_today_stats();
    
    if (result.is_ok()) {
        today_stats_ = result.value();
        emit todayStatsChanged();
    } else {
        Logger::warn("Failed to load today stats: {}", result.error());
    }
}
