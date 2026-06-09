# LoRA Mask Loss CEP Extension Installer
# Auto-detects Photoshop installation

$ErrorActionPreference = "Stop"
$ExtId = "com.lora-mask-loss.exporter"
$Source = Split-Path -Parent $MyInvocation.MyCommand.Path

# Auto-elevate
$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) {
  Start-Process powershell -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
  exit
}

Clear-Host
Write-Host "LoRA Mask Loss - CEP Extension Installer" -ForegroundColor Cyan
Write-Host ""

# ── Detect Photoshop ──
function Find-PhotoshopCEPPath {
  # Try registry first
  $regBases = @("HKLM:\SOFTWARE\Adobe\Photoshop", "HKLM:\SOFTWARE\WOW6432Node\Adobe\Photoshop")
  foreach ($base in $regBases) {
    if (-not (Test-Path $base)) { continue }
    $vers = Get-ChildItem $base -ErrorAction SilentlyContinue | Where-Object { $_.PSChildName -match '^\d+' } | Sort-Object { [int]($_.PSChildName -replace '\..*','') } -Descending
    foreach ($v in $vers) {
      $appPath = (Get-ItemProperty "$($v.PSPath)" -Name "ApplicationPath" -ErrorAction SilentlyContinue).ApplicationPath
      if ($appPath) {
        $appPath = $appPath.TrimEnd('\')
        $cepPath = "$appPath\Required\CEP\extensions"
        if (Test-Path $cepPath) { return $cepPath }
        # Some versions use different layout
        $cepPath = "$appPath\Plug-ins\CEP\extensions"
        if (Test-Path $cepPath) { return $cepPath }
      }
    }
  }

  # Scan Program Files
  foreach ($pfx in @($env:ProgramFiles, ${env:ProgramFiles(x86)}, "D:\Adobe")) {
    if (-not (Test-Path $pfx)) { continue }
    Get-ChildItem "$pfx\Adobe" -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*Photoshop*" } | Sort-Object Name -Descending | ForEach-Object {
      $cepPath = "$($_.FullName)\Required\CEP\extensions"
      if (Test-Path $cepPath) { return $cepPath }
    }
  }

  # Fallback: AppData (no admin needed)
  $userCep = "$env:APPDATA\Adobe\CEP\extensions"
  if (Test-Path $userCep) { return $userCep }
  New-Item -ItemType Directory -Path $userCep -Force | Out-Null
  return $userCep
}

$TargetBase = Find-PhotoshopCEPPath
$Target = "$TargetBase\$ExtId"

if (-not $TargetBase) {
  Write-Host "ERROR: Cannot find Photoshop CEP extensions directory" -ForegroundColor Red
  Read-Host "Press Enter to exit"
  exit 1
}

Write-Host "Source : $Source" -ForegroundColor Gray
Write-Host "Target : $Target" -ForegroundColor Gray
Write-Host ""

# ── Install ──
if (Test-Path $Target) {
  $item = Get-Item $Target -Force -ErrorAction SilentlyContinue
  if ($item.LinkType -eq "Junction") { Remove-Item $Target -Force; Write-Host "Removed old junction" -ForegroundColor Gray }
  else { Remove-Item $Target -Recurse -Force; Write-Host "Removed old installation" -ForegroundColor Gray }
}

New-Item -ItemType Directory -Path $Target -Force | Out-Null

Write-Host "Copying files..." -ForegroundColor Gray
Copy-Item -Path "$Source\CSXS" -Destination $Target -Recurse -Force
Copy-Item -Path "$Source\client" -Destination $Target -Recurse -Force
Copy-Item -Path "$Source\mimetype" -Destination $Target -Force -ErrorAction SilentlyContinue
Copy-Item -Path "$Source\index.html" -Destination $Target -Force

# ── Enable debug mode ──
Write-Host "Enabling CEP debug mode..." -ForegroundColor Gray
9,12,13 | ForEach-Object {
  $d = "$env:APPDATA\Adobe\CSXS.$_"
  if (-not (Test-Path $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
  Set-Content -Path "$d\PlayerDebugMode" -Value "1" -NoNewline -Encoding ASCII -Force
}

Write-Host ""
Write-Host "=== INSTALL COMPLETE ===" -ForegroundColor Green
Write-Host ""
Write-Host "1. Restart Photoshop" -ForegroundColor Yellow
Write-Host "2. Window > Extensions > LoRA Mask Loss" -ForegroundColor White
Write-Host ""
Write-Host "Debug: Right-click panel > Inspect" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to exit"
