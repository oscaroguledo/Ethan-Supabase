# getSignedUrl Task — Ethan / Supabase deliverable

## Goal
Edge Function `getSignedUrl`:
- Validate caller's JWT.
- Confirm the file exists and belongs to the caller in `files` table.
- Return a signed Supabase Storage URL valid for 60 seconds.
- Otherwise return 403 Forbidden.

---

## Repo layout
- `migrations/001_create_files_table_and_rls.sql` — create table + RLS policies
- `functions/getSignedUrl/index.ts` — Deno TypeScript Edge Function
- `.env.example` — required env vars and secrets

---

## Pre-reqs
- Supabase account (free tier OK)
- Supabase CLI (optional but recommended): https://supabase.com/docs/guides/cli
- Node 18+ (for local test tokens or supporting scripts, optional)
- `supabase` CLI installed and logged in

---

## Setup Steps

### 1) Create Supabase project
- Go to https://app.supabase.com and create a project
- Note your `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (Settings → API)

### 2) Create bucket
- In Supabase dashboard → Storage → Create bucket named `files` (or your chosen name).
- Make bucket `private` (default) so signed URLs are required.

### 3) Apply DB migration
Using Supabase CLI:
```bash
# login and link project
supabase login
supabase link --project-ref <your-project-ref>

# Apply the migration
supabase db push
```
Alternatively, you can run the SQL from `migrations/001_create_files_table_and_rls.sql` directly in the Supabase SQL editor.

### 4) Configure Environment Variables
- Create a `.env` file by copying `.env.example`.
- Fill in the values for your Supabase project.

---

## Local Development and Testing

### 1) Start Supabase services
```bash
supabase start
```

### 2) Serve the function

This command uses the `start` task in `supabase/functions/getSignedUrl/deno.json` to run the function locally.

```bash
supabase functions serve getSignedUrl
```

### 3) Invoke the function

You can use the `curl` command below to test the function. You will need to replace `<your-jwt>` with a valid JWT for a user in your project.

```bash
curl -X POST 'http://127.0.0.1:54321/functions/v1/getSignedUrl' \
  -H 'Authorization: Bearer <your-jwt>' \
  -H 'Content-Type: application/json' \
  -d '{"filePath":"uploads/abc.pdf"}'
```

---

## Test Cases

### A) Enrolled user can get a signed URL (happy path)
1. Create a test user (via Supabase Auth in Dashboard or API). Note the user's `id` and obtain an access token (sign-up + sign-in flow).
2. In the dashboard or via supabase client, insert a row into `public.files` with:
   - `path`: the path to the stored file in the bucket (e.g., `uploads/abc.pdf`)
   - `owner_id`: the user's `id`
3. Upload the file to the Storage bucket under that path (you can use the Storage dashboard or `supabase.storage.from('files').upload(...)`).
4. Make request:
```bash
curl -X POST "https://<YOUR-PROJECT>.functions.supabase.co/getSignedUrl" \
  -H "Authorization: Bearer <USER_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"filePath":"uploads/abc.pdf"}'
```
**Expected response:** `200 OK` with JSON: `{ "signedUrl": "...", "expiresIn": 60 }
Visit the `signedUrl` in browser to confirm download (within ~60 seconds).

### B) Different user cannot get a signed URL (forbidden)
1. Create another user (different account). Obtain their access token.
2. Make the same request as above but with the other user's token:
```bash
curl -X POST "https://<YOUR-PROJECT>.functions.supabase.co/getSignedUrl" \
  -H "Authorization: Bearer <OTHER_USER_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"filePath":"uploads/abc.pdf"}'
```
**Expected response:** `403 Forbidden` with JSON `{ "error":"File not found or access denied" }` (or similar).

### C) Automated Test Script

The `supabase/functions/getSignedUrl` directory contains a shell script `call_function.sh` that automates the testing process.

This script:
1.  Runs `login.ts` to programmatically log in a test user and retrieve a JWT.
2.  Calls the `getSignedUrl` Edge Function with the obtained JWT.

**To use this script:**
1.  Make sure you have a `.env` file in the `supabase/functions/getSignedUrl` directory with the following variables:
    - `SUPABASE_URL`
    - `SUPABASE_ANON_KEY`
    - `TEST_USER_EMAIL`
    - `TEST_USER_PASSWORD`
2.  Make the script executable: `chmod +x supabase/functions/getSignedUrl/call_function.sh`
3.  Run the script from the root of the project: `supabase/functions/getSignedUrl/call_function.sh`