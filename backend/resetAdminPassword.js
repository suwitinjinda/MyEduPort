const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const bcrypt = require('bcryptjs');

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'myeduport'
};

async function resetAdminPassword() {
  let connection;
  try {
    console.log('=== Reset Admin Password ===\n');
    console.log('Target Email: admin@gmail.com\n');
    console.log('Attempting to connect to MySQL...');
    console.log(`  Host: ${dbConfig.host}`);
    console.log(`  Port: ${dbConfig.port}`);
    console.log(`  Database: ${dbConfig.database}`);
    console.log(`  User: ${dbConfig.user}`);
    console.log('');
    
    // Connect to MySQL
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to MySQL database\n');
    
    // Find admin user
    const [users] = await connection.execute(
      'SELECT id, email, name, role FROM users WHERE email = ?',
      ['admin@gmail.com']
    );
    
    if (users.length === 0) {
      console.log('❌ User with email "admin@gmail.com" not found in database.');
      console.log('\nAvailable users:');
      const [allUsers] = await connection.execute('SELECT id, email, name, role FROM users LIMIT 10');
      allUsers.forEach(user => {
        console.log(`  - ${user.email} (${user.name}, ${user.role})`);
      });
      await connection.end();
      return;
    }
    
    const adminUser = users[0];
    console.log('✅ Found admin user:');
    console.log(`   ID: ${adminUser.id}`);
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Name: ${adminUser.name}`);
    console.log(`   Role: ${adminUser.role}`);
    console.log('');
    
    // Generate new password
    const newPassword = 'Admin@123'; // Default new password
    console.log(`Setting new password: ${newPassword}`);
    console.log('(You can change this after logging in)\n');
    
    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Update password in database
    await connection.execute(
      'UPDATE users SET password_hash = ? WHERE id = ?',
      [passwordHash, adminUser.id]
    );
    
    console.log('✅ Password reset successfully!\n');
    console.log('=== Login Credentials ===');
    console.log(`Email: ${adminUser.email}`);
    console.log(`Password: ${newPassword}`);
    console.log('\n⚠️  IMPORTANT: Please change this password after logging in!');
    console.log('Go to Account Settings > Change Password\n');
    
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
    }
    if (connection) {
      await connection.end();
    }
    process.exit(1);
  }
}

resetAdminPassword();
