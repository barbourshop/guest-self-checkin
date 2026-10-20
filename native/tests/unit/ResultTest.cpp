#include <gtest/gtest.h>
#include "utils/Result.h"

TEST(ResultTest, OkValue) {
    auto result = Result<int, std::string>::ok(42);
    
    EXPECT_TRUE(result.is_ok());
    EXPECT_FALSE(result.is_error());
    EXPECT_EQ(result.value(), 42);
}

TEST(ResultTest, ErrorValue) {
    auto result = Result<int, std::string>::error("something went wrong");
    
    EXPECT_FALSE(result.is_ok());
    EXPECT_TRUE(result.is_error());
    EXPECT_EQ(result.error(), "something went wrong");
}

TEST(ResultTest, ValueOr) {
    auto ok_result = Result<int, std::string>::ok(42);
    auto error_result = Result<int, std::string>::error("error");
    
    EXPECT_EQ(ok_result.value_or(100), 42);
    EXPECT_EQ(error_result.value_or(100), 100);
}

TEST(ResultTest, Map) {
    auto result = Result<int, std::string>::ok(21);
    auto mapped = result.map([](int x) { return x * 2; });
    
    EXPECT_TRUE(mapped.is_ok());
    EXPECT_EQ(mapped.value(), 42);
}

TEST(ResultTest, MapOnError) {
    auto result = Result<int, std::string>::error("error");
    auto mapped = result.map([](int x) { return x * 2; });
    
    EXPECT_TRUE(mapped.is_error());
    EXPECT_EQ(mapped.error(), "error");
}

TEST(ResultTest, AndThen) {
    auto result = Result<int, std::string>::ok(21);
    auto chained = result.and_then([](int x) {
        return Result<std::string, std::string>::ok(std::to_string(x * 2));
    });
    
    EXPECT_TRUE(chained.is_ok());
    EXPECT_EQ(chained.value(), "42");
}

TEST(ResultTest, AndThenOnError) {
    auto result = Result<int, std::string>::error("original error");
    auto chained = result.and_then([](int x) {
        return Result<std::string, std::string>::ok(std::to_string(x * 2));
    });
    
    EXPECT_TRUE(chained.is_error());
    EXPECT_EQ(chained.error(), "original error");
}

TEST(ResultTest, VoidResult) {
    auto ok_result = Result<void, std::string>::ok();
    auto error_result = Result<void, std::string>::error("failed");
    
    EXPECT_TRUE(ok_result.is_ok());
    EXPECT_FALSE(ok_result.is_error());
    
    EXPECT_FALSE(error_result.is_ok());
    EXPECT_TRUE(error_result.is_error());
    EXPECT_EQ(error_result.error(), "failed");
}
