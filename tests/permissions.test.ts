import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {MongoMemoryReplSet} from 'mongodb-memory-server';
import {classroom,AccessError} from '../lib/classroom';
import {actionSchema} from '../lib/validation';
test('valida fecha real, hora y asignaturas libres',()=>{
 const e={title:'Tema 1',subject:'Programación',type:'Examen',date:'2026-02-30',time:'09:00'};
 assert.equal(actionSchema.safeParse({action:'save',classId:randomUUID(),event:e}).success,false);
 assert.equal(actionSchema.safeParse({action:'save',classId:randomUUID(),event:{...e,date:'2026-02-28'}}).success,true);
});
test('login real, sesiones y permisos con MongoDB',{timeout:180000},async()=>{
 const replica=await MongoMemoryReplSet.create({replSet:{count:1}});
 process.env.MONGODB_URI=replica.getUri();process.env.MONGODB_DB='calendar_test';process.env.BETTER_AUTH_SECRET='test-only-secret-32-characters-long-not-production';process.env.BETTER_AUTH_URL='http://localhost:3000';
 const {createAuth}=await import('../lib/auth');const {database,mongoClient}=await import('../lib/mongodb');
 try{
 const provisioning=createAuth(true),auth=createAuth(),db=database(),service=classroom(db);await service.indexes();
 const teacher=(await provisioning.api.signUpEmail({body:{name:'Profesor QA',email:'teacher@example.test',password:'test-password-teacher-123'}})).user.id;
 await db.collection('teachers').insertOne({userId:teacher});
 const student=(await auth.api.signInAnonymous()).user.id;
 assert.equal(await service.isTeacher(student),false);
 const login=await auth.handler(new Request('http://localhost:3000/api/auth/sign-in/email',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost:3000'},body:JSON.stringify({email:'teacher@example.test',password:'test-password-teacher-123'})}));assert.equal(login.status,200);
 const cookies=login.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ');assert.ok(cookies);
 const session=await auth.api.getSession({headers:new Headers({cookie:cookies})});assert.equal(session?.user.id,teacher);
 const bad=await auth.handler(new Request('http://localhost:3000/api/auth/sign-in/email',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost:3000'},body:JSON.stringify({email:'teacher@example.test',password:'wrong-password-123'})}));assert.ok(bad.status>=400);
 const signup=await auth.handler(new Request('http://localhost:3000/api/auth/sign-up/email',{method:'POST',headers:{'Content-Type':'application/json',Origin:'http://localhost:3000'},body:JSON.stringify({name:'Ataque',email:'bad@example.test',password:'test-password-student-123'})}));assert.ok(signup.status>=400);
 const a=await service.create(teacher,'DAW A'),b=await service.create(teacher,'DAW B');const groups=(await service.list(teacher)).classes;assert.equal(groups.length,2);assert.notEqual(groups[0].code,groups[1].code);
 await assert.rejects(()=>service.create(student,'Ataque'),AccessError);
 await assert.rejects(()=>service.events(student,a),AccessError);
 await assert.rejects(()=>service.join(student,'000000000000'),AccessError);
 await service.join(student,groups.find(g=>g.id===a)!.code);await service.join(student,groups.find(g=>g.id===a)!.code);assert.equal((await service.list(student)).classes.length,1);
 const exam={title:'Tema 1',subject:'Programación',type:'Examen',date:'2026-11-26',time:'09:00'};
 await service.save(teacher,a,exam);const e=(await service.events(student,a))[0];assert.equal(e.title,'Tema 1');
 await assert.rejects(()=>service.save(student,a,{...exam,id:e.id}),AccessError);await assert.rejects(()=>service.remove(student,a,e.id),AccessError);await assert.rejects(()=>service.events(student,b),AccessError);
 const outsider='other-teacher';await db.collection('teachers').insertOne({userId:outsider});await assert.rejects(()=>service.save(outsider,a,exam),AccessError);
 await service.save(teacher,a,{...exam,id:e.id,title:'Tema actualizado'});assert.equal((await service.events(student,a))[0].title,'Tema actualizado');await service.remove(teacher,a,e.id);assert.equal((await service.events(student,a)).length,0);
 const account=await db.collection('account').findOne({providerId:'credential'});assert.ok(account?.password);assert.notEqual(account.password,'test-password-teacher-123');
 await auth.api.signOut({headers:new Headers({cookie:cookies})});assert.equal(await auth.api.getSession({headers:new Headers({cookie:cookies})}),null);
 }finally{await mongoClient().close();await replica.stop()}
});
