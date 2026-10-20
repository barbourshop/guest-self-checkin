#pragma once

#include <string>
#include <chrono>
#include <optional>

/**
 * Check-in record model.
 */
struct CheckIn {
    // Database ID (0 if not yet persisted)
    int id = 0;
    
    // Customer information
    std::string customer_id;  // Square customer ID (or "daypass" for anonymous)
    
    // Check-in details
    int guest_count = 1;
    std::chrono::system_clock::time_point timestamp;
    std::string checkin_type;  // "member" or "daypass"
    
    // Square sync (for future use if syncing back to Square)
    std::optional<std::string> order_id;
    bool synced_to_square = false;
    
    // Customer details (denormalized for easy querying)
    std::optional<std::string> customer_name;
    std::optional<std::string> email_address;
    std::optional<std::string> phone_number;
    std::optional<std::string> lot_number;
    std::vector<std::string> membership_types;  // Display names
    
    // Device/location tracking
    std::optional<std::string> location_id;  // Computer name
    
    // Helper methods
    bool is_member_checkin() const {
        return checkin_type == "member";
    }
    
    bool is_daypass_checkin() const {
        return checkin_type == "daypass";
    }
    
    std::string membership_types_string() const {
        std::string result;
        for (size_t i = 0; i < membership_types.size(); ++i) {
            if (i > 0) result += ", ";
            result += membership_types[i];
        }
        return result.empty() ? "Day Pass" : result;
    }
};
