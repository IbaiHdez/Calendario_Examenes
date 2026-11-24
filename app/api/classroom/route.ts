import {getAuth} from '@/lib/auth';
import {store} from '@/lib/store';
import {AccessError} from '@/lib/classroom';
import {actionSchema} from '@/lib/validation';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
const failure=(e:unknown)=>e instanceof AccessError?json({error:e.message},e.status):json({error:'No se pudo conectar. Inténtalo de nuevo.'},503);
export async function GET(request:Request){try{
 const session=await getAuth().api.getSession({headers:request.headers});if(!session)return json({error:'Inicia sesión para continuar.'},401);
 const service=await store(),data=await service.list(session.user.id),id=new URL(request.url).searchParams.get('classId');
 return json({user:{signedIn:true,role:data.role},classes:data.classes,events:id?await service.events(session.user.id,id):[]});
}catch(e){return failure(e)}}
export async function POST(request:Request){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return json({error:'Origen no permitido.'},403);
 try{
 const session=await getAuth().api.getSession({headers:request.headers});if(!session)return json({error:'Inicia sesión para continuar.'},401);
 let raw:unknown;try{raw=await request.json()}catch{return json({error:'Solicitud no válida.'},400)}
 const parsed=actionSchema.safeParse(raw);if(!parsed.success)return json({error:'Revisa los datos de fecha, hora, asignatura o código.'},400);
 const body=parsed.data,service=await store(),uid=session.user.id;
 if(body.action==='create')return json({id:await service.create(uid,body.name)});
 if(body.action==='join')return json({id:await service.join(uid,body.code)});
 if(body.action==='save')await service.save(uid,body.classId,body.event);
 if(body.action==='delete')await service.remove(uid,body.classId,body.id);
 return json({ok:true});
 }catch(e){return failure(e)}
}
