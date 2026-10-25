-- GAME: abstract fictional competition. No geographic or operational military models.
create schema if not exists game_private;
revoke all on schema game_private from public, anon;
grant usage on schema game_private to authenticated, service_role;
alter default privileges in schema game_private revoke execute on functions from public;

create table public.teams (
 id uuid primary key default gen_random_uuid(), code text not null unique check(code in ('iran','usa')),
 name text not null, color text not null
);
insert into public.teams(id,code,name,color) values
 ('10000000-0000-4000-8000-000000000001','iran','ایران','#20E3A2'),
 ('10000000-0000-4000-8000-000000000002','usa','آمریکا','#38BDF8');
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 username text unique not null check(username ~ '^[a-z0-9_]{3,32}$'),
 display_name text not null check(length(display_name) between 1 and 80),
 role text not null default 'player' check(role in ('admin','player','spectator')),
 disabled boolean not null default false, must_change_password boolean not null default true,
 created_at timestamptz not null default now()
);
create table public.matches (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 1 and 100),
 description text not null default '', status text not null default 'draft' check(status in ('draft','ready','running','paused','ended','archived')),
 is_test boolean not null default false, created_by uuid references public.profiles(id),
 created_at timestamptz not null default now(), scheduled_at timestamptz,
 started_at timestamptz, ends_at timestamptz, paused_at timestamptz, ended_at timestamptz,
 result jsonb, revision bigint not null default 0
);
create table public.match_members (
 id uuid primary key default gen_random_uuid(), match_id uuid not null references public.matches(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade, team_id uuid references public.teams(id),
 role text not null check(role in ('commander','operator','spectator')),
 unique(match_id,user_id), check((role='spectator' and team_id is null) or (role<>'spectator' and team_id is not null))
);
create table public.game_settings (
 id uuid primary key default gen_random_uuid(), match_id uuid not null unique references public.matches(id) on delete cascade,
 rules jsonb not null default '{"mission_seconds":40,"return_seconds":15,"repair_seconds":60,"jam_seconds":25,"mission_credits":120,"mission_energy":45,"repair_credits":100,"repair_materials":40,"build_credits":300,"build_materials":80,"upgrade_credits":200,"upgrade_research":25,"defense_chance":0.35,"manual_chance":0.45,"damage":35,"repair_slots":2,"victory_score":2000,"duration_minutes":60,"advanced_enabled":true,"maintenance":false,"initial_credits":5000,"initial_energy":2000,"initial_materials":1200,"initial_logistics":20,"initial_research":200,"initial_mission_tokens":30}'::jsonb
);
create table public.structure_types (
 id uuid primary key default gen_random_uuid(), code text not null unique, name text not null check(length(name) between 1 and 60),
 icon text not null default 'building', enabled boolean not null default true
);
insert into public.structure_types(code,name,icon) values
 ('airbase','پایگاه هوایی','plane'),('command','مرکز فرماندهی','command'),('radar','ایستگاه رادار مجازی','radar'),
 ('defense','پدافند بازی','shield'),('warehouse','انبار منابع','box'),('repair','مرکز تعمیرات','wrench'),
 ('comms','مرکز ارتباطات','radio'),('strategic','تأسیسات راهبردی خیالی','building'),('story','ساختمان داستانی','building'),('residence','اقامتگاه داستانی','home');
create table public.structures (
 id uuid primary key default gen_random_uuid(), match_id uuid not null references public.matches(id) on delete cascade,
 team_id uuid not null references public.teams(id), type_id uuid not null references public.structure_types(id),
 name text not null check(length(name) between 1 and 80), description text not null default '' check(length(description)<=240),
 x numeric not null check(x between 0 and 1000), y numeric not null check(y between 0 and 1000),
 hp integer not null default 100 check(hp>=0), max_hp integer not null default 100 check(max_hp between 1 and 1000 and hp<=max_hp),
 level integer not null default 1 check(level between 1 and 10),
 status text not null default 'healthy' check(status in ('healthy','damaged','needs_repair','repairing','repaired','inactive','destroyed')),
 intel text not null default 'identified' check(intel in ('identified','unknown','hidden')),
 active boolean not null default true, fictional boolean not null default true check(fictional),
 repair_cost integer not null default 100 check(repair_cost>=0), repair_seconds integer not null default 60 check(repair_seconds between 5 and 3600),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,match_id)
);
create table public.fictional_characters (
 id uuid primary key default gen_random_uuid(), match_id uuid not null references public.matches(id) on delete cascade,
 team_id uuid not null references public.teams(id), first_name text not null, last_name text not null, title text not null,
 description text not null default '', residence_id uuid not null, fictional boolean not null default true check(fictional),
 status text not null default 'active' check(status in ('active','safe','lost')),
 foreign key(residence_id,match_id) references public.structures(id,match_id) on delete cascade
);
create table public.aircraft (
 id uuid primary key default gen_random_uuid(), match_id uuid not null references public.matches(id) on delete cascade,
 team_id uuid not null references public.teams(id), name text not null,
 kind text not null check(kind in ('standard','advanced','stealth')), level integer not null default 1 check(level between 1 and 10),
 hp integer not null default 100 check(hp between 0 and 100), energy integer not null default 100 check(energy between 0 and 100),
 animation_speed integer not null default 1 check(animation_speed between 1 and 5), cost integer not null default 120 check(cost>=0),
 missions_remaining integer not null default 12 check(missions_remaining>=0), preparation_seconds integer not null default 15,
 status text not null default 'ready' check(status in ('ready','preparing','mission','returning','damaged','destroyed','inactive','repairing')),
 home_id uuid not null, x numeric not null, y numeric not null, ready_at timestamptz,
 foreign key(home_id,match_id) references public.structures(id,match_id), unique(id,match_id),
 check(kind<>'stealth' or team_id='10000000-0000-4000-8000-000000000002')
);
create table public.defense_units (
 id uuid primary key default gen_random_uuid(), match_id uuid not null references public.matches(id) on delete cascade,
 team_id uuid not null references public.teams(id), structure_id uuid not null unique,
 name text not null, level integer not null default 1 check(level between 1 and 10),
 defense_score integer not null default 20 check(defense_score between 0 and 100),
 charges integer not null default 10 check(charges>=0), cooldown_seconds integer not null default 15,
 ready_at timestamptz, active boolean not null default true,
 foreign key(structure_id,match_id) references public.structures(id,match_id) on delete cascade
);
create table public.intel_contacts (
 id uuid primary key default gen_random_uuid(), match_id uuid not null references public.matches(id) on delete cascade,
 observer_team_id uuid not null references public.teams(id), target_id uuid not null,
 visibility text not null check(visibility in ('identified','unknown')),
 label text not null, kind text, x numeric, y numeric, health_pct integer,
 updated_at timestamptz not null default now(), unique(match_id,observer_team_id,target_id),
 foreign key(target_id,match_id) references public.structures(id,match_id) on delete cascade,
 check(visibility='identified' or (x is null and y is null and kind is null and health_pct is null))
);
create table public.team_resources (
 id uuid primary key default gen_random_uuid(), match_id uuid not null references public.matches(id) on delete cascade,
 team_id uuid not null references public.teams(id), credits bigint not null default 5000 check(credits>=0),
 energy bigint not null default 2000 check(energy>=0), materials bigint not null default 1200 check(materials>=0),
 logistics bigint not null default 20 check(logistics>=0), research bigint not null default 200 check(research>=0),
 mission_tokens bigint not null default 30 check(mission_tokens>=0), unique(match_id,team_id)
);
create table public.resource_transactions (
 id uuid primary key default gen_random_uuid(), match_id uuid not null references public.matches(id) on delete cascade,
 team_id uuid not null references public.teams(id), actor_id uuid references public.profiles(id),
 reason text not null, delta jsonb not null, created_at timestamptz not null default now()
);
create table public.missions (
 id uuid primary key default gen_random_uuid(), match_id uuid not null references public.matches(id) on delete cascade,
 team_id uuid not null references public.teams(id), actor_id uuid not null references public.profiles(id),
 aircraft_id uuid not null, target_id uuid not null, target_team_id uuid not null references public.teams(id),
 status text not null default 'outbound' check(status in ('outbound','returning','completed','failed','destroyed')),
 started_at timestamptz not null default now(), resolves_at timestamptz not null, ready_at timestamptz not null,
 jam_until timestamptz, manual_attempted boolean not null default false, manual_success boolean not null default false,
 origin_x numeric not null, origin_y numeric not null, target_x numeric not null, target_y numeric not null,
 result jsonb, foreign key(aircraft_id,match_id) references public.aircraft(id,match_id),
 foreign key(target_id,match_id) references public.structures(id,match_id), unique(id,match_id)
);
create unique index one_active_mission on public.missions(aircraft_id) where status in ('outbound','returning');
create table public.mission_signals (
 id uuid primary key default gen_random_uuid(), match_id uuid not null references public.matches(id) on delete cascade,
 mission_id uuid not null references public.missions(id) on delete cascade, viewer_team_id uuid not null references public.teams(id),
 label text not null, jammed boolean not null default false, x numeric, y numeric, target_x numeric, target_y numeric,
 started_at timestamptz not null, resolves_at timestamptz not null, jam_until timestamptz,
 unique(mission_id,viewer_team_id), check(not jammed or (x is null and y is null and target_x is null and target_y is null))
);
create table public.mission_events (
 id uuid primary key default gen_random_uuid(), match_id uuid not null references public.matches(id) on delete cascade,
 team_id uuid not null references public.teams(id), mission_id uuid not null references public.missions(id) on delete cascade,
 kind text not null, payload jsonb not null default '{}', created_at timestamptz not null default now()
);
create table public.defense_events (
 id uuid primary key default gen_random_uuid(), match_id uuid not null references public.matches(id) on delete cascade,
 team_id uuid not null references public.teams(id), mission_id uuid not null references public.missions(id) on delete cascade,
 defense_id uuid references public.defense_units(id), actor_id uuid references public.profiles(id),
 manual boolean not null default false, region integer check(region between 1 and 4), success boolean not null,
 created_at timestamptz not null default now(), unique(mission_id,manual)
);
create table public.repair_jobs (
 id uuid primary key default gen_random_uuid(), match_id uuid not null references public.matches(id) on delete cascade,
 team_id uuid not null references public.teams(id), actor_id uuid not null references public.profiles(id),
 structure_id uuid, aircraft_id uuid, started_at timestamptz not null default now(), completes_at timestamptz not null,
 status text not null default 'active' check(status in ('active','completed','cancelled')),
 check(num_nonnulls(structure_id,aircraft_id)=1),
 foreign key(structure_id,match_id) references public.structures(id,match_id),
 foreign key(aircraft_id,match_id) references public.aircraft(id,match_id)
);
create unique index one_structure_repair on public.repair_jobs(structure_id) where status='active';
create unique index one_aircraft_repair on public.repair_jobs(aircraft_id) where status='active';
create table public.match_scores (
 id uuid primary key default gen_random_uuid(), match_id uuid not null references public.matches(id) on delete cascade,
 team_id uuid not null references public.teams(id), score integer not null default 0 check(score>=0),
 successful_missions integer not null default 0, successful_defenses integer not null default 0,
 losses integer not null default 0, damage integer not null default 0, repairs integer not null default 0,
 unique(match_id,team_id)
);
create table public.game_events (
 id uuid primary key default gen_random_uuid(), seq bigint generated always as identity unique,
 match_id uuid not null references public.matches(id) on delete cascade, team_id uuid references public.teams(id),
 kind text not null, title text not null, payload jsonb not null default '{}', state jsonb,
 created_at timestamptz not null default now()
);
create table public.notifications (
 id uuid primary key default gen_random_uuid(), match_id uuid not null references public.matches(id) on delete cascade,
 team_id uuid references public.teams(id), kind text not null, title text not null, body text not null default '',
 created_at timestamptz not null default now()
);
create table public.notification_reads (
 id uuid primary key default gen_random_uuid(), notification_id uuid not null references public.notifications(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade, read_at timestamptz not null default now(), unique(notification_id,user_id)
);
create table public.audit_logs (
 id uuid primary key default gen_random_uuid(), match_id uuid references public.matches(id) on delete set null,
 actor_id uuid references public.profiles(id) on delete set null, action text not null, payload jsonb not null default '{}',
 created_at timestamptz not null default now()
);
create table public.action_requests (
 id uuid primary key default gen_random_uuid(), match_id uuid not null references public.matches(id) on delete cascade,
 actor_id uuid not null references public.profiles(id) on delete cascade, request_id uuid not null,
 action text not null, payload jsonb not null, response jsonb not null, created_at timestamptz not null default now(),
 unique(actor_id,request_id)
);
create table public.system_settings (id boolean primary key default true check(id), maintenance boolean not null default false);
insert into public.system_settings values(true,false);

create index members_user on public.match_members(user_id,match_id);
create index profiles_role on public.profiles(role) where not disabled;
create index structures_team on public.structures(match_id,team_id);
create index aircraft_team on public.aircraft(match_id,team_id);
create index defense_team on public.defense_units(match_id,team_id);
create index contacts_team on public.intel_contacts(match_id,observer_team_id);
create index missions_due on public.missions(match_id,resolves_at) where status='outbound';
create index missions_team on public.missions(match_id,team_id);
create index repairs_due on public.repair_jobs(match_id,completes_at) where status='active';
create index events_feed on public.game_events(match_id,team_id,seq desc);
create index notifications_feed on public.notifications(match_id,team_id,created_at desc);
create index resource_history on public.resource_transactions(match_id,team_id,created_at desc);
create index audit_history on public.audit_logs(created_at desc);
create index signals_viewer on public.mission_signals(match_id,viewer_team_id);

create function game_private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.profiles where id=auth.uid() and role='admin' and not disabled and not must_change_password)
$$;
create function game_private.is_member(mid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and (game_private.is_admin() or exists(select 1 from public.match_members m join public.profiles p on p.id=m.user_id where m.match_id=mid and m.user_id=auth.uid() and not p.disabled and not p.must_change_password))
$$;
create function game_private.my_team(mid uuid) returns uuid language sql stable security definer set search_path='' as $$
 select m.team_id from public.match_members m join public.profiles p on p.id=m.user_id where m.match_id=mid and m.user_id=auth.uid() and not p.disabled and p.role<>'spectator' and m.role<>'spectator'
$$;
create function game_private.can_read(mid uuid,tid uuid) returns boolean language sql stable security definer set search_path='' as $$
 select game_private.is_member(mid) and (game_private.is_admin() or tid is null or tid=game_private.my_team(mid))
$$;
create function game_private.operator(mid uuid) returns uuid language plpgsql stable security definer set search_path='' as $$
 declare tid uuid;
 begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select m.team_id into tid from public.match_members m join public.profiles p on p.id=m.user_id
 where m.match_id=mid and m.user_id=auth.uid() and m.role in ('commander','operator') and p.role<>'spectator' and not p.disabled and not p.must_change_password;
 if tid is null then raise exception 'OPERATOR_REQUIRED'; end if;
 return tid;
 end $$;
-- Read-only API grants; writes are possible only through validated functions.
do $$ declare t text; begin
 foreach t in array array['teams','profiles','matches','match_members','game_settings','structure_types','structures','fictional_characters','aircraft','defense_units','intel_contacts','team_resources','resource_transactions','missions','mission_signals','mission_events','defense_events','repair_jobs','match_scores','game_events','notifications','notification_reads','audit_logs','action_requests','system_settings'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon, authenticated',t);
 execute format('grant select on public.%I to authenticated',t);
 end loop;
end $$;
create policy teams_read on public.teams for select to authenticated using(auth.uid() is not null);
create policy profiles_read on public.profiles for select to authenticated using(id=(select auth.uid()) or (select game_private.is_admin()));
create policy matches_read on public.matches for select to authenticated using(game_private.is_member(id));
create policy members_read on public.match_members for select to authenticated using(user_id=(select auth.uid()) or (select game_private.is_admin()));
create policy settings_read on public.game_settings for select to authenticated using(game_private.is_member(match_id));
create policy types_read on public.structure_types for select to authenticated using(auth.uid() is not null);
create policy system_read on public.system_settings for select to authenticated using(auth.uid() is not null);
do $$ declare t text; begin
 foreach t in array array['structures','fictional_characters','aircraft','defense_units','team_resources','resource_transactions','missions','mission_events','defense_events','repair_jobs'] loop
 execute format('create policy team_read on public.%I for select to authenticated using(game_private.can_read(match_id,team_id))',t);
 end loop;
end $$;
create policy intel_read on public.intel_contacts for select to authenticated using(game_private.can_read(match_id,observer_team_id));
create policy signal_read on public.mission_signals for select to authenticated using(game_private.can_read(match_id,viewer_team_id));
create policy score_read on public.match_scores for select to authenticated using(game_private.is_member(match_id));
create policy event_read on public.game_events for select to authenticated using(game_private.can_read(match_id,team_id));
create policy notice_read on public.notifications for select to authenticated using(game_private.can_read(match_id,team_id));
create policy receipt_read on public.notification_reads for select to authenticated using(user_id=(select auth.uid()));
create policy audit_read on public.audit_logs for select to authenticated using((select game_private.is_admin()));
create policy request_read on public.action_requests for select to authenticated using(actor_id=(select auth.uid()));

create function game_private.safe_text(value text,max_len integer default 240) returns text language plpgsql immutable set search_path='' as $$
 begin
 if value is null or length(trim(value))=0 or length(value)>max_len or value ~* '(https?://|www\.|@|[0-9۰-۹]{7,})' then raise exception 'FICTIONAL_TEXT_REQUIRED'; end if;
 return trim(value);
 end $$;
create function game_private.refresh_intel(mid uuid) returns void language plpgsql security definer set search_path='' as $$
 begin
 delete from public.intel_contacts c using public.structures s where c.target_id=s.id and s.match_id=mid and s.intel='hidden';
 insert into public.intel_contacts(match_id,observer_team_id,target_id,visibility,label,kind,x,y,health_pct)
 select s.match_id,t.id,s.id,s.intel,case when s.intel='identified' then s.name else 'تماس نامشخص' end,
 case when s.intel='identified' then st.code end,case when s.intel='identified' then s.x end,case when s.intel='identified' then s.y end,
 case when s.intel='identified' then round(100.0*s.hp/s.max_hp)::int end
 from public.structures s join public.structure_types st on st.id=s.type_id cross join public.teams t
 where s.match_id=mid and t.id<>s.team_id and s.intel<>'hidden'
 on conflict(match_id,observer_team_id,target_id) do update set visibility=excluded.visibility,label=excluded.label,kind=excluded.kind,x=excluded.x,y=excluded.y,health_pct=excluded.health_pct,updated_at=now();
 end $$;
create function game_private.visible_state(mid uuid,tid uuid) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
 'structures',coalesce((select jsonb_agg(to_jsonb(s)) from public.structures s where match_id=mid and team_id=tid),'[]'::jsonb),
 'contacts',coalesce((select jsonb_agg(to_jsonb(c)) from public.intel_contacts c where match_id=mid and observer_team_id=tid),'[]'::jsonb),
 'signals',coalesce((select jsonb_agg(to_jsonb(s)) from public.mission_signals s where match_id=mid and viewer_team_id=tid),'[]'::jsonb),
 'missions',coalesce((select jsonb_agg(to_jsonb(ms)) from public.missions ms where match_id=mid and team_id=tid and status in ('outbound','returning')),'[]'::jsonb),
 'resources',coalesce((select jsonb_agg(to_jsonb(rs)) from public.team_resources rs where match_id=mid and team_id=tid),'[]'::jsonb),
 'scores',coalesce((select jsonb_agg(to_jsonb(s)) from public.match_scores s where match_id=mid),'[]'::jsonb))
$$;
create function game_private.emit(mid uuid,tid uuid,event_kind text,event_title text,event_payload jsonb default '{}') returns void language plpgsql security definer set search_path='' as $$
 begin
 insert into public.game_events(match_id,team_id,kind,title,payload,state) values(mid,tid,event_kind,event_title,event_payload,case when tid is not null then game_private.visible_state(mid,tid) end);
 insert into public.notifications(match_id,team_id,kind,title,body) values(mid,tid,event_kind,event_title,coalesce(event_payload->>'message',''));
 update public.matches set revision=revision+1 where id=mid;
 end $$;
create function game_private.spend(mid uuid,tid uuid,reason_text text,dc bigint default 0,de bigint default 0,dm bigint default 0,dl bigint default 0,dr bigint default 0,dt bigint default 0) returns void language plpgsql security definer set search_path='' as $$
 begin
 update public.team_resources set credits=credits+dc,energy=energy+de,materials=materials+dm,logistics=logistics+dl,research=research+dr,mission_tokens=mission_tokens+dt
 where match_id=mid and team_id=tid and credits+dc>=0 and energy+de>=0 and materials+dm>=0 and logistics+dl>=0 and research+dr>=0 and mission_tokens+dt>=0;
 if not found then raise exception 'INSUFFICIENT_RESOURCES'; end if;
 insert into public.resource_transactions(match_id,team_id,actor_id,reason,delta) values(mid,tid,auth.uid(),reason_text,jsonb_build_object('credits',dc,'energy',de,'materials',dm,'logistics',dl,'research',dr,'mission_tokens',dt));
 end $$;
create function game_private.recalculate(mid uuid) returns void language plpgsql security definer set search_path='' as $$
 begin
 update public.match_scores sc set score=(select coalesce(sum(s.hp),0)::int from public.structures s where s.match_id=mid and s.team_id=sc.team_id and s.active)
 +sc.successful_missions*100+sc.successful_defenses*60+sc.repairs*20+
 (select (r.research/10+r.credits/100)::int from public.team_resources r where r.match_id=mid and r.team_id=sc.team_id)
 where sc.match_id=mid;
 end $$;
create function game_private.finish(mid uuid) returns void language plpgsql security definer set search_path='' as $$
 declare result_data jsonb; winner uuid;
 begin
 perform game_private.recalculate(mid);
 select case when count(*)=1 then (array_agg(team_id))[1] end into winner from public.match_scores where match_id=mid and score=(select max(score) from public.match_scores where match_id=mid);
 select jsonb_build_object('winner',winner,'scores',jsonb_agg(to_jsonb(s)),'mission_count',(select count(*) from public.missions where match_id=mid)) into result_data from public.match_scores s where match_id=mid;
 update public.matches set status='ended',ended_at=now(),result=result_data where id=mid;
 -- Freeze in-flight work; final state is immutable except archival or explicit test reset.
 update public.missions set status='failed',result=coalesce(result,'{}')||'{"reason":"match_ended"}' where match_id=mid and status in ('outbound','returning');
 update public.aircraft set status=case when hp=0 then 'destroyed' when hp<100 then 'damaged' else 'ready' end where match_id=mid and status in ('mission','returning','repairing');
 update public.structures set status=case when hp=0 then 'destroyed' else 'damaged' end where match_id=mid and status='repairing';
 update public.repair_jobs set status='cancelled' where match_id=mid and status='active';
 delete from public.mission_signals where match_id=mid;
 perform game_private.emit(mid,null,'match_ended','مسابقه پایان یافت',result_data);
 end $$;
create function game_private.tick_match(mid uuid) returns void language plpgsql security definer set search_path='' as $$
 declare m public.matches%rowtype; r jsonb; ms public.missions%rowtype; a public.aircraft%rowtype;
 d public.defense_units%rowtype; j public.repair_jobs%rowtype; s public.structures%rowtype;
 defended boolean; destroyed_air boolean; damage_amount integer; tx uuid; winner_score integer;
 begin
 select * into m from public.matches where id=mid for update;
 if m.status<>'running' then return; end if;
 update public.aircraft a0 set x=case when flight.status='outbound' then flight.origin_x+(flight.target_x-flight.origin_x)*least(1,greatest(0,extract(epoch from (now()-flight.started_at))/greatest(1,extract(epoch from (flight.resolves_at-flight.started_at))))) else flight.target_x+(flight.origin_x-flight.target_x)*least(1,greatest(0,extract(epoch from (now()-flight.resolves_at))/greatest(1,extract(epoch from (flight.ready_at-flight.resolves_at))))) end,
 y=case when flight.status='outbound' then flight.origin_y+(flight.target_y-flight.origin_y)*least(1,greatest(0,extract(epoch from (now()-flight.started_at))/greatest(1,extract(epoch from (flight.resolves_at-flight.started_at))))) else flight.target_y+(flight.origin_y-flight.target_y)*least(1,greatest(0,extract(epoch from (now()-flight.resolves_at))/greatest(1,extract(epoch from (flight.ready_at-flight.resolves_at))))) end
 from public.missions flight where a0.id=flight.aircraft_id and flight.match_id=mid and flight.status in ('outbound','returning');
 select rules into r from public.game_settings where match_id=mid;
 for ms in select * from public.missions where match_id=mid and status='outbound' and resolves_at<=now() order by resolves_at,id for update loop
 select * into a from public.aircraft where id=ms.aircraft_id for update;
 select * into s from public.structures where id=ms.target_id for update;
 defended:=ms.manual_success; destroyed_air:=false;
 -- An active jam only disables automatic defense until its server-side expiration.
 if not ms.manual_attempted and (ms.jam_until is null or ms.jam_until<=ms.resolves_at) then
 select du.* into d from public.defense_units du join public.structures st on st.id=du.structure_id
 where du.match_id=mid and du.team_id=ms.target_team_id and du.active and du.charges>0 and st.hp>0 and st.active and st.status<>'repairing' and (du.ready_at is null or du.ready_at<=now()) order by du.id limit 1 for update of du;
 if found then
 defended:=random()<least(0.85,(r->>'defense_chance')::numeric+d.defense_score*0.001+d.level*0.015);
 update public.defense_units set charges=charges-1,ready_at=now()+make_interval(secs=>cooldown_seconds) where id=d.id;
 insert into public.defense_events(match_id,team_id,mission_id,defense_id,success) values(mid,ms.target_team_id,ms.id,d.id,defended);
 end if;
 end if;
 damage_amount:=case when defended then 0 else least(s.hp,(r->>'damage')::int+a.level*2) end;
 if defended then
 destroyed_air:=random()<0.2;
 update public.aircraft set hp=case when destroyed_air then 0 else greatest(1,hp-30) end,status=case when destroyed_air then 'destroyed' else 'returning' end where id=a.id;
 update public.match_scores set successful_defenses=successful_defenses+1 where match_id=mid and team_id=ms.target_team_id;
 if destroyed_air then update public.match_scores set losses=losses+1 where match_id=mid and team_id=ms.team_id; end if;
 else
 update public.structures set hp=hp-damage_amount,status=case when hp-damage_amount=0 then 'destroyed' when status='repairing' then 'repairing' else 'damaged' end,active=hp-damage_amount>0,updated_at=now() where id=s.id;
 update public.aircraft set status='returning' where id=a.id;
 update public.match_scores set successful_missions=successful_missions+1,damage=damage+damage_amount where match_id=mid and team_id=ms.team_id;
 if s.hp>0 and s.hp-damage_amount=0 then
 update public.match_scores set losses=losses+1 where match_id=mid and team_id=ms.target_team_id;
 for tx in select id from public.fictional_characters where residence_id=s.id and status<>'lost' loop
 update public.fictional_characters set status='lost' where id=tx;
 perform game_private.emit(mid,ms.target_team_id,'character_lost','رویداد شخصیت داستانی',jsonb_build_object('message',(select 'اطلاعیه بازی: شخصیت خیالی '||first_name||' '||last_name||' در رویداد اخیر کشته شد.' from public.fictional_characters where id=tx)));
 end loop;
 end if;
 end if;
 update public.missions set status=case when destroyed_air then 'destroyed' else 'returning' end,result=jsonb_build_object('defended',defended,'damage',damage_amount,'aircraft_lost',destroyed_air) where id=ms.id;
 insert into public.mission_events(match_id,team_id,mission_id,kind,payload) values(mid,ms.team_id,ms.id,'resolved',jsonb_build_object('damage',damage_amount,'defended',defended));
 delete from public.mission_signals where mission_id=ms.id;
 perform game_private.refresh_intel(mid); perform game_private.recalculate(mid);
 perform game_private.emit(mid,ms.team_id,'mission_resolved',case when defended then 'مأموریت متوقف شد' else 'مأموریت به هدف رسید' end,jsonb_build_object('mission_id',ms.id,'damage',damage_amount,'target_x',ms.target_x,'target_y',ms.target_y,'defended',defended));
 perform game_private.emit(mid,ms.target_team_id,'defense_resolved',case when defended then 'دفاع بازی موفق بود' else 'آسیب به یک سازهٔ خیالی' end,jsonb_build_object('damage',damage_amount,'target_id',s.id,'target_x',s.x,'target_y',s.y,'defended',defended));
 end loop;
 for ms in select * from public.missions where match_id=mid and status='returning' and ready_at<=now() for update loop
 update public.missions set status=case when (result->>'defended')::boolean then 'failed' else 'completed' end where id=ms.id;
 update public.aircraft set status=case when hp<100 then 'damaged' else 'ready' end,x=ms.origin_x,y=ms.origin_y,ready_at=null where id=ms.aircraft_id;
 perform game_private.emit(mid,ms.team_id,'aircraft_ready','واحد به پایگاه بازگشت',jsonb_build_object('aircraft_id',ms.aircraft_id));
 end loop;
 for j in select * from public.repair_jobs where match_id=mid and status='active' and completes_at<=now() order by completes_at for update loop
 if j.structure_id is not null then update public.structures set hp=max_hp,status='healthy',active=true,updated_at=now() where id=j.structure_id;
 else update public.aircraft set hp=100,energy=100,status='ready' where id=j.aircraft_id; end if;
 update public.repair_jobs set status='completed' where id=j.id;
 update public.match_scores set repairs=repairs+1 where match_id=mid and team_id=j.team_id;
 perform game_private.refresh_intel(mid); perform game_private.recalculate(mid);
 perform game_private.emit(mid,j.team_id,'repair_completed','تعمیر با موفقیت تکمیل شد',jsonb_build_object('repair_id',j.id));
 end loop;
 -- Expired visual jams clear without revealing a stealth position.
 for ms in select * from public.missions where match_id=mid and status='outbound' and jam_until<=now() and exists(select 1 from public.mission_signals sg where sg.mission_id=missions.id and sg.jammed and sg.jam_until is not null) loop
 update public.mission_signals set jam_until=null where mission_id=ms.id and jammed;
 perform game_private.emit(mid,ms.target_team_id,'jam_ended','اختلال نمایشی پایان یافت','{}');
 end loop;
 perform game_private.recalculate(mid);
 select max(score) into winner_score from public.match_scores where match_id=mid;
 if m.ends_at<=now() or winner_score>=(r->>'victory_score')::int then perform game_private.finish(mid); end if;
 end $$;
create function game_private.seed_scenario(mid uuid) returns void language plpgsql security definer set search_path='' as $$
 declare t public.teams%rowtype; base uuid; st uuid; def uuid; residence uuid; k integer; offset_x integer; rules_data jsonb;
 begin
 select rules into rules_data from public.game_settings where match_id=mid;
 for t in select * from public.teams order by code loop
 offset_x:=case when t.code='iran' then 0 else 500 end;
 insert into public.team_resources(match_id,team_id,credits,energy,materials,logistics,research,mission_tokens) values(mid,t.id,(rules_data->>'initial_credits')::bigint,(rules_data->>'initial_energy')::bigint,(rules_data->>'initial_materials')::bigint,(rules_data->>'initial_logistics')::bigint,(rules_data->>'initial_research')::bigint,(rules_data->>'initial_mission_tokens')::bigint);
 insert into public.match_scores(match_id,team_id) values(mid,t.id);
 for k in 1..7 loop
 insert into public.structures(match_id,team_id,type_id,name,x,y,hp,status,intel)
 values(mid,t.id,(select id from public.structure_types where code=(array['airbase','command','radar','defense','repair','warehouse','residence'])[k]),
 (array['پایگاه سپهر','فرماندهی افق','ایستگاه پرتو','سپر آبی','کارگاه آذر','انبار ستاره','اقامتگاه داستانی'])[k]||case when t.code='iran' then ' • شرق' else ' • غرب' end,
 offset_x+(array[160,275,350,180,320,120,390])[k],(array[310,230,450,590,680,770,810])[k],case when k=5 then 55 when k=6 then 70 else 100 end,case when k in (5,6) then 'damaged' else 'healthy' end,case when k=3 then 'hidden' when k=7 then 'unknown' else 'identified' end) returning id into st;
 if k=1 then base:=st; end if;
 if k=4 then insert into public.defense_units(match_id,team_id,structure_id,name) values(mid,t.id,st,'نگهبان مجازی'); end if;
 if k=7 then residence:=st; end if;
 end loop;
 for k in 1..3 loop
 insert into public.aircraft(match_id,team_id,name,kind,home_id,x,y)
 values(mid,t.id,case when k=3 and t.code='usa' then 'شبح • S03' else 'شاهین • A0'||k end,case when k=3 and t.code='usa' then 'stealth' when k=2 then 'advanced' else 'standard' end,base,offset_x+160,310);
 end loop;
 insert into public.fictional_characters(match_id,team_id,first_name,last_name,title,residence_id)
 values(mid,t.id,case when t.code='iran' then 'آرمان' else 'الیوت' end,case when t.code='iran' then 'مهرافزا' else 'استارلینگ' end,'هماهنگ‌کنندهٔ داستانی',residence);
 end loop;
 perform game_private.refresh_intel(mid); perform game_private.recalculate(mid);
 perform game_private.emit(mid,'10000000-0000-4000-8000-000000000001','scenario_ready','سناریوی خیالی آماده است','{}');
 perform game_private.emit(mid,'10000000-0000-4000-8000-000000000002','scenario_ready','سناریوی خیالی آماده است','{}');
 end $$;

create function game_private.validate_rules(r jsonb) returns void language plpgsql immutable set search_path='' as $$
 declare k text; v numeric;
 begin
 if jsonb_typeof(r)<>'object' then raise exception 'INVALID_RULES'; end if;
 for k in select jsonb_object_keys(r) loop
 if k in ('advanced_enabled','maintenance') then
 if jsonb_typeof(r->k)<>'boolean' then raise exception 'INVALID_RULES'; end if;
 elsif k in ('defense_chance','manual_chance') then
 v:=(r->>k)::numeric; if v<0 or v>0.9 then raise exception 'INVALID_RULES'; end if;
 elsif k in ('mission_seconds','return_seconds','repair_seconds','jam_seconds') then
 v:=(r->>k)::numeric; if v<>trunc(v) or v<5 or v>3600 then raise exception 'INVALID_RULES'; end if;
 elsif k in ('mission_credits','mission_energy','repair_credits','repair_materials','build_credits','build_materials','upgrade_credits','upgrade_research','initial_credits','initial_energy','initial_materials','initial_logistics','initial_research','initial_mission_tokens') then
 v:=(r->>k)::numeric; if v<>trunc(v) or v<0 or v>1000000 then raise exception 'INVALID_RULES'; end if;
 elsif k in ('damage','repair_slots','victory_score','duration_minutes') then
 v:=(r->>k)::numeric; if v<>trunc(v) or v<1 or v>10000 then raise exception 'INVALID_RULES'; end if;
 else raise exception 'UNKNOWN_RULE'; end if;
 if r->k='null'::jsonb then raise exception 'INVALID_RULES'; end if;
 end loop;
 end $$;
create function game_private.action(mid uuid,act text,p jsonb,rid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
 declare uid uuid:=auth.uid(); tid uuid; m public.matches%rowtype; r jsonb; prev public.action_requests%rowtype;
 a public.aircraft%rowtype; s public.structures%rowtype; ms public.missions%rowtype; d public.defense_units%rowtype;
 new_id uuid; response_data jsonb; cost integer; seconds integer; b boolean; delta_interval interval; t uuid; count_jobs integer;
 begin
 if uid is null or rid is null or not exists(select 1 from public.profiles where id=uid and not disabled and not must_change_password) then raise exception 'AUTH_REQUIRED'; end if;
 if jsonb_typeof(p)<>'object' or octet_length(p::text)>16384 then raise exception 'INVALID_PAYLOAD'; end if;
 if not game_private.is_member(mid) then raise exception 'FORBIDDEN'; end if;
 select * into m from public.matches where id=mid for update;
 -- Serialize an idempotency key even when it is reused across matches.
 perform pg_advisory_xact_lock(hashtextextended(uid::text||rid::text,0));
 select * into prev from public.action_requests where actor_id=uid and request_id=rid;
 if found then
 if prev.match_id<>mid or prev.action<>act or prev.payload<>p then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
 return prev.response;
 end if;
 perform game_private.tick_match(mid);
 select * into m from public.matches where id=mid;
 select rules into r from public.game_settings where match_id=mid;
 response_data:='{"ok":true}'::jsonb;
 if act like 'admin_%' then
 if not game_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 case act
 when 'admin_start' then
 if m.status not in ('draft','ready') then raise exception 'INVALID_MATCH_STATE'; end if;
 if not exists(select 1 from public.structures where match_id=mid) then raise exception 'SCENARIO_REQUIRED'; end if;
 update public.matches set status='running',started_at=now(),ends_at=now()+make_interval(mins=>(r->>'duration_minutes')::int) where id=mid;
 -- Demonstrate one genuine server-timed repair in test matches, with a ledger entry.
 if m.is_test then
 select * into s from public.structures where match_id=mid and hp<max_hp order by id limit 1;
 if found then
 perform game_private.spend(mid,s.team_id,'scenario_repair',-(r->>'repair_credits')::bigint,0,-(r->>'repair_materials')::bigint);
 insert into public.repair_jobs(match_id,team_id,actor_id,structure_id,completes_at) values(mid,s.team_id,uid,s.id,now()+make_interval(secs=>(r->>'repair_seconds')::int));
 update public.structures set status='repairing' where id=s.id;
 end if;
 end if;
 perform game_private.emit(mid,null,'match_started','مسابقه آغاز شد','{}');
 when 'admin_pause' then
 if m.status<>'running' then raise exception 'INVALID_MATCH_STATE'; end if;
 update public.matches set status='paused',paused_at=now() where id=mid;
 perform game_private.emit(mid,null,'match_paused','مسابقه موقتاً متوقف شد','{}');
 when 'admin_resume' then
 if m.status<>'paused' then raise exception 'INVALID_MATCH_STATE'; end if;
 delta_interval:=now()-m.paused_at;
 update public.missions set started_at=started_at+delta_interval,resolves_at=resolves_at+delta_interval,ready_at=ready_at+delta_interval,jam_until=jam_until+delta_interval where match_id=mid and status in ('outbound','returning');
 update public.mission_signals set started_at=started_at+delta_interval,resolves_at=resolves_at+delta_interval,jam_until=jam_until+delta_interval where match_id=mid;
 update public.repair_jobs set started_at=started_at+delta_interval,completes_at=completes_at+delta_interval where match_id=mid and status='active';
 update public.defense_units set ready_at=ready_at+delta_interval where match_id=mid and ready_at is not null;
 update public.matches set status='running',paused_at=null,ends_at=ends_at+delta_interval where id=mid;
 perform game_private.emit(mid,null,'match_resumed','مسابقه ادامه یافت','{}');
 when 'admin_end' then
 if m.status not in ('running','paused') then raise exception 'INVALID_MATCH_STATE'; end if;
 perform game_private.finish(mid);
 when 'admin_archive' then
 if m.status<>'ended' then raise exception 'INVALID_MATCH_STATE'; end if;
 update public.matches set status='archived' where id=mid;
 when 'admin_rules' then
 if m.status not in ('draft','ready','paused') then raise exception 'INVALID_MATCH_STATE'; end if;
 perform game_private.validate_rules(p);
 update public.game_settings set rules=rules||p where match_id=mid;
 if m.status in ('draft','ready') then
 for t in select id from public.teams loop
 perform game_private.spend(mid,t,'initial_settings',coalesce((p->>'initial_credits')::bigint,(select credits from public.team_resources where match_id=mid and team_id=t))-(select credits from public.team_resources where match_id=mid and team_id=t),coalesce((p->>'initial_energy')::bigint,(select energy from public.team_resources where match_id=mid and team_id=t))-(select energy from public.team_resources where match_id=mid and team_id=t),coalesce((p->>'initial_materials')::bigint,(select materials from public.team_resources where match_id=mid and team_id=t))-(select materials from public.team_resources where match_id=mid and team_id=t),coalesce((p->>'initial_logistics')::bigint,(select logistics from public.team_resources where match_id=mid and team_id=t))-(select logistics from public.team_resources where match_id=mid and team_id=t),coalesce((p->>'initial_research')::bigint,(select research from public.team_resources where match_id=mid and team_id=t))-(select research from public.team_resources where match_id=mid and team_id=t),coalesce((p->>'initial_mission_tokens')::bigint,(select mission_tokens from public.team_resources where match_id=mid and team_id=t))-(select mission_tokens from public.team_resources where match_id=mid and team_id=t));
 end loop;
 end if;
 perform game_private.emit(mid,null,'rules_updated','قوانین مسابقه به‌روزرسانی شد','{}');
 when 'admin_reset' then
 if not m.is_test or m.status='running' or p->>'confirm'<>'RESET_TEST' then raise exception 'TEST_RESET_ONLY'; end if;
 delete from public.action_requests where match_id=mid;
 delete from public.game_events where match_id=mid;
 delete from public.notifications where match_id=mid;
 delete from public.defense_events where match_id=mid;
 delete from public.mission_events where match_id=mid;
 delete from public.missions where match_id=mid;
 delete from public.repair_jobs where match_id=mid;
 delete from public.aircraft where match_id=mid;
 delete from public.structures where match_id=mid;
 delete from public.team_resources where match_id=mid;
 delete from public.resource_transactions where match_id=mid;
 delete from public.match_scores where match_id=mid;
 update public.matches set status='ready',started_at=null,ends_at=null,paused_at=null,ended_at=null,result=null where id=mid;
 perform game_private.seed_scenario(mid);
 when 'admin_member' then
 if m.status not in ('draft','ready','paused') then raise exception 'INVALID_MATCH_STATE'; end if;
 if p->>'role' not in ('commander','operator','spectator') then raise exception 'INVALID_ROLE'; end if;
 if p->>'role'<>'spectator' and exists(select 1 from public.profiles where id=(p->>'user_id')::uuid and role='spectator') then raise exception 'GLOBAL_SPECTATOR_ONLY'; end if;
 insert into public.match_members(match_id,user_id,team_id,role) values(mid,(p->>'user_id')::uuid,case when p->>'role'='spectator' then null else (p->>'team_id')::uuid end,p->>'role')
 on conflict(match_id,user_id) do update set team_id=excluded.team_id,role=excluded.role;
 when 'admin_profile' then
 if (p->>'user_id')::uuid=uid then raise exception 'SELF_ROLE_CHANGE_FORBIDDEN'; end if;
 if p->>'role' not in ('admin','player','spectator') or jsonb_typeof(p->'disabled')<>'boolean' then raise exception 'INVALID_PROFILE'; end if;
 update public.profiles set role=p->>'role',disabled=(p->>'disabled')::boolean where id=(p->>'user_id')::uuid;
 when 'admin_resources' then
 t:=(p->>'team_id')::uuid;
 perform game_private.spend(mid,t,'admin_adjustment',coalesce((p->>'credits')::bigint,0),coalesce((p->>'energy')::bigint,0),coalesce((p->>'materials')::bigint,0),0,coalesce((p->>'research')::bigint,0));
 perform game_private.emit(mid,t,'resources_updated','منابع توسط مدیر تنظیم شد','{}');
 when 'admin_message' then
 perform game_private.emit(mid,null,'admin_message','پیام مدیریت',jsonb_build_object('message',game_private.safe_text(p->>'message')));
 when 'admin_maintenance' then
 update public.system_settings set maintenance=(p->>'enabled')::boolean where id=true;
 when 'admin_type' then
 insert into public.structure_types(code,name) values('custom_'||replace(gen_random_uuid()::text,'-',''),game_private.safe_text(p->>'name',60)) returning id into new_id;
 when 'admin_structure' then
 if m.status not in ('draft','ready','paused') then raise exception 'INVALID_MATCH_STATE'; end if;
 if p->>'fictional'<>'true' then raise exception 'FICTIONAL_ONLY'; end if;
 t:=(p->>'team_id')::uuid;
 if (p->>'x')::numeric not between (case when t='10000000-0000-4000-8000-000000000001' then 60 else 560 end) and (case when t='10000000-0000-4000-8000-000000000001' then 440 else 940 end) or (p->>'y')::numeric not between 60 and 940 then raise exception 'OUTSIDE_FICTIONAL_TERRITORY'; end if;
 if nullif(p->>'id','') is not null then
 select * into s from public.structures where id=(p->>'id')::uuid and match_id=mid for update;
 if not found or s.team_id<>t or s.status='repairing' then raise exception 'ASSET_BUSY'; end if;
 update public.structures set name=game_private.safe_text(p->>'name',80),description=case when coalesce(p->>'description','')='' then '' else game_private.safe_text(p->>'description') end,x=(p->>'x')::numeric,y=(p->>'y')::numeric,hp=(p->>'hp')::int,level=(p->>'level')::int,intel=p->>'intel',active=(p->>'active')::boolean,status=case when (p->>'hp')::int=0 then 'destroyed' when not (p->>'active')::boolean then 'inactive' when (p->>'hp')::int<max_hp then 'damaged' else 'healthy' end,updated_at=now() where id=s.id returning id into new_id;
 else
 insert into public.structures(match_id,team_id,type_id,name,description,x,y,hp,level,intel,active,status) values(mid,t,(p->>'type_id')::uuid,game_private.safe_text(p->>'name',80),case when coalesce(p->>'description','')='' then '' else game_private.safe_text(p->>'description') end,(p->>'x')::numeric,(p->>'y')::numeric,(p->>'hp')::int,(p->>'level')::int,p->>'intel',(p->>'active')::boolean,case when (p->>'hp')::int=0 then 'destroyed' when not (p->>'active')::boolean then 'inactive' when (p->>'hp')::int<100 then 'damaged' else 'healthy' end) returning id into new_id;
 if exists(select 1 from public.structure_types where id=(p->>'type_id')::uuid and code='defense') then insert into public.defense_units(match_id,team_id,structure_id,name) values(mid,t,new_id,p->>'name'); end if;
 end if;
 perform game_private.refresh_intel(mid); perform game_private.recalculate(mid);
 perform game_private.emit(mid,t,'admin_structure','سازه توسط مدیر تنظیم شد','{}');
 when 'admin_aircraft' then
 if m.status not in ('draft','ready','paused') then raise exception 'INVALID_MATCH_STATE'; end if;
 select * into s from public.structures where id=(p->>'home_id')::uuid and match_id=mid and active and hp>0;
 if not found then raise exception 'INVALID_HOME'; end if;
 insert into public.aircraft(match_id,team_id,name,kind,home_id,x,y) values(mid,s.team_id,game_private.safe_text(p->>'name',80),p->>'kind',s.id,s.x,s.y) returning id into new_id;
 when 'admin_character' then
 if p->>'fictional'<>'true' then raise exception 'FICTIONAL_ONLY'; end if;
 select * into s from public.structures where id=(p->>'residence_id')::uuid and match_id=mid;
 if not found then raise exception 'INVALID_RESIDENCE'; end if;
 if nullif(p->>'id','') is not null then
 update public.fictional_characters set first_name=game_private.safe_text(p->>'first_name',40),last_name=game_private.safe_text(p->>'last_name',40),title=game_private.safe_text(p->>'title',80),residence_id=s.id,team_id=s.team_id,status=coalesce(p->>'status','active') where id=(p->>'id')::uuid and match_id=mid returning id into new_id;
 else insert into public.fictional_characters(match_id,team_id,first_name,last_name,title,residence_id) values(mid,s.team_id,game_private.safe_text(p->>'first_name',40),game_private.safe_text(p->>'last_name',40),game_private.safe_text(p->>'title',80),s.id) returning id into new_id; end if;
 if p->>'status'='lost' then
 perform game_private.emit(mid,s.team_id,'character_lost','رویداد شخصیت داستانی',jsonb_build_object('message','اطلاعیه بازی: شخصیت خیالی '||(p->>'first_name')||' '||(p->>'last_name')||' در رویداد داستانی کشته شد.'));
 end if;
 when 'admin_character_delete' then
 delete from public.fictional_characters where id=(p->>'id')::uuid and match_id=mid;
 else raise exception 'UNKNOWN_ACTION';
 end case;
 else
 if act='mark_read' then
 insert into public.notification_reads(notification_id,user_id)
 select id,uid from public.notifications where match_id=mid and game_private.can_read(match_id,team_id) and (p->>'id' is null or id=(p->>'id')::uuid)
 on conflict(notification_id,user_id) do nothing;
 else
 tid:=game_private.operator(mid);
 if m.status<>'running' then raise exception 'MATCH_NOT_RUNNING'; end if;
 if (r->>'maintenance')::boolean or (select maintenance from public.system_settings) then raise exception 'MAINTENANCE'; end if;
 case act
 when 'launch' then
 select * into a from public.aircraft where id=(p->>'aircraft_id')::uuid and match_id=mid and team_id=tid for update;
 if not found or a.status<>'ready' or a.hp=0 or a.energy<20 or a.missions_remaining<1 then raise exception 'AIRCRAFT_UNAVAILABLE'; end if;
 if a.kind='stealth' and tid<>'10000000-0000-4000-8000-000000000002' then raise exception 'STEALTH_USA_ONLY'; end if;
 if a.kind='advanced' and not (r->>'advanced_enabled')::boolean then raise exception 'ADVANCED_DISABLED'; end if;
 select s0.* into s from public.intel_contacts c join public.structures s0 on s0.id=c.target_id
 where c.id=(p->>'contact_id')::uuid and c.match_id=mid and c.observer_team_id=tid and c.visibility='identified' and s0.team_id<>tid and s0.active and s0.hp>0 for update of s0;
 if not found then raise exception 'TARGET_NOT_VISIBLE'; end if;
 perform game_private.spend(mid,tid,'mission',-(r->>'mission_credits')::bigint,-(r->>'mission_energy')::bigint,0,0,0,-1);
 seconds:=(r->>'mission_seconds')::int;
 insert into public.missions(match_id,team_id,actor_id,aircraft_id,target_id,target_team_id,resolves_at,ready_at,jam_until,origin_x,origin_y,target_x,target_y)
 values(mid,tid,uid,a.id,s.id,s.team_id,now()+make_interval(secs=>seconds),now()+make_interval(secs=>seconds+(r->>'return_seconds')::int),case when a.kind='stealth' then now()+make_interval(secs=>(r->>'jam_seconds')::int) end,a.x,a.y,s.x,s.y) returning id into new_id;
 update public.aircraft set status='mission',energy=energy-20,missions_remaining=missions_remaining-1,ready_at=now()+make_interval(secs=>seconds+(r->>'return_seconds')::int) where id=a.id;
 insert into public.mission_signals(match_id,mission_id,viewer_team_id,label,jammed,x,y,target_x,target_y,started_at,resolves_at,jam_until)
 select mid,new_id,s.team_id,case when a.kind='stealth' then 'تماس نامشخص • اختلال بازی' else 'واحد هوایی شناسایی‌شده' end,a.kind='stealth',case when a.kind<>'stealth' then a.x end,case when a.kind<>'stealth' then a.y end,case when a.kind<>'stealth' then s.x end,case when a.kind<>'stealth' then s.y end,now(),now()+make_interval(secs=>seconds),case when a.kind='stealth' then now()+make_interval(secs=>(r->>'jam_seconds')::int) end;
 perform game_private.emit(mid,tid,'mission_started','مأموریت مجازی آغاز شد',jsonb_build_object('mission_id',new_id));
 perform game_private.emit(mid,s.team_id,case when a.kind='stealth' then 'jam_started' else 'incoming' end,case when a.kind='stealth' then 'اختلال نمایشی • دفاع دستی در دسترس' else 'رویداد هوایی در حال نزدیک‌شدن است' end,'{}');
 when 'manual_defense' then
 select * into ms from public.missions where id=(p->>'mission_id')::uuid and match_id=mid and target_team_id=tid and status='outbound' for update;
 if not found or ms.jam_until is null or ms.jam_until<=now() or ms.manual_attempted then raise exception 'MANUAL_DEFENSE_UNAVAILABLE'; end if;
 if p->>'region' is null or (p->>'region')::int not between 1 and 4 then raise exception 'INVALID_REGION'; end if;
 select du.* into d from public.defense_units du join public.structures st on st.id=du.structure_id where du.match_id=mid and du.team_id=tid and du.active and du.charges>0 and st.hp>0 and st.active and st.status<>'repairing' and (du.ready_at is null or du.ready_at<=now()) order by du.id limit 1 for update of du;
 if not found then raise exception 'DEFENSE_UNAVAILABLE'; end if;
 -- Region is a fictional player choice, deliberately independent of aircraft coordinates.
 b:=random()<(r->>'manual_chance')::numeric;
 update public.missions set manual_attempted=true,manual_success=b where id=ms.id;
 update public.defense_units set charges=charges-1,ready_at=now()+make_interval(secs=>cooldown_seconds) where id=d.id;
 insert into public.defense_events(match_id,team_id,mission_id,defense_id,actor_id,manual,region,success) values(mid,tid,ms.id,d.id,uid,true,(p->>'region')::int,b);
 perform game_private.emit(mid,tid,'manual_defense','انتخاب ناحیه برای دفاع ثبت شد',jsonb_build_object('success',b,'region',(p->>'region')::int));
 when 'defense_toggle' then
 update public.defense_units set active=(p->>'active')::boolean where id=(p->>'id')::uuid and match_id=mid and team_id=tid;
 if not found then raise exception 'FORBIDDEN'; end if;
 perform game_private.emit(mid,tid,'defense_updated','وضعیت دفاع تغییر کرد','{}');
 when 'repair' then
 select count(*) into count_jobs from public.repair_jobs where match_id=mid and team_id=tid and status='active';
 if count_jobs>=least(10,(r->>'repair_slots')::int)+least(2,(select count(*)::int from public.structures st join public.structure_types ty on ty.id=st.type_id where st.match_id=mid and st.team_id=tid and ty.code='repair' and st.active and st.hp>0 and st.status<>'repairing')) then raise exception 'REPAIR_SLOTS_FULL'; end if;
 if p->>'aircraft_id' is not null then
 select * into a from public.aircraft where id=(p->>'aircraft_id')::uuid and match_id=mid and team_id=tid for update;
 if not found or a.hp=0 or (a.hp=100 and a.energy=100) or a.status not in ('damaged','ready') then raise exception 'REPAIR_UNAVAILABLE'; end if;
 update public.aircraft set status='repairing' where id=a.id;
 else
 select * into s from public.structures where id=(p->>'structure_id')::uuid and match_id=mid and team_id=tid for update;
 if not found or s.hp=s.max_hp or s.status='repairing' then raise exception 'REPAIR_UNAVAILABLE'; end if;
 update public.structures set status='repairing' where id=s.id;
 end if;
 perform game_private.spend(mid,tid,'repair',-(r->>'repair_credits')::bigint,0,-(r->>'repair_materials')::bigint);
 insert into public.repair_jobs(match_id,team_id,actor_id,structure_id,aircraft_id,completes_at) values(mid,tid,uid,s.id,a.id,now()+make_interval(secs=>(r->>'repair_seconds')::int)) returning id into new_id;
 perform game_private.emit(mid,tid,'repair_started','تعمیر آغاز شد',jsonb_build_object('repair_id',new_id));
 when 'construct' then
 if (select count(*) from public.structures where match_id=mid and team_id=tid and active)>=100 then raise exception 'STRUCTURE_LIMIT'; end if;
 if p->>'fictional'<>'true' then raise exception 'FICTIONAL_ONLY'; end if;
 if (p->>'x')::numeric not between (case when tid='10000000-0000-4000-8000-000000000001' then 60 else 560 end) and (case when tid='10000000-0000-4000-8000-000000000001' then 440 else 940 end) or (p->>'y')::numeric not between 60 and 940 then raise exception 'OUTSIDE_FICTIONAL_TERRITORY'; end if;
 if not exists(select 1 from public.structure_types where id=(p->>'type_id')::uuid and enabled) then raise exception 'INVALID_TYPE'; end if;
 perform game_private.spend(mid,tid,'construction',-(r->>'build_credits')::bigint,0,-(r->>'build_materials')::bigint,-1);
 insert into public.structures(match_id,team_id,type_id,name,description,x,y,intel) values(mid,tid,(p->>'type_id')::uuid,game_private.safe_text(p->>'name',80),case when coalesce(p->>'description','')='' then '' else game_private.safe_text(p->>'description') end,(p->>'x')::numeric,(p->>'y')::numeric,'unknown') returning id into new_id;
 if exists(select 1 from public.structure_types where id=(p->>'type_id')::uuid and code='defense') then insert into public.defense_units(match_id,team_id,structure_id,name) values(mid,tid,new_id,p->>'name'); end if;
 perform game_private.refresh_intel(mid); perform game_private.recalculate(mid);
 perform game_private.emit(mid,tid,'structure_created','سازهٔ خیالی ساخته شد',jsonb_build_object('structure_id',new_id));
 when 'update_structure' then
 if not exists(select 1 from public.match_members where match_id=mid and user_id=uid and role='commander') then raise exception 'COMMANDER_REQUIRED'; end if;
 update public.structures set name=game_private.safe_text(p->>'name',80),description=case when coalesce(p->>'description','')='' then '' else game_private.safe_text(p->>'description') end,updated_at=now() where id=(p->>'id')::uuid and match_id=mid and team_id=tid returning id into new_id;
 if new_id is null then raise exception 'FORBIDDEN'; end if;
 perform game_private.refresh_intel(mid);
 perform game_private.emit(mid,tid,'structure_updated','مشخصات سازه تغییر کرد',jsonb_build_object('structure_id',new_id));
 when 'delete_structure' then
 if not exists(select 1 from public.match_members where match_id=mid and user_id=uid and role='commander') then raise exception 'COMMANDER_REQUIRED'; end if;
 -- Soft deletion preserves mission and replay integrity.
 update public.structures set active=false,status='inactive',updated_at=now() where id=(p->>'id')::uuid and match_id=mid and team_id=tid and status<>'repairing' and not exists(select 1 from public.missions where (target_id=structures.id or aircraft_id in(select id from public.aircraft where home_id=structures.id)) and status in ('outbound','returning')) returning id into new_id;
 if new_id is null then raise exception 'ASSET_BUSY'; end if;
 update public.aircraft set status='inactive' where home_id=new_id and status<>'destroyed';
 update public.defense_units set active=false where structure_id=new_id;
 perform game_private.refresh_intel(mid); perform game_private.recalculate(mid);
 perform game_private.emit(mid,tid,'structure_inactive','سازه از چرخهٔ بازی خارج شد','{}');
 when 'upgrade' then
 select * into s from public.structures where id=(p->>'id')::uuid and match_id=mid and team_id=tid for update;
 if not found or s.level>=10 or s.hp=0 or not s.active or s.status='repairing' then raise exception 'UPGRADE_UNAVAILABLE'; end if;
 perform game_private.spend(mid,tid,'upgrade',-(r->>'upgrade_credits')::bigint,0,0,0,-(r->>'upgrade_research')::bigint);
 update public.structures set level=level+1,max_hp=max_hp+20,hp=hp+20,updated_at=now() where id=s.id;
 update public.defense_units set level=least(10,level+1),defense_score=least(100,defense_score+5) where structure_id=s.id;
 perform game_private.refresh_intel(mid); perform game_private.recalculate(mid);
 perform game_private.emit(mid,tid,'structure_upgraded','سطح سازه افزایش یافت','{}');
 else raise exception 'UNKNOWN_ACTION'; end case;
 end if;
 end if;
 response_data:=response_data||jsonb_build_object('id',new_id,'server_time',now());
 insert into public.action_requests(match_id,actor_id,request_id,action,payload,response) values(mid,uid,rid,act,p,response_data);
 insert into public.audit_logs(match_id,actor_id,action,payload) values(mid,uid,act,jsonb_build_object('request_id',rid,'object_id',new_id));
 return response_data;
 end $$;
create function game_private.new_match(p jsonb,rid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
 declare mid uuid; prior public.action_requests%rowtype; r jsonb; source uuid;
 begin
 if not game_private.is_admin() or exists(select 1 from public.profiles where id=auth.uid() and must_change_password) or rid is null then raise exception 'ADMIN_REQUIRED'; end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||rid::text,0));
 select * into prior from public.action_requests where actor_id=auth.uid() and request_id=rid;
 if found then if prior.action<>'create_match' or prior.payload<>p then raise exception 'IDEMPOTENCY_CONFLICT'; end if; return prior.response; end if;
 insert into public.matches(name,description,is_test,created_by,status,scheduled_at) values(game_private.safe_text(p->>'name',100),coalesce(p->>'description',''),coalesce((p->>'is_test')::boolean,true),auth.uid(),'ready',nullif(p->>'scheduled_at','')::timestamptz) returning id into mid;
 insert into public.game_settings(match_id) values(mid);
 if nullif(p->>'source_id','') is not null then
 source:=(p->>'source_id')::uuid;
 select rules into r from public.game_settings where match_id=source;
 if r is null then raise exception 'INVALID_SOURCE_MATCH'; end if;
 update public.game_settings set rules=r where match_id=mid;
 end if;
 perform game_private.seed_scenario(mid);
 insert into public.action_requests(match_id,actor_id,request_id,action,payload,response) values(mid,auth.uid(),rid,'create_match',p,jsonb_build_object('id',mid,'ok',true));
 insert into public.audit_logs(match_id,actor_id,action) values(mid,auth.uid(),'create_match');
 return jsonb_build_object('id',mid,'ok',true);
 end $$;
create function game_private.lobby() returns jsonb language plpgsql stable security definer set search_path='' as $$
 declare result_data jsonb;
 begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and not disabled) then raise exception 'PROFILE_REQUIRED'; end if;
 select jsonb_build_object('profile',(select to_jsonb(p) from public.profiles p where id=auth.uid()),'matches',coalesce((select jsonb_agg(to_jsonb(m) order by created_at desc) from public.matches m where game_private.is_member(m.id)),'[]'::jsonb)) into result_data;
 return result_data;
 end $$;
