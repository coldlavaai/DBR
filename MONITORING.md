# Quick Monitoring Guide

## Production Dashboard
**https://greenstar-dbr-dashboard-hqc3jxxpd-olivers-projects-a3cbd2e0.vercel.app**

---

## One-Click Health Checks

### Is Everything Working?
https://greenstar-dbr-dashboard-hqc3jxxpd-olivers-projects-a3cbd2e0.vercel.app/api/health

✅ Look for: `"overall": "healthy"`

---

### Did Watchdog Detect Any Problems?
https://greenstar-dbr-dashboard-hqc3jxxpd-olivers-projects-a3cbd2e0.vercel.app/api/watchdog

✅ Look for: `"overall": "healthy"` and `"actions": []` (empty = no problems)

---

### Find a Specific Lead
https://greenstar-dbr-dashboard-hqc3jxxpd-olivers-projects-a3cbd2e0.vercel.app/api/diagnostic?name=LeadName

Replace `LeadName` with the person's first or last name.

---

## What Each Status Means

### Health Status
- **"healthy"** = Everything working perfectly ✅
- **"degraded"** = Some issues but still operational ⚠️
- **"unhealthy"** = Critical problems detected ❌

### Sync Status
- **"OK"** = Last sync was recent (<10 min) ✅
- **"STALE"** = Sync is old (>10 min) - Watchdog will auto-fix ⚠️

### Watchdog Actions
- **Empty `[]`** = No problems detected ✅
- **Has actions** = Watchdog is fixing something 🔧

---

## When to Worry

### Don't Worry If:
- Health shows "degraded" temporarily (system auto-recovers)
- Watchdog has 1-2 actions (it's fixing things)
- One service has higher latency

### Worry If:
- Health stays "unhealthy" for >30 minutes
- Database shows 0 leads
- Watchdog shows "watchdog_failed"

---

## Emergency Recovery

If everything looks broken:

1. **Manual Sync**: Click green "Sync Sheets" button in dashboard
2. **Force Recovery**: Visit this URL to trigger full resilient sync
   https://greenstar-dbr-dashboard-hqc3jxxpd-olivers-projects-a3cbd2e0.vercel.app/api/sync-with-retry
3. **Wait 2 minutes**, then check health again

---

## Automatic Protection

The system checks itself every 5 minutes and fixes problems automatically.

**You don't need to monitor this constantly** - just check occasionally to feel good about it! 😊
