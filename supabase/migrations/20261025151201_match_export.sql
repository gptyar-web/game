create function game_private.export_match(mid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
 declare result_data jsonb; tbl text; rows_data jsonb;
 begin
 if not game_private.is_admin() then raise exception 'ADMIN_REQUIRED'; end if;
 perform 1 from public.matches where id=mid for update;
 if not found then raise exception 'MATCH_NOT_FOUND'; end if;
 result_data:=jsonb_build_object('format','game-match-backup','version',1,'exported_at',now(),'match',(select to_jsonb(m) from public.matches m where id=mid),'teams',(select jsonb_agg(to_jsonb(t)) from public.teams t),'structure_types',(select jsonb_agg(to_jsonb(t)) from public.structure_types t));
 foreach tbl in array array['game_settings','match_members','structures','fictional_characters','aircraft','defense_units','intel_contacts','team_resources','resource_transactions','missions','mission_signals','mission_events','defense_events','repair_jobs','match_scores','game_events','notifications'] loop
 execute format('select coalesce(jsonb_agg(to_jsonb(t)),''[]''::jsonb) from public.%I t where match_id=$1',tbl) into rows_data using mid;
 result_data:=result_data||jsonb_build_object(tbl,rows_data);
 end loop;
 insert into public.audit_logs(match_id,actor_id,action) values(mid,auth.uid(),'export_match');
 return result_data;
 end $$;
create function public.game_export_match(p_match_id uuid) returns jsonb language sql security invoker set search_path='' as $$ select game_private.export_match(p_match_id) $$;
revoke all on function public.game_export_match(uuid),game_private.export_match(uuid) from public,anon,authenticated;
grant execute on function public.game_export_match(uuid),game_private.export_match(uuid) to authenticated;
