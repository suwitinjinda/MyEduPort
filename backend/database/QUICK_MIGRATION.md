# Quick Migration Guide

## Run Security Fields Migration

You need to run the migration to add security fields to the database. Choose one method:

### Method 1: Double-click Batch File (Easiest)

1. Navigate to: `d:\DevProject\portfolio\backend\database`
2. Double-click `run_migration.bat`
3. Enter your MySQL **root** password when prompted
4. Wait for "Migration complete!" message

### Method 2: PowerShell Command

1. Open PowerShell
2. Navigate to the database folder:
   ```powershell
   cd d:\DevProject\portfolio\backend\database
   ```
3. Run:
   ```powershell
   Get-Content alter_add_security_fields.sql | & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p myeduport
   ```
4. Enter your MySQL **root** password when prompted

### Method 3: MySQL Command Line

1. Open Command Prompt or PowerShell
2. Run:
   ```cmd
   "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p
   ```
3. Enter your password
4. Run these commands:
   ```sql
   USE myeduport;
   SOURCE d:/DevProject/portfolio/backend/database/alter_add_security_fields.sql;
   ```

### Verify Migration

After running, verify it worked:

```sql
DESCRIBE users;
```

You should see these new columns:
- `data_consent`
- `is_disabled`  
- `deleted_at`

### Common Errors

- **"Duplicate column name"**: Migration already ran - this is OK!
- **"Access denied"**: Wrong password - make sure you're using the **root** password
- **"Unknown database"**: Make sure the database `myeduport` exists
