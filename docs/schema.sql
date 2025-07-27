---
create table public.categories (
  id uuid not null default gen_random_uuid (),
  name text not null,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  created_by uuid null,
  updated_at timestamp with time zone null,
  updated_by uuid null,
  deleted_at timestamp with time zone null,
  deleted_by uuid null,
  color text null,
  user_id uuid null,
  constraint categories_pkey primary key (id),
  constraint unique_user_category unique (user_id, name),
  constraint categories_created_by_fkey foreign KEY (created_by) references auth.users (id),
  constraint categories_deleted_by_fkey foreign KEY (deleted_by) references auth.users (id),
  constraint categories_updated_by_fkey foreign KEY (updated_by) references auth.users (id)
) TABLESPACE pg_default;
---
create table public.subjects (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  name text not null,
  category_id uuid null,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  created_by uuid null,
  updated_at timestamp with time zone null,
  updated_by uuid null,
  deleted_at timestamp with time zone null,
  deleted_by uuid null,
  constraint subjects_pkey primary key (id),
  constraint fk_category foreign KEY (category_id) references categories (id),
  constraint subjects_created_by_fkey foreign KEY (created_by) references auth.users (id),
  constraint subjects_deleted_by_fkey foreign KEY (deleted_by) references auth.users (id),
  constraint subjects_updated_by_fkey foreign KEY (updated_by) references auth.users (id),
  constraint subjects_user_id_fkey foreign KEY (user_id) references auth.users (id)
) TABLESPACE pg_default;

---
create table public.schedules (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  type text not null,
  category_id uuid null,
  subject_id uuid null,
  planned_pages integer null,
  planned_items integer null,
  memo text null,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  created_by uuid null,
  updated_at timestamp with time zone null,
  updated_by uuid null,
  deleted_at timestamp with time zone null,
  deleted_by uuid null,
  date date null,
  start_time time without time zone null,
  end_time time without time zone null,
  constraint schedules_pkey primary key (id),
  constraint schedules_created_by_fkey foreign KEY (created_by) references auth.users (id),
  constraint schedules_deleted_by_fkey foreign KEY (deleted_by) references auth.users (id),
  constraint schedules_subject_id_fkey foreign KEY (subject_id) references subjects (id),
  constraint schedules_user_id_fkey foreign KEY (user_id) references auth.users (id),
  constraint schedules_category_id_fkey foreign KEY (category_id) references categories (id),
  constraint schedules_updated_by_fkey foreign KEY (updated_by) references auth.users (id),
  constraint schedules_type_check check ((type = any (array['todo'::text, '24h'::text])))
) TABLESPACE pg_default;

--
create table public.tasks (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  subject_id uuid null,
  memo text null,
  date date null,
  start_time time without time zone null,
  end_time time without time zone null,
  pages integer null,
  items integer null,
  attempt_number integer null,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  created_by uuid null,
  updated_at timestamp with time zone null,
  updated_by uuid null,
  deleted_at timestamp with time zone null,
  deleted_by uuid null,
  time integer null,
  ai_comment text null,
  constraint tasks_pkey primary key (id),
  constraint tasks_created_by_fkey foreign KEY (created_by) references auth.users (id),
  constraint tasks_deleted_by_fkey foreign KEY (deleted_by) references auth.users (id),
  constraint tasks_subject_id_fkey foreign KEY (subject_id) references subjects (id),
  constraint tasks_updated_by_fkey foreign KEY (updated_by) references auth.users (id),
  constraint tasks_user_id_fkey foreign KEY (user_id) references auth.users (id)
) TABLESPACE pg_default;
---
create table public.profiles (
  id uuid not null,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  email text null,
  name text null,
  avatar_url text null,
  theme text null default 'system'::text,
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id)
) TABLESPACE pg_default;
---
create table public.api_keys (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  provider text not null,
  api_key text not null,
  is_demo boolean null default false,
  mac_address text null,
  expires_at timestamp without time zone null,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  created_by uuid null,
  updated_at timestamp with time zone null,
  updated_by uuid null,
  deleted_at timestamp with time zone null,
  deleted_by uuid null,
  usage_count integer null default 0,
  constraint api_keys_pkey primary key (id),
  constraint api_keys_user_id_unique unique (user_id),
  constraint unique_user_demo unique (user_id, is_demo),
  constraint api_keys_user_id_fkey foreign KEY (user_id) references auth.users (id),
  constraint api_keys_updated_by_fkey foreign KEY (updated_by) references auth.users (id),
  constraint api_keys_deleted_by_fkey foreign KEY (deleted_by) references auth.users (id),
  constraint api_keys_created_by_fkey foreign KEY (created_by) references auth.users (id)
) TABLESPACE pg_default;
---
create table public.api_usage (
  id text not null,
  usage_count integer null default 0,
  updated_at timestamp with time zone null default now(),
  deleted_at timestamp with time zone null,
  constraint api_usage_pkey primary key (id)
) TABLESPACE pg_default;
---
create view public.subject_with_category as
select
  s.id,
  s.name,
  s.category_id,
  c.name as category_name,
  c.color as category_color,
  c.user_id
from
  subjects s
  join categories c on s.category_id = c.id
  and s.user_id = c.user_id
where
  s.deleted_at is null;
---
create view public.schedule_with_subject as
select
  s.id,
  s.user_id,
  s.subject_id,
  s.date,
  s.start_time,
  s.end_time,
  s.planned_pages,
  s.planned_items,
  s.memo,
  subj.name as subject_name,
  cat.name as category_name,
  cat.color as category_color,
  s.created_at,
  s.deleted_at
from
  schedules s
  join subjects subj on s.subject_id = subj.id and subj.deleted_at is null
  left join categories cat on subj.category_id = cat.id and subj.user_id = cat.user_id
where
  s.deleted_at is null;
---
create view public.task_view_with_category as
select
  t.id,
  t.user_id,
  t.subject_id,
  t.memo,
  t.date,
  t.start_time,
  t.end_time,
  t.pages,
  t.items,
  t.attempt_number,
  t.created_at,
  t.created_by,
  t.updated_at,
  t.updated_by,
  t.deleted_at,
  t.deleted_by,
  t."time",
  t.ai_comment,
  s.name as subject_name,
  c.name as category_name,
  c.color as category_color
from
  tasks t
  join subjects s on t.subject_id = s.id
  left join categories c on s.category_id = c.id;
