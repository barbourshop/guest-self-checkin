#include "SquareService.h"
#include "../utils/Logger.h"
#include <QPromise>
#include <QtConcurrent>
#include <QRegularExpression>

SquareService::SquareService(const Config& config, QObject* parent)
    : QObject(parent)
    , config_(config)
{
    // Create HTTP client
    HttpClient::Config http_config;
    http_config.base_url = QUrl(config_.api_url);
    http_config.timeout = config_.timeout;
    http_config.retry_attempts = config_.retry_attempts;
    
    // Set default headers
    http_config.default_headers["Square-Version"] = config_.api_version;
    http_config.default_headers["Authorization"] = "Bearer " + config_.access_token;
    http_config.default_headers["Content-Type"] = "application/json";
    
    http_client_ = std::make_shared<HttpClient>(http_config, this);
    
    Logger::info("SquareService initialized with API version {}", 
                 config_.api_version.toStdString());
}

SquareService::~SquareService() {
    Logger::info("SquareService destroyed");
}

QFuture<Result<std::vector<Customer>>> SquareService::search_customers(
    const QString& query,
    const QString& type,
    bool fuzzy,
    int limit
) {
    return QtConcurrent::run([this, query, type, fuzzy, limit]() -> Result<std::vector<Customer>> {
        json search_body = build_search_query(query, type, fuzzy);
        search_body["limit"] = limit;
        
        Logger::debug("Searching customers: type={}, query={}, fuzzy={}",
                     type.toStdString(), query.toStdString(), fuzzy);
        
        auto future = http_client_->post("/customers/search", search_body);
        future.waitForFinished();
        auto result = future.result();
        
        if (result.is_error()) {
            return Result<std::vector<Customer>>::error(result.error());
        }
        
        auto response = result.value();
        std::vector<Customer> customers;
        
        if (response.contains("customers") && response["customers"].is_array()) {
            for (const auto& customer_json : response["customers"]) {
                customers.push_back(parse_customer(customer_json));
            }
        }
        
        Logger::info("Found {} customers", customers.size());
        return Result<std::vector<Customer>>::ok(customers);
    });
}

QFuture<Result<Customer>> SquareService::get_customer(const QString& customer_id) {
    return QtConcurrent::run([this, customer_id]() -> Result<Customer> {
        QString path = QString("/customers/%1").arg(customer_id);
        
        Logger::debug("Getting customer: {}", customer_id.toStdString());
        
        auto future = http_client_->get(path);
        future.waitForFinished();
        auto result = future.result();
        
        if (result.is_error()) {
            return Result<Customer>::error(result.error());
        }
        
        auto response = result.value();
        
        if (!response.contains("customer")) {
            return Result<Customer>::error("No customer in response");
        }
        
        Customer customer = parse_customer(response["customer"]);
        Logger::info("Retrieved customer: {}", customer.display_name());
        
        return Result<Customer>::ok(customer);
    });
}

QFuture<Result<std::vector<Customer>>> SquareService::get_customers_by_ids(
    const std::vector<QString>& customer_ids
) {
    return QtConcurrent::run([this, customer_ids]() -> Result<std::vector<Customer>> {
        std::vector<Customer> customers;
        
        for (const auto& customer_id : customer_ids) {
            auto future = get_customer(customer_id);
            future.waitForFinished();
            auto result = future.result();
            
            if (result.is_ok()) {
                customers.push_back(result.value());
            } else {
                Logger::warn("Failed to get customer {}: {}",
                           customer_id.toStdString(), result.error());
            }
        }
        
        return Result<std::vector<Customer>>::ok(customers);
    });
}

QFuture<Result<std::vector<Segment>>> SquareService::list_segments() {
    return QtConcurrent::run([this]() -> Result<std::vector<Segment>> {
        Logger::debug("Listing customer segments");
        
        auto future = http_client_->get("/customers/segments");
        future.waitForFinished();
        auto result = future.result();
        
        if (result.is_error()) {
            return Result<std::vector<Segment>>::error(result.error());
        }
        
        auto response = result.value();
        std::vector<Segment> segments;
        
        if (response.contains("segments") && response["segments"].is_array()) {
            for (const auto& segment_json : response["segments"]) {
                segments.push_back(parse_segment(segment_json));
            }
        }
        
        Logger::info("Found {} segments", segments.size());
        return Result<std::vector<Segment>>::ok(segments);
    });
}

