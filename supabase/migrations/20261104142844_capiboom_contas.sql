-- CapiBoom: contas de jogador (perfil + progresso) ligadas ao Supabase Auth
-- (já aplicada no projeto cswuqdlxlguivvhzugyq — guardada aqui só como registro)
create extension if not exists citext with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username extensions.citext not null unique check (username ~ '^[A-Za-z0-9_]{3,16}$'),
  oranges bigint not null default 0 check (oranges >= 0),
  data jsonb not null default '{}'::jsonb,
  synced boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.account_grants (
  email extensions.citext primary key,
  username extensions.citext unique,
  oranges bigint not null default 0,
  note text,
  claimed_at timestamptz
);

alter table public.profiles enable row level security;
alter table public.account_grants enable row level security;
create policy "perfil: ler o próprio" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy "perfil: salvar o próprio" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (oranges, data, synced) on public.profiles to authenticated;
revoke all on public.account_grants from anon, authenticated;

create or replace function public.touch_profile() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end $$;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_profile();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
declare
  want text := coalesce(nullif(new.raw_user_meta_data->>'username',''), split_part(new.email,'@',1));
  g public.account_grants%rowtype;
  final text;
  n int := 0;
begin
  want := left(regexp_replace(want, '[^A-Za-z0-9_]', '', 'g'), 16);
  if length(want) < 3 then want := 'capivara' || floor(random()*9000+1000)::int; end if;
  select * into g from public.account_grants where email = new.email::extensions.citext;
  if found and g.username is not null then want := g.username::text; end if;
  final := want;
  while exists (select 1 from public.profiles where username = final::extensions.citext)
     or exists (select 1 from public.account_grants a where a.username = final::extensions.citext and a.email <> new.email::extensions.citext) loop
    n := n + 1;
    final := left(want, 12) || floor(random()*9000+1000)::int;
    exit when n > 20;
  end loop;
  insert into public.profiles (id, username, oranges) values (new.id, final, coalesce(g.oranges, 0));
  if found then update public.account_grants set claimed_at = now() where email = new.email::extensions.citext; end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.username_available(u text, mail text default null) returns boolean language sql stable security definer set search_path = '' as $$
  select u ~ '^[A-Za-z0-9_]{3,16}$'
     and not exists (select 1 from public.profiles p where p.username = u::extensions.citext)
     and not exists (select 1 from public.account_grants a where a.username = u::extensions.citext and (mail is null or a.email <> mail::extensions.citext));
$$;
revoke all on function public.username_available(text, text) from public;
grant execute on function public.username_available(text, text) to anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.touch_profile() from public, anon, authenticated;

