-- 瀏覽人次計數器（只需執行一次；可重複執行）
-- Supabase 後台 → SQL Editor → New query → 貼上 → Run
create table if not exists public.site_stats (
  id int primary key,
  visits bigint not null default 0
);
insert into public.site_stats (id, visits) values (1, 0) on conflict do nothing;
alter table public.site_stats enable row level security;   -- 不開放直接讀寫，只能透過下面兩個函式

create or replace function public.hit_visit() returns bigint
language sql security definer set search_path = public as $$
  update public.site_stats set visits = visits + 1 where id = 1 returning visits;
$$;
create or replace function public.get_visits() returns bigint
language sql security definer set search_path = public stable as $$
  select visits from public.site_stats where id = 1;
$$;
grant execute on function public.hit_visit() to anon, authenticated;
grant execute on function public.get_visits() to anon, authenticated;
