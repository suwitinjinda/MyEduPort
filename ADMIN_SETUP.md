# Admin Setup Guide

## How to Set Up Admin Access

### Step 1: Set Admin Email in Backend

1. Open `backend/.env` file
2. Add or update the `ADMIN_EMAIL` line:
   ```env
   ADMIN_EMAIL=your-admin-email@example.com
   ```
3. Replace `your-admin-email@example.com` with the email address you want to use as admin
4. Restart the backend server

### Step 2: Verify Admin Status

1. Login with the email you set as `ADMIN_EMAIL`
2. Open browser console (F12) and check for:
   - "Admin check result: true" - means you're admin
   - "Admin check result: false" - means you're not admin
3. Check the user profile dropdown - you should see:
   - "Admin Panel" option in the dropdown menu
   - "Admin" link in the navigation bar

### Step 3: Troubleshooting

**If Admin Panel doesn't appear:**

1. **Check .env file:**
   - Make sure `ADMIN_EMAIL` is set correctly
   - Make sure there are no extra spaces
   - Make sure the email matches exactly (case-sensitive)

2. **Check backend logs:**
   - Look for any errors when calling `/api/admin/check`
   - Verify the endpoint is accessible

3. **Check browser console:**
   - Open Developer Tools (F12)
   - Look for "Admin check result:" in the console
   - Check for any error messages

4. **Verify email match:**
   - The email in your JWT token must match `ADMIN_EMAIL` exactly
   - Or your user role must be "admin" in the database

### Alternative: Set Role to "admin" in Database

If you want to set admin via database role instead of email:

```sql
USE myeduport;
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

**Note:** The `users` table currently only allows 'student' or 'parent' roles. You may need to modify the schema to allow 'admin' role, or use the `ADMIN_EMAIL` method instead.

## Current Admin Check Logic

The system checks if a user is admin by:
1. Comparing their email to `ADMIN_EMAIL` environment variable
2. OR checking if their role is "admin" in the database

```javascript
// Backend: backend/src/routes/admin.js
function isAdmin(user) {
  return user.email === process.env.ADMIN_EMAIL || user.role === "admin";
}
```

## Testing Admin Access

1. Login with admin email
2. Check navigation bar - should see "Admin" link
3. Click user profile dropdown - should see "Admin Panel" option
4. Click "Admin Panel" - should access admin dashboard
