# ==============================================================================
# ZMS — PostgreSQL Restore Script (Windows / PowerShell)
# ==============================================================================
param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,
    [string]$ContainerName = "zms-postgres",
    [string]$DbName = "zms",
    [string]$DbUser = "zms"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupFile)) {
    Write-Host "[ZMS Restore ERROR] File does not exist: $BackupFile" -ForegroundColor Red
    exit 1
}

Write-Host "[ZMS Restore] Restoring database '$DbName' from '$BackupFile'..." -ForegroundColor Cyan

$dockerRunning = docker ps --format "{{.Names}}" 2>$null | Select-String -Pattern "^$ContainerName$"
if ($dockerRunning) {
    Write-Host "[ZMS Restore] Streaming into container '$ContainerName'..." -ForegroundColor Yellow
    Get-Content $BackupFile | docker exec -i $ContainerName psql -U $DbUser -d $DbName
} else {
    Write-Host "[ZMS Restore] Container '$ContainerName' not running, attempting local psql..." -ForegroundColor Yellow
    Get-Content $BackupFile | psql -U $DbUser -d $DbName
}

Write-Host "[ZMS Restore] SUCCESS! Database restore completed." -ForegroundColor Green

