#include "MembershipService.h"
#include "../utils/Logger.h"
#include "../utils/ConfigService.h"
#include <QtConcurrent>
#include <algorithm>

MembershipService::MembershipService(
    std::shared_ptr<SquareService> square_service,
    std::shared_ptr<DatabaseService> database_service,
    QObject* parent
)
    : QObject(parent)
    , square_service_(square_service)
    , database_service_(database_service)
    , last_cache_time_(std::chrono::system_clock::time_point::min())
{
    Logger::info("MembershipService initialized");
    
    // Load cached segments and groups from database
    auto segments_result = database_service_->get_all_segments();
    if (segments_result.is_ok()) {
        cached_segments_ = segments_result.value();
        Logger::info("Loaded {} cached segments", cached_segments_.size());
    }
    
    auto groups_result = database_service_->get_all_groups();
    if (groups_result.is_ok()) {
        cached_groups_ = groups_result.value();
        Logger::info("Loaded {} cached groups", cached_groups_.size());
    }
    
    // Get last cache refresh time
    auto time_result = database_service_->get_cache_last_refresh();
    if (time_result.is_ok()) {
        last_cache_time_ = time_result.value();
    }
}

MembershipService::~MembershipService() {
    Logger::info("MembershipService destroyed");
}

QFuture<Result<MembershipStatus>> MembershipService::check_membership(const Customer& customer) {
    return QtConcurrent::run([this, customer]() -> Result<MembershipStatus> {
        Logger::debug("Checking membership for customer: {}", customer.display_name());
        
        // Get enabled segments/groups
        std::vector<Segment> enabled_segments;
        std::copy_if(cached_segments_.begin(), cached_segments_.end(),
                     std::back_inserter(enabled_segments),
                     [](const Segment& s) { return s.enabled; });
        
        std::vector<Group> enabled_groups;
        std::copy_if(cached_groups_.begin(), cached_groups_.end(),
                     std::back_inserter(enabled_groups),
                     [](const Group& g) { return g.enabled; });
        
        // Match segments and groups (OR logic)
        std::vector<std::string> matched_segment_ids = match_segments(customer);
        std::vector<std::string> matched_group_ids = match_groups(customer);
        
        // Build membership status
        MembershipStatus status;
        
        for (const auto& seg_id : matched_segment_ids) {
            auto it = std::find_if(enabled_segments.begin(), enabled_segments.end(),
                                   [&seg_id](const Segment& s) { return s.id == seg_id; });
            if (it != enabled_segments.end()) {
                status.add_segment(*it);
            }
        }
        
        for (const auto& grp_id : matched_group_ids) {
            auto it = std::find_if(enabled_groups.begin(), enabled_groups.end(),
                                   [&grp_id](const Group& g) { return g.id == grp_id; });
            if (it != enabled_groups.end()) {
                status.add_group(*it);
            }
        }
        
        if (status.is_member()) {
            Logger::info("Customer {} is a member: {}", 
                        customer.display_name(),
                        status.format_display_names());
        } else {
            Logger::info("Customer {} is not a member", customer.display_name());
        }
        
        return Result<MembershipStatus>::ok(status);
    });
}

