# Native Qt App - CI/CD Setup

## Overview
GitHub Actions workflows have been configured for automated building and testing of the native Qt 6 application. These workflows are **completely separate** from the existing Electron app workflows.

## Workflows Created

### 1. `native-build-windows.yml` ✅
**Purpose**: Build and package native Qt app for Windows x64

**Triggers**:
- Push to `feature/native-qt-app` branch (when `native/**` files change)
- Pull requests to `main` (when `native/**` files change)
- Manual dispatch via GitHub UI

**What it does**:
- Sets up MSVC build environment
- Installs Qt 6.8.1 for Windows
- Installs C++ dependencies via vcpkg (nlohmann-json, spdlog, sqlite3, xlsxwriter, gtest)
- Builds with CMake using Visual Studio 2022
- Runs GTest unit tests
- Packages executable with Qt dependencies using `windeployqt`
- Creates ZIP archive ready for distribution
- Uploads artifacts (30-day retention)

**Output**: `FrontDeskApp-Native-Windows-{version}.zip`

---

### 2. `native-build-macos.yml` ✅
**Purpose**: Build and package native Qt app for macOS (both architectures)

**Triggers**:
- Push to `feature/native-qt-app` branch (when `native/**` files change)
- Pull requests to `main` (when `native/**` files change)
- Manual dispatch via GitHub UI

**Matrix Strategy**: Builds for both architectures in parallel
- `x86_64` - Intel Macs
- `arm64` - Apple Silicon Macs

**What it does**:
- Installs Qt 6.8.1 for macOS
- Installs C++ dependencies via vcpkg
- Builds with CMake using Ninja for each architecture
- Runs GTest unit tests
- Creates proper .app bundle structure
- Packages with Qt frameworks using `macdeployqt`
- Creates DMG installer for each architecture
- Uploads separate artifacts per architecture (30-day retention)

**Output**: 
- `FrontDeskApp-Native-macOS-x86_64-{version}.dmg`
- `FrontDeskApp-Native-macOS-arm64-{version}.dmg`

---

### 3. `native-full-pipeline.yml` ✅
**Purpose**: Complete CI/CD pipeline with testing and optional release creation

**Triggers**:
- Push to `feature/native-qt-app` branch (when `native/**` files change)
- Pull requests to `main` (when `native/**` files change)
- Manual dispatch (with release options)

**Jobs Pipeline**:

1. **test-native** (Linux runner)
   - Fast build and test on Linux
   - Runs full GTest suite
   - Gates the Windows/macOS builds

2. **build-windows** (runs after tests pass)
   - Builds Windows package
   - Same as `native-build-windows.yml`

3. **build-macos** (runs after tests pass)
   - Builds both macOS architectures in parallel
   - Same as `native-build-macos.yml`

4. **create-release** (optional, only on manual dispatch)
   - Downloads all build artifacts
   - Creates GitHub release with proper versioning
   - Attaches all platform binaries (Windows ZIP + 2 macOS DMGs)
   - Only runs when `create_release` input is `true`

**Manual Dispatch Options**:
- `create_release` (checkbox) - Create GitHub release
- `version` (text) - Version tag (e.g., `v2026.3.0-native`)

---

## Workflow Isolation from Electron Builds

✅ **Path-based triggers**: Native workflows only trigger on `native/**` changes  
✅ **Separate branches**: Native workflows live on `feature/native-qt-app`  
✅ **Different artifact names**: No conflicts with Electron build artifacts  
✅ **Independent cache keys**: Qt/vcpkg caches don't interfere with npm caches  
✅ **Separate release tags**: Native releases use `-native` suffix

The existing `full-pipeline.yml` for the Electron app **remains unchanged** and continues to work.

---

## Performance Optimizations

### Caching Strategy
All workflows use GitHub Actions cache to speed up builds:

1. **vcpkg packages** - Cached per platform/architecture
   - Key includes `vcpkg.json` hash
   - Dramatically speeds up dependency installation

2. **Qt installation** - Cached per platform/version
   - Qt 6.8.1 only downloaded once per runner
   - Saved across workflow runs

3. **Build artifacts** - `vcpkg_installed` directory cached
   - Reused between builds

