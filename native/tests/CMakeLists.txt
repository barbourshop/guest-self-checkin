cmake_minimum_required(VERSION 3.20)

# Find GTest and Qt Test
find_package(GTest CONFIG REQUIRED)
find_package(Qt6 REQUIRED COMPONENTS Test Core Sql Network Concurrent)

# Enable Qt Test integration
enable_testing()

# Include parent src directory
include_directories(${CMAKE_SOURCE_DIR}/src)

# Unit test executable
add_executable(unit_tests
    unit/ResultTest.cpp
    unit/DatabaseServiceTest.cpp
    unit/SquareServiceTest.cpp
    # Add more test files as they're created
)

# Link against libraries
target_link_libraries(unit_tests PRIVATE
    GTest::gtest
    GTest::gtest_main
    Qt6::Core
    Qt6::Sql
    Qt6::Test
    Qt6::Network
    Qt6::Concurrent
    # Link against main app sources (for now, include directly)
    # Later we can refactor to create a library
)

# Add source files directly (temporary until we create a library)
target_sources(unit_tests PRIVATE
    ${CMAKE_SOURCE_DIR}/src/services/DatabaseService.cpp
    ${CMAKE_SOURCE_DIR}/src/services/SquareService.cpp
    ${CMAKE_SOURCE_DIR}/src/services/MembershipService.cpp
    ${CMAKE_SOURCE_DIR}/src/services/CheckInService.cpp
    ${CMAKE_SOURCE_DIR}/src/services/ExportService.cpp
    ${CMAKE_SOURCE_DIR}/src/models/Customer.cpp
    ${CMAKE_SOURCE_DIR}/src/models/CheckIn.cpp
    ${CMAKE_SOURCE_DIR}/src/models/Segment.cpp
    ${CMAKE_SOURCE_DIR}/src/models/Group.cpp
    ${CMAKE_SOURCE_DIR}/src/utils/ConfigService.cpp
    ${CMAKE_SOURCE_DIR}/src/utils/Logger.cpp
    ${CMAKE_SOURCE_DIR}/src/utils/HttpClient.cpp
)

# Link additional dependencies
find_package(nlohmann_json CONFIG REQUIRED)
find_package(spdlog CONFIG REQUIRED)
find_package(SQLite3 REQUIRED)
find_package(unofficial-xlsxwriter CONFIG REQUIRED)

target_link_libraries(unit_tests PRIVATE
    nlohmann_json::nlohmann_json
    spdlog::spdlog
    SQLite::SQLite3
    unofficial::xlsxwriter::xlsxwriter
)

# Discover tests
include(GoogleTest)
gtest_discover_tests(unit_tests)
