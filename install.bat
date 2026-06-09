@echo off
title LoRA Mask Loss Installer
setlocal enabledelayedexpansion

echo LoRA Mask Loss - CEP Extension Installer
echo ========================================
echo.

set EXT_ID=com.lora-mask-loss.exporter
set SOURCE=%~dp0
if "%SOURCE:~-1%"=="\" set SOURCE=%SOURCE:~0,-1%

echo Source: %SOURCE%

:: ── Detect Photoshop ──
set PS_DIR=
set PS_REG_FOUND=

:: Try registry: HKLM\SOFTWARE\Adobe\Photoshop
for /f "tokens=*" %%a in ('reg query "HKLM\SOFTWARE\Adobe\Photoshop" 2^>nul') do set PS_REG_FOUND=1
if defined PS_REG_FOUND (
  for /f "tokens=3*" %%a in ('reg query "HKLM\SOFTWARE\Adobe\Photoshop" 2^>nul ^| findstr "ApplicationPath"') do (
    set "PS_DIR=%%a %%b"
  )
  if defined PS_DIR call :SetPath
  if defined PS_DIR goto :install
)

:: Try registry: HKLM\SOFTWARE\WOW6432Node\Adobe\Photoshop
for /f "tokens=3*" %%a in ('reg query "HKLM\SOFTWARE\WOW6432Node\Adobe\Photoshop" 2^>nul ^| findstr "ApplicationPath"') do (
  set "PS_DIR=%%a %%b"
)
if defined PS_DIR call :SetPath
if defined PS_DIR goto :install

:: Try common paths
for %%d in ("%ProgramFiles%\Adobe","C:\Program Files\Adobe","D:\Adobe") do (
  for /d %%p in ("%%~d\Adobe Photoshop*") do (
    set "PS_DIR=%%~p"
    call :SetPath
    if defined PS_DIR goto :install
  )
)

:: Fallback: AppData
set PS_DIR=%APPDATA%\Adobe\CEP
set TARGET=%APPDATA%\Adobe\CEP\extensions\%EXT_ID%
echo Using AppData CEP path
goto :install

:SetPath
set TARGET=%PS_DIR%\Required\CEP\extensions\%EXT_ID%
if exist "%PS_DIR%\Required\CEP\extensions" exit /b 0
set TARGET=%APPDATA%\Adobe\CEP\extensions\%EXT_ID%
exit /b 0

:install
echo Target: %TARGET%
echo.

:: ── Install ──
if exist "%TARGET%" (
  echo Removing old installation...
  rmdir /s /q "%TARGET%" 2>nul
)

mkdir "%TARGET%" 2>nul

echo Copying files...
xcopy "%SOURCE%\CSXS" "%TARGET%\CSXS\" /s /e /y /q >nul
xcopy "%SOURCE%\client" "%TARGET%\client\" /s /e /y /q >nul
copy "%SOURCE%\mimetype" "%TARGET%\" /y >nul 2>&1
copy "%SOURCE%\index.html" "%TARGET%\" /y >nul

:: Enable debug mode
echo Enabling CEP debug mode...
if not exist "%APPDATA%\Adobe\CSXS.9" mkdir "%APPDATA%\Adobe\CSXS.9" 2>nul
echo 1 > "%APPDATA%\Adobe\CSXS.9\PlayerDebugMode" 2>nul
if not exist "%APPDATA%\Adobe\CSXS.12" mkdir "%APPDATA%\Adobe\CSXS.12" 2>nul
echo 1 > "%APPDATA%\Adobe\CSXS.12\PlayerDebugMode" 2>nul
if not exist "%APPDATA%\Adobe\CSXS.13" mkdir "%APPDATA%\Adobe\CSXS.13" 2>nul
echo 1 > "%APPDATA%\Adobe\CSXS.13\PlayerDebugMode" 2>nul

echo.
echo ====== DONE ======
echo.
echo 1. Restart Photoshop
echo 2. Window ^> Extensions ^> LoRA Mask Loss
echo.
echo Debug: Right-click panel ^> Inspect
echo.
pause
