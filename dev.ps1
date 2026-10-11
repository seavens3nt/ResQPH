# ResQPH Local Development Runner for Windows PowerShell
[CmdletBinding()]
param(
    [switch]$Install,
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 5173,
    [int]$MongoPort = 27018
)

$ErrorActionPreference = "Stop"
$rootDir = $PSScriptRoot

function Write-Log {
    param([string]$Message)
    Write-Host "`n[$((Get-Date).ToString('HH:mm:ss'))] $Message" -ForegroundColor Cyan
}

# 1. Check / Create Environment Files
$backendEnv = Join-Path $rootDir "backend\.env"
$backendEnvExample = Join-Path $rootDir "backend\.env.example"
if (!(Test-Path $backendEnv) -and (Test-Path $backendEnvExample)) {
    Write-Log "Creating backend\.env from backend\.env.example"
    Copy-Item $backendEnvExample $backendEnv
    # Update MONGODB_URI for replica set on port $MongoPort
    (Get-Content $backendEnv) -replace 'mongodb://localhost:27017/\?replicaSet=rs0', "mongodb://127.0.0.1:$($MongoPort)/?replicaSet=rs0" | Set-Content $backendEnv
}

$frontendEnv = Join-Path $rootDir "frontend\.env"
$frontendEnvExample = Join-Path $rootDir "frontend\.env.example"
if (!(Test-Path $frontendEnv) -and (Test-Path $frontendEnvExample)) {
    Write-Log "Creating frontend\.env from frontend\.env.example"
    Copy-Item $frontendEnvExample $frontendEnv
}

# 2. Virtual Environment & Dependencies
$venvPython = Join-Path $rootDir "backend\.venv\Scripts\python.exe"
if (!(Test-Path $venvPython)) {
    Write-Log "Creating backend virtual environment (.venv)..."
    py -3.13 -m venv (Join-Path $rootDir "backend\.venv")
}

if ($Install) {
    Write-Log "Installing backend dependencies..."
    & $venvPython -m pip install --upgrade pip
    & $venvPython -m pip install -r (Join-Path $rootDir "backend\requirements.txt") -r (Join-Path $rootDir "backend\requirements-dev.txt")
    & $venvPython -m pip install -e (Join-Path $rootDir "routing")

    Write-Log "Installing frontend dependencies..."
    Push-Location (Join-Path $rootDir "frontend")
    npm install
    Pop-Location
}

# 3. MongoDB Replica Set (port $MongoPort)
$mongoDataDir = Join-Path $env:LOCALAPPDATA "ResQPH\mongo_data"
if (!(Test-Path $mongoDataDir)) {
    New-Item -ItemType Directory -Path $mongoDataDir -Force | Out-Null
}

$mongodExe = "C:\Program Files\MongoDB\Server\8.3\bin\mongod.exe"
if (!(Test-Path $mongodExe)) {
    $mongodCmd = Get-Command mongod -ErrorAction SilentlyContinue
    if ($mongodCmd) {
        $mongodExe = $mongodCmd.Source
    }
}

$mongoIsReady = $false
try {
    $conn = Get-NetTCPConnection -LocalPort $MongoPort -State Listen -ErrorAction SilentlyContinue
    if ($conn) { $mongoIsReady = $true }
} catch {}

if (!$mongoIsReady) {
    if (Test-Path $mongodExe) {
        Write-Log "Starting MongoDB with replica set rs0 on port $MongoPort..."
        Start-Process -FilePath $mongodExe -ArgumentList "--dbpath `"$mongoDataDir`" --port $MongoPort --replSet rs0 --bind_ip 127.0.0.1" -WindowStyle Hidden
        Start-Sleep -Seconds 2

        # Initialize replica set if not already initialized
        & $venvPython -c @"
import asyncio
from pymongo import AsyncMongoClient

async def init():
    client = AsyncMongoClient('mongodb://127.0.0.1:$($MongoPort)/?directConnection=true', serverSelectionTimeoutMS=3000)
    try:
        await client.admin.command('replSetInitiate', {'_id': 'rs0', 'members': [{'_id': 0, 'host': '127.0.0.1:$($MongoPort)'}]})
    except Exception:
        pass
    finally:
        await client.close()

asyncio.run(init())
"@
    } else {
        Write-Warning "mongod.exe not found. Ensure MongoDB replica set is running on port $MongoPort."
    }
} else {
    Write-Log "MongoDB is already running on port $MongoPort."
}

# 4. Start Backend
Write-Log "Starting FastAPI backend on http://127.0.0.1:$BackendPort..."
$backendProcess = Start-Process -FilePath $venvPython -ArgumentList "-m fastapi dev app\main.py --host 127.0.0.1 --port $BackendPort" -WorkingDirectory (Join-Path $rootDir "backend") -PassThru

# 5. Start Frontend
Write-Log "Starting Vite frontend on http://localhost:$FrontendPort..."
Push-Location (Join-Path $rootDir "frontend")
$frontendProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "run dev -- --host localhost --port $FrontendPort" -PassThru
Pop-Location

Write-Log "Services started!"
Write-Host "Frontend:  http://localhost:$FrontendPort" -ForegroundColor Green
Write-Host "Backend:   http://127.0.0.1:$BackendPort" -ForegroundColor Green
Write-Host "API Docs:  http://127.0.0.1:$BackendPort/docs" -ForegroundColor Green
Write-Host "`nPress Ctrl+C to stop services..." -ForegroundColor Yellow

try {
    Wait-Process -Id $backendProcess.Id, $frontendProcess.Id
} finally {
    Write-Log "Stopping services..."
    if ($backendProcess -and !$backendProcess.HasExited) { Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue }
    if ($frontendProcess -and !$frontendProcess.HasExited) { Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue }
}
