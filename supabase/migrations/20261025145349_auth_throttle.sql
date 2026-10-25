create table game_private.auth_attempts (
 key text primary key, attempts integer not null default 0, window_start timestamptz not null default now()
);
alter table game_private.auth_attempts enable row level security;
revoke all on game_private.auth_attempts from public,anon,authenticated;
create function game_private.throttle(k text) returns boolean language plpgsql security definer set search_path='' as $$
 declare n integer;
 begin
 insert into game_private.auth_attempts(key,attempts) values(k,1)
 on conflict(key) do update set attempts=case when auth_attempts.window_start<now()-interval '15 minutes' then 1 else auth_attempts.attempts+1 end,
 window_start=case when auth_attempts.window_start<now()-interval '15 minutes' then now() else auth_attempts.window_start end returning attempts into n;
 delete from game_private.auth_attempts where window_start<now()-interval '1 day';
 return n<=10;
 end $$;
create function public.game_auth_throttle(p_key text) returns boolean language sql security invoker set search_path='' as $$ select game_private.throttle(p_key) $$;
revoke all on function game_private.throttle(text),public.game_auth_throttle(text) from public,anon,authenticated;
grant execute on function game_private.throttle(text),public.game_auth_throttle(text) to service_role;
