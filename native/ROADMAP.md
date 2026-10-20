# Native Qt App Development Roadmap

## Project Status: ✅ Phase 1 - Foundation Complete

### What's Been Built

#### 1. Project Structure ✅
```
native/
├── CMakeLists.txt          ✅ Complete build configuration
├── vcpkg.json              ✅ Dependency manifest
├── config/
│   └── config.template.json ✅ Full configuration template
├── src/
│   ├── main.cpp            ✅ Application entry point
│   ├── models/             ✅ All data models complete
│   │   ├── Customer.h
│   │   ├── CheckIn.h
│   │   ├── Segment.h
│   │   ├── Group.h
│   │   └── MembershipStatus.h
│   └── utils/              ✅ Core utilities complete
│       ├── Result.h        ✅ Error handling type
│       ├── Logger.h/cpp    ✅ spdlog wrapper
│       └── ConfigService.h/cpp ✅ Full JSON config management
└── tests/                  ✅ Test infrastructure set up
    └── unit/
        └── ResultTest.cpp  ✅ Sample test
```

#### 2. Core Features Implemented ✅

**Configuration System:**
- ✅ JSON-based external configuration
- ✅ Support for all required settings (Square, Membership, Cloud Sync, etc.)
- ✅ Hot reload capability
- ✅ Validation and error reporting
- ✅ Platform-specific paths (AppData on Windows, Application Support on macOS)

**Data Models:**
- ✅ Customer with segments and groups
- ✅ CheckIn with denormalized data for reports
- ✅ Segment and Group configurations
- ✅ MembershipStatus with OR logic support

**Utilities:**
- ✅ Result<T, E> type for error handling without exceptions
- ✅ Logger with file rotation via spdlog
- ✅ ConfigService with type-safe accessors

**Build System:**
- ✅ CMake with Qt 6 integration
- ✅ vcpkg dependency management
- ✅ Cross-platform support (macOS → Windows)
- ✅ Test framework integration (GTest)

#### 3. Design Decisions Made ✅

**Membership Logic:**
- OR logic: Customer is member if in ANY enabled segment OR group
- Multiple memberships displayed as badges
- Sort order determines display priority

**Google Sheets Privacy:**
- Customer ID IS included (for account linking)
- Configurable field inclusion
- Defaults exclude email/phone but include lot number

**Architecture:**
- Qt 6 with QML for cross-platform UI
- C++20 with modern features
- MVVM pattern (ViewModels bridge C++ ↔ QML)
- Result type for error handling
- Service layer for business logic

## Phase 2: Services Layer (Current Priority)

### 2.1 Database Service 🔄

**Files to Create:**
- `src/services/DatabaseService.h`
- `src/services/DatabaseService.cpp`
- `tests/unit/DatabaseServiceTest.cpp`

**Implementation Tasks:**
```cpp
class DatabaseService {
public:
    // Connection management
    Result<void> initialize(const std::string& db_path);
    Result<void> close();
    
    // Schema management
    Result<void> create_tables();
    Result<void> migrate(int from_version, int to_version);
    
    // Check-in operations
    Result<int> create_checkin(const CheckIn& checkin);
    Result<std::vector<CheckIn>> get_checkins_for_date(const date& date);
    Result<std::vector<CheckIn>> get_all_checkins(const std::optional<std::string>& filter);
    
    // Cache operations
    Result<void> upsert_cached_member(const Customer& customer);
    Result<void> clear_cache();
    Result<std::vector<Customer>> get_cached_members();
    
    // Segment/Group operations
    Result<void> upsert_segment(const Segment& segment);
    Result<void> delete_segment(const std::string& segment_id);
    Result<std::vector<Segment>> get_segments();
    Result<void> upsert_group(const Group& group);
    Result<void> delete_group(const std::string& group_id);
    Result<std::vector<Group>> get_groups();
    
    // Transaction support
    class Transaction;
    Result<Transaction> begin_transaction();
    
    // Maintenance
    Result<void> vacuum();
    Result<void> backup(const std::filesystem::path& backup_path);
};
```

