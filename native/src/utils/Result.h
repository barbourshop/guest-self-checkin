#pragma once

#include <optional>
#include <string>
#include <functional>
#include <stdexcept>

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
        Result r;
        r.is_ok_ = true;
        r.value_ = std::move(value);
        return r;
    }
    
    // Create error result
    static Result error(E error) {
        Result r;
        r.is_ok_ = false;
        r.error_ = std::move(error);
        return r;
    }
    
    // Check if result is ok
    bool is_ok() const {
        return is_ok_;
    }
    
    // Check if result is error
    bool is_error() const {
        return !is_ok_;
    }
    
    // Get value (throws if error)
    T& value() {
        if (!is_ok_) {
            throw std::runtime_error("Attempted to get value from error result");
        }
        return *value_;
    }
    
    const T& value() const {
        if (!is_ok_) {
            throw std::runtime_error("Attempted to get value from error result");
        }
        return *value_;
    }
    
    // Get error (throws if ok)
    const E& error() const {
        if (is_ok_) {
            throw std::runtime_error("Attempted to get error from ok result");
        }
        return *error_;
    }
    
    // Get value or default
    T value_or(T default_value) const {
        return is_ok_ ? *value_ : std::move(default_value);
    }
    
    // Map function over value (if ok)
    template<typename F>
    auto map(F func) -> Result<decltype(func(std::declval<T>())), E> {
        using U = decltype(func(std::declval<T>()));
        if (is_ok_) {
            return Result<U, E>::ok(func(*value_));
        } else {
            return Result<U, E>::error(*error_);
        }
    }
    
    // Monadic bind (flatMap)
    template<typename F>
    auto and_then(F func) -> decltype(func(std::declval<T>())) {
        if (is_ok_) {
            return func(*value_);
        } else {
            using ResultType = decltype(func(std::declval<T>()));
            return ResultType::error(*error_);
        }
    }
    
    // Execute function on error
    Result& or_else(std::function<void(const E&)> func) {
        if (!is_ok_) {
            func(*error_);
        }
        return *this;
    }

    // Copy constructor
    Result(const Result& other) : is_ok_(other.is_ok_) {
        if (is_ok_) {
            value_ = other.value_;
        } else {
            error_ = other.error_;
        }
    }

    // Move constructor
    Result(Result&& other) noexcept : is_ok_(other.is_ok_) {
        if (is_ok_) {
            value_ = std::move(other.value_);
        } else {
            error_ = std::move(other.error_);
        }
    }

    // Copy assignment
    Result& operator=(const Result& other) {
        if (this != &other) {
            is_ok_ = other.is_ok_;
            if (is_ok_) {
                value_ = other.value_;
                error_.reset();
            } else {
                error_ = other.error_;
                value_.reset();
            }
        }
        return *this;
    }

    // Move assignment
    Result& operator=(Result&& other) noexcept {
        if (this != &other) {
            is_ok_ = other.is_ok_;
            if (is_ok_) {
                value_ = std::move(other.value_);
                error_.reset();
            } else {
                error_ = std::move(other.error_);
                value_.reset();
            }
        }
        return *this;
    }

private:
    Result() = default;
    
    bool is_ok_;
    std::optional<T> value_;
    std::optional<E> error_;
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