QFuture<Result<std::vector<Customer>>> SquareService::get_segment_members(
    const QString& segment_id,
    int limit
) {
    return QtConcurrent::run([this, segment_id, limit]() -> Result<std::vector<Customer>> {
        json search_body;
        search_body["query"]["filter"]["segment_ids"]["any"] = json::array({segment_id.toStdString()});
        search_body["limit"] = limit;
        
        Logger::debug("Getting members of segment: {}", segment_id.toStdString());
        
        auto future = http_client_->post("/customers/search", search_body);
        future.waitForFinished();
        auto result = future.result();
        
        if (result.is_error()) {
            return Result<std::vector<Customer>>::error(result.error());
        }
        
        auto response = result.value();
        std::vector<Customer> customers;
        
        if (response.contains("customers") && response["customers"].is_array()) {
            for (const auto& customer_json : response["customers"]) {
                customers.push_back(parse_customer(customer_json));
            }
        }
        
        Logger::info("Found {} members in segment {}", customers.size(), segment_id.toStdString());
        return Result<std::vector<Customer>>::ok(customers);
    });
}

QFuture<Result<std::vector<Group>>> SquareService::list_groups() {
    return QtConcurrent::run([this]() -> Result<std::vector<Group>> {
        Logger::debug("Listing customer groups");
        
        auto future = http_client_->get("/customers/groups");
        future.waitForFinished();
        auto result = future.result();
        
        if (result.is_error()) {
            return Result<std::vector<Group>>::error(result.error());
        }
        
        auto response = result.value();
        std::vector<Group> groups;
        
        if (response.contains("groups") && response["groups"].is_array()) {
            for (const auto& group_json : response["groups"]) {
                groups.push_back(parse_group(group_json));
            }
        }
        
        Logger::info("Found {} groups", groups.size());
        return Result<std::vector<Group>>::ok(groups);
    });
}

QFuture<Result<std::vector<QString>>> SquareService::get_group_member_ids(
    const QString& group_id,
    int limit
) {
    return QtConcurrent::run([this, group_id, limit]() -> Result<std::vector<QString>> {
        json search_body;
        search_body["query"]["filter"]["group_ids"]["any"] = json::array({group_id.toStdString()});
        search_body["limit"] = limit;
        
        Logger::debug("Getting members of group: {}", group_id.toStdString());
        
        auto future = http_client_->post("/customers/search", search_body);
        future.waitForFinished();
        auto result = future.result();
        
        if (result.is_error()) {
            return Result<std::vector<QString>>::error(result.error());
        }
        
        auto response = result.value();
        std::vector<QString> customer_ids;
        
        if (response.contains("customers") && response["customers"].is_array()) {
            for (const auto& customer_json : response["customers"]) {
                if (customer_json.contains("id")) {
                    customer_ids.push_back(QString::fromStdString(customer_json["id"]));
                }
            }
        }
        
        Logger::info("Found {} members in group {}", customer_ids.size(), group_id.toStdString());
        return Result<std::vector<QString>>::ok(customer_ids);
    });
}

QFuture<Result<void>> SquareService::test_connection() {
    return QtConcurrent::run([this]() -> Result<void> {
        Logger::info("Testing Square API connection");
        
        // Try to list segments as a simple test
        auto future = http_client_->get("/customers/segments");
        future.waitForFinished();
        auto result = future.result();
        
        if (result.is_error()) {
            Logger::error("Square API connection test failed: {}", result.error());
            return Result<void>::error(result.error());
        }
        
        Logger::info("Square API connection test successful");
        return Result<void>::ok();
    });
}

void SquareService::set_access_token(const QString& token) {
    config_.access_token = token;
    http_client_->set_default_header("Authorization", "Bearer " + token);
    Logger::info("Square access token updated");
}

// Private helper methods

