# Deleted Items Management System

This document explains the new deleted items management system with automatic cleanup functionality.

## Features Added

### 1. **Soft Delete Fix**
- Modified `getAllEquipment()` to exclude soft-deleted items from normal views
- Deleted items no longer appear when the page is reloaded

### 2. **Deleted Items View**
- New page accessible via Advanced → "View Deleted Items"
- Shows: Equipment name, model, type, serial number, delete reason, delete note, deleted date, and cleanup status
- Real-time countdown showing time until permanent deletion
- Manual cleanup option for administrators
- Auto-refresh every 30 seconds when the dialog is open

### 3. **Automatic Cleanup System**
- Items are permanently deleted after 3 days
- Configurable retention period (default: 3 days)
- Automatic cron job runs daily at 2 AM UTC
- Warning messages show users when items will be permanently removed

### 4. **Database Functions**
- `getDeletedEquipment()`: Fetches only soft-deleted items
- `permanentlyDeleteOldEquipment()`: Permanently removes items older than specified days
- `permanently_delete_old_equipment()`: Database RPC function for cleanup

## Setup Instructions

### 1. Database Setup
Run the following command to update your database schema:
```bash
npx supabase db reset
```

This will apply the new RPC function `permanently_delete_old_equipment()`.

### 2. Environment Variables (Optional)
Add to your `.env.local` file for cron job security:
```env
CRON_SECRET=your-secret-key-here
```

### 3. Vercel Cron Setup
The system includes a `vercel.json` file that automatically sets up:
- Daily cleanup at 2 AM UTC
- Endpoint: `/api/cron/cleanup`

For other hosting providers, set up a cron job to call:
```bash
POST /api/cron/cleanup
# With Authorization header if CRON_SECRET is set
```

## Usage

### Viewing Deleted Items
1. Click the "Advanced" button in the dashboard
2. Select "View Deleted Items"
3. See all soft-deleted equipment with cleanup countdown
4. Items eligible for cleanup are highlighted in red

### Manual Cleanup
- Use the "Run Cleanup Now" button to immediately remove eligible items
- Only items older than 3 days will be permanently deleted

### Automatic Cleanup
- Runs daily at 2 AM UTC (configurable in `vercel.json`)
- Logs cleanup results to console
- No user intervention required

## API Endpoints

### GET/POST `/api/cron/cleanup`
- **Purpose**: Permanently delete equipment older than 3 days
- **Schedule**: Daily at 2 AM UTC
- **Returns**: `{ success: boolean, deletedCount: number, timestamp: string }`
- **Security**: Optional Bearer token authorization

## Technical Details

### Retention Policy
- **Soft Delete**: Items marked as deleted with reason and timestamp
- **Retention Period**: 3 days (configurable)
- **Permanent Deletion**: Irreversible removal from database

### Real-time Updates
- Deleted items view refreshes every 30 seconds
- Countdown timers update dynamically
- Immediate refresh after manual cleanup

### Database Schema
The system uses existing equipment table with:
- `delete_reason`: Reason for deletion (NULL for active items)
- `delete_note`: Optional additional notes
- `last_updated`: Timestamp for deletion time tracking

## Monitoring

### Logs
- Cleanup operations are logged to console
- Error handling for failed operations
- Success/failure reporting in the UI

### Statistics
- Shows total deleted items count
- Displays items pending cleanup
- Real-time status updates

## Security Considerations

1. **Cron Job Security**: Optional API key verification
2. **Manual Cleanup**: Admin-only operation
3. **Permanent Deletion**: Cannot be undone
4. **Data Retention**: 3-day grace period for recovery

## Troubleshooting

### Common Issues

1. **Deleted items still showing**: Clear browser cache, database filter applied
2. **Cron not running**: Check Vercel deployment logs
3. **Cleanup fails**: Check database permissions and RPC function
4. **Missing items**: Check if auto-cleanup ran (permanent deletion)

### Testing

Test the cleanup manually:
```bash
# GET request for testing
curl http://localhost:3000/api/cron/cleanup

# POST request with auth
curl -X POST http://localhost:3000/api/cron/cleanup \
  -H "Authorization: Bearer your-secret"
```

## Migration Notes

### Existing Data
- No data migration required
- Existing soft-deleted items will be included
- Cleanup applies to all historical deletions

### Backward Compatibility
- All existing functionality preserved
- New features are additive
- No breaking changes to existing API 