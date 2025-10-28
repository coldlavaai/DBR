import { sql } from '@vercel/postgres'
import * as fs from 'fs'
import * as path from 'path'

async function initDatabase() {
  try {
    console.log('🔄 Initializing database...')

    // Read the schema file
    const schemaPath = path.join(process.cwd(), 'lib', 'db', 'schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf-8')

    // Execute the schema
    await sql.query(schema)

    console.log('✅ Database initialized successfully!')
    console.log('📧 Default admin user created: oliver@coldlava.ai')
    console.log('🔑 Default password: admin123')
    console.log('⚠️  IMPORTANT: Change this password after first login!')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error initializing database:', error)
    process.exit(1)
  }
}

initDatabase()
