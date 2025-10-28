# DBR Dashboard - Authentication Setup Guide

This guide will help you set up the authentication system for the DBR Dashboard, including user login, OAuth providers (Google/Apple), and role-based access control.

## Overview

The authentication system uses:
- **Auth.js v5** (NextAuth.js) for authentication
- **Vercel Postgres** for user database
- **Google & Apple OAuth** for social login
- **Email/Password** for traditional login
- **Role-based access control** (Admin & User roles)

## Quick Start

### 1. Generate Auth Secret

Generate a secure secret key for JWT signing:

```bash
openssl rand -base64 32
```

Add this to your `.env.local`:

```env
AUTH_SECRET=your_generated_secret_here
NEXTAUTH_URL=http://localhost:3000
```

For production (Vercel):
```env
AUTH_SECRET=your_generated_secret_here
NEXTAUTH_URL=https://your-domain.vercel.app
```

### 2. Set Up Vercel Postgres

#### Option A: Via Vercel Dashboard (Recommended)

1. Go to your Vercel project dashboard
2. Navigate to **Storage** tab
3. Click **Create Database** → Select **Postgres**
4. Follow the prompts to create your database
5. Vercel will automatically inject the `POSTGRES_*` environment variables

#### Option B: Via Vercel CLI

```bash
cd ~/Documents/greenstar-dbr-dashboard
vercel link  # Link to your Vercel project
vercel env pull .env.local  # Pull environment variables
```

### 3. Initialize Database Schema

Once your Postgres database is set up, run the schema SQL to create the tables:

**From Vercel Dashboard:**
1. Go to Storage → Your Postgres Database
2. Click **Query** tab
3. Copy and paste the contents of `lib/db/schema.sql`
4. Click **Run Query**

**From local CLI (if you have psql):**
```bash
psql $POSTGRES_URL -f lib/db/schema.sql
```

This will create:
- `users` table - User accounts
- `accounts` table - OAuth provider links
- `sessions` table - User sessions
- `verification_tokens` table - Email verification
- Default admin user (oliver@otdm.net)

### 4. Set Up OAuth Providers (Optional)

#### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen
6. Set authorized redirect URIs:
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.vercel.app/api/auth/callback/google`
7. Copy the **Client ID** and **Client Secret**

Add to `.env.local`:
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

#### Apple OAuth

1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Navigate to **Certificates, IDs & Profiles**
3. Create a new **Service ID**
4. Configure Sign in with Apple
5. Set redirect URIs:
   - Local: `http://localhost:3000/api/auth/callback/apple`
   - Production: `https://your-domain.vercel.app/api/auth/callback/apple`
6. Generate client secret (valid for 6 months)

Add to `.env.local`:
```env
APPLE_CLIENT_ID=your_apple_service_id
APPLE_CLIENT_SECRET=your_generated_secret
```

**Note:** If you don't want to use OAuth providers, you can skip this step. Users can still log in with email/password.

## Default Admin Account

A default admin account is created by the schema:

```
Email: oliver@otdm.net
Password: admin123
Role: admin
```

**⚠️ IMPORTANT:** Change this password immediately after first login!

### To change the admin password:

1. Log in as admin
2. Go to **Admin Panel** → **Manage Users**
3. Click on your user
4. Update password
5. Save

Or manually update in database:

```bash
# Generate new password hash
node -e "console.log(require('bcryptjs').hashSync('your_new_password', 10))"

# Update in database (via Vercel Dashboard or psql)
UPDATE users SET password_hash = 'new_hash_here' WHERE email = 'oliver@otdm.net';
```

## User Roles

### Admin Role
- Full access to dashboard
- Can create new users
- Can manage user roles
- Can activate/deactivate users
- Can delete users
- Can access admin panel at `/admin/users`

### User Role
- Can view dashboard
- Can read and write data
- Cannot edit settings
- Cannot manage other users
- No access to admin panel

## Creating Users

### Via Admin Panel (Recommended)

1. Log in as admin
2. Click your profile → **Manage Users**
3. Click **Create User**
4. Fill in:
   - Email (required)
   - Name (optional)
   - Password (min 8 characters)
   - Role (Admin or User)
