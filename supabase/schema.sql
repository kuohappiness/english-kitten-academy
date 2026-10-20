-- 喵喵英文拼句學院：Supabase 資料庫結構
-- 使用方式：Supabase 後台 → SQL Editor → New query → 貼上整份 → Run
-- 可重複執行（已存在的物件會略過或更新）。

-- ========== 資料表 ==========

-- 學員資料：暱稱（排行榜顯示用，不公開 email）
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique check (char_length(nickname) between 1 and 20),
  created_at timestamptz not null default now()
);

-- 每一句的學習狀態
create table if not exists public.progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  lid text not null,             -- 主題代號，例如 unit05:take
  item int not null,             -- 第幾句（從 0 開始）
  attempts int not null default 0,
  correct boolean not null default false,
  points int not null default 0,
  points_at timestamptz,
  wrong boolean not null default false,
  wrong_count int not null default 0,
  fix int not null default 0,
  primary key (user_id, lid, item)
);

-- 主題完成獎勵（+5 分）
create table if not exists public.bonuses (
  user_id uuid not null references auth.users(id) on delete cascade,
  lid text not null,
  at timestamptz not null default now(),
  primary key (user_id, lid)
);

-- 每一次作答紀錄（老師分析常錯句子用）
create table if not exists public.attempts (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  lid text not null,
  item int not null,
  ok boolean not null,
  first_try boolean not null,
  answer text,                   -- 答錯時學生排出的句子
  created_at timestamptz not null default now()
);
create index if not exists attempts_lid_item on public.attempts (lid, item);

-- ========== 權限：學生只能「讀」自己的資料，寫入一律透過下面的函式 ==========
alter table public.profiles enable row level security;
alter table public.progress enable row level security;
alter table public.bonuses  enable row level security;
alter table public.attempts enable row level security;

drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select using (auth.uid() = id);
drop policy if exists "read own progress" on public.progress;
create policy "read own progress" on public.progress for select using (auth.uid() = user_id);
drop policy if exists "read own bonuses" on public.bonuses;
create policy "read own bonuses" on public.bonuses for select using (auth.uid() = user_id);
drop policy if exists "read own attempts" on public.attempts;
create policy "read own attempts" on public.attempts for select using (auth.uid() = user_id);

-- ========== 註冊時自動建立學員資料 ==========
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, nickname)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'nickname'), ''), split_part(new.email, '@', 1)));
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 註冊前檢查暱稱是否已被使用
create or replace function public.nickname_available(p_nickname text) returns boolean
language sql security definer set search_path = public stable as $$
  select not exists (select 1 from public.profiles where lower(nickname) = lower(trim(p_nickname)));
$$;

-- ========== 作答：積分由伺服器計算，避免學生自己改分數 ==========
create or replace function public.record_attempt(
  p_lid text, p_item int, p_ok boolean, p_first boolean, p_answer text, p_scoring boolean
) returns void
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r public.progress;
begin
  if uid is null then raise exception 'not logged in'; end if;
  if char_length(p_lid) > 60 or p_item < 0 or p_item > 500 then raise exception 'bad input'; end if;
  insert into public.progress (user_id, lid, item) values (uid, p_lid, p_item) on conflict do nothing;
  select * into r from public.progress where user_id = uid and lid = p_lid and item = p_item for update;

  if p_scoring then   -- 一般闖關才計次與給分；複習、速測不加分
    r.attempts := r.attempts + 1;
    if p_ok and not r.correct then
      r.points := case when r.attempts = 1 then 3 when r.attempts = 2 then 2 else 1 end;
      r.correct := true; r.points_at := now();
    end if;
  end if;

  if not p_ok then
    r.wrong := true; r.wrong_count := r.wrong_count + 1; r.fix := 0;
  elsif r.wrong and p_first then          -- 錯題「一次就答對」2 次後移出錯題本
    r.fix := r.fix + 1;
    if r.fix >= 2 then r.wrong := false; r.fix := 0; end if;
  end if;

  update public.progress set attempts = r.attempts, correct = r.correct, points = r.points,
    points_at = r.points_at, wrong = r.wrong, wrong_count = r.wrong_count, fix = r.fix
  where user_id = uid and lid = p_lid and item = p_item;

  insert into public.attempts (user_id, lid, item, ok, first_try, answer)
  values (uid, p_lid, p_item, p_ok, p_first, case when p_ok then null else left(p_answer, 500) end);
end $$;

-- 主題完成獎勵：伺服器確認該主題句子都答對才給
create or replace function public.claim_bonus(p_lid text, p_total int) returns boolean
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); n int;
begin
  if uid is null or p_total < 1 then return false; end if;
  select count(*) into n from public.progress where user_id = uid and lid = p_lid and correct and item < p_total;
  if n < p_total then return false; end if;
  insert into public.bonuses (user_id, lid) values (uid, p_lid) on conflict do nothing;
  return found;
end $$;

-- 排行榜：只公開暱稱與分數。p_since 為 null＝總積分
create or replace function public.leaderboard(p_since timestamptz default null)
returns table (nickname text, score int)
language sql security definer set search_path = public stable as $$
  select * from (
    select p.nickname,
      (coalesce((select sum(g.points) from public.progress g
                 where g.user_id = p.id and (p_since is null or g.points_at >= p_since)), 0)
       + 5 * (select count(*) from public.bonuses b
              where b.user_id = p.id and (p_since is null or b.at >= p_since)))::int as score
    from public.profiles p
  ) s
  where p_since is null or s.score > 0
  order by s.score desc, s.nickname
  limit 10;
$$;

-- 函式執行權限
revoke all on function public.record_attempt(text,int,boolean,boolean,text,boolean) from public, anon;
revoke all on function public.claim_bonus(text,int) from public, anon;
revoke all on function public.leaderboard(timestamptz) from public, anon;
grant execute on function public.record_attempt(text,int,boolean,boolean,text,boolean) to authenticated;
grant execute on function public.claim_bonus(text,int) to authenticated;
grant execute on function public.leaderboard(timestamptz) to authenticated;
grant execute on function public.nickname_available(text) to anon, authenticated;

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
