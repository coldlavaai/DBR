# Database Migrations

## Running the User Preferences Migration

To enable the account settings feature, you need to run the user preferences migration.

### Option 1: Via Vercel Dashboard (Recommended)

1. Go to your Vercel project dashboard
2. Navigate to **Storage** → **Postgres** → **Data** → **Query**
3. Copy the SQL from `create_user_preferences.sql`
4. Paste and execute in the query editor

### Option 2: Via Vercel CLI

```bash
# Connect to your database
vercel env pull

# Run the migration
vercel postgres run < migrations/create_user_preferences.sql
```

### Option 3: Locally (if using local Postgres)

```bash
psql -d your_database_name -f migrations/create_user_preferences.sql
```

## What This Migration Does

- Creates `user_preferences` table
- Stores dashboard customization settings per user:
  - Section order (drag & drop arrangement)
  - Visible/hidden sections
  - Collapsed/expanded states
  - Default time range
  - Auto-refresh settings
  - Metric card visibility
- Auto-updates `updated_at` timestamp on changes
- One preferences record per user (enforced by UNIQUE constraint)

## After Migration

Users can customize their dashboard via **Account Settings** in the user menu:
- Drag to reorder sections
- Show/hide sections
- Set default collapsed state
- Choose default time range
- Configure auto-refresh interval
- Show/hide metric cards

All preferences are saved to their account and persist across devices/browsers.
