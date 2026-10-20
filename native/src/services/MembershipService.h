#pragma once

#include <QObject>
#include <QFuture>
#include <memory>
#include "../utils/Result.h"
#include "../models/Customer.h"
#include "../models/Segment.h"
#include "../models/Group.h"
#include "../models/MembershipStatus.h"
#include "SquareService.h"
#include "DatabaseService.h"

/**
 * Service for checking membership status using OR logic across segments and groups.
 * A customer is a member if they belong to ANY enabled segment OR group.
 */
class MembershipService : public QObject {
    Q_OBJECT
    
public:
    explicit MembershipService(
        std::shared_ptr<SquareService> square_service,
        std::shared_ptr<DatabaseService> database_service,
        QObject* parent = nullptr
    );
    ~MembershipService() override;
    
    /**
     * Check if a customer is a member based on configured segments/groups.
     * Returns MembershipStatus with all matching memberships (OR logic).
     */
    QFuture<Result<MembershipStatus>> check_membership(const Customer& customer);
    
    /**
     * Refresh membership cache from Square API.
     * Fetches all enabled segments and groups from Square,
     * updates database cache.
     */
    QFuture<Result<void>> refresh_cache();
    
    /**
     * Get cached segments from database.
     */
    Result<std::vector<Segment>> get_cached_segments() const;
    
    /**
     * Get cached groups from database.
     */
    Result<std::vector<Group>> get_cached_groups() const;
    
    /**
     * Get cache age in seconds.
     * Returns 0 if never refreshed.
     */
    std::chrono::seconds get_cache_age() const;
    
    /**
     * Check if cache needs refresh based on configured TTL.
     */
    bool cache_needs_refresh() const;
    
signals:
    void cache_refreshed();
    void cache_refresh_failed(const QString& error);
    
private:
    /**
     * Load segments and groups from config, update database.
     */
    Result<void> sync_config_to_database();
    
    /**
     * Check if customer belongs to any enabled segments.
     */
    std::vector<std::string> match_segments(const Customer& customer) const;
    
    /**
     * Check if customer belongs to any enabled groups.
     */
    std::vector<std::string> match_groups(const Customer& customer) const;
    
    std::shared_ptr<SquareService> square_service_;
    std::shared_ptr<DatabaseService> database_service_;
    
    // Cache of enabled segments/groups
    std::vector<Segment> cached_segments_;
    std::vector<Group> cached_groups_;
    std::chrono::system_clock::time_point last_cache_time_;
};
