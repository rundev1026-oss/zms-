# ==============================================================================
# ZMS — PostgreSQL Automated Backup Script (Windows / PowerShell)
# ==============================================================================
param(
    [string]$BackupDir = "backups",
    [string]$ContainerName = "zms-postgres",
    [string]$DbName = "zms",
    [string]$DbUser = "zms"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = Join-Path $BackupDir "zms_backup_$Timestamp.sql"

Write-Host "[ZMS Backup] Starting backup for database '$DbName'..." -ForegroundColor Cyan

$dockerRunning = docker ps --format "{{.Names}}" 2>$null | Select-String -Pattern "^$ContainerName$"
if ($dockerRunning) {
    Write-Host "[ZMS Backup] Streaming pg_dump from container '$ContainerName'..." -ForegroundColor Yellow
    docker exec -t $ContainerName pg_dump -U $DbUser -d $DbName --clean --if-exists > $BackupFile
} else {
    Write-Host "[ZMS Backup] Container '$ContainerName' not running, attempting local pg_dump..." -ForegroundColor Yellow
    pg_dump -U $DbUser -d $DbName --clean --if-exists -f $BackupFile
}

if (Test-Path $BackupFile) {
    $item = Get-Item $BackupFile
    $sizeKb = [math]::Round($item.Length / 1KB, 2)
    Write-Host "[ZMS Backup] SUCCESS! Backup saved to: $BackupFile ($sizeKb KB)" -ForegroundColor Green
} else {
    Write-Host "[ZMS Backup ERROR] Backup file was not generated." -ForegroundColor Red
    exit 1
}

