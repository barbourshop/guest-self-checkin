# Native Qt App - Foundation Complete ✅

## Summary

I've successfully created the foundation for the native Qt application to replace your Electron-based front desk check-in app. The entire project is set up in a new `native/` directory on the `feature/native-qt-app` branch, keeping your existing web-based app completely intact on the `main` branch.

**Branch**: `feature/native-qt-app`  
**Commit**: c0c57d5  
**GitHub**: https://github.com/barbourshop/guest-self-checkin/tree/feature/native-qt-app

---

## What's Been Built

### ✅ Complete Project Structure

```
native/
├── CMakeLists.txt              # Qt 6 + CMake build system
├── vcpkg.json                  # Dependency management
├── README.md                   # Comprehensive documentation
├── ROADMAP.md                  # Development plan and next steps
├── config/
│   └── config.template.json    # Full configuration template
├── src/
│   ├── main.cpp                # Application entry point
│   ├── models/                 # Data models (5 files)
│   │   ├── Customer.h          # With segments & groups
│   │   ├── CheckIn.h           # With denormalized data
│   │   ├── Segment.h           # Square segments
│   │   ├── Group.h             # Square groups
│   │   └── MembershipStatus.h  # OR logic result
│   └── utils/                  # Core utilities (5 files)
│       ├── Result.h            # Error handling without exceptions
│       ├── Logger.h/cpp        # spdlog wrapper
│       └── ConfigService.h/cpp # JSON configuration
└── tests/
    ├── CMakeLists.txt          # GTest integration
    └── unit/
        └── ResultTest.cpp      # Sample test
```

### ✅ Key Features Implemented

**1. Configuration System**
- External JSON configuration (not hardcoded)
- Support for Square API, Membership (segments + groups), Cloud Sync, UI, Logging
- Hot reload capability
- Platform-specific paths (AppData/Application Support)
- Full validation and error reporting

**2. Data Models**
- `Customer`: With segments AND groups support
- `CheckIn`: With denormalized data for efficient reporting
- `Segment` & `Group`: Separate configurations for both membership types
- `MembershipStatus`: Implements OR logic (member if in ANY segment OR group)

**3. Utilities**
- `Result<T, E>`: Type-safe error handling (no exceptions)
- `Logger`: File-based logging with rotation via spdlog
- `ConfigService`: Strongly-typed configuration access

**4. Build System**
- CMake 3.20+ with Qt 6 integration
- vcpkg for dependency management
- Cross-platform support (develop on Mac, build for Windows)
- Test framework integration (GTest)

---

## Key Design Decisions Confirmed

### ✅ Membership Logic: OR

Customers are considered members if they belong to **ANY** enabled Segment OR Group:
- Multiple memberships displayed as color-coded badges
- Sort order determines priority in display
- Example: Customer in "Annual Member" segment AND "Pool Pass" group shows both badges

### ✅ Google Sheets: Customer ID INCLUDED

For account linking purposes, the Google Sheets sync **will include** the Square customer_id:

**Included by default:**
- ✅ Timestamp
- ✅ **Customer ID** (Square) - for linking back to Square account
- ✅ Customer Name (configurable: full or first only)
- ✅ Lot Number
- ✅ Membership Types (display names)
- ✅ Guest Count
- ✅ Check-in Type (member/daypass)
- ✅ Location ID (computer name)

**Excluded by default (configurable):**
- ❌ Email
- ❌ Phone
- ❌ Full Address

### ✅ Testing: Mac → Windows rsync

Build on Mac, transfer to Windows laptop for testing:
```bash
rsync -avz build-windows/FrontDeskApp.exe user@windows-laptop:/test/
```

### ✅ Repository Structure: Separate Directory

- **Web app**: Stays on `main` branch in root directory
- **Native app**: In `native/` directory on `feature/native-qt-app` branch
- No conflicts - both can coexist
- Easy migration path

---

## Configuration Example

The app uses a comprehensive JSON configuration file:

**Location (Windows)**: `%APPDATA%\FrontDeskApp\config.json`  
**Location (macOS)**: `~/Library/Application Support/FrontDeskApp/config.json`

**Sample configuration** (see `native/config/config.template.json`):

```json
{
  "square": {
    "api_url": "https://connect.squareup.com/v2",
    "timeout_seconds": 30,
    "retry_attempts": 3
  },
  "membership": {
    "mode": "segments_and_groups",  // OR logic
    "segments": [
      {
        "segment_id": "gv2:...",
        "display_name": "Annual Member",
        "enabled": true,
        "sort_order": 1
      }
    ],
    "groups": [
      {
        "group_id": "GRP_...",
        "display_name": "Pool Pass Holders",
        "enabled": true,
        "sort_order": 10
      }
    ]
  },
  "cloud_sync": {
    "enabled": false,
    "google_sheets": {
      "spreadsheet_id": "",
      "include_fields": {
        "customer_id": true,  // For account linking
        "email": false,
        "phone": false
      }
    }
  }
}
```

