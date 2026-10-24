-- aboutus-freezer-stock 初回セットアップ
-- Supabase SQL Editor で一度だけ実行してください。

-- お菓子の種類
create table if not exists fs_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  shelf_life_days integer not null default 30,  -- 仕込み日から何日で期限か
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

-- 仕込みロット（仕込み日ごとの在庫）
create table if not exists fs_lots (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references fs_items(id) on delete cascade,
  made_on date not null,
  expires_on date not null,
  quantity integer not null default 0 check (quantity >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fs_lots_item_made_idx on fs_lots (item_id, made_on);

-- 個数の増減（2台の端末で同時に押しても数がずれないよう、DB側で足し引きする）
create or replace function fs_adjust_lot(p_lot_id uuid, p_delta integer)
returns fs_lots
language sql
as $$
  update fs_lots
     set quantity = greatest(quantity + p_delta, 0),
         updated_at = now()
   where id = p_lot_id
  returning *;
$$;

-- RLS（他の姉妹アプリと同じく anon 全許可）
alter table fs_items enable row level security;
alter table fs_lots enable row level security;

drop policy if exists "fs_items anon all" on fs_items;
create policy "fs_items anon all" on fs_items for all to anon using (true) with check (true);

drop policy if exists "fs_lots anon all" on fs_lots;
create policy "fs_lots anon all" on fs_lots for all to anon using (true) with check (true);

grant execute on function fs_adjust_lot(uuid, integer) to anon;
