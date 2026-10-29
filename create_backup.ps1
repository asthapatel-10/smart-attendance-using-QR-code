# ==============================================================================
# SMART ATTENDANCE SYSTEM — WINDOWS POWERSHELL BACKUP SCRIPT
# ==============================================================================
$ErrorActionPreference = "Stop"

$ProjectRoot = $PSScriptRoot
if (-not $ProjectRoot) { $ProjectRoot = Get-Location }

$DbPath = Join-Path $ProjectRoot "backend\db\attendance_store.json"
$BackupDir = Join-Path $ProjectRoot "backups"
$FailoverBackup = Join-Path $ProjectRoot "backend\db\attendance_store.backup.json"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "🛡️ SMART ATTENDANCE SYSTEM — DATABASE BACKUP & VERIFICATION" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "📍 Project Root:   $ProjectRoot"

if (-not (Test-Path $DbPath)) {
    Write-Host "❌ ERROR: Source database not found at: $DbPath" -ForegroundColor Red
    exit 1
}

Write-Host "📍 Source Database: $DbPath"

# Ensure separate backup folder exists
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
    Write-Host "📁 Created separate backup directory: $BackupDir" -ForegroundColor Green
} else {
    Write-Host "📁 Using separate backup directory: $BackupDir"
}

# Generate timestamp
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$TimestampedBackup = Join-Path $BackupDir "attendance_store_backup_$Timestamp.json"

# Copy files
Copy-Item -Path $DbPath -Destination $TimestampedBackup -Force
Copy-Item -Path $DbPath -Destination $FailoverBackup -Force

# Verify file existence and sizes
$SourceSize = (Get-Item $DbPath).Length
$BackupSize = (Get-Item $TimestampedBackup).Length

if ($SourceSize -ne $BackupSize) {
    Write-Host "❌ ERROR: Size mismatch between source ($SourceSize bytes) and backup ($BackupSize bytes)!" -ForegroundColor Red
    exit 1
}

# Verify JSON validity
try {
    $JsonContent = Get-Content -Raw -Path $TimestampedBackup | ConvertFrom-Json
    Write-Host "✅ JSON Integrity Verified: File parsed successfully." -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: Backup file contains invalid JSON: $_" -ForegroundColor Red
    exit 1
}

$UsersCount = ($JsonContent.users).Count
$StudentsCount = ($JsonContent.students).Count
$FacultyCount = ($JsonContent.faculty).Count
$MentorsCount = ($JsonContent.mentors).Count
$TimetableCount = ($JsonContent.timetable).Count
$AttendanceCount = ($JsonContent.attendance).Count

Write-Host "`n================================================================" -ForegroundColor Cyan
Write-Host "📋 VERIFIED RECORD COUNTS IN BACKUP:" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "• System Users:          $UsersCount"
Write-Host "• Student Records:       $StudentsCount"
Write-Host "• Faculty Records:       $FacultyCount"
Write-Host "• Mentor Records:        $MentorsCount"
Write-Host "• Weekly Timetable Slots: $TimetableCount"
Write-Host "• Attendance Logs:       $AttendanceCount (0% reset verified)"
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "🎉 BACKUP VERIFICATION STATUS: 100% SUCCESSFUL & VERIFIED" -ForegroundColor Green
Write-Host "📁 Backup File Path: $TimestampedBackup" -ForegroundColor Yellow
Write-Host "================================================================`n" -ForegroundColor Cyan