**Database Schema:**
```sql
-- Port from src/server/db/schema.sql
CREATE TABLE customer_segments (...)
CREATE TABLE customer_groups (...)
CREATE TABLE membership_cache (...)
CREATE TABLE checkin_log (...)
CREATE TABLE checkin_queue (...)
CREATE TABLE app_config (...)
```

### 2.2 HTTP Client & Square Service 🔄

**Files to Create:**
- `src/utils/HttpClient.h/cpp`
- `src/services/SquareService.h/cpp`
- `tests/unit/SquareServiceTest.cpp`
- `tests/mocks/MockSquareService.h/cpp`

**HttpClient Implementation:**
```cpp
class HttpClient {
public:
    HttpClient(const std::string& base_url,
               const std::map<std::string, std::string>& headers);
    
    // Async operations with Qt Network
    QFuture<Result<json>> get(const std::string& path);
    QFuture<Result<json>> post(const std::string& path, const json& body);
    QFuture<Result<json>> put(const std::string& path, const json& body);
    
private:
    QNetworkAccessManager* manager_;
    // Retry logic, timeout handling
};
```

**SquareService Implementation:**
```cpp
class SquareService {
public:
    // Customer operations
    QFuture<Result<std::vector<Customer>>> search_customers(
        const std::string& query,
        const std::string& type  // "email", "phone", "lot", "name", "customer_id"
    );
    
    QFuture<Result<Customer>> get_customer(const std::string& customer_id);
    
    // Segment operations  
    QFuture<Result<std::vector<Segment>>> list_segments();
    QFuture<Result<std::vector<std::string>>> get_customer_segments(const std::string& customer_id);
    
    // Group operations (NEW)
    QFuture<Result<std::vector<Group>>> list_groups();
    QFuture<Result<std::vector<std::string>>> get_customer_groups(const std::string& customer_id);
};
```

### 2.3 Membership Service 🔄

**Files to Create:**
- `src/services/MembershipService.h/cpp`
- `tests/unit/MembershipServiceTest.cpp`

**Implementation:**
```cpp
class MembershipService {
public:
    // Check membership with OR logic
    QFuture<Result<MembershipStatus>> check_membership(const std::string& customer_id);
    
    // Refresh cache from Square
    QFuture<Result<void>> refresh_cache(ProgressCallback callback);
    
    // Cache statistics
    struct CacheStats {
        int total_customers;
        std::chrono::system_clock::time_point last_refresh;
        std::chrono::hours age;
        bool is_stale;
        bool is_empty;
    };
    CacheStats get_stats() const;
};
```

### 2.4 Check-In Service 🔄

**Files to Create:**
- `src/services/CheckInService.h/cpp`
- `tests/unit/CheckInServiceTest.cpp`

**Implementation:**
```cpp
class CheckInService {
public:
    // Record check-in
    Result<int> record_checkin(const Customer& customer, int guest_count);
    Result<int> record_daypass_checkin(int guest_count);
    
    // Daily backup
    Result<void> create_daily_backup();
};
```

### 2.5 Google Sheets Service 🔄

**Files to Create:**
- `src/services/GoogleSheetsService.h/cpp`
- `src/utils/OAuth2Flow.h/cpp`
- `tests/unit/GoogleSheetsServiceTest.cpp`

**Implementation:**
```cpp
class GoogleSheetsService {
public:
    struct AnonymizedCheckIn {
        std::chrono::system_clock::time_point timestamp;
        std::string customer_id;      // INCLUDED for account linking
        std::string display_name;
        std::optional<std::string> lot_number;
        std::vector<std::string> membership_types;
        int guest_count;
        std::string checkin_type;
        std::string location_id;
    };
    
    // OAuth2 authorization
    QFuture<Result<void>> authorize();
    bool is_authorized() const;
    void revoke_authorization();
    
    // Sync operations
    QFuture<Result<void>> sync_checkin(const AnonymizedCheckIn& checkin);
    QFuture<Result<int>> sync_batch(const std::vector<AnonymizedCheckIn>& checkins);
    
    // Status
    struct SyncStatus {
        int pending_count;
        std::chrono::system_clock::time_point last_sync;
        bool is_syncing;
        std::optional<std::string> last_error;
    };
    SyncStatus get_status() const;
};
```

