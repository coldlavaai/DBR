# ✅ Deployment Complete!

Your DBR Dashboard authentication system is **deployed and ready**!

🌐 **Production URL:** https://greenstar-dbr-dashboard-olivers-projects-a3cbd2e0.vercel.app

---

## 🔥 Final Step: Set Up Database

You're almost done! Just need to create the Postgres database and run one SQL script.

### Step 1: Create Postgres Database (2 minutes)

1. Open: https://vercel.com/olivers-projects-a3cbd2e0/greenstar-dbr-dashboard/stores
2. Click **Create Database**
3. Select **Postgres**
4. Name: `dbr-users-prod`
5. Region: **US East (iad1)**
6. Click **Create**

✅ Vercel will automatically inject all `POSTGRES_*` environment variables.

### Step 2: Run Database Schema (1 minute)

Once database is created:

1. Click on the new database
2. Go to **Query** tab
3. Copy and paste this entire SQL:

```sql
-- User accounts table for DBR Dashboard authentication
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  password_hash VARCHAR(255),
  role VARCHAR(50) DEFAULT 'user',
  image VARCHAR(500),
  email_verified TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT true
);

-- OAuth accounts table (for Google, Apple, etc.)
CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  provider_account_id VARCHAR(255) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at INTEGER,
  token_type VARCHAR(50),
  scope TEXT,
  id_token TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, provider_account_id)
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  expires TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Verification tokens (for email verification)
CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires TIMESTAMP NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);

-- Insert default admin user (password: 'admin123' - CHANGE THIS!)
INSERT INTO users (email, name, password_hash, role, is_active, email_verified)
VALUES (
  'oliver@coldlava.ai',
  'Oliver Tatler',
  '$2b$10$qZ1gfGXln9N1FPkn3mPhd.9jhgGD37h/b7KyjeHTeFc/3A4D4j7de',
  'admin',
  true,
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO NOTHING;
```

4. Click **Run Query**
5. You should see: `✓ Success` with "1 row inserted"

---

## 🎉 You're Done! Time to Login

### Your Credentials:
- **Email:** `oliver@coldlava.ai`
- **Password:** `admin123`

### Login URL:
https://greenstar-dbr-dashboard-olivers-projects-a3cbd2e0.vercel.app

🔒 **IMPORTANT:** Change your password immediately after first login!

1. Log in with the credentials above
2. Click your profile icon (top right)
3. Click **Manage Users**
4. Find your account
5. Update password
6. Save

---

## ✨ What You Can Do Now

### As Admin:
- ✅ View the full DBR analytics dashboard
- ✅ Create new user accounts
- ✅ Assign roles (Admin or User)
- ✅ Activate/deactivate users
- ✅ Delete users
- ✅ Manage permissions

### Features:
- 🔐 Email/password login
- 🌐 Google OAuth (optional - needs setup)
- 🍎 Apple OAuth (optional - needs setup)
- 🔒 Role-based access control
- ⏰ 30-day persistent sessions (stay logged in)
- 🛡️ Secure JWT tokens with bcrypt hashing
- 🚀 Protected routes via middleware

---

## 📚 Need OAuth Setup?

If you want Google or Apple login, see `AUTH_SETUP_GUIDE.md` for detailed instructions.

For now, email/password login is fully functional!

---

## 🆘 Troubleshooting

### Can't access the site?
- Make sure you ran the SQL schema in Vercel Postgres
- Check environment variables are set: `AUTH_SECRET`, `NEXTAUTH_URL`, `POSTGRES_URL`

### Login not working?
- Double-check email: `oliver@coldlava.ai`
- Double-check password: `admin123`
- Try clearing browser cookies
- Check Vercel Postgres has data: Run `SELECT * FROM users;`

### Need help?
Email: oliver@coldlava.ai

---

**Built with ❤️ by Cold Lava AI**
