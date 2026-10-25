import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
export function cors(req: Request) {
 const origin=req.headers.get('origin')??'';
 const allowed=(Deno.env.get('ALLOWED_ORIGINS')??'https://gptyar-web.github.io,http://localhost:5173,http://127.0.0.1:5173').split(',').map(s=>s.trim());
 return {'Access-Control-Allow-Origin':allowed.includes(origin)?origin:allowed[0],Vary:'Origin','Access-Control-Allow-Headers':'authorization, apikey, content-type, x-client-info, x-request-id','Access-Control-Allow-Methods':'POST, OPTIONS','Cache-Control':'no-store','Content-Type':'application/json'};
}
export const reply=(req:Request,status:number,data:unknown)=>new Response(JSON.stringify(data),{status,headers:cors(req)});
export const service=()=>createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
export async function authenticated(req:Request){
 const token=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'');
 if(!token)throw new Error('AUTH_REQUIRED');
 const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_ANON_KEY')!,{auth:{persistSession:false},global:{headers:{Authorization:`Bearer ${token}`}}});
 const {data:{user},error}=await client.auth.getUser(token);
 if(error||!user)throw new Error('AUTH_REQUIRED');
 return {client,user};
}
export async function payload(req:Request){
 if(req.method!=='POST')throw new Error('METHOD_NOT_ALLOWED');
 const value=await req.text(); if(value.length>16384)throw new Error('INVALID_PAYLOAD');
 const data=JSON.parse(value);if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('INVALID_PAYLOAD');return data;
}
export function endpoint(handler:(req:Request)=>Promise<Response>){Deno.serve(async(req)=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors(req)});
 try{return await handler(req);}catch(e){const code=e instanceof Error?e.message:'REQUEST_FAILED';const safe=/^[A-Z_]{3,64}$/.test(code)?code:'REQUEST_FAILED';return reply(req,safe==='AUTH_REQUIRED'?401:safe==='ADMIN_REQUIRED'?403:400,{error:safe});}
});}
