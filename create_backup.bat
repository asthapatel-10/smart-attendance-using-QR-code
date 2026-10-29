@echo off
echo ================================================================
echo SMART ATTENDANCE SYSTEM - DATABASE BACKUP SCRIPT
echo ================================================================
node "%~dp0backend\db\createBackup.js"
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Node backup failed, attempting PowerShell fallback...
    powershell -ExecutionPolicy Bypass -File "%~dp0create_backup.ps1"
)
pause
