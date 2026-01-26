@echo off
echo Running Essays Table Migration...
echo.
echo Please enter MySQL root password when prompted.
echo.
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p myeduport < alter_add_essays.sql
echo.
if %ERRORLEVEL% EQU 0 (
    echo Migration completed successfully!
) else (
    echo Migration failed. Please check the error messages above.
)
pause