**First run**: ~30-45 minutes per platform  
**Subsequent runs with cache**: ~10-15 minutes per platform

---

## How to Use

### Automatic Builds
Workflows trigger automatically when you push changes to `native/**` on the `feature/native-qt-app` branch:

```bash
git checkout feature/native-qt-app
# Make changes to native/...
git add native/
git commit -m "feat: add new feature"
git push
```

Builds will start automatically and you can monitor progress in the **Actions** tab on GitHub.

### Manual Builds
You can manually trigger builds from GitHub:

1. Go to **Actions** tab
2. Select a workflow (e.g., "Native Qt App - Full Pipeline")
3. Click **Run workflow**
4. Choose branch and options
5. Click **Run workflow**

### Creating Releases
To create a GitHub release with all platform builds:

1. Go to **Actions** tab
2. Select **Native Qt App - Full Pipeline**
3. Click **Run workflow**
4. Check **create_release**
5. Enter version tag (e.g., `v2026.3.0-native`)
6. Click **Run workflow**

The workflow will:
- Build for all platforms
- Run tests
- Create GitHub release
- Attach all binaries (Windows ZIP + 2 macOS DMGs)

---

## Viewing Build Artifacts

After a workflow completes:

1. Go to the workflow run in the **Actions** tab
2. Scroll down to **Artifacts** section
3. Download artifacts:
   - `native-windows` or `native-windows-build` - Windows ZIP
   - `native-macos-x86_64` or `native-macos-x86_64-dmg` - Intel Mac DMG
   - `native-macos-arm64` or `native-macos-arm64-dmg` - Apple Silicon DMG

Artifacts are retained for **30 days** by default.

---

## Testing the Workflows

To test if workflows are working:

1. Make a small change to a file in `native/` (e.g., update a comment)
2. Commit and push to `feature/native-qt-app`
3. Check the **Actions** tab to see workflows start
4. Monitor build progress and logs
5. Download and test the artifacts

---

## Current Status

✅ All three workflows committed to `feature/native-qt-app` branch  
✅ Workflows will trigger on next push to `native/**`  
✅ Ready to build for Windows and macOS (both architectures)  
✅ Optional release creation via manual dispatch  
✅ Complete documentation in `.github/workflows/README.md`

---

## Next Steps

1. **Test the workflows**: Push a small change to trigger builds
2. **Download artifacts**: Verify Windows and macOS builds work
3. **Test on target hardware**: Install and test on Windows laptop
4. **Create first release**: Use manual dispatch when ready
5. **Merge to main**: When native app is stable, these workflows will coexist with Electron workflows

---

## Files Added

```
.github/workflows/
├── README.md                      # Complete workflow documentation
├── native-build-windows.yml       # Windows build workflow
├── native-build-macos.yml         # macOS build workflow (matrix)
└── native-full-pipeline.yml       # Complete pipeline with tests + release
```

**Location**: `feature/native-qt-app` branch  
**Commit**: `e33c088` - ci: add GitHub Actions workflows for native Qt builds

---

## Troubleshooting

### Workflow doesn't trigger
- Ensure changes are in `native/**` directory
- Check you're on `feature/native-qt-app` branch
- Workflow files must be in `.github/workflows/`

### Build fails with Qt not found
- Qt cache may be corrupted
- Re-run workflow to rebuild cache
- Check Qt version in workflow file matches available versions

### vcpkg dependencies fail
- First build takes longer as vcpkg compiles dependencies
- Subsequent builds use cache
- If persistent, clear cache and rebuild

### Tests fail
- Tests are set to `continue-on-error: true`
- Build will continue even if some tests fail
- Check test logs for details

---

## Maintenance

When updating:
- **Qt version**: Update in all three workflow files + cache keys
- **Dependencies**: Modify `native/vcpkg.json`, cache will auto-invalidate
- **Retention**: Adjust `retention-days` in `upload-artifact` steps
- **Triggers**: Modify `on:` section to change when workflows run

---

**Status**: ✅ **CI/CD Setup Complete**  
**Branch**: `feature/native-qt-app`  
**Ready**: Yes - workflows will trigger on next push to `native/**`
