# DBR Analytics Dashboard Guide

## Overview

Your DBR Dashboard now includes a comprehensive **Analytics Dashboard** showing real-time metrics, sentiment analysis, and campaign performance across all 975+ leads.

## Features

### 1. **Time Period Filtering**
Filter analytics by:
- **All Time** - Complete campaign history
- **Last Month** - 30 days
- **Last Week** - 7 days
- **Today** - Messages sent today

### 2. **Key Metrics**

**Total Leads**
- Number of leads in selected time period

**Messages Sent**
- Total messages (M1 + M2 + M3)
- Breakdown by message stage

**Reply Rate**
- Percentage of leads who replied
- Engagement metric

**Hot Leads**
- Number of high-priority conversions

### 3. **Sentiment Analysis**

Visual breakdown showing:
- 🔥 **Positive** - Interested leads
- ❌ **Negative** - Not interested
- 🤔 **Neutral** - Undecided
- 🚫 **Negative Removed** - Opted out
- ❓ **Unclear** - Needs clarification

Includes:
- Count for each sentiment
- Percentage bar chart
- Color-coded visualization

### 4. **Status Breakdown**

Grid view showing:
- 🔥 **HOT** - Ready to convert
- ✅ **Positive** - Showing interest
- 📤 **Sent 1/2/3** - In follow-up sequence
- 📅 **Scheduled** - Installation booked
- ✨ **Converted** - Deal won
- ❌ **Negative** - Not interested
- 🚫 **Removed** - Opted out

## How to Access

### Option 1: Direct URL
```
http://localhost:3001/dbr-analytics
```

### Option 2: From Sanity Studio
1. Open Sanity Studio: `http://localhost:3001/studio`
2. Navigate to **🔥 DBR Dashboard (Database Recovery)**
3. Click **📊 View Analytics Dashboard**
4. Click the blue button to open in new tab

## Use Cases

### Daily Check-in
1. Set filter to "Today"
2. View messages sent today
3. Check reply rate
4. Monitor hot leads

### Weekly Review
1. Set filter to "Week"
2. Review sentiment breakdown
3. Identify trends
4. Plan next batch

### Monthly Reporting
1. Set filter to "Month"
2. Export metrics for stakeholders
3. Calculate conversion rates
4. Assess campaign ROI

### Campaign Analysis
1. Set filter to "All"
2. View complete campaign stats
3. Analyze overall sentiment distribution
4. Review total conversions

## Metrics Explained

### Reply Rate
```
Reply Rate = (Leads with Replies / Total Leads) × 100
```
Higher is better. Target: 30-50%

### Conversion Funnel
```
Total Leads (975)
  ↓ M1 Sent (xxx)
  ↓ M2 Sent (xxx)
  ↓ M3 Sent (xxx)
  ↓ Replies (xxx)
  ↓ Positive (xxx)
  ↓ Hot (xxx)
  ↓ Converted (xxx)
```

### Sentiment Distribution
- **Positive** > 20% = Good campaign
- **Negative** < 30% = Acceptable
- **Unclear** < 10% = Clear messaging

## Data Sync

The analytics dashboard pulls live data from Sanity.

To update with latest from Google Sheets:
```bash
npm run sync:dbr
```

Then refresh the analytics page.

## Technical Details

### Data Source
- Queries Sanity CMS via GROQ
- Real-time data (no caching for `/dbr-analytics`)
- Filters applied server-side for performance

### Time Filtering
- Uses `m1Sent` timestamp as reference
- ISO 8601 date comparison
- Timezone-aware

### Performance
- Optimized queries
- Client-side aggregation
- Fast rendering with React

## Troubleshooting

### Analytics show 0 leads
- **Solution**: Run `npm run sync:dbr` to import from Google Sheets

### Time filters not working
- **Solution**: Ensure leads have valid `m1Sent` timestamps

### Sentiment counts seem wrong
- **Solution**: Check Google Sheet `Lead_sentiment` column values match schema options

### Can't access /dbr-analytics
- **Solution**: Make sure dev server is running (`npm run dev`)

## Next Steps

### Automation
- Schedule daily sync with cron
- Auto-refresh analytics every 5 minutes
- Email daily reports

### Enhanced Analytics
- Time-series charts (messages over time)
- Conversion rate trends
- Response time analysis
- Geographic distribution (by postcode)

### Export Features
- CSV export
- PDF reports
- Email digest

---

**Analytics URL**: http://localhost:3001/dbr-analytics
**Last Updated**: 2025-10-23
**Total Leads**: 975
