-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =====================
-- TABLES
-- =====================

create table public.clients (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  logo_url text,
  primary_color text default '#7c3aed',
  email text,
  created_at timestamptz default now()
);

create table public.users (
  id uuid primary key default uuid_generate_v4(),
  auth_id uuid not null unique references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  role text not null check (role in ('admin', 'client')),
  name text not null,
  email text not null,
  created_at timestamptz default now()
);

create table public.posts (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  caption text,
  media_url text,
  media_type text check (media_type in ('image', 'video')),
  scheduled_date date not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  comment text,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

create table public.campaigns (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  description text,
  objective text,
  file_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  comment text,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

create table public.insights (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  title text not null,
  body text not null,
  specialist_name text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  comment text,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

create table public.results (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid not null references public.clients(id) on delete cascade,
  period text not null,
  followers integer,
  reach integer,
  clicks integer,
  conversions integer,
  roi numeric(10,2),
  created_at timestamptz default now()
);

create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('post_pending', 'campaign_pending', 'insight_pending', 'approved', 'rejected')),
  message text not null,
  ref_id uuid,
  ref_type text check (ref_type in ('post', 'campaign', 'insight')),
  read boolean not null default false,
  created_at timestamptz default now()
);

-- =====================
-- INDEXES
-- =====================

create index posts_client_id_idx on public.posts(client_id);
create index posts_scheduled_date_idx on public.posts(scheduled_date);
create index campaigns_client_id_idx on public.campaigns(client_id);
create index insights_client_id_idx on public.insights(client_id);
create index notifications_user_id_idx on public.notifications(user_id);
create index notifications_read_idx on public.notifications(user_id, read);

-- =====================
-- ROW LEVEL SECURITY
-- =====================

alter table public.clients enable row level security;
alter table public.users enable row level security;
alter table public.posts enable row level security;
alter table public.campaigns enable row level security;
alter table public.insights enable row level security;
alter table public.results enable row level security;
alter table public.notifications enable row level security;

-- Helper function: get current user's profile
create or replace function public.current_user_profile()
returns public.users
language sql security definer stable
as $$
  select * from public.users where auth_id = auth.uid() limit 1;
$$;

-- Helper function: is current user an admin?
create or replace function public.is_admin()
returns boolean
language sql security definer stable
as $$
  select exists (
    select 1 from public.users where auth_id = auth.uid() and role = 'admin'
  );
$$;

-- Helper function: get current user's client_id
create or replace function public.my_client_id()
returns uuid
language sql security definer stable
as $$
  select client_id from public.users where auth_id = auth.uid() limit 1;
$$;

-- CLIENTS policies
create policy "Admin can do everything on clients"
  on public.clients for all
  using (public.is_admin());

create policy "Client can view own client"
  on public.clients for select
  using (id = public.my_client_id());

-- USERS policies
create policy "Admin can do everything on users"
  on public.users for all
  using (public.is_admin());

create policy "User can view own profile"
  on public.users for select
  using (auth_id = auth.uid());

create policy "User can update own profile"
  on public.users for update
  using (auth_id = auth.uid());

-- POSTS policies
create policy "Admin can do everything on posts"
  on public.posts for all
  using (public.is_admin());

create policy "Client can view own posts"
  on public.posts for select
  using (client_id = public.my_client_id());

create policy "Client can update post status (approve/reject)"
  on public.posts for update
  using (client_id = public.my_client_id())
  with check (client_id = public.my_client_id());

-- CAMPAIGNS policies
create policy "Admin can do everything on campaigns"
  on public.campaigns for all
  using (public.is_admin());

create policy "Client can view own campaigns"
  on public.campaigns for select
  using (client_id = public.my_client_id());

create policy "Client can update campaign status"
  on public.campaigns for update
  using (client_id = public.my_client_id())
  with check (client_id = public.my_client_id());

-- INSIGHTS policies
create policy "Admin can do everything on insights"
  on public.insights for all
  using (public.is_admin());

create policy "Client can view own insights"
  on public.insights for select
  using (client_id = public.my_client_id());

create policy "Client can update insight status"
  on public.insights for update
  using (client_id = public.my_client_id())
  with check (client_id = public.my_client_id());

-- RESULTS policies
create policy "Admin can do everything on results"
  on public.results for all
  using (public.is_admin());

create policy "Client can view own results"
  on public.results for select
  using (client_id = public.my_client_id());

-- NOTIFICATIONS policies
create policy "User can view own notifications"
  on public.notifications for select
  using (user_id = (select id from public.users where auth_id = auth.uid() limit 1));

create policy "User can update own notifications (mark read)"
  on public.notifications for update
  using (user_id = (select id from public.users where auth_id = auth.uid() limit 1));

create policy "Admin can insert notifications"
  on public.notifications for insert
  with check (public.is_admin());

-- =====================
-- REALTIME
-- =====================

alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.posts;

-- =====================
-- STORAGE BUCKET
-- =====================

insert into storage.buckets (id, name, public) values ('groove-media', 'groove-media', true);

create policy "Admin can upload media"
  on storage.objects for insert
  with check (bucket_id = 'groove-media' and public.is_admin());

create policy "Authenticated users can read media"
  on storage.objects for select
  using (bucket_id = 'groove-media' and auth.role() = 'authenticated');

create policy "Admin can delete media"
  on storage.objects for delete
  using (bucket_id = 'groove-media' and public.is_admin());