### 2.6 Export Service 🔄

**Files to Create:**
- `src/services/ExportService.h/cpp`
- `tests/unit/ExportServiceTest.cpp`

**Implementation:**
```cpp
class ExportService {
public:
    Result<std::string> export_daily_checkins(const std::filesystem::path& output_path);
    Result<std::string> export_full_history(const std::filesystem::path& output_path,
                                             const std::optional<std::string>& filter);
};
```

## Phase 3: UI Layer (QML) 📋

### 3.1 ViewModels

**Files to Create:**
- `src/viewmodels/BaseViewModel.h`
- `src/viewmodels/CheckInViewModel.h/cpp`
- `src/viewmodels/AdminViewModel.h/cpp`
- `src/viewmodels/SetupViewModel.h/cpp`

### 3.2 QML Views

**Files to Create:**
- `src/ui/main.qml` - Main window with navigation
- `src/ui/views/CheckInView.qml` - Search & check-in
- `src/ui/views/DayPassView.qml` - Day pass flow
- `src/ui/views/AdminView.qml` - Admin dashboard (tabs)
- `src/ui/views/SetupWizard.qml` - First-run setup

### 3.3 QML Components

**Files to Create:**
- `src/ui/components/CustomerCard.qml` - Result card with multiple badges
- `src/ui/components/MembershipBadge.qml` - Single badge
- `src/ui/components/SyncStatusIndicator.qml` - Cloud sync status
- `src/ui/dialogs/ErrorDialog.qml`
- `src/ui/dialogs/ConfirmDialog.qml`

### 3.4 Styling

**Files to Create:**
- `src/ui/styles/AppTheme.qml` - Colors, fonts, spacing

## Phase 4: Testing & Polish 📋

### 4.1 Unit Tests
- Complete all service tests
- Mock Square API
- Database tests with in-memory SQLite

### 4.2 Integration Tests
- End-to-end check-in flow
- Cache refresh
- Google Sheets sync
- Excel export

### 4.3 Performance Testing
- Startup time measurement
- Memory usage profiling
- Search performance

## Phase 5: Deployment 📋

### 5.1 Windows Installer
- NSIS or WiX script
- Bundle Qt dependencies
- Desktop/Start Menu shortcuts

### 5.2 Documentation
- User guide (replace ADMIN_GUIDE.md)
- IT installation guide
- Configuration reference

### 5.3 CI/CD
- GitHub Actions for Windows builds
- Automated testing
- Release packaging

## Development Workflow

### On Mac (Daily Development)

```bash
cd native

# Configure (first time)
cmake -B build \
    -DCMAKE_PREFIX_PATH=/opt/homebrew/opt/qt@6 \
    -DCMAKE_TOOLCHAIN_FILE=~/vcpkg/scripts/buildsystems/vcpkg.cmake

# Build
cmake --build build

# Run
./build/FrontDeskApp

# Run tests
cd build && ctest --verbose
```

### Transfer to Windows for Testing

```bash
# Build Windows binary (cross-compile or GitHub Actions)
# Then transfer:
rsync -avz build-windows/FrontDeskApp.exe user@windows-laptop:/test/
```

### Git Workflow

```bash
# Current branch: feature/native-qt-app
git add native/
git commit -m "feat: add [component]"
git push origin feature/native-qt-app

# Keep web app on main branch untouched
```

## Next Immediate Steps

1. **Create DatabaseService** - Critical path for all other services
2. **Create SquareService** - Required for membership and check-in
3. **Create MembershipService** - Core business logic
4. **Create CheckInViewModel** - Bridge to UI
5. **Create basic CheckInView.qml** - First UI screen

## Questions / Decisions Needed

None at this time - design approved and ready for implementation!

## Estimated Timeline

- **Phase 2 (Services)**: 2-3 weeks
- **Phase 3 (UI)**: 2-3 weeks  
- **Phase 4 (Testing)**: 1-2 weeks
- **Phase 5 (Deployment)**: 1 week

**Total: 6-9 weeks** for production-ready native app

## Notes

- Web app remains intact on `main` branch
- Native app is self-contained in `native/` directory
- Can run both versions in parallel during transition
- Configuration format compatible (easy migration)
