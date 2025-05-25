# JGHC Inventory Management System (MVP version)


## Features

### Core Functionality
- **Equipment Tracking**: Track equipment across warehouse, classrooms, and offices
- **Location Management**: Transfer equipment between locations with status updates
- **CRUD Operations**: Add, edit, view, and delete equipment
- **Status Management**: Real-time status tracking and bulk status updates
- **Serial Number Validation**: Duplicate detection and validation


## Tech Stack

- **Frontend**: React 18 with TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Supabase PostgreSQL (serverless backend)
  - RESTful API via Supabase Client
  - PostgreSQL database with views, functions, and RPC calls
- **State Management**: React Hooks + Local State: localStorage
- **Deployment**: Vercel

## Setup Instructions

### Prerequisites
- Node.js (v18+)
- npm or yarn
- Supabase account
- Fetching project (clone)

### Step 1: Setup Supabase Database

1. Create a new Supabase project at [https://supabase.com](https://supabase.com)
2. Once your project is created, go to the SQL Editor
3. Run the following SQL files in order:
   ```sql
   -- 1. Create the main schema
   supabase-schema.sql
   
   -- 2. Add RPC functions for bulk operations
   supabase-rpc.sql
   
   -- 3. Setup automated cleanup with pg_cron
   supabase-cronDelete.sql
   ```
4. From the Supabase dashboard, copy your project URL and anon key from Project Settings > API

### Step 2: Configure Environment Variables

Create a `.env` file in the project root:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Step 3: Install Dependencies and Run

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/                          # Next.js app directory
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main page
├── components/                   # React components
│   ├── ui/                       # Shadcn UI base components
│   ├── equipment-form.tsx        # Multi-step equipment form with wizard
│   ├── equipment-table.tsx       # Advanced data table with sorting/filtering
│   ├── inventory-dashboard.tsx   # Main dashboard with real-time updates
│   ├── multiple-delete.tsx       # Bulk delete with confirmation
│   ├── multiple-status-change.tsx # Bulk status updates
│   ├── multiple-transfer.tsx     # Bulk transfer operations
│   └── deleted-items-view.tsx    # Deleted items management with PDF export
├── lib/                          # Utilities and helpers
│   ├── api.ts                    # Comprehensive API functions with error handling
│   ├── database.types.ts         # Auto-generated TypeScript types
│   ├── rooms.ts                  # Room and location management
│   ├── supabase.ts               # Supabase client configuration
│   ├── types.ts                  # Application TypeScript interfaces
│   └── utils.ts                  # Utility functions and helpers
├── public/                       # Static assets
├── supabase-schema.sql           # Database schema and initial setup
├── supabase-rpc.sql              # RPC functions for bulk operations
└── supabase-cronDelete.sql       # Automated cleanup with pg_cron
```

## Database Schema

### Core Tables
- **`equipment`** - Equipment details
- **`locations`** - Room/location information with building types
- **`equipment_location`** - Current equipment location mapping
- **`equipment_transfer_history`** - Complete list of transfers

### Views
- **`equipment_with_location`** - Joining equipment with location data

### Custom Types
- **`equipment_status`** - Enum: stored, in-use, maintenance, need-replacement, replaced
- **`building_type`** - Enum: classroom, office, warehouse
- **`delete_reason`** - Enum: broken, obsolete, other

### RPC Functions
- **`add_equipment_with_location()`** - Bulk equipment creation with location assignment
- **`transfer_equipment_batch()`** - Bulk transfer operations with history tracking
- **`delete_equipment_soft()`** - Soft delete individual items
- **`delete_equipment_soft_bulk()`** - Bulk soft delete operations
- **`hard_delete_soft_deleted_weekly()`** - Permanent deletion for cleanup