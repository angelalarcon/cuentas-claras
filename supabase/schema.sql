create extension if not exists pgcrypto;

create table if not exists records (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('expense', 'settlement')),
  description text not null,
  amount numeric(10, 2) not null check (amount > 0),
  paid_by text not null check (paid_by in ('Angel', 'Nelson')),
  contribution numeric(10, 2) not null,
  -- how many people the bill was divided between, and how many of those
  -- parts paid_by covered themselves — null for a non-split expense or one
  -- entered via the receipt scanner (item selection isn't an even split)
  split_people integer,
  split_paid_parts integer,
  created_at timestamptz not null default now()
);

alter table records add column if not exists split_people integer;
alter table records add column if not exists split_paid_parts integer;

alter table records enable row level security;

-- this app has no login, just a shared link between Angel and Nelson, so both
-- directions are open to anyone holding the anon key (which ships in the static page)
create policy "anyone can read records" on records
  for select using (true);

create policy "anyone can insert records" on records
  for insert with check (true);

create policy "anyone can update records" on records
  for update using (true) with check (true);

create policy "anyone can delete records" on records
  for delete using (true);
