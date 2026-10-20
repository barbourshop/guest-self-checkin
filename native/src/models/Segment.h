#pragma once

#include <string>

/**
 * Square Customer Segment model.
 * Segments are dynamic smart filters based on customer attributes.
 */
struct Segment {
    std::string id;           // Square segment ID
    std::string name;         // Segment name from Square
    
    // Local configuration
    std::string display_name; // Display name in UI
    bool enabled = true;      // Whether this segment counts as membership
    int sort_order = 0;       // Display order (lower = higher priority)
    
    // Helper methods
    std::string effective_display_name() const {
        return display_name.empty() ? name : display_name;
    }
};
