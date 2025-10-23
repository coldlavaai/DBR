# DBR Analytics Dashboard

**Database Recovery Campaign Analytics for Greenstar Solar**

A real-time analytics dashboard for managing and monitoring Database Recovery (DBR) campaigns. Track 975+ leads, view conversation histories, analyze sentiment, and monitor campaign performance.

![Dashboard Preview](https://img.shields.io/badge/Status-Production%20Ready-success)
![Next.js](https://img.shields.io/badge/Next.js-14.2.13-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)

---

## 🎯 Features

- **Real-Time Analytics**: Live metrics and KPIs for your DBR campaigns
- **Interactive Dashboard**: Click any metric to drill down into lead details
- **Conversation Viewer**: Read full AI-human conversation histories
- **Time Filtering**: View data by All Time, Month, Week, or Today
- **Sentiment Analysis**: Track positive, negative, neutral, and unclear responses
- **Status Tracking**: Monitor leads from first contact to conversion
- **Webhook Integration**: Auto-sync from Google Sheets when data changes
- **Manual Sync**: Bulk import all leads with one command

---

## 📊 Dashboard Metrics

- Total Leads
- Messages Sent (M1, M2, M3 breakdown)
- Reply Rate %
- Hot Leads Count
- Sentiment Distribution
- Status Breakdown (HOT, POSITIVE, NEGATIVE, etc.)

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/coldlavaai/DBR.git
cd DBR
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```env
NEXT_PUBLIC_SANITY_PROJECT_ID=your_project_id
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_WRITE_TOKEN=your_write_token

GOOGLE_SERVICE_ACCOUNT_EMAIL=your_service_account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEET_ID=your_sheet_id
```

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## 📦 Deployment

### Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

Make sure to add environment variables in Vercel dashboard:
- Go to Project Settings → Environment Variables
- Add all variables from `.env.example`

---

## 🔄 Data Sync

### Manual Sync (All Leads)

```bash
npm run sync:dbr
```

This syncs all 975+ leads from Google Sheets to Sanity CMS.

### Real-Time Webhook (Recommended)

Set up Google Apps Script to auto-sync when sheet changes:

1. See `WEBHOOK_SETUP.md` for detailed instructions
2. Copy script from `scripts/google-apps-script-webhook.js`
3. Configure trigger in Google Sheets
4. Updates happen automatically within 1-2 seconds

---

## 📁 Project Structure

```
DBR/
├── app/
│   ├── api/
│   │   ├── dbr-analytics/       # Analytics API endpoint
│   │   ├── dbr-leads/           # Leads API endpoint
│   │   └── webhook/             # Google Sheets webhook
│   ├── dbr-analytics/           # Main dashboard page
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Home (redirects to dashboard)
├── components/
│   ├── DbrDashboard.tsx         # Dashboard component
│   └── LeadsModal.tsx           # Lead viewer modal
├── sanity/
│   └── schemas/
│       └── dbrLead.ts           # Sanity schema
├── scripts/
│   ├── sync-dbr-leads.ts        # Manual sync script
│   └── google-apps-script-webhook.js  # Google Apps Script
└── docs/
    ├── DBR_ANALYTICS_GUIDE.md   # User guide
    ├── DBR_DASHBOARD_COMPLETE.md # Implementation docs
    └── WEBHOOK_SETUP.md         # Webhook setup guide
```

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **CMS**: Sanity.io
- **Data Source**: Google Sheets
- **Deployment**: Vercel
- **APIs**: Google Sheets API, Sanity Client API

---

## 📖 Documentation

- **[User Guide](DBR_ANALYTICS_GUIDE.md)** - How to use the dashboard
- **[Setup Guide](WEBHOOK_SETUP.md)** - Configure real-time webhooks
- **[Complete Docs](DBR_DASHBOARD_COMPLETE.md)** - Full implementation details

---

## 🔐 Security

- API keys stored in environment variables
- Webhook endpoint validates data before updates
- No public data exposure
- Google Sheets authentication via service account

---

## 🐛 Troubleshooting

### Dashboard shows 0 leads
Run `npm run sync:dbr` to import from Google Sheets

### Webhook not working
- Check Google Apps Script execution logs
- Verify Vercel environment variables
- Ensure webhook URL is correct

### Build errors
- Check all environment variables are set
- Run `npm install` to ensure dependencies are installed
- Clear `.next` folder and rebuild

---

## 📝 License

Private - Greenstar Solar Internal Tool

---

## 👥 Contact

**Developer**: Cold Lava AI
**Client**: Greenstar Solar
**Support**: oliver@otdm.net

---

**Built with [Claude Code](https://claude.com/claude-code)**
