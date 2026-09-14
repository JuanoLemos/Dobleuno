# scripts/shortcuts/create-shortcuts.ps1
# Crea accesos directos en el Escritorio para los comandos comunes de Dobleuno.
# Uso: powershell -ExecutionPolicy Bypass -File scripts\shortcuts\create-shortcuts.ps1
$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$MonorepoRoot = Resolve-Path (Join-Path $ScriptDir '..\..')
$Desktop = [Environment]::GetFolderPath('Desktop')
$WshShell = New-Object -ComObject WScript.Shell

# Definir los shortcuts a crear.
# Icon: shell32.dll,N  -  N es el indice del icono en la DLL del sistema.
#   12  = globo (web)
#   238 = consola/terminal
#   15  = bases de datos
#   144 = engranaje (build)
#   13  = reloj (sync)
$names = @(
    'Dobleuno - Portal Dev',
    'Dobleuno - Astro Upgrade'
)
$scripts = @(
    'portal-dev.ps1',
    'astro-upgrade.ps1'
)
$icons = @(
    'shell32.dll,12',
    'shell32.dll,238'
)
$descriptions = @(
    'Levanta el portal estatico en http://localhost:4321',
    'Upgrade oficial de Astro y sus integraciones'
)

for ($i = 0; $i -lt $names.Length; $i++) {
    $scriptPath = Join-Path $ScriptDir $scripts[$i]
    $linkPath = Join-Path $Desktop ($names[$i] + '.lnk')
    $shortcut = $WshShell.CreateShortcut($linkPath)
    $shortcut.TargetPath = 'powershell.exe'
    $shortcut.Arguments = "-NoExit -ExecutionPolicy Bypass -File `"$scriptPath`""
    $shortcut.WorkingDirectory = $MonorepoRoot.Path
    $shortcut.IconLocation = $icons[$i]
    $shortcut.Description = $descriptions[$i]
    $shortcut.Save()
    Write-Host "OK Creado: $linkPath" -ForegroundColor Green
}

Write-Host ""
Write-Host "Listo. Los accesos directos quedaron en tu Escritorio." -ForegroundColor Yellow
Write-Host "(Si no los ves, presiona F5 sobre el Escritorio o espera unos segundos.)" -ForegroundColor Yellow
Write-Host ""
Read-Host "Presiona Enter para cerrar"