json SquareService::build_search_query(const QString& query, const QString& type, bool fuzzy) {
    json search_body;
    
    if (type == "customer_id") {
        // Direct customer ID search
        search_body["query"]["filter"]["customer_ids"] = json::array({query.toStdString()});
    } else if (type == "email") {
        if (fuzzy) {
            search_body["query"]["filter"]["email_address"]["fuzzy"] = query.toStdString();
        } else {
            search_body["query"]["filter"]["email_address"]["exact"] = query.toStdString();
        }
    } else if (type == "phone") {
        // Phone numbers: remove non-digits for search
        QString digits_only = query;
        digits_only.remove(QRegularExpression("[^0-9]"));
        
        if (fuzzy) {
            search_body["query"]["filter"]["phone_number"]["fuzzy"] = digits_only.toStdString();
        } else {
            search_body["query"]["filter"]["phone_number"]["exact"] = digits_only.toStdString();
        }
    } else if (type == "lot" || type == "reference_id") {
        // Lot number stored in reference_id
        if (fuzzy) {
            search_body["query"]["filter"]["reference_id"]["fuzzy"] = query.toStdString();
        } else {
            search_body["query"]["filter"]["reference_id"]["exact"] = query.toStdString();
        }
    } else if (type == "name") {
        // Name search - search both given_name and family_name
        if (fuzzy) {
            search_body["query"]["filter"]["given_name"]["fuzzy"] = query.toStdString();
        } else {
            search_body["query"]["filter"]["given_name"]["exact"] = query.toStdString();
        }
    } else if (type == "address") {
        // Address search
        if (fuzzy) {
            search_body["query"]["filter"]["address"]["fuzzy"] = query.toStdString();
        } else {
            search_body["query"]["filter"]["address"]["exact"] = query.toStdString();
        }
    }
    
    return search_body;
}

Customer SquareService::parse_customer(const json& customer_json) {
    Customer customer;
    
    customer.id = customer_json.value("id", "");
    customer.given_name = customer_json.value("given_name", "");
    customer.family_name = customer_json.value("family_name", "");
    
    if (customer_json.contains("email_address")) {
        customer.email_address = customer_json["email_address"];
    }
    
    if (customer_json.contains("phone_number")) {
        customer.phone_number = customer_json["phone_number"];
    }
    
    if (customer_json.contains("reference_id")) {
        customer.reference_id = customer_json["reference_id"];
    }
    
    // Parse address
    if (customer_json.contains("address")) {
        const auto& addr = customer_json["address"];
        if (addr.contains("address_line_1")) {
            customer.address_line_1 = addr["address_line_1"];
        }
        if (addr.contains("locality")) {
            customer.locality = addr["locality"];
        }
        if (addr.contains("postal_code")) {
            customer.postal_code = addr["postal_code"];
        }
    }
    
    // Parse segment IDs
    if (customer_json.contains("segment_ids") && customer_json["segment_ids"].is_array()) {
        for (const auto& seg_id : customer_json["segment_ids"]) {
            if (seg_id.is_string()) {
                customer.segment_ids.push_back(seg_id.get<std::string>());
            }
        }
    }
    
    // Parse group IDs
    if (customer_json.contains("group_ids") && customer_json["group_ids"].is_array()) {
        for (const auto& grp_id : customer_json["group_ids"]) {
            if (grp_id.is_string()) {
                customer.group_ids.push_back(grp_id.get<std::string>());
            }
        }
    }
    
    customer.last_verified_at = std::chrono::system_clock::now();
    
    return customer;
}

Segment SquareService::parse_segment(const json& segment_json) {
    Segment segment;
    
    segment.id = segment_json.value("id", "");
    segment.name = segment_json.value("name", "");
    segment.display_name = segment.name;  // Use Square name as default
    segment.enabled = true;  // Default to enabled
    segment.sort_order = 0;
    
    return segment;
}

Group SquareService::parse_group(const json& group_json) {
    Group group;
    
    group.id = group_json.value("id", "");
    group.name = group_json.value("name", "");
    group.display_name = group.name;  // Use Square name as default
    group.enabled = true;  // Default to enabled
    group.sort_order = 0;
    
    return group;
}
