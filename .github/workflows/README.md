# GitHub Actions Workflows

This repository contains workflows for both the **Electron/web-based app** and the **native Qt app**.

## Electron App Workflows (on `main` branch)

### `full-pipeline.yml`
**Purpose**: Build, test, and release the Electron-based application

**Triggers**:
- Pull requests to `main`
- Manual dispatch (with version bump options)

**Jobs**:
- `ci-tests` - Run Node.js tests
- `build-docs` - Generate Word documents from Markdown
- `build-app` - Build SvelteKit web app
- `build-windows-app` - Create Windows installer (.exe)
- `build-mac-app` - Create macOS DMGs (arm64 and x64)
- `smoke-test-windows-app` - Test Windows installer
- `release` - Create GitHub release (manual dispatch only on `main`)

---

## Native Qt App Workflows (on `feature/native-qt-app` branch)

### `native-build-windows.yml`
**Purpose**: Build native Qt application for Windows

**Triggers**:
- Push to `feature/native-qt-app` (when `native/**` changes)
- Pull requests to `main` (when `native/**` changes)
- Manual dispatch

**Output**:
- Windows ZIP package with executable and Qt dependencies
- Artifact: `native-windows-build` (30 days retention)

**Requirements**:
- Windows runner with MSVC
- Qt 6.8.1
- vcpkg for dependencies (nlohmann-json, spdlog, sqlite3, xlsxwriter, gtest)

---

### `native-build-macos.yml`
**Purpose**: Build native Qt application for macOS (both architectures)

**Triggers**:
- Push to `feature/native-qt-app` (when `native/**` changes)
- Pull requests to `main` (when `native/**` changes)
- Manual dispatch

**Matrix Strategy**:
- `x86_64` - Intel Macs
- `arm64` - Apple Silicon Macs

**Output**:
- macOS DMG for each architecture
- Artifacts: `native-macos-x86_64-dmg` and `native-macos-arm64-dmg` (30 days retention)

**Requirements**:
- macOS runner
- Qt 6.8.1
- vcpkg for dependencies
- Homebrew (cmake, ninja)

---

### `native-full-pipeline.yml`
**Purpose**: Complete build and test pipeline for native Qt app with optional release creation

**Triggers**:
- Push to `feature/native-qt-app` (when `native/**` changes)
- Pull requests to `main` (when `native/**` changes)
- Manual dispatch (with release options)

**Jobs**:
1. **test-native** (Linux) - Run CMake build and GTest suite
2. **build-windows** - Build Windows package
3. **build-macos** - Build macOS DMGs (both architectures in parallel)
4. **create-release** - Create GitHub release (only on manual dispatch with `create_release=true`)

**Manual Dispatch Inputs**:
- `create_release` (boolean) - Whether to create a GitHub release
- `version` (string) - Version tag (e.g., `v2026.3.0-native`)

**Output Artifacts**:
- `native-windows` - Windows ZIP package
- `native-macos-x86_64` - macOS DMG for Intel
- `native-macos-arm64` - macOS DMG for Apple Silicon

---

## Workflow Isolation

The native Qt workflows are **completely separate** from the Electron workflows:

✅ **Separate trigger paths**: Native workflows only trigger on `native/**` changes  
✅ **Different branches**: Native workflows primarily run on `feature/native-qt-app`  
✅ **Different artifacts**: No naming conflicts between Electron and native builds  
✅ **Independent releases**: Native releases use separate tags (e.g., `v2026.3.0-native`)

---

## Cache Strategy

Both workflow sets use GitHub Actions caching to speed up builds:

### Electron Workflows
- Node.js modules (`npm` cache)

### Native Qt Workflows
- **vcpkg packages** - Cached per platform and architecture
- **Qt installation** - Cached per platform and version
- **Build artifacts** - `vcpkg_installed` directory

Cache keys include:
- Platform (`${{ runner.os }}`)
- Architecture (for macOS: `x86_64` or `arm64`)
- Dependency hash (`${{ hashFiles('native/vcpkg.json') }}`)

---

## Building Locally

### Native Qt App

**Windows:**
```bash
cd native
mkdir build && cd build
cmake .. -G "Visual Studio 17 2022" -A x64 -DCMAKE_TOOLCHAIN_FILE="C:/vcpkg/scripts/buildsystems/vcpkg.cmake"
cmake --build . --config Release
```

**macOS:**
```bash
cd native
mkdir build && cd build
cmake .. -G Ninja -DCMAKE_BUILD_TYPE=Release -DCMAKE_TOOLCHAIN_FILE="$HOME/vcpkg/scripts/buildsystems/vcpkg.cmake"
cmake --build . --config Release
```

---

## Future Plans

When the native Qt app is ready to replace the Electron version:

1. Merge `feature/native-qt-app` to `main`
2. The native workflows will coexist with Electron workflows on `main`
3. Both sets of workflows will continue to work side-by-side
4. Eventually, Electron workflows can be removed when fully transitioning to native

---

## Troubleshooting

### Qt Not Found
- Ensure Qt 6.8.1 is installed
- Check `Qt6_DIR` environment variable
- Verify `Qt6Config.cmake` exists in Qt installation

### vcpkg Dependencies Fail
- Clear vcpkg cache and rebuild
- Check `vcpkg.json` for correct package names
- Ensure vcpkg is bootstrapped correctly

### Tests Fail in CI
- Tests continue workflow even on failure (`continue-on-error: true`)
- Check test logs in workflow run details
- Run tests locally: `cd native/build && ctest -C Release -V`

### DMG Creation Fails (macOS)
- Ensure `hdiutil` is available
- Check app bundle structure
- Verify codesigning (if enabled)

---

## Maintenance

**Updating Qt Version:**
1. Change version in all workflow files
2. Update cache keys to include new version
3. Test locally before pushing

**Adding Dependencies:**
1. Add to `native/vcpkg.json`
2. Cache keys will automatically invalidate
3. First run will be slower as vcpkg rebuilds

**Modifying Workflows:**
1. Test changes on a branch first
2. Use `workflow_dispatch` for manual testing
3. Check workflow syntax with `actionlint` (optional)