5. Click **Create User**

The user can now log in with their email and password.

### Via API

```bash
curl -X POST https://your-domain.vercel.app/api/admin/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "name": "New User",
    "password": "securepassword123",
    "role": "user"
  }'
```

## Session Management

- Sessions last **30 days** by default
- Users stay logged in until they manually log out
- Sessions use JWT tokens (stored in HTTP-only cookies)
- Tokens are automatically refreshed

## Security Features

✅ **Bcrypt password hashing** (10 rounds)
✅ **HTTP-only cookies** (prevents XSS)
✅ **CSRF protection** (built into Auth.js)
✅ **Secure sessions** (30-day expiry)
✅ **Role-based access control**
✅ **Account linking** (same email across providers)
✅ **SQL injection prevention** (parameterized queries)

## Protected Routes

All routes are protected by default except:
- `/auth/login` - Login page
- `/auth/error` - Error page
- `/api/auth/*` - Auth API routes

Users who are not logged in are automatically redirected to `/auth/login`.

## Deployment Checklist

### Local Development

- [ ] Generate `AUTH_SECRET`
- [ ] Set `NEXTAUTH_URL=http://localhost:3000`
- [ ] Set up Vercel Postgres (or local Postgres)
- [ ] Run database schema SQL
- [ ] (Optional) Configure Google/Apple OAuth
- [ ] Test login with default admin account
- [ ] Change default admin password

### Production (Vercel)

- [ ] Generate new `AUTH_SECRET` for production
- [ ] Set `NEXTAUTH_URL=https://your-domain.vercel.app`
- [ ] Create Vercel Postgres database
- [ ] Run database schema in production
- [ ] (Optional) Configure OAuth with production redirect URIs
- [ ] Test login in production
- [ ] Create additional user accounts
- [ ] Remove or change default admin credentials

## Testing

### Test Login Flow

1. Navigate to `http://localhost:3000` (or production URL)
2. You should be redirected to `/auth/login`
3. Try logging in with:
   - Email: `oliver@otdm.net`
   - Password: `admin123`
4. You should be redirected to `/dbr-analytics`
5. Click your profile icon in the header
6. Verify you see "Admin" badge

### Test OAuth (if configured)

1. Go to `/auth/login`
2. Click "Continue with Google" or "Continue with Apple"
3. Complete OAuth flow
4. Verify you're logged in and redirected to dashboard

### Test Admin Panel

1. Log in as admin
2. Click profile → "Manage Users"
3. Try creating a new user
4. Try changing user roles
5. Try deactivating/activating users

### Test Logout

1. Click profile → "Sign Out"
2. Verify redirect to `/auth/login`
3. Try accessing `/dbr-analytics` directly
4. Verify redirect back to login

## Troubleshooting

### "AUTH_SECRET is not set"
**Solution:** Generate and add `AUTH_SECRET` to your environment variables.

### "Database connection failed"
**Solution:** Verify `POSTGRES_URL` is set correctly. Check Vercel dashboard for database connection string.

### "User not found" or "Invalid password"
**Solution:** Verify the database schema was run correctly and the admin user exists.

### OAuth redirect errors
**Solution:**
- Verify redirect URIs match exactly in provider console
- Check `NEXTAUTH_URL` is set correctly
- Ensure OAuth credentials are valid

### Session expires immediately
**Solution:**
- Clear browser cookies
- Verify `AUTH_SECRET` is the same across requests
- Check system time is correct

### Can't access admin panel
**Solution:**
- Verify your user role is 'admin' in database
- Check middleware is allowing admin routes
- Clear session and log in again

## Database Queries

### Check all users
```sql
SELECT id, email, name, role, is_active, created_at FROM users;
```

### Update user role
```sql
UPDATE users SET role = 'admin' WHERE email = 'user@example.com';
```

### Activate/deactivate user
```sql
UPDATE users SET is_active = true WHERE email = 'user@example.com';
```

### Delete user
```sql
DELETE FROM users WHERE email = 'user@example.com';
```

## Support

For issues or questions:
- Email: oliver@otdm.net
- GitHub: https://github.com/coldlavaai/DBR

---

**Built with ❤️ by Cold Lava AI**