create function game_private.snapshot(mid uuid,view_team uuid default null) returns jsonb language plpgsql security definer set search_path='' as $$
 declare tid uuid; adm boolean; output jsonb;
 begin
 if not game_private.is_member(mid) then raise exception 'FORBIDDEN'; end if;
 adm:=game_private.is_admin(); tid:=game_private.my_team(mid);
 if adm then tid:=coalesce(view_team,'10000000-0000-4000-8000-000000000001'::uuid); end if;
 perform game_private.tick_match(mid);
 select jsonb_build_object(
 'server_time',now(),'profile',(select to_jsonb(p) from public.profiles p where id=auth.uid()),
 'match',(select to_jsonb(m) from public.matches m where id=mid),
 'rules',(select rules from public.game_settings where match_id=mid),
 'team_id',tid,'membership',(select to_jsonb(mm) from public.match_members mm where match_id=mid and user_id=auth.uid()),
 'teams',(select jsonb_agg(to_jsonb(t)) from public.teams t),
 'types',(select jsonb_agg(to_jsonb(st)) from public.structure_types st where enabled),
 'structures',coalesce((select jsonb_agg(to_jsonb(s)) from public.structures s where match_id=mid and (adm or team_id=tid)),'[]'::jsonb),
 'contacts',coalesce((select jsonb_agg(to_jsonb(c)) from public.intel_contacts c where match_id=mid and observer_team_id=tid),'[]'::jsonb),
 'aircraft',coalesce((select jsonb_agg(to_jsonb(a)) from public.aircraft a where match_id=mid and (adm or team_id=tid)),'[]'::jsonb),
 'defenses',coalesce((select jsonb_agg(to_jsonb(d)) from public.defense_units d where match_id=mid and (adm or team_id=tid)),'[]'::jsonb),
 'missions',coalesce((select jsonb_agg(to_jsonb(ms) order by started_at desc) from (select * from public.missions where match_id=mid and (adm or team_id=tid) order by started_at desc limit 200) ms),'[]'::jsonb),
 'signals',coalesce((select jsonb_agg(to_jsonb(sg)) from public.mission_signals sg where match_id=mid and viewer_team_id=tid),'[]'::jsonb),
 'repairs',coalesce((select jsonb_agg(to_jsonb(j) order by started_at desc) from (select * from public.repair_jobs where match_id=mid and (adm or team_id=tid) order by started_at desc limit 200) j),'[]'::jsonb),
 'resources',coalesce((select jsonb_agg(to_jsonb(rs)) from public.team_resources rs where match_id=mid and (adm or team_id=tid)),'[]'::jsonb),
 'transactions',coalesce((select jsonb_agg(to_jsonb(rt) order by created_at desc) from (select * from public.resource_transactions where match_id=mid and (adm or team_id=tid) order by created_at desc limit 100) rt),'[]'::jsonb),
 'scores',coalesce((select jsonb_agg(to_jsonb(sc)) from public.match_scores sc where match_id=mid),'[]'::jsonb),
 'characters',coalesce((select jsonb_agg(to_jsonb(c)) from public.fictional_characters c where match_id=mid and (adm or team_id=tid)),'[]'::jsonb),
 'notifications',coalesce((select jsonb_agg(to_jsonb(n)||jsonb_build_object('read',exists(select 1 from public.notification_reads nr where nr.notification_id=n.id and user_id=auth.uid())) order by created_at desc) from (select * from public.notifications where match_id=mid and (team_id is null or team_id=tid) order by created_at desc limit 100) n),'[]'::jsonb),
 'events',coalesce((select jsonb_agg(to_jsonb(e) order by seq) from (select * from public.game_events where match_id=mid and (team_id is null or team_id=tid) order by seq desc limit 500) e),'[]'::jsonb),
 'members',case when adm then coalesce((select jsonb_agg(to_jsonb(mm)) from public.match_members mm where match_id=mid),'[]'::jsonb) else '[]'::jsonb end,
 'profiles',case when adm then coalesce((select jsonb_agg(to_jsonb(pr)) from public.profiles pr),'[]'::jsonb) else '[]'::jsonb end,
 'audit',case when adm then coalesce((select jsonb_agg(to_jsonb(al) order by created_at desc) from (select * from public.audit_logs order by created_at desc limit 100) al),'[]'::jsonb) else '[]'::jsonb end
 ) into output;
 return output;
 end $$;

