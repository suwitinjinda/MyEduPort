# Security Fields Migration Script
Write-Host "Running Security Fields Migration..." -ForegroundColor Cyan
Write-Host ""
Write-Host "This will add the following columns to the users table:" -ForegroundColor Yellow
Write-Host "  - data_consent (BOOLEAN)" -ForegroundColor Gray
Write-Host "  - is_disabled (BOOLEAN)" -ForegroundColor Gray
Write-Host "  - deleted_at (TIMESTAMP)" -ForegroundColor Gray
Write-Host ""

$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$sqlFile = Join-Path $PSScriptRoot "alter_add_security_fields.sql"

if (-not (Test-Path $mysqlPath)) {
    Write-Host "Error: MySQL not found at $mysqlPath" -ForegroundColor Red
    Write-Host "Please update the mysqlPath variable in this script." -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path $sqlFile)) {
    Write-Host "Error: SQL file not found at $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host "Please enter your MySQL root password when prompted..." -ForegroundColor Yellow
Write-Host ""

# Read SQL file content
$sqlContent = Get-Content $sqlFile -Raw

# Execute SQL
& $mysqlPath -u root -p myeduport -e $sqlContent

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Migration completed successfully!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Migration failed. Please check the error messages above." -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
