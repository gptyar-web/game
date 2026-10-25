import {authenticated,endpoint,payload,reply} from '../_shared/http.ts';
endpoint(async(req)=>{
 const {client}=await authenticated(req);const body=await payload(req);
 if(typeof body.action!=='string'||typeof body.request_id!=='string')throw new Error('INVALID_PAYLOAD');
 const {data,error}=body.action==='create_match'
 ?await client.rpc('game_create_match',{p_payload:body.payload??{},p_request_id:body.request_id})
 :await client.rpc('game_action',{p_match_id:body.match_id,p_action:body.action,p_payload:body.payload??{},p_request_id:body.request_id});
 if(error)throw new Error(error.message);
 return reply(req,200,data);
});