All settings can be changed via:
- Admin Dashboard → Settings UI
- Direct JSON file editing
- First-run setup wizard

---

## Expected Performance Improvements

| Metric | Electron | Native Qt | Improvement |
|--------|----------|-----------|-------------|
| **Install Size** | 150-200 MB | 15-25 MB | **85-90% smaller** |
| **Memory Usage** | 150-300 MB | 30-50 MB | **75-85% less** |
| **Startup Time** | 3-5 seconds | < 1 second | **70-80% faster** |
| **Search Response** | ~100ms | ~20ms | **80% faster** |

---

## Development Setup (On Your Mac)

### 1. Install Prerequisites

```bash
# Install Qt 6
brew install qt@6

# Install CMake and vcpkg
brew install cmake
git clone https://github.com/Microsoft/vcpkg.git ~/vcpkg
~/vcpkg/bootstrap-vcpkg.sh

# Install dependencies
~/vcpkg/vcpkg install nlohmann-json spdlog sqlite3 xlsxwriter gtest
```

### 2. Build and Run

```bash
cd native

# Configure (first time)
cmake -B build \
    -DCMAKE_PREFIX_PATH=/opt/homebrew/opt/qt@6 \
    -DCMAKE_TOOLCHAIN_FILE=~/vcpkg/scripts/buildsystems/vcpkg.cmake

# Build
cmake --build build

# Run (once services are implemented)
./build/FrontDeskApp

# Run tests
cd build && ctest --verbose
```

### 3. Cross-Compile for Windows

```bash
# Install MinGW cross-compiler
brew install mingw-w64

# Build for Windows
cmake -B build-windows \
    -DCMAKE_TOOLCHAIN_FILE=~/vcpkg/scripts/buildsystems/vcpkg.cmake \
    -DVCPKG_TARGET_TRIPLET=x64-mingw-static \
    -DCMAKE_SYSTEM_NAME=Windows \
    -DCMAKE_C_COMPILER=x86_64-w64-mingw32-gcc \
    -DCMAKE_CXX_COMPILER=x86_64-w64-mingw32-g++

cmake --build build-windows
```

### 4. Transfer to Windows for Testing

```bash
# Using rsync
rsync -avz build-windows/FrontDeskApp.exe user@windows-laptop:/test/

# Or using scp
scp build-windows/FrontDeskApp.exe user@windows-laptop:/test/
```

---

## Next Steps (Phase 2: Services Layer)

The foundation is complete. Next, we need to implement the business logic services:

### Priority 1: DatabaseService (Critical Path)
- SQLite integration with Qt SQL
- Schema creation and migrations
- CRUD operations for check-ins, cache, segments, groups
- Transaction support

**Estimated**: 3-4 days

### Priority 2: SquareService (Core Integration)
- HTTP client with Qt Network
- Customer search (all types: name, phone, email, lot, customer_id)
- Segment and Group fetching
- Retry logic and error handling

**Estimated**: 4-5 days

### Priority 3: MembershipService (Business Logic)
- OR logic implementation
- Cache refresh with progress reporting
- Customer membership checking

**Estimated**: 2-3 days

### Priority 4: CheckInService & ExportService
- Check-in recording
- Daily CSV backups
- Excel export with libxlsxwriter

**Estimated**: 2-3 days

### Priority 5: GoogleSheetsService
- OAuth2 authorization flow
- Batch sync with customer_id
- Retry and queue management

**Estimated**: 3-4 days

**Total Phase 2**: ~2-3 weeks

---

## Full Timeline to Production

- ✅ **Phase 1 - Foundation**: Complete (current)
- 🔄 **Phase 2 - Services**: 2-3 weeks (next)
- 📋 **Phase 3 - UI (QML)**: 2-3 weeks
- 📋 **Phase 4 - Testing**: 1-2 weeks
- 📋 **Phase 5 - Deployment**: 1 week

**Total**: 6-9 weeks for production-ready native app

---

## Documentation

All documentation is in the `native/` directory:

1. **README.md**: Complete project overview, setup, and usage
2. **ROADMAP.md**: Detailed development plan with all tasks
3. **config.template.json**: Full configuration reference with comments

---

## Questions?

The design is approved and ready for implementation. Key decisions:

✅ Membership: OR logic (any segment OR group)  
✅ Google Sheets: Customer ID included for account linking  
✅ Testing: Mac → Windows via rsync  
✅ Repository: Separate `native/` directory, own branch  

**Ready to proceed with Phase 2 (Services Layer)!**

Would you like me to:
1. Start implementing DatabaseService?
2. Set up GitHub Actions for automated Windows builds?
3. Create the first QML UI prototype?
4. Something else?

Let me know and I'll continue building! 🚀
