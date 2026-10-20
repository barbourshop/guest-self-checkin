#pragma once

#include <string>
#include <vector>
#include "Segment.h"
#include "Group.h"

/**
 * Membership status result with OR logic.
 * Customer is a member if they match ANY enabled segment OR group.
 */
struct MembershipStatus {
    bool is_member = false;
    
    // Individual membership types matched
    struct Membership {
        enum class Type {
            Segment,
            Group
        };
        
        Type type;
        std::string id;           // segment_id or group_id
        std::string display_name;
        int sort_order;
        
        bool operator<(const Membership& other) const {
            return sort_order < other.sort_order;
        }
    };
    
    std::vector<Membership> memberships;  // All matching memberships (sorted by sort_order)
    
    // Helper methods
    std::string primary_membership() const {
        if (memberships.empty()) {
            return "Non-Member";
        }
        return memberships.front().display_name;
    }
    
    std::vector<std::string> all_display_names() const {
        std::vector<std::string> names;
        names.reserve(memberships.size());
        for (const auto& m : memberships) {
            names.push_back(m.display_name);
        }
        return names;
    }
    
    std::string display_names_string() const {
        auto names = all_display_names();
        std::string result;
        for (size_t i = 0; i < names.size(); ++i) {
            if (i > 0) result += ", ";
            result += names[i];
        }
        return result.empty() ? "Non-Member" : result;
    }
    
    bool has_segment(const std::string& segment_id) const {
        for (const auto& m : memberships) {
            if (m.type == Membership::Type::Segment && m.id == segment_id) {
                return true;
            }
        }
        return false;
    }
    
    bool has_group(const std::string& group_id) const {
        for (const auto& m : memberships) {
            if (m.type == Membership::Type::Group && m.id == group_id) {
                return true;
            }
        }
        return false;
    }
    
    size_t membership_count() const {
        return memberships.size();
    }
};
