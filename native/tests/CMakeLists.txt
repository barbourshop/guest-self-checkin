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

# Compile definitions
target_compile_definitions(unit_tests PRIVATE
    SPDLOG_FMT_EXTERNAL
    SPDLOG_COMPILED_LIB
    FMT_ENFORCE_COMPILE_STRING=0
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
    ${CMAKE_SOURCE_DIR}/src/services/GoogleSheetsService.cpp
    ${CMAKE_SOURCE_DIR}/src/services/SecureStorage.cpp
    ${CMAKE_SOURCE_DIR}/src/models/Customer.cpp
    ${CMAKE_SOURCE_DIR}/src/models/CheckIn.cpp
    ${CMAKE_SOURCE_DIR}/src/models/Segment.cpp
    ${CMAKE_SOURCE_DIR}/src/models/Group.cpp
    ${CMAKE_SOURCE_DIR}/src/utils/ConfigService.cpp
    ${CMAKE_SOURCE_DIR}/src/utils/Logger.cpp
    ${CMAKE_SOURCE_DIR}/src/utils/HttpClient.cpp
    ${CMAKE_SOURCE_DIR}/src/utils/OAuth2Flow.cpp
)

# Link additional dependencies
find_package(nlohmann_json CONFIG REQUIRED)
find_package(spdlog CONFIG REQUIRED)
find_package(SQLite3 REQUIRED)

# libxlsxwriter - should already be found by parent CMakeLists.txt
# If not found, try to find it here
if(NOT TARGET xlsxwriter::xlsxwriter AND NOT TARGET PkgConfig::xlsxwriter)
    find_package(xlsxwriter CONFIG QUIET)
    if(NOT xlsxwriter_FOUND)
        find_package(PkgConfig)
        if(PKG_CONFIG_FOUND)
            pkg_check_modules(xlsxwriter REQUIRED IMPORTED_TARGET xlsxwriter)
        else()
            # On Windows/vcpkg, find the library manually
            find_path(XLSXWRITER_INCLUDE_DIR xlsxwriter.h PATH_SUFFIXES include)
            find_library(XLSXWRITER_LIBRARY NAMES xlsxwriter libxlsxwriter)
            if(XLSXWRITER_INCLUDE_DIR AND XLSXWRITER_LIBRARY)
                add_library(xlsxwriter::xlsxwriter UNKNOWN IMPORTED)
                set_target_properties(xlsxwriter::xlsxwriter PROPERTIES
                    IMPORTED_LOCATION "${XLSXWRITER_LIBRARY}"
                    INTERFACE_INCLUDE_DIRECTORIES "${XLSXWRITER_INCLUDE_DIR}"
                )
                set(xlsxwriter_FOUND TRUE)
            endif()
        endif()
    endif()
endif()

target_link_libraries(unit_tests PRIVATE
    nlohmann_json::nlohmann_json
    spdlog::spdlog
    SQLite::SQLite3
)

# Link xlsxwriter - different target names depending on how it was found
if(TARGET xlsxwriter::xlsxwriter)
    target_link_libraries(unit_tests PRIVATE xlsxwriter::xlsxwriter)
elseif(TARGET PkgConfig::xlsxwriter)
    target_link_libraries(unit_tests PRIVATE PkgConfig::xlsxwriter)
else()
    message(WARNING "xlsxwriter library not found for tests - some tests may fail")
endif()

# Platform-specific settings
if(APPLE)
    # Downgrade spdlog consteval errors to warnings on macOS
    target_compile_options(unit_tests PRIVATE
        -Wno-error
        -ferror-limit=0
    )
endif()

# Discover tests
include(GoogleTest)
gtest_discover_tests(unit_tests)
