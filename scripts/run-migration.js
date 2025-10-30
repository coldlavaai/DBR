const { neon } = require('@neondatabase/serverless');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  try {
    console.log('🔄 Running user preferences migration...');

    // Create Neon client
    const sql = neon(process.env.POSTGRES_URL);

    // Read the migration file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../migrations/create_user_preferences.sql'),
      'utf8'
    );

    // Split SQL into statements intelligently
    // Group lines between $$ delimiters (function definitions)
    const lines = migrationSQL.split('\n');
    const statements = [];
    let currentStatement = [];
    let inFunction = false;

    for (const line of lines) {
      // Skip comments
      if (line.trim().startsWith('--')) continue;

      // Track function boundaries
      if (line.includes('$$')) {
        inFunction = !inFunction;
      }

      currentStatement.push(line);

      // End of statement (semicolon outside of function)
      if (line.includes(';') && !inFunction) {
        statements.push(currentStatement.join('\n').trim());
        currentStatement = [];
      }
    }

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt.length > 0) {
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        try {
          await sql(stmt);
        } catch (error) {
          if (error.message && error.message.includes('already exists')) {
            console.log(`⚠️  Statement ${i + 1} already exists - skipping`);
          } else {
            throw error;
          }
        }
      }
    }

    console.log('✅ Migration completed successfully!');
    console.log('✅ user_preferences table created');
    console.log('✅ Indexes and triggers set up');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
