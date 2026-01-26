# Running the Security Fields Migration

## Option 1: Using MySQL Command Line (Recommended)

1. Open PowerShell or Command Prompt
2. Navigate to the database folder:
   ```powershell
   cd d:\DevProject\portfolio\backend\database
   ```
3. Run the migration:
   ```powershell
   & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p myeduport < alter_add_security_fields.sql
   ```
4. Enter your MySQL root password when prompted

## Option 2: Using MySQL Interactive Shell

1. Open MySQL command line:
   ```powershell
   & "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p
   ```
2. Enter your password
3. Run:
   ```sql
   USE myeduport;
   SOURCE alter_add_security_fields.sql;
   ```

## Option 3: Using Batch File

1. Double-click `run_migration.bat` in the database folder
2. Enter your MySQL root password when prompted

## What This Migration Does

Adds three new fields to the `users` table:
- `data_consent` (BOOLEAN) - Tracks user consent for data processing
- `is_disabled` (BOOLEAN) - Tracks if account is disabled
- `deleted_at` (TIMESTAMP) - Tracks when account was deleted (soft delete)

Also creates two indexes for performance:
- `idx_users_disabled` - Index on `is_disabled` field
- `idx_users_deleted` - Index on `deleted_at` field

## Verification

After running the migration, verify it worked:

```sql
DESCRIBE users;
```

You should see the new columns: `data_consent`, `is_disabled`, and `deleted_at`.

## Troubleshooting

- **"Duplicate column name" error**: The columns already exist. This is fine - the migration has already been run.
- **"Duplicate key name" error**: The indexes already exist. This is fine - the migration has already been run.
- **"Access denied" error**: Make sure you're using the correct MySQL root password.
