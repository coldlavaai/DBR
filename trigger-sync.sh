#!/bin/bash
# Get the latest deployment URL
DEPLOYMENT_URL="https://greenstar-dbr-dashboard-c5jwd1lqo-olivers-projects-a3cbd2e0.vercel.app"

echo "Triggering sync-sheets..."
curl -s "$DEPLOYMENT_URL/api/sync-sheets" | head -20
