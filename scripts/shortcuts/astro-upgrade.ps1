# scripts/shortcuts/astro-upgrade.ps1
# Upgrade de Astro y sus integraciones (oficial @astrojs/upgrade tool)
$ErrorActionPreference = 'Stop'
Set-Location (Resolve-Path (Join-Path $PSScriptRoot '..\..\portal')).Path
Write-Host "==========================================" -ForegroundColor Yellow
Write-Host "  Astro - Upgrade" -ForegroundColor Yellow
Write-Host "  Working dir: $(Get-Location)" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Yellow
Write-Host ""
npx @astrojs/upgrade
Write-Host ""
Write-Host "Listo. Presiona Enter para cerrar esta ventana." -ForegroundColor Yellow
Read-Host
