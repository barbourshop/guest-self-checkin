#pragma once

#include "BaseViewModel.h"
#include <QObject>
#include <QString>
#include <QList>
#include <memory>
#include "../models/Customer.h"
#include "../models/MembershipStatus.h"
#include "../services/SquareService.h"
#include "../services/MembershipService.h"
#include "../services/CheckInService.h"

/**
 * ViewModel for the main check-in screen.
 * Handles customer search, membership verification, and check-in recording.
 */
class CheckInViewModel : public BaseViewModel {
    Q_OBJECT
    
    Q_PROPERTY(QString searchQuery READ searchQuery WRITE setSearchQuery NOTIFY searchQueryChanged)
    Q_PROPERTY(QString searchType READ searchType WRITE setSearchType NOTIFY searchTypeChanged)
    Q_PROPERTY(bool isSearching READ isSearching NOTIFY isSearchingChanged)
    Q_PROPERTY(bool hasSearchResults READ hasSearchResults NOTIFY hasSearchResultsChanged)
    Q_PROPERTY(QList<QVariant> searchResults READ searchResults NOTIFY searchResultsChanged)
    
    Q_PROPERTY(bool hasSelectedCustomer READ hasSelectedCustomer NOTIFY hasSelectedCustomerChanged)
    Q_PROPERTY(QString selectedCustomerName READ selectedCustomerName NOTIFY selectedCustomerChanged)
    Q_PROPERTY(QString selectedCustomerLot READ selectedCustomerLot NOTIFY selectedCustomerChanged)
    Q_PROPERTY(bool selectedCustomerIsMember READ selectedCustomerIsMember NOTIFY selectedCustomerChanged)
    Q_PROPERTY(QString selectedCustomerMemberships READ selectedCustomerMemberships NOTIFY selectedCustomerChanged)
    
    Q_PROPERTY(int guestCount READ guestCount WRITE setGuestCount NOTIFY guestCountChanged)
    Q_PROPERTY(int todayMemberCount READ todayMemberCount NOTIFY todayStatsChanged)
    Q_PROPERTY(int todayDayPassCount READ todayDayPassCount NOTIFY todayStatsChanged)
    Q_PROPERTY(int todayTotalGuests READ todayTotalGuests NOTIFY todayStatsChanged)
    
public:
    explicit CheckInViewModel(
        std::shared_ptr<SquareService> square_service,
        std::shared_ptr<MembershipService> membership_service,
        std::shared_ptr<CheckInService> checkin_service,
        QObject* parent = nullptr
    );
    ~CheckInViewModel() override;
    
    // Property getters
    QString searchQuery() const { return search_query_; }
    QString searchType() const { return search_type_; }
    bool isSearching() const { return is_searching_; }
    bool hasSearchResults() const { return !search_results_.empty(); }
    QList<QVariant> searchResults() const;
    
    bool hasSelectedCustomer() const { return selected_customer_.has_value(); }
    QString selectedCustomerName() const;
    QString selectedCustomerLot() const;
    bool selectedCustomerIsMember() const;
    QString selectedCustomerMemberships() const;
    
    int guestCount() const { return guest_count_; }
    int todayMemberCount() const { return today_stats_.member_checkins; }
    int todayDayPassCount() const { return today_stats_.daypass_checkins; }
    int todayTotalGuests() const { return today_stats_.total_guests; }
    
    // Property setters
    void setSearchQuery(const QString& query);
    void setSearchType(const QString& type);
    void setGuestCount(int count);
    
public slots:
    void search();
    void selectCustomer(int index);
    void clearSelection();
    void checkInMember();
    void checkInDayPass();
    void refreshTodayStats();
    
signals:
    void searchQueryChanged();
    void searchTypeChanged();
    void isSearchingChanged();
    void hasSearchResultsChanged();
    void searchResultsChanged();
    void hasSelectedCustomerChanged();
    void selectedCustomerChanged();
    void guestCountChanged();
    void todayStatsChanged();
    void checkInSuccess(const QString& customerName, bool isMember);
    void checkInFailed(const QString& error);
    
private:
    void updateSearching(bool searching);
    void loadTodayStats();
    
    std::shared_ptr<SquareService> square_service_;
    std::shared_ptr<MembershipService> membership_service_;
    std::shared_ptr<CheckInService> checkin_service_;
    
    QString search_query_;
    QString search_type_{"email"};
    bool is_searching_{false};
    
    std::vector<Customer> search_results_;
    std::optional<Customer> selected_customer_;
    std::optional<MembershipStatus> selected_customer_membership_;
    
    int guest_count_{0};
    CheckInService::TodayStats today_stats_;
};
