import {input,password,confirm} from '@inquirer/prompts';
import {hashPassword} from 'better-auth/crypto';
import {createAuth} from '../lib/auth';
import {database,mongoClient} from '../lib/mongodb';
try{
 const email=(await input({message:'Correo del profesor:',validate:v=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)||'Introduce un correo válido.'})).trim().toLowerCase();
 const name=await input({message:'Nombre:',validate:v=>!!v.trim()||'Introduce un nombre.'});
 const secret=await password({message:'Contraseña (mínimo 12 caracteres):',mask:'*',validate:v=>v.length>=12&&v.length<=128||'Debe tener entre 12 y 128 caracteres.'});
 const repeat=await password({message:'Repite la contraseña:',mask:'*'});if(secret!==repeat)throw new Error('Las contraseñas no coinciden.');
 const auth=createAuth(true),context=await auth.$context;
 const existing=await context.internalAdapter.findUserByEmail(email);let userId:string;
 if(existing){
  if(!await confirm({message:'Ya existe la cuenta. ¿Restablecer contraseña y autorizar como profesor?',default:false}))process.exit(0);
  userId=existing.user.id;await context.internalAdapter.updatePassword(userId,await hashPassword(secret));await context.internalAdapter.deleteUserSessions(userId);
 }else{const result=await auth.api.signUpEmail({body:{name:name.trim(),email,password:secret}});userId=result.user.id}
 await database().collection('teachers').updateOne({userId},{$setOnInsert:{userId,createdAt:new Date()}},{upsert:true});
 console.log('Profesor autorizado. Ya puede iniciar sesión.');
}catch(error){console.error(error instanceof Error?error.message:'No se pudo crear el profesor.');process.exitCode=1}finally{await mongoClient().close()}

