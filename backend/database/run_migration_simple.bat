@echo off
echo ========================================
echo Security Fields Migration
echo ========================================
echo.
echo This will add security fields to the users table.
echo.
echo Please enter your MySQL ROOT password when prompted.
echo.
pause
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p myeduport < alter_add_security_fields.sql
echo.
echo ========================================
if %ERRORLEVEL% EQU 0 (
    echo Migration completed successfully!
) else (
    echo Migration failed. Please check the error messages above.
)
echo ========================================
pause
