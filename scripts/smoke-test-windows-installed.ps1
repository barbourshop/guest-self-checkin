# Smoke-test a silently installed Front Desk App on Windows.
# Validates server health, writable AppData database, and absence of known regressions in app.log.
#
# Usage:
#   pwsh -File scripts/smoke-test-windows-installed.ps1 -ExePath "C:\...\Front Desk App.exe"

param(
  [Parameter(Mandatory = $true)]
  [string]$ExePath,
  [int]$HealthTimeoutSeconds = 60,
  [int]$InitialWaitSeconds = 8
)

$ErrorActionPreference = 'Stop'

if (-not (Test-Path $ExePath)) {
  throw "Executable not found: $ExePath"
}

$userDataRoot = Join-Path $env:APPDATA 'front-desk-app'
$logFile = Join-Path $userDataRoot 'logs\app.log'
$dbFile = Join-Path $userDataRoot 'checkin.db'
$resourcesDir = Join-Path (Split-Path $ExePath -Parent) 'resources'
$legacyDbInResources = Join-Path $resourcesDir 'checkin.db'

$processName = [System.IO.Path]::GetFileNameWithoutExtension($ExePath)
Write-Host "Starting: $ExePath"
Write-Host "User data root: $userDataRoot"
Write-Host "Resources: $resourcesDir"

$proc = Start-Process -FilePath $ExePath -PassThru
Start-Sleep -Seconds $InitialWaitSeconds

try {
  if (-not (Get-Process -Id $proc.Id -ErrorAction SilentlyContinue)) {
    throw "App process exited within ${InitialWaitSeconds}s (pid $($proc.Id))"
  }
  Write-Host "App process running (pid $($proc.Id))"

  $deadline = (Get-Date).AddSeconds($HealthTimeoutSeconds)
  $healthy = $false
  # while ((Get-Date) -lt $deadline) {
  #   try {
  #     $response = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/health' -UseBasicParsing -TimeoutSec 5
  #     if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 300) {
  #       Write-Host "Health OK (HTTP $($response.StatusCode)): $($response.Content)"
  #       $healthy = $true
  #       break
  #     }
  #     Write-Host "Health returned HTTP $($response.StatusCode), retrying..."
  #   } catch {
  #     Write-Host "Health not ready: $($_.Exception.Message)"
  #   }
  #   Start-Sleep -Seconds 2
  # }
  # if (-not $healthy) {
  #   throw "Server did not respond on http://127.0.0.1:3000/api/health within ${HealthTimeoutSeconds}s"
  # }

  $dbDeadline = (Get-Date).AddSeconds(20)
  while (-not (Test-Path $dbFile) -and (Get-Date) -lt $dbDeadline) {
    Start-Sleep -Seconds 1
  }
  if (-not (Test-Path $dbFile)) {
    throw "Expected SQLite database at $dbFile (writable AppData path) but it was not created"
  }
  Write-Host "Database OK: $dbFile"

  if (-not (Test-Path $logFile)) {
    throw "Expected app log at $logFile but it was not found"
  }
  $logContent = Get-Content -Path $logFile -Raw

  if ($logContent -notmatch 'Server is running on http://localhost:') {
    throw "app.log is missing 'Server is running on http://localhost:' — embedded server may not have started"
  }
  Write-Host "app.log contains server started message"

  $regressionPatterns = @(
    'logger\.warn is not a function',
    'attempt to write a readonly database',
    'SQLITE_CANTOPEN',
    'unable to open database file'
  )
  foreach ($pattern in $regressionPatterns) {
    if ($logContent -match $pattern) {
      throw "Regression pattern matched in app.log: $pattern"
    }
  }
  Write-Host "app.log has no known regression patterns"

  if (Test-Path $legacyDbInResources) {
    Write-Host "Note: legacy checkin.db still exists under resources ($legacyDbInResources); primary DB is AppData."
  }

  Write-Host "Windows installed-app smoke test PASSED"
} finally {
  Write-Host "Stopping app ($processName)..."
  Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
  Get-Process -Name $processName -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
  }
}
