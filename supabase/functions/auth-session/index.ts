import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
import {endpoint,payload,reply,service} from '../_shared/http.ts';
endpoint(async(req)=>{
 const b=await payload(req);if(!['login','recover'].includes(b.action)||typeof b.username!=='string'||!/^[a-z0-9_]{3,32}$/.test(b.username))throw new Error('INVALID_CREDENTIALS');
 if(b.action==='login'&&(typeof b.password!=='string'||b.password.length>256))throw new Error('INVALID_CREDENTIALS');
 const admin=service();const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()??'unknown';
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(ip+'|'+b.username+'|'+b.action));
 const key=Array.from(new Uint8Array(bytes)).map(x=>x.toString(16).padStart(2,'0')).join('');
 const {data:allowed,error:rateError}=await admin.rpc('game_auth_throttle',{p_key:key});if(rateError||!allowed)return reply(req,429,{error:'RATE_LIMITED'});
 const {data:profile}=await admin.from('profiles').select('id,disabled').eq('username',b.username).maybeSingle();
 let email=b.username+'@login.game.invalid';
 if(profile&&!profile.disabled){const {data}=await admin.auth.admin.getUserById(profile.id);email=data.user?.email??email;}
 const auth=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 if(b.action==='recover'){
 if(profile&&!profile.disabled&&!email.endsWith('@login.game.invalid'))await auth.auth.resetPasswordForEmail(email,{redirectTo:Deno.env.get('APP_URL')??'https://gptyar-web.github.io/game/'});
 return reply(req,200,{ok:true});
 }
 const {data,error}=await auth.auth.signInWithPassword({email,password:b.password});
 if(error||!data.session||!profile||profile.disabled)throw new Error('INVALID_CREDENTIALS');
 return reply(req,200,{access_token:data.session.access_token,refresh_token:data.session.refresh_token});
});
