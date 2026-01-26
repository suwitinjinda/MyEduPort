@echo off
echo Running Security Fields Migration...
echo.
echo Please enter MySQL root password when prompted.
echo.
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p myeduport < alter_add_security_fields.sql
echo.
echo Migration complete!
pause