-- All exposed functions are invokers. Privileged work lives in a non-exposed schema.
create function public.game_lobby() returns jsonb language sql security invoker set search_path='' as $$ select game_private.lobby() $$;
create function public.game_snapshot(p_match_id uuid,p_view_team uuid default null) returns jsonb language sql security invoker set search_path='' as $$ select game_private.snapshot(p_match_id,p_view_team) $$;
create function public.game_action(p_match_id uuid,p_action text,p_payload jsonb,p_request_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select game_private.action(p_match_id,p_action,p_payload,p_request_id) $$;
create function public.game_create_match(p_payload jsonb,p_request_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select game_private.new_match(p_payload,p_request_id) $$;
create function game_private.auth_password_trigger() returns trigger language plpgsql security definer set search_path='' as $$
 begin
 if old.encrypted_password is distinct from new.encrypted_password and old.encrypted_password is not null then
 update public.profiles set must_change_password=false where id=new.id;
 end if;
 return new;
 end $$;
create trigger game_password_change after update of encrypted_password on auth.users for each row execute function game_private.auth_password_trigger();
create function game_private.password_changed() returns void language plpgsql security definer set search_path='' as $$
 begin
 if auth.uid() is null or not exists(select 1 from public.profiles where id=auth.uid() and not must_change_password) then raise exception 'PASSWORD_CHANGE_REQUIRED'; end if;
 end $$;
create function public.game_password_changed() returns void language sql security invoker set search_path='' as $$select game_private.password_changed()$$;
create function game_private.tick_all() returns integer language plpgsql security definer set search_path='' as $$
 declare mid uuid; n integer:=0; begin
 for mid in select id from public.matches where status='ready' and scheduled_at<=now() order by id for update skip locked loop
 update public.matches set status='running',started_at=now(),ends_at=now()+make_interval(mins=>(select (rules->>'duration_minutes')::int from public.game_settings where match_id=mid)) where id=mid;
 perform game_private.emit(mid,null,'match_started','مسابقهٔ زمان‌بندی‌شده آغاز شد','{}');
 end loop;
 for mid in select id from public.matches where status='running' order by id for update skip locked loop
 begin
 perform game_private.tick_match(mid); n:=n+1;
 exception when others then
 insert into public.audit_logs(match_id,action,payload) values(mid,'engine_error',jsonb_build_object('sqlstate',sqlstate));
 end;
 end loop; return n; end $$;
create function public.game_engine_tick() returns integer language sql security invoker set search_path='' as $$select game_private.tick_all()$$;

revoke all on all functions in schema game_private from public,anon,authenticated;
grant execute on function game_private.is_admin(),game_private.is_member(uuid),game_private.my_team(uuid),game_private.can_read(uuid,uuid),game_private.lobby(),game_private.snapshot(uuid,uuid),game_private.action(uuid,text,jsonb,uuid),game_private.new_match(jsonb,uuid),game_private.password_changed() to authenticated;
grant execute on function game_private.tick_all() to service_role;
revoke execute on function public.game_lobby(),public.game_snapshot(uuid,uuid),public.game_action(uuid,text,jsonb,uuid),public.game_create_match(jsonb,uuid),public.game_password_changed(),public.game_engine_tick() from public,anon,authenticated;
grant execute on function public.game_lobby(),public.game_snapshot(uuid,uuid),public.game_action(uuid,text,jsonb,uuid),public.game_create_match(jsonb,uuid),public.game_password_changed() to authenticated;
grant execute on function public.game_engine_tick() to service_role;
grant all on all tables in schema public to service_role;
grant usage,select on all sequences in schema public to service_role;
-- Only sanitized events and lobby revisions are streamed. No raw enemy units or targets in Realtime.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
 alter publication supabase_realtime add table public.game_events,public.matches;
 end if;
end $$;
-- Supabase Cron runs with the database owner's privileges, independent of open browsers.
do $$ begin
 if exists(select 1 from pg_available_extensions where name='pg_cron') then
 create extension if not exists pg_cron;
 perform cron.schedule('game-engine-tick','10 seconds','select game_private.tick_all();');
 end if;
end $$;
