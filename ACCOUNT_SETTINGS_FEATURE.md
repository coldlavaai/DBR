# Account Settings Feature

## Overview

Added comprehensive account settings system allowing users to customize their dashboard layout and preferences. All settings are saved to their account and persist across devices.

## Features

### 1. Section Layout Customization
- **Drag & Drop Reorder**: Rearrange sections in any order
- **Show/Hide Sections**: Hide sections you don't use
- **Collapsed State**: Set default expanded/collapsed for each section

### 2. Dashboard Settings
- **Default Time Range**: Choose your preferred filter (today/week/month/all)
- **Auto-Refresh**: Enable/disable and set interval (15s/30s/60s/off)

### 3. Metric Cards
- **Show/Hide Cards**: Choose which metrics to display
- 7 customizable cards: Total Leads, Messages Sent, Reply Rate, Hot Leads, Avg Response, Total Calls Booked, Upcoming Calls

## Implementation

### Database Schema
- New table: `user_preferences`
- Stores: section_order, sections_expanded, sections_visible, default_time_range, auto_refresh_enabled, auto_refresh_interval, visible_metric_cards
- Auto-updates `updated_at` timestamp

### API Endpoints
- `GET /api/user/preferences` - Load user preferences
- `POST /api/user/preferences` - Save preferences

### Components
- `AccountSettingsModal.tsx` - Settings UI with 3 tabs (Layout, Dashboard, Metrics)
- Updated `DashboardHeader.tsx` - Added "Account Settings" to user menu
- Updated `EnhancedDbrDashboard.tsx` - Integrated preferences system

## Setup Instructions

### 1. Run Database Migration

Run the SQL migration from `migrations/create_user_preferences.sql`:

```bash
# Via Vercel CLI
vercel postgres run < migrations/create_user_preferences.sql

# Or via Vercel Dashboard
# Storage → Postgres → Data → Query → Paste SQL
```

### 2. Add to Auth Config

The `/api/user/preferences` endpoint is already set up with NextAuth session handling.

### 3. Deploy

```bash
git add .
git commit -m "Add account settings feature"
git push
```

##Usage

1. Click your user avatar in the top right
2. Select "Account Settings"
3. Customize via 3 tabs:
   - **Layout**: Drag sections, toggle visibility, set collapsed state
   - **Dashboard**: Set default time range and auto-refresh
   - **Metrics**: Show/hide metric cards
4. Click "Save Changes"

Settings are applied immediately and persist across sessions.

## Technical Details

### Preferences Storage
- Stored in PostgreSQL `user_preferences` table
- One record per user (UNIQUE constraint on user_id)
- Falls back to sensible defaults if no preferences exist

### State Management
- Dashboard loads preferences on mount
- Applies preferences to section order, visibility, collapsed state
- Saves section order changes automatically (drag & drop)
- Manual save for other settings via settings modal

### Performance
- Preferences loaded once on mount
- No impact on dashboard performance
- Settings modal uses React portals for optimal rendering

## Future Enhancements

Potential additions:
- Theme customization (dark/light mode)
- Notification preferences
- Export formats
- Custom metric thresholds
- Email digest preferences
