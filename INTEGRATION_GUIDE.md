# Dashboard Integration Guide

## To Complete the Account Settings Feature

Add the following code to `components/EnhancedDbrDashboard.tsx`:

### 1. Add Import

Add to the top of the file:
```typescript
import AccountSettingsModal from './AccountSettingsModal'
```

### 2. Add State Variables

Add after the existing state declarations (around line 48):
```typescript
const [settingsModalOpen, setSettingsModalOpen] = useState(false)
const [userPreferences, setUserPreferences] = useState<any>(null)
const [preferencesLoaded, setPreferencesLoaded] = useState(false)
```

### 3. Add Load Preferences Function

Add after the `fetchStats` function:
```typescript
const loadUserPreferences = useCallback(async () => {
  try {
    const response = await fetch('/api/user/preferences')
    if (!response.ok) throw new Error('Failed to load preferences')

    const prefs = await response.json()
    setUserPreferences(prefs)

    // Apply preferences to dashboard state
    if (!prefs.isDefault) {
      setSectionOrder(prefs.sectionOrder || defaultSectionOrder)
      setSectionsExpanded(prefs.sectionsExpanded || sectionsExpanded)
      setTimeRange(prefs.defaultTimeRange || 'all')
      setAutoRefresh(prefs.autoRefreshEnabled !== false)

      // Apply auto-refresh interval if different from default
      if (prefs.autoRefreshInterval !== undefined) {
        // Store in state if you want to customize interval
        console.log('Auto-refresh interval:', prefs.autoRefreshInterval)
      }
    }

    setPreferencesLoaded(true)
  } catch (error) {
    console.error('Error loading user preferences:', error)
    setPreferencesLoaded(true) // Continue with defaults
  }
}, [])
```

### 4. Add Save Preferences Function

Add after `loadUserPreferences`:
```typescript
const saveUserPreferences = useCallback(async (preferences: any) => {
  try {
    const response = await fetch('/api/user/preferences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences),
    })

    if (!response.ok) throw new Error('Failed to save preferences')

    // Apply preferences immediately
    setSectionOrder(preferences.sectionOrder || sectionOrder)
    setSectionsExpanded(preferences.sectionsExpanded || sectionsExpanded)
    setTimeRange(preferences.defaultTimeRange || timeRange)
    setAutoRefresh(preferences.autoRefreshEnabled !== false)

    setUserPreferences(preferences)
    setSettingsModalOpen(false)

    // Show success message
    console.log('✅ Preferences saved successfully')
  } catch (error) {
    console.error('Error saving user preferences:', error)
    alert('Failed to save preferences. Please try again.')
  }
}, [sectionOrder, sectionsExpanded, timeRange])
```

### 5. Load Preferences on Mount

Add to the useEffect section (around line 194):
```typescript
useEffect(() => {
  loadUserPreferences()
}, [loadUserPreferences])
```

### 6. Auto-Save Section Order Changes

Update the section order localStorage save to also save to API:
Find the code that saves to localStorage (around line 80-88) and add:
```typescript
// Also save to user preferences API
if (preferencesLoaded && userPreferences) {
  saveUserPreferences({
    ...userPreferences,
    sectionOrder: newOrder,
  })
}
```

### 7. Update DashboardHeader Props

Find the `<DashboardHeader />` component (around line 569) and add:
```typescript
<DashboardHeader
  lastUpdated={stats.lastUpdated}
  onSettingsClick={() => setSettingsModalOpen(true)}
/>
```

### 8. Add Settings Modal

Add before the closing `</div>` of the main component (around line 713):
```typescript
{/* Account Settings Modal */}
{settingsModalOpen && userPreferences && (
  <AccountSettingsModal
    isOpen={settingsModalOpen}
    onClose={() => setSettingsModalOpen(false)}
    currentPreferences={{
      sectionOrder,
      sectionsExpanded,
      sectionsVisible: userPreferences.sectionsVisible || {},
      defaultTimeRange: timeRange,
      autoRefreshEnabled: autoRefresh,
      autoRefreshInterval: 30, // or from state if you track it
      visibleMetricCards: userPreferences.visibleMetricCards || [
        'totalLeads', 'messagesSent', 'replyRate', 'hotLeads',
        'avgResponse', 'callsBooked', 'upcomingCalls'
      ],
    }}
    onSave={saveUserPreferences}
  />
)}
```

## Testing

1. Run database migration (see `migrations/README.md`)
2. Start dev server: `npm run dev`
3. Click user avatar → "Account Settings"
4. Test drag & drop reordering
5. Test show/hide sections
6. Test default time range
7. Test auto-refresh settings
8. Test metric card visibility
9. Refresh page - settings should persist

## Notes

- Preferences are user-specific (not browser-specific)
- Falls back to sensible defaults if no preferences exist
- Section visibility feature requires additional filtering logic in `renderSection()`
- Metric card visibility requires conditional rendering in metrics grid
