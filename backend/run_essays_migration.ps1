# PowerShell script to run essays table migration
# Run this script from the backend directory

$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$sqlFile = "database\alter_add_essays.sql"
$database = "myeduport"

Write-Host "Running essays table migration..." -ForegroundColor Yellow
Write-Host "You will be prompted for MySQL root password" -ForegroundColor Yellow

# Read SQL file content
$sqlContent = Get-Content $sqlFile -Raw

# Execute SQL
& $mysqlPath -u root -p $database -e $sqlContent

Write-Host "Migration completed!" -ForegroundColor Green
