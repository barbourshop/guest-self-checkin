#pragma once

#include <string>

/**
 * Square Customer Group model.
 * Groups are static collections with manually-assigned members.
 */
struct Group {
    std::string id;           // Square group ID
    std::string name;         // Group name from Square
    
    // Local configuration
    std::string display_name; // Display name in UI
    bool enabled = true;      // Whether this group counts as membership
    int sort_order = 0;       // Display order (lower = higher priority)
    
    // Helper methods
    std::string effective_display_name() const {
        return display_name.empty() ? name : display_name;
    }
};
