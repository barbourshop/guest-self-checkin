#pragma once

#include <string>
#include <vector>
#include <optional>
#include <chrono>

/**
 * Customer data model representing a Square customer.
 */
struct Customer {
    // Square customer ID
    std::string id;
    
    // Name
    std::string given_name;
    std::string family_name;
    
    // Contact information
    std::optional<std::string> email_address;
    std::optional<std::string> phone_number;
    std::optional<std::string> reference_id;  // Lot number
    
    // Address (optional)
    std::optional<std::string> address_line_1;
    std::optional<std::string> locality;
    std::optional<std::string> postal_code;
    
    // Membership information
    std::vector<std::string> segment_ids;  // Square segment IDs
    std::vector<std::string> group_ids;    // Square group IDs
    
    // Cached membership display names (filled by MembershipService)
    std::vector<std::string> membership_display_names;
    
    // Cache metadata
    std::optional<std::chrono::system_clock::time_point> last_verified_at;
    
    // Helper methods
    std::string display_name() const {
        std::string name = given_name;
        if (!family_name.empty()) {
            if (!name.empty()) name += " ";
            name += family_name;
        }
        return name.empty() ? "Unknown" : name;
    }
    
    std::string first_name() const {
        return given_name.empty() ? "Guest" : given_name;
    }
    
    bool has_segment(const std::string& segment_id) const {
        return std::find(segment_ids.begin(), segment_ids.end(), segment_id) != segment_ids.end();
    }
    
    bool has_group(const std::string& group_id) const {
        return std::find(group_ids.begin(), group_ids.end(), group_id) != group_ids.end();
    }
};
