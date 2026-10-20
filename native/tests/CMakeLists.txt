cmake_minimum_required(VERSION 3.20)

# Find GTest
find_package(GTest CONFIG REQUIRED)
find_package(Qt6 REQUIRED COMPONENTS Test)

# Enable Qt Test integration
enable_testing()

# Unit test executable
add_executable(unit_tests
    unit/ConfigServiceTest.cpp
    unit/LoggerTest.cpp
    unit/ResultTest.cpp
)

target_link_libraries(unit_tests PRIVATE
    GTest::gtest
    GTest::gtest_main
    Qt6::Test
    # Link against main app library (would need to refactor main app as library)
)

target_include_directories(unit_tests PRIVATE
    ${CMAKE_SOURCE_DIR}/src
)

# Discover tests
include(GoogleTest)
gtest_discover_tests(unit_tests)

# Qt Test
qt_add_test(qt_tests
    qt_test_main.cpp
)

target_link_libraries(qt_tests PRIVATE
    Qt6::Test
)
