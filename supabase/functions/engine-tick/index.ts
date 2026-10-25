import {endpoint,reply,service} from '../_shared/http.ts';
endpoint(async(req)=>{
 if(req.method!=='POST')throw new Error('METHOD_NOT_ALLOWED');
 const secret=Deno.env.get('ENGINE_TICK_SECRET');const supplied=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'')??'';
 if(!secret||secret.length<32)throw new Error('WORKER_NOT_CONFIGURED');
 const hash=async(s:string)=>new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s)));
 const a=await hash(secret),b=await hash(supplied);let diff=0;for(let i=0;i<a.length;i++)diff|=a[i]^b[i];if(diff!==0)throw new Error('AUTH_REQUIRED');
 const {data,error}=await service().rpc('game_engine_tick');if(error)throw new Error('WORKER_FAILED');return reply(req,200,{processed:data});
});
