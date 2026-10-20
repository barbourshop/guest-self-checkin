cmake_minimum_required(VERSION 3.20)
project(FrontDeskApp VERSION 2026.3.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

# Export compile commands for IDE integration
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

# Find Qt6 packages
find_package(Qt6 REQUIRED COMPONENTS 
    Core 
    Gui 
    Quick 
    Network 
    Sql
    Widgets
    Concurrent
)

# Find vcpkg dependencies
find_package(nlohmann_json CONFIG REQUIRED)
find_package(spdlog CONFIG REQUIRED)
find_package(SQLite3 REQUIRED)
find_package(unofficial-xlsxwriter CONFIG REQUIRED)

# Source files
set(SOURCES
    src/main.cpp
    src/services/DatabaseService.cpp
    src/models/Customer.cpp
    src/models/CheckIn.cpp
    src/models/Segment.cpp
    src/models/Group.cpp
    src/utils/ConfigService.cpp
    src/utils/Logger.cpp
    src/utils/HttpClient.cpp
    src/services/SquareService.cpp
    src/services/MembershipService.cpp
    src/services/CheckInService.cpp
    src/services/ExportService.cpp
    src/services/GoogleSheetsService.cpp
    src/services/SecureStorage.cpp
    src/utils/OAuth2Flow.cpp
    src/viewmodels/CheckInViewModel.cpp
    src/viewmodels/AdminViewModel.cpp
    # TODO: Add as they're implemented
    # src/app/Application.cpp
    # src/app/AppSettings.cpp
    # src/viewmodels/CheckInViewModel.cpp
    # src/viewmodels/AdminViewModel.cpp
    # src/viewmodels/SetupViewModel.cpp
    # src/utils/OAuth2Flow.cpp
)

set(HEADERS
    src/services/DatabaseService.h
    src/models/Customer.h
    src/models/CheckIn.h
    src/models/Segment.h
    src/models/Group.h
    src/models/MembershipStatus.h
    src/utils/ConfigService.h
    src/utils/Logger.h
    src/utils/Result.h
    src/utils/HttpClient.h
    src/services/SquareService.h
    src/services/MembershipService.h
    src/services/CheckInService.h
    src/services/ExportService.h
    src/services/GoogleSheetsService.h
    src/services/SecureStorage.h
    src/utils/OAuth2Flow.h
    src/viewmodels/BaseViewModel.h
    src/viewmodels/CheckInViewModel.h
    src/viewmodels/AdminViewModel.h
    # TODO: Add as they're implemented
    # src/app/Application.h
    # src/app/AppSettings.h
    # src/viewmodels/CheckInViewModel.h
    # src/viewmodels/AdminViewModel.h
    # src/viewmodels/SetupViewModel.h
    # src/viewmodels/BaseViewModel.h
    # src/utils/OAuth2Flow.h
)

# QML resources
qt_add_qml_module(FrontDeskApp
    URI com.frontdesk.app
    VERSION 1.0
    QML_FILES
        src/ui/main.qml
        src/ui/views/CheckInView.qml
        src/ui/views/DayPassView.qml
        src/ui/views/AdminView.qml
        src/ui/views/SetupWizard.qml
        src/ui/components/CustomerCard.qml
        src/ui/components/MembershipBadge.qml
        src/ui/components/SyncStatusIndicator.qml
        src/ui/dialogs/ErrorDialog.qml
        src/ui/dialogs/ConfirmDialog.qml
        src/ui/styles/AppTheme.qml
    SOURCES
        ${SOURCES}
        ${HEADERS}
)

target_link_libraries(FrontDeskApp PRIVATE
    Qt6::Core
    Qt6::Gui
    Qt6::Quick
    Qt6::Network
    Qt6::Sql
    Qt6::Widgets
    Qt6::Concurrent
    nlohmann_json::nlohmann_json
    spdlog::spdlog
    SQLite::SQLite3
    unofficial::xlsxwriter::xlsxwriter
)

# Platform-specific settings
if(WIN32)
    set_target_properties(FrontDeskApp PROPERTIES
        WIN32_EXECUTABLE TRUE
    )
    # Windows-specific libraries
    target_link_libraries(FrontDeskApp PRIVATE crypt32)
endif()

if(APPLE)
    set_target_properties(FrontDeskApp PROPERTIES
        MACOSX_BUNDLE TRUE
    )
    # macOS-specific frameworks
    target_link_libraries(FrontDeskApp PRIVATE
        "-framework Security"
    )
endif()

# Install
install(TARGETS FrontDeskApp
    BUNDLE DESTINATION .
    RUNTIME DESTINATION bin
)

# Qt deployment helper
if(QT_VERSION_MAJOR EQUAL 6)
    qt_generate_deploy_app_script(
        TARGET FrontDeskApp
        OUTPUT_SCRIPT deploy_script
        NO_UNSUPPORTED_PLATFORM_ERROR
    )
    install(SCRIPT ${deploy_script})
endif()

# Testing
enable_testing()
add_subdirectory(tests)
