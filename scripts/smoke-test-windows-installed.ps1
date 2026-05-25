# Smoke-test a silently installed Front Desk App on Windows (CI or local).
# Does not call localhost HTTP (unreliable on GitHub Actions). Uses app.log + direct SQLite checks.
#
# Usage:
#   pwsh -File scripts/smoke-test-windows-installed.ps1 -ExePath "C:\...\Front Desk App.exe"

param(
  [Parameter(Mandatory = $true)]
  [string]$ExePath,
  [int]$StartupTimeoutSeconds = 90,
  [int]$InitialWaitSeconds = 5,
  [switch]$SkipNodeDbVerify
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $ExePath)) {
  throw "Executable not found: $ExePath"
}

$userData = Join-Path $env:APPDATA 'front-desk-app'
$dbFile = Join-Path $userData 'checkin.db'
$logFile = Join-Path $userData 'logs\app.log'
$installDir = Split-Path $ExePath -Parent
$resourcesDir = Join-Path $installDir 'resources'
$legacyDbInResources = Join-Path $resourcesDir 'checkin.db'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

$regressionPatterns = @(
  'readonly database',
  'SQLITE_READONLY',
  'SQLITE_CANTOPEN',
  'unable to open database file',
  'logger.warn is not a function',
  'attempt to write a readonly database'
)

function Stop-FrontDeskApp {
  param([string]$ProcessName)
  Get-Process -Name $ProcessName -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  try {
    Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue |
      ForEach-Object {
        Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
      }
  } catch {
    # Get-NetTCPConnection may be unavailable on some hosts
  }
}

function Wait-ForAppReady {
  param(
    [int]$TimeoutSeconds,
    [string]$LogPath,
    [string]$DbPath,
    [string]$ProcessName
  )
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $running = Get-Process -Name $ProcessName -ErrorAction SilentlyContinue
    if (-not $running) {
      throw "App process '$ProcessName' exited before becoming ready"
    }
    if ((Test-Path $DbPath) -and (Test-Path $LogPath)) {
      $tail = Get-Content $LogPath -Tail 200 -ErrorAction SilentlyContinue
      if ($tail | Select-String -Pattern 'Server is running on http://127\.0\.0\.1:' -Quiet) {
        Write-Host "Server ready (app.log + AppData DB present)"
        return
      }
    }
    Start-Sleep -Seconds 2
  }
  throw "App did not become ready within ${TimeoutSeconds}s (need app.log server line + $DbPath)"
}

function Assert-NoLogRegressions {
  param([string]$Path)
  if (-not (Test-Path $Path)) {
    throw "App log not found: $Path"
  }
  $lines = Get-Content $Path -Tail 400 -ErrorAction Stop
  if (-not ($lines | Select-String -Pattern 'Server is running on http://127\.0\.0\.1:' -Quiet)) {
    throw "Expected 'Server is running on http://127.0.0.1:' in $Path"
  }
  Write-Host "Found server started line in app.log"
  foreach ($pattern in $regressionPatterns) {
    $hits = $lines | Select-String -Pattern $pattern -SimpleMatch
    if ($hits) {
      Write-Host "Regression pattern '$pattern' found:"
      $hits | ForEach-Object { Write-Host "  $_" }
      throw "Log regression detected: $pattern"
    }
  }
  Write-Host "No database regression patterns in recent app.log"
}

function Invoke-NodeDbVerify {
  param([string]$ResourcesPath)
  $script = Join-Path $repoRoot 'scripts\verify-appdata-db.js'
  if (-not (Test-Path $script)) {
    throw "Missing $script (run from repo checkout)"
  }
  $args = @($script, '--db', $dbFile)
  if ($ResourcesPath) {
    $args += @('--resources', $ResourcesPath)
  }
  Write-Host "Running: node $($args -join ' ')"
  & node @args
  if ($LASTEXITCODE -ne 0) {
    throw "verify-appdata-db.js failed with exit $LASTEXITCODE"
  }
}

$processName = [System.IO.Path]::GetFileNameWithoutExtension($ExePath)
Write-Host "Starting: $ExePath"
Write-Host "Expected user data: $userData"
Write-Host "Readiness: app.log + AppData DB (no HTTP health check)"

try {
  Stop-FrontDeskApp -ProcessName $processName
  Start-Sleep -Seconds 1

  $app = Start-Process -FilePath $ExePath -PassThru
  Write-Host "Launched PID $($app.Id); waiting ${InitialWaitSeconds}s..."
  Start-Sleep -Seconds $InitialWaitSeconds

  Wait-ForAppReady -TimeoutSeconds $StartupTimeoutSeconds -LogPath $logFile -DbPath $dbFile -ProcessName $processName

  if (-not (Test-Path $dbFile)) {
    throw "Database not created under AppData (ELECTRON_USER_DATA): $dbFile"
  }
  $dbInfo = Get-Item $dbFile
  Write-Host "AppData database OK: $($dbInfo.FullName) ($($dbInfo.Length) bytes)"

  if (Test-Path $legacyDbInResources) {
    Write-Host "Note: legacy resources\checkin.db present; AppData DB must remain primary ($dbFile)"
  } else {
    Write-Host "No checkin.db under install resources (expected for current builds)"
  }

  Assert-NoLogRegressions -Path $logFile

  Write-Host "Stopping app before direct DB verification..."
  Stop-FrontDeskApp -ProcessName $processName
  Start-Sleep -Seconds 2

  if (-not $SkipNodeDbVerify) {
    Invoke-NodeDbVerify -ResourcesPath $resourcesDir
  }

  Write-Host "Smoke test passed."
} finally {
  Write-Host "Ensuring app is stopped..."
  Stop-FrontDeskApp -ProcessName $processName
}
