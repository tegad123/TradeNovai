# Supabase Setup Guide for TradeNova

This guide explains how to set up Supabase authentication with Google OAuth for local development.

## Prerequisites

1. A Supabase account (free tier works)
2. A Google Cloud Console account (for OAuth)

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in the project details and create it
4. Wait for the project to be provisioned

## Step 2: Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Settings > API**
2. Copy the following values:
   - **Project URL** (e.g., `https://abc123xyz.supabase.co`)
   - **anon public** key (the shorter one, safe for client-side)

## Step 3: Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Keep your existing API keys
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
```

## Step 4: Set Up Google OAuth in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Go to **APIs & Services > Credentials**
4. Click **Create Credentials > OAuth client ID**
5. Select **Web application**
6. Add the following:
   - **Authorized JavaScript origins**: 
     - `http://localhost:3000`
   - **Authorized redirect URIs**:
     - `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`
     
     (Replace `YOUR_PROJECT_REF` with your Supabase project reference from the Project URL)

7. Click **Create** and copy the **Client ID** and **Client Secret**

## Step 5: Configure Google OAuth in Supabase

1. In Supabase dashboard, go to **Authentication > Providers**
2. Find **Google** and enable it
3. Paste your Google **Client ID** and **Client Secret**
4. Save

## Step 6: Configure Redirect URLs in Supabase

1. Go to **Authentication > URL Configuration**
2. Set:
   - **Site URL**: `http://localhost:3000`
   - **Redirect URLs** (add both):
     - `http://localhost:3000/auth/callback`
     - `http://127.0.0.1:3000/auth/callback`

3. Save

## Step 7: Run the Chat Tables Migration (Optional)

If you want to persist chat messages in Supabase:

1. Go to **SQL Editor** in your Supabase dashboard
2. Copy the contents of `supabase/migrations/001_chat_tables.sql`
3. Paste and run it

## Step 8: Test Locally

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open `http://localhost:3000/login`
3. Click "Sign in with Google"
4. You should be redirected to Google, then back to `/chat`

## Troubleshooting

### "auth_callback_error" on login

- Check that your Supabase redirect URLs are correctly configured
- Ensure the Google OAuth redirect URI matches exactly: `https://YOUR_PROJECT_REF.supabase.co/auth/v1/callback`

### Session not persisting after refresh

- The middleware should handle this automatically
- Check that `src/middleware.ts` exists and is correctly configured

### "Missing Supabase environment variables"

- Ensure `.env.local` exists and contains the correct values
- Restart the Next.js dev server after changing env vars

## Architecture

```
src/
├── lib/
│   └── supabase/
│       ├── browser.ts    # Client-side Supabase client
│       ├── server.ts     # Server-side Supabase client (for API routes)
│       └── middleware.ts # Session refresh middleware
├── middleware.ts         # Next.js middleware for auth
├── app/
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts  # OAuth callback handler
│   └── login/
│       └── page.tsx      # Login page with Google sign-in
└── components/
    └── chat/
        └── AICoachInterface.tsx  # AI Coach with auth integration
```

## Security Notes

- Never commit `.env.local` to git (it's already in `.gitignore`)
- The `anon` key is safe for client-side use (RLS protects data)
- Never expose the `service_role` key on the client side

