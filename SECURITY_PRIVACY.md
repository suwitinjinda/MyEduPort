# Security, Privacy, and Admin Features

This document outlines the security, privacy, and administrative features implemented in MyEduPort.

## Security Features

### 1. HTTPS Everywhere
- **Status**: Configured at deployment level
- **Implementation**: Use HTTPS in production (configure reverse proxy like Nginx or use hosting platform SSL)
- **Note**: For local development, HTTP is acceptable. Production deployments must use HTTPS.

### 2. Password Security
- **Hashing**: Passwords are hashed using `bcryptjs` with salt rounds of 10
- **Storage**: Only password hashes are stored in the database, never plain text passwords
- **Implementation**: `backend/src/routes/auth.js`
  ```javascript
  const passwordHash = await bcrypt.hash(password, 10);
  ```

### 3. Authentication
- **Method**: JWT (JSON Web Tokens)
- **Token Expiration**: 7 days
- **Token Storage**: Client-side (localStorage)
- **Implementation**: `backend/src/routes/auth.js` and `backend/src/middleware/auth.js`

### 4. Role-Based Access Control (RBAC)
- **Roles**: `student`, `parent`, `admin`
- **Parent Access**: Parents can only view students they are linked to via invite code
- **Student Access**: Students can only access their own data
- **Admin Access**: Admin users (defined by `ADMIN_EMAIL` in `.env`) have full access
- **Implementation**: 
  - `backend/src/middleware/auth.js` - Token verification
  - `backend/src/routes/parents.js` - Parent-student link verification
  - `backend/src/routes/admin.js` - Admin-only routes

### 5. Account Status Management
- **Active**: Normal account status
- **Disabled**: Account is disabled but not deleted (can be re-enabled)
- **Deleted**: Account is soft-deleted with `deleted_at` timestamp
- **Implementation**: `backend/src/middleware/auth.js` checks account status on every request

## Privacy Features

### 1. Data Consent
- **Requirement**: Users must consent to data processing during registration
- **Storage**: Consent is stored in `users.data_consent` field
- **Purpose**: 
  - Personalized guidance and recommendations
  - AI model improvement
  - Service enhancement
- **Withdrawal**: Users can withdraw consent by deleting their account
- **Implementation**: `frontend/src/pages/Login.jsx` - Consent checkbox in registration

### 2. Account Deletion
- **Self-Service**: Users can delete their own accounts
- **Admin Deletion**: Admins can delete any user account
- **Soft Delete**: Accounts are soft-deleted (marked with `deleted_at` timestamp)
- **Data Cascade**: Related data is handled via database CASCADE foreign keys
- **Confirmation**: Requires typing "DELETE" to confirm
- **Implementation**: 
  - `backend/src/routes/auth.js` - `DELETE /api/auth/me`
  - `frontend/src/pages/Settings.jsx` - Account deletion UI

### 3. Data Access Control
- **Parents**: Can only access data for students they are linked to
- **Students**: Can only access their own data
- **Cross-Access Prevention**: Database queries verify parent-student links before returning data
- **Implementation**: `backend/src/routes/parents.js` - Link verification on all parent routes

## Admin Features

### 1. Admin Panel Access
- **Authentication**: Admin users identified by `ADMIN_EMAIL` environment variable
- **Route Protection**: All admin routes check `isAdmin()` function
- **Implementation**: `backend/src/routes/admin.js`

### 2. User Management
- **View Users**: List all users with status, consent, and role information
- **Disable/Enable**: Toggle user account status
- **Delete Users**: Permanently delete user accounts
- **Implementation**: 
  - `GET /api/admin/users` - List users
  - `PUT /api/admin/users/:id/disable` - Toggle status
  - `DELETE /api/admin/users/:id` - Delete user

### 3. Student Overview
- **View Students**: List all students with portfolio statistics
- **Statistics**: Academic records, activities, tests, awards counts
- **Status**: See which students have disabled accounts
- **Implementation**: `GET /api/admin/students`

### 4. Usage Statistics
- **Metrics**: Total users, students, parents, academics, activities, tests, awards, essays, universities
- **Disabled Accounts**: Count of disabled accounts
- **Implementation**: `GET /api/admin/stats`

### 5. University Database Management
- **View Universities**: List all universities with filtering
- **Add University**: Create new university entries
- **Edit University**: Update existing university information
- **Delete University**: Remove universities from database
- **Implementation**: 
  - `GET /api/admin/universities` - List universities
  - `GET /api/admin/universities/:id` - Get single university
  - `POST /api/admin/universities` - Create university
  - `PUT /api/admin/universities/:id` - Update university
  - `DELETE /api/admin/universities/:id` - Delete university

## Database Schema Updates

### Users Table Additions
```sql
ALTER TABLE users 
ADD COLUMN data_consent BOOLEAN DEFAULT FALSE,
ADD COLUMN is_disabled BOOLEAN DEFAULT FALSE,
ADD COLUMN deleted_at TIMESTAMP NULL;
```

### Indexes
```sql
CREATE INDEX idx_users_disabled ON users(is_disabled);
CREATE INDEX idx_users_deleted ON users(deleted_at);
```

## Frontend Features

### 1. Settings Page
- **Location**: `/settings`
- **Features**:
  - Account deletion with confirmation
  - Data consent information
  - Privacy policy links
- **Implementation**: `frontend/src/pages/Settings.jsx`

### 2. Admin Dashboard
- **Location**: `/admin`
- **Features**:
  - Overview with statistics
  - User management
  - Student overview
  - University database management
- **Implementation**: `frontend/src/pages/Admin.jsx`

### 3. Registration Consent
- **Requirement**: Users must check consent checkbox to register
- **Validation**: Frontend and backend validation
- **Implementation**: `frontend/src/pages/Login.jsx`

## Environment Variables

Required environment variables for security:
```env
JWT_SECRET=your-secret-key-here
ADMIN_EMAIL=admin@example.com
```

## Deployment Security Checklist

- [ ] HTTPS enabled (SSL/TLS certificate)
- [ ] `JWT_SECRET` is a strong, random value
- [ ] `ADMIN_EMAIL` is set to admin user's email
- [ ] Database credentials are secure
- [ ] CORS is properly configured
- [ ] File uploads are restricted and validated
- [ ] Rate limiting is implemented (recommended)
- [ ] Regular security updates for dependencies

## Privacy Policy Requirements

The application requires a Privacy Policy that should cover:
1. Data collection and processing purposes
2. AI model training and improvement
3. Data sharing policies
4. User rights (access, deletion, correction)
5. Data retention policies
6. Security measures
7. Contact information for privacy concerns

## Compliance Notes

- **GDPR**: Users can delete accounts and withdraw consent
- **Data Minimization**: Only necessary data is collected
- **Access Control**: Role-based access ensures data privacy
- **Audit Trail**: Soft deletes maintain audit trail

---

**Last Updated**: January 2025  
**Version**: 1.0
