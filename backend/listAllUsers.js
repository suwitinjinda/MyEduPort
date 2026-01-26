const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'myeduport'
};

async function listAllUsers() {
  let connection;
  try {
    console.log('=== Portfolio Project - User & Admin Check ===\n');
    console.log('Attempting to connect to MySQL...');
    console.log(`  Host: ${dbConfig.host}`);
    console.log(`  Port: ${dbConfig.port}`);
    console.log(`  Database: ${dbConfig.database}`);
    console.log(`  User: ${dbConfig.user}`);
    console.log(`  Admin Email (from .env): ${process.env.ADMIN_EMAIL || 'Not set'}`);
    console.log('');
    
    // Connect to MySQL
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to MySQL database\n');
    
    // Check if users table exists
    const [tables] = await connection.execute(
      "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'",
      [dbConfig.database]
    );

    if (tables.length === 0) {
      console.log('⚠️  Users table not found in the database.');
      console.log('The database might not be initialized yet.');
      await connection.end();
      return;
    }

    // Get admin email from env
    const adminEmail = process.env.ADMIN_EMAIL || '';
    
    // Get all users - check for security columns
    let allUsers;
    try {
      // Try with security columns first
      [allUsers] = await connection.execute(
        `SELECT id, email, role, name, data_consent, is_disabled, deleted_at, created_at 
         FROM users 
         WHERE deleted_at IS NULL
         ORDER BY created_at DESC`
      );
    } catch (err) {
      // Fallback to basic query if security columns don't exist
      [allUsers] = await connection.execute(
        `SELECT id, email, role, name, created_at 
         FROM users 
         ORDER BY created_at DESC`
      );
      // Add default values
      allUsers = allUsers.map(user => ({
        ...user,
        data_consent: null,
        is_disabled: false,
        deleted_at: null
      }));
    }

    console.log('=== All Registered Users ===');
    console.log(`Total users found: ${allUsers.length}\n`);

    if (allUsers.length === 0) {
      console.log('No users found in the database.');
      console.log('No one has registered yet.');
    } else {
      allUsers.forEach((user, index) => {
        const isAdmin = user.email === adminEmail || user.role === 'admin';
        console.log(`${index + 1}. User Details:`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Name: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Is Admin: ${isAdmin ? '✅ YES' : '❌ NO'} ${isAdmin ? `(matches ADMIN_EMAIL: ${adminEmail})` : ''}`);
        if (user.is_disabled) console.log(`   ⚠️  Account Status: DISABLED`);
        if (user.deleted_at) console.log(`   ⚠️  Account Status: DELETED (${user.deleted_at})`);
        if (user.data_consent !== null) console.log(`   Data Consent: ${user.data_consent ? 'Yes' : 'No'}`);
        console.log(`   Registered: ${user.created_at}`);
        console.log('');
      });
    }

    // Show summary by role
    if (allUsers.length > 0) {
      const [roleSummary] = await connection.execute(
        'SELECT role, COUNT(*) as count FROM users WHERE deleted_at IS NULL GROUP BY role'
      );
      
      console.log('=== Summary by Role ===');
      roleSummary.forEach(row => {
        console.log(`  ${row.role}: ${row.count} user(s)`);
      });
      
      // Count admins
      const adminCount = allUsers.filter(u => u.email === adminEmail || u.role === 'admin').length;
      console.log(`  Admin users: ${adminCount} (email matches ${adminEmail || 'ADMIN_EMAIL not set'})`);
      console.log('');
    }

    // Show total counts
    const [totalResult] = await connection.execute('SELECT COUNT(*) as total FROM users WHERE deleted_at IS NULL');
    const [studentResult] = await connection.execute(
      "SELECT COUNT(*) as total FROM users WHERE role = 'student' AND deleted_at IS NULL"
    );
    const [parentResult] = await connection.execute(
      "SELECT COUNT(*) as total FROM users WHERE role = 'parent' AND deleted_at IS NULL"
    );
    
    console.log('=== Database Statistics ===');
    console.log(`Total active users: ${totalResult[0].total}`);
    console.log(`Students: ${studentResult[0].total}`);
    console.log(`Parents: ${parentResult[0].total}`);
    
    // Check for disabled/deleted users
    try {
      const [disabledResult] = await connection.execute(
        'SELECT COUNT(*) as total FROM users WHERE is_disabled = TRUE AND deleted_at IS NULL'
      );
      const [deletedResult] = await connection.execute(
        'SELECT COUNT(*) as total FROM users WHERE deleted_at IS NOT NULL'
      );
      console.log(`Disabled accounts: ${disabledResult[0].total}`);
      console.log(`Deleted accounts: ${deletedResult[0].total}`);
    } catch (err) {
      // Security columns don't exist
    }
    console.log('');

    await connection.end();
    console.log('Database connection closed.');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('\n⚠️  Could not connect to MySQL server.');
      console.error('Please make sure MySQL is running:');
      console.error('  1. Check MySQL service: Get-Service MySQL80');
      console.error('  2. Start MySQL: net start MySQL80 (as Administrator)');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\n⚠️  Access denied. Please check your MySQL credentials in .env file.');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error(`\n⚠️  Database "${dbConfig.database}" does not exist.`);
      console.error('Run the schema.sql file to create the database.');
    }
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

listAllUsers();