QFuture<Result<void>> MembershipService::refresh_cache() {
    return QtConcurrent::run([this]() -> Result<void> {
        Logger::info("Refreshing membership cache from Square API");
        
        // Fetch segments from Square
        auto segments_future = square_service_->list_segments();
        segments_future.waitForFinished();
        auto segments_result = segments_future.result();
        
        if (segments_result.is_error()) {
            QString error_msg = QString("Failed to fetch segments: %1")
                .arg(QString::fromStdString(segments_result.error()));
            Logger::error(error_msg.toStdString());
            emit cache_refresh_failed(error_msg);
            return Result<void>::error(segments_result.error());
        }
        
        auto square_segments = segments_result.value();
        Logger::info("Fetched {} segments from Square", square_segments.size());
        
        // Fetch groups from Square
        auto groups_future = square_service_->list_groups();
        groups_future.waitForFinished();
        auto groups_result = groups_future.result();
        
        if (groups_result.is_error()) {
            QString error_msg = QString("Failed to fetch groups: %1")
                .arg(QString::fromStdString(groups_result.error()));
            Logger::error(error_msg.toStdString());
            emit cache_refresh_failed(error_msg);
            return Result<void>::error(groups_result.error());
        }
        
        auto square_groups = groups_result.value();
        Logger::info("Fetched {} groups from Square", square_groups.size());
        
        // Get enabled segments/groups from config
        auto& config = ConfigService::instance();
        auto membership_config = config.get_membership_config();
        
        // Update segments in database
        auto clear_segments_result = database_service_->clear_all_segments();
        if (clear_segments_result.is_error()) {
            Logger::error("Failed to clear segments: {}", clear_segments_result.error());
            return Result<void>::error(clear_segments_result.error());
        }
        
        for (const auto& segment : square_segments) {
            // Check if segment is enabled in config
            bool enabled = false;
            for (const auto& config_seg : membership_config.segments) {
                if (config_seg.id == segment.id) {
                    enabled = config_seg.enabled;
                    break;
                }
            }
            
            Segment db_segment = segment;
            db_segment.enabled = enabled;
            
            auto result = database_service_->upsert_segment(db_segment);
            if (result.is_error()) {
                Logger::warn("Failed to upsert segment {}: {}", 
                           segment.id, result.error());
            }
        }
        
        // Update groups in database
        auto clear_groups_result = database_service_->clear_all_groups();
        if (clear_groups_result.is_error()) {
            Logger::error("Failed to clear groups: {}", clear_groups_result.error());
            return Result<void>::error(clear_groups_result.error());
        }
        
        for (const auto& group : square_groups) {
            // Check if group is enabled in config
            bool enabled = false;
            for (const auto& config_grp : membership_config.groups) {
                if (config_grp.id == group.id) {
                    enabled = config_grp.enabled;
                    break;
                }
            }
            
            Group db_group = group;
            db_group.enabled = enabled;
            
            auto result = database_service_->upsert_group(db_group);
            if (result.is_error()) {
                Logger::warn("Failed to upsert group {}: {}", 
                           group.id, result.error());
            }
        }
        
        // Update cache timestamp
        auto now = std::chrono::system_clock::now();
        auto timestamp_result = database_service_->set_cache_last_refresh(now);
        if (timestamp_result.is_error()) {
            Logger::warn("Failed to update cache timestamp: {}", timestamp_result.error());
        }
        
        // Reload cache
        auto reload_segments_result = database_service_->get_all_segments();
        if (reload_segments_result.is_ok()) {
            cached_segments_ = reload_segments_result.value();
        }
        
        auto reload_groups_result = database_service_->get_all_groups();
        if (reload_groups_result.is_ok()) {
            cached_groups_ = reload_groups_result.value();
        }
        
        last_cache_time_ = now;
        
        Logger::info("Cache refresh complete: {} segments, {} groups",
                    cached_segments_.size(), cached_groups_.size());
        
        emit cache_refreshed();
        return Result<void>::ok();
    });
}

Result<std::vector<Segment>> MembershipService::get_cached_segments() const {
    return Result<std::vector<Segment>>::ok(cached_segments_);
}

Result<std::vector<Group>> MembershipService::get_cached_groups() const {
    return Result<std::vector<Group>>::ok(cached_groups_);
}

std::chrono::seconds MembershipService::get_cache_age() const {
    if (last_cache_time_ == std::chrono::system_clock::time_point::min()) {
        return std::chrono::seconds(0);
    }
    
    auto now = std::chrono::system_clock::now();
    return std::chrono::duration_cast<std::chrono::seconds>(now - last_cache_time_);
}

bool MembershipService::cache_needs_refresh() const {
    auto& config = ConfigService::instance();
    auto membership_config = config.get_membership_config();
    
    auto age = get_cache_age();
    return age > std::chrono::hours(membership_config.cache_ttl_hours);
}

// Private methods

std::vector<std::string> MembershipService::match_segments(const Customer& customer) const {
    std::vector<std::string> matched;
    
    for (const auto& segment : cached_segments_) {
        if (!segment.enabled) continue;
        
        // Check if customer has this segment ID
        auto it = std::find(customer.segment_ids.begin(), 
                           customer.segment_ids.end(), 
                           segment.id);
        
        if (it != customer.segment_ids.end()) {
            matched.push_back(segment.id);
        }
    }
    
    return matched;
}

std::vector<std::string> MembershipService::match_groups(const Customer& customer) const {
    std::vector<std::string> matched;
    
    for (const auto& group : cached_groups_) {
        if (!group.enabled) continue;
        
        // Check if customer has this group ID
        auto it = std::find(customer.group_ids.begin(), 
                           customer.group_ids.end(), 
                           group.id);
        
        if (it != customer.group_ids.end()) {
            matched.push_back(group.id);
        }
    }
    
    return matched;
}
