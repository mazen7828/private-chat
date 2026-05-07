-- =============================================
-- Private Chat v2 — Supabase Setup SQL
-- شغّل الكود ده في SQL Editor في Supabase
-- =============================================

-- 1. جدول الرسائل
create table if not exists messages (
  id text primary key,
  sender text not null,
  text text default '',
  timestamp bigint not null,
  type text default 'normal',
  "mediaType" text,
  "mediaUrl" jsonb,
  "fileName" text,
  "fileSize" bigint,
  "replyTo" text,
  edited boolean default false,
  "isPreset" boolean default false,
  "readBy" jsonb default '{"MAZEN": false, "ASMAA": false}'
);

-- 2. جدول اللimits اليومية
create table if not exists limits (
  user_id text primary key,
  count int default 0,
  date text,
  "finalNoteSent" boolean default false
);

-- 3. جدول الـ reactions
create table if not exists reactions (
  id serial primary key,
  data jsonb default '{}'
);

-- 4. جدول الـ emoji usage
create table if not exists emoji_usage (
  id serial primary key,
  data jsonb default '{}'
);

-- 5. جدول الـ presence
create table if not exists presence (
  user_id text primary key,
  "isOnline" boolean default false,
  "lastSeen" bigint
);

-- 6. تفعيل Realtime على كل الجداول
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table limits;
alter publication supabase_realtime add table presence;
alter publication supabase_realtime add table reactions;

-- 7. Disable RLS (لأن الشات ده private بين اتنين بس)
alter table messages disable row level security;
alter table limits disable row level security;
alter table reactions disable row level security;
alter table emoji_usage disable row level security;
alter table presence disable row level security;

-- 8. إدخال صفوف أولية للـ limits
insert into limits (user_id, count, date, "finalNoteSent")
values 
  ('MAZEN', 0, to_char(current_date, 'YYYY-MM-DD'), false),
  ('ASMAA', 0, to_char(current_date, 'YYYY-MM-DD'), false)
on conflict (user_id) do nothing;

-- 9. إدخال صفوف أولية للـ reactions و emoji_usage
insert into reactions (data) values ('{}') on conflict do nothing;
insert into emoji_usage (data) values ('{}') on conflict do nothing;

-- ✅ خلاص! الداتابيز جاهزة
