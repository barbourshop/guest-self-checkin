#pragma once

#include "../../src/services/SquareService.h"
#include <map>

/**
 * Mock implementation of SquareService for testing.
 * Returns predefined test data.
 */
class MockSquareService : public QObject {
    Q_OBJECT
    
public:
    explicit MockSquareService(QObject* parent = nullptr) : QObject(parent) {}
    
    // Configure mock responses
    void set_customers(const std::vector<Customer>& customers) {
        customers_ = customers;
    }
    
    void set_customer(const QString& id, const Customer& customer) {
        customer_map_[id] = customer;
    }
    
    void set_segments(const std::vector<Segment>& segments) {
        segments_ = segments;
    }
    
    void set_groups(const std::vector<Group>& groups) {
        groups_ = groups;
    }
    
    void set_error(const QString& error) {
        error_message_ = error;
        has_error_ = true;
    }
    
    void clear_error() {
        has_error_ = false;
        error_message_.clear();
    }
    
    // Mock operations
    QFuture<Result<std::vector<Customer>>> search_customers(
        const QString& query,
        const QString& type,
        bool fuzzy = true,
        int limit = 50
    ) {
        return QtConcurrent::run([this, query, type]() -> Result<std::vector<Customer>> {
            if (has_error_) {
                return Result<std::vector<Customer>>::error(error_message_.toStdString());
            }
            
            // Simple mock: filter customers by query
            std::vector<Customer> results;
            for (const auto& customer : customers_) {
                bool matches = false;
                
                if (type == "customer_id") {
                    matches = QString::fromStdString(customer.id) == query;
                } else if (type == "email") {
                    matches = QString::fromStdString(customer.email_address.value_or("")).contains(query, Qt::CaseInsensitive);
                } else if (type == "phone") {
                    matches = QString::fromStdString(customer.phone_number.value_or("")).contains(query);
                } else if (type == "lot") {
                    matches = QString::fromStdString(customer.reference_id.value_or("")) == query;
                } else if (type == "name") {
                    QString full_name = QString("%1 %2")
                        .arg(QString::fromStdString(customer.given_name))
                        .arg(QString::fromStdString(customer.family_name));
                    matches = full_name.contains(query, Qt::CaseInsensitive);
                }
                
                if (matches) {
                    results.push_back(customer);
                }
            }
            
            return Result<std::vector<Customer>>::ok(results);
        });
    }
    
    QFuture<Result<Customer>> get_customer(const QString& customer_id) {
        return QtConcurrent::run([this, customer_id]() -> Result<Customer> {
            if (has_error_) {
                return Result<Customer>::error(error_message_.toStdString());
            }
            
            auto it = customer_map_.find(customer_id);
            if (it != customer_map_.end()) {
                return Result<Customer>::ok(it->second);
            }
            
            return Result<Customer>::error("Customer not found");
        });
    }
    
    QFuture<Result<std::vector<Segment>>> list_segments() {
        return QtConcurrent::run([this]() -> Result<std::vector<Segment>> {
            if (has_error_) {
                return Result<std::vector<Segment>>::error(error_message_.toStdString());
            }
            return Result<std::vector<Segment>>::ok(segments_);
        });
    }
    
    QFuture<Result<std::vector<Group>>> list_groups() {
        return QtConcurrent::run([this]() -> Result<std::vector<Group>> {
            if (has_error_) {
                return Result<std::vector<Group>>::error(error_message_.toStdString());
            }
            return Result<std::vector<Group>>::ok(groups_);
        });
    }
    
    QFuture<Result<void>> test_connection() {
        return QtConcurrent::run([this]() -> Result<void> {
            if (has_error_) {
                return Result<void>::error(error_message_.toStdString());
            }
            return Result<void>::ok();
        });
    }
    
private:
    std::vector<Customer> customers_;
    std::map<QString, Customer> customer_map_;
    std::vector<Segment> segments_;
    std::vector<Group> groups_;
    bool has_error_{false};
    QString error_message_;
};
