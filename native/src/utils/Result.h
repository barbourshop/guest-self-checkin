#pragma once

#include <optional>
#include <string>
#include <variant>
#include <functional>

/**
 * Result type for error handling without exceptions.
 * 
 * Usage:
 *   Result<Customer, std::string> result = get_customer(id);
 *   if (result.is_ok()) {
 *       Customer customer = result.value();
 *   } else {
 *       std::string error = result.error();
 *   }
 */
template<typename T, typename E = std::string>
class Result {
public:
    // Create successful result
    static Result ok(T value) {
        return Result(std::move(value));
    }
    
    // Create error result
    static Result error(E error) {
        return Result(std::move(error));
    }
    
    // Check if result is ok
    bool is_ok() const {
        return std::holds_alternative<T>(data_);
    }
    
    // Check if result is error
    bool is_error() const {
        return std::holds_alternative<E>(data_);
    }
    
    // Get value (throws if error)
    T& value() {
        if (is_error()) {
            throw std::runtime_error("Attempted to get value from error result");
        }
        return std::get<T>(data_);
    }
    
    const T& value() const {
        if (is_error()) {
            throw std::runtime_error("Attempted to get value from error result");
        }
        return std::get<T>(data_);
    }
    
    // Get error (throws if ok)
    const E& error() const {
        if (is_ok()) {
            throw std::runtime_error("Attempted to get error from ok result");
        }
        return std::get<E>(data_);
    }
    
    // Get value or default
    T value_or(T default_value) const {
        return is_ok() ? std::get<T>(data_) : std::move(default_value);
    }
    
    // Map function over value (if ok)
    template<typename F>
    auto map(F func) -> Result<decltype(func(std::declval<T>())), E> {
        using U = decltype(func(std::declval<T>()));
        if (is_ok()) {
            return Result<U, E>::ok(func(std::get<T>(data_)));
        } else {
            return Result<U, E>::error(std::get<E>(data_));
        }
    }
    
    // Monadic bind (flatMap)
    template<typename F>
    auto and_then(F func) -> decltype(func(std::declval<T>())) {
        if (is_ok()) {
            return func(std::get<T>(data_));
        } else {
            using ResultType = decltype(func(std::declval<T>()));
            return ResultType::error(std::get<E>(data_));
        }
    }
    
    // Execute function on error
    Result& or_else(std::function<void(const E&)> func) {
        if (is_error()) {
            func(std::get<E>(data_));
        }
        return *this;
    }

private:
    explicit Result(T value) : data_(std::move(value)) {}
    explicit Result(E error) : data_(std::move(error)) {}
    
    std::variant<T, E> data_;
};

// Specialization for void return type
template<typename E>
class Result<void, E> {
public:
    static Result ok() {
        return Result(true);
    }
    
    static Result error(E error) {
        return Result(std::move(error));
    }
    
    bool is_ok() const { return is_ok_; }
    bool is_error() const { return !is_ok_; }
    
    const E& error() const {
        if (is_ok_) {
            throw std::runtime_error("Attempted to get error from ok result");
        }
        return error_;
    }

private:
    explicit Result(bool ok) : is_ok_(ok) {}
    explicit Result(E error) : is_ok_(false), error_(std::move(error)) {}
    
    bool is_ok_;
    E error_;
};
