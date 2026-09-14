# scripts/shortcuts/portal-dev.ps1
# Levanta el portal estatico de Dobleuno en http://localhost:4321
$ErrorActionPreference = 'Stop'
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
Write-Host "==========================================" -ForegroundColor Yellow
Write-Host "  Portal Dobleuno - Dev Server" -ForegroundColor Yellow
Write-Host "  http://localhost:4321" -ForegroundColor Yellow
Write-Host "  Ctrl+C para detener" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Yellow
Write-Host ""
npm run portal:dev
