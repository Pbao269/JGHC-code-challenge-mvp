# Environment Variables Setup

To connect your application to Supabase, you need to set up the required environment variables.

## Setting up `.env.local` file

1. Create a new file named `.env.local` in the `frontend` directory
2. Add the following content to the file:

```
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

3. Replace the placeholder values with your actual Supabase URL and anon key

## Where to find your Supabase credentials

1. Go to your Supabase project dashboard: https://app.supabase.com/projects
2. Select your project
3. Navigate to Project Settings > API
4. Under "Project API keys", copy:
   - Project URL: This is your `NEXT_PUBLIC_SUPABASE_URL`
   - anon/public key: This is your `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   
**Important**: Make sure to use the "anon" key, not the "service_role" key which has admin privileges.

## Verifying your setup

After setting up your environment variables:

1. Restart your development server
2. Check the browser console for any connection warnings or errors
3. The application should be able to connect to your Supabase backend

If you're still experiencing connection issues, verify that:
- The `.env.local` file is in the correct location (frontend directory)
- There are no typos in the variable names or values
- Your Supabase project is active and not paused 