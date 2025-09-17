-- 001_create_files_table_and_rls.sql
-- Run this via `supabase db push` or psql against your Supabase Postgres.

-- Ensure pgcrypto (for gen_random_uuid) is available
create extension if not exists "pgcrypto";

-- Create files table
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

-- Enable Row Level Security
alter table public.files enable row level security;

-- SELECT: allow only owner to read
create policy "Files: owner can select" on public.files
  for select
  using (owner_id = auth.uid());

-- INSERT: allow logged-in users to insert only rows where owner_id == auth.uid()
create policy "Files: owner can insert" on public.files
  for insert
  with check (owner_id = auth.uid());

-- UPDATE: allow only owner to update
create policy "Files: owner can update" on public.files
  for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- DELETE: allow only owner to delete
create policy "Files: owner can delete" on public.files
  for delete
  using (owner_id = auth.uid());

-- (Optional) Grant minimal privileges to anon (if needed for other flows)
-- grant select on public.files to anon; -- NOT recommended for this task
