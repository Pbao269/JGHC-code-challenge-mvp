# JGHC Inventory Management System

A comprehensive inventory management system for equipment tracking with real-time database integration.

## Features

- Track equipment across warehouse, classrooms, and offices
- Transfer equipment between locations
- Add new equipment
- Edit equipment details
- Delete equipment
- Status tracking and updates
- Bulk operations (multiple transfer, status change, delete)

## Tech Stack

- **Frontend**: React with TypeScript, Next.js, Tailwind CSS, Shadcn UI
- **Backend**: Supabase PostgreSQL (serverless backend)
  - RESTful API via Supabase Client
  - PostgreSQL database with views and functions
- **State Management**: React Hooks + Local State
- **Deployment**: Vercel (recommended)

## Setup Instructions

- Node.js (v16+)
- npm or yarn
- Supabase account

### Step 1: Setup Supabase

1. Create a new Supabase project at [https://supabase.com](https://supabase.com)
2. Once your project is created, go to the SQL Editor
3. Copy the contents of the `supabase-schema.sql` file from this repository
4. Run the SQL script in the Supabase SQL Editor to create the necessary tables, views, and functions
5. From the Supabase dashboard, copy your project URL and anon key from Project Settings > API

### Step 2: Configure Environment Variables

1. Create a `.env` file in the project root with the following content:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```
2. Replace the placeholder values with your actual Supabase URL and anon key from Step 1

### Step 3: Install Dependencies and Run the Application

```bash
# Install dependencies
npm install
# or
yarn install

# Run the development server
npm run dev
# or
yarn dev
```

4. Open your browser and navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
├── app/                  # Next.js app directory
├── components/           # React components
│   ├── ui/               # Shadcn UI components
│   ├── equipment-form.tsx      # Equipment form component
│   ├── equipment-table.tsx     # Equipment table component
│   ├── inventory-dashboard.tsx # Main dashboard component
│   ├── multiple-delete.tsx     # Multiple delete component
│   ├── multiple-status-change.tsx # Multiple status change component
│   └── multiple-transfer.tsx   # Multiple transfer component
├── lib/                  # Utilities and helpers
│   ├── api.ts            # Supabase API functions for CRUD operations
│   ├── database.types.ts # TypeScript types for database
│   ├── rooms.ts          # Room management
│   ├── supabase.ts       # Supabase client configuration
│   ├── types.ts          # TypeScript types for the application
│   └── utils.ts          # Utility functions
├── public/               # Static assets
└── ...                   # Configuration files
```

## Database Schema

The database schema includes:

- `equipment` - Stores equipment details (model, type, serial number, etc.)
- `locations` - Stores room/location information (name, building type)
- `equipment_location` - Maps equipment to their current location (one-to-one)
- `equipment_transfer_history` - Tracks equipment transfers between locations
- `equipment_with_location` - View that joins equipment with location details for easy querying

Custom types:
- `equipment_status` - Enum for equipment status values
- `building_type` - Enum for building types (classroom, office, warehouse)
- `delete_reason` - Enum for deletion reasons (broken, obsolete, other)

## License

MIT 