import {authenticated,endpoint,payload,reply,service} from '../_shared/http.ts';
endpoint(async(req)=>{
 const {client,user}=await authenticated(req);
 const {data:actor}=await client.from('profiles').select('role,disabled,must_change_password').eq('id',user.id).single();
 if(actor?.role!=='admin'||actor.disabled||actor.must_change_password)throw new Error('ADMIN_REQUIRED');
 const b=await payload(req),admin=service();
 if(b.action==='recovery'){
 const {data:target}=await admin.auth.admin.getUserById(b.user_id);
 if(!target.user?.email||target.user.email.endsWith('@login.game.invalid'))throw new Error('RECOVERY_EMAIL_REQUIRED');
 const {error}=await admin.auth.resetPasswordForEmail(target.user.email,{redirectTo:Deno.env.get('APP_URL')??'https://gptyar-web.github.io/game/'});
 if(error)throw new Error('RECOVERY_FAILED');
 await admin.from('audit_logs').insert({actor_id:user.id,action:'admin_recovery',payload:{user_id:b.user_id}});
 return reply(req,200,{ok:true});
 }
 if(b.action!=='create'||typeof b.username!=='string'||!/^[a-z0-9_]{3,32}$/.test(b.username)||!['admin','player','spectator'].includes(b.role))throw new Error('INVALID_PAYLOAD');
 const password=crypto.randomUUID()+crypto.randomUUID().slice(0,12)+'A!7';
 const email=b.email||b.username+'@login.game.invalid';
 const {data,error}=await admin.auth.admin.createUser({email,password,email_confirm:true});if(error||!data.user)throw new Error('USER_CREATE_FAILED');
 const {error:profileError}=await admin.from('profiles').insert({id:data.user.id,username:b.username,display_name:String(b.display_name??b.username).slice(0,80),role:b.role,must_change_password:true});
 if(profileError){await admin.auth.admin.deleteUser(data.user.id);throw new Error('PROFILE_CREATE_FAILED');}
 await admin.from('audit_logs').insert({actor_id:user.id,action:'admin_user_created',payload:{user_id:data.user.id,username:b.username}});
 // This response is the only delivery. The plaintext password is never persisted or logged.
 return reply(req,201,{user_id:data.user.id,username:b.username,initial_password:password});
});
