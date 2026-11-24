import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mongoConnection} from '../lib/config';
test('Atlas admite contraseña separada y codifica caracteres especiales sin duplicar escapes',()=>{
 const password='clave@:/?#% con espacios';
 const uri=mongoConnection({MONGODB_HOST:'example.mongodb.net',MONGODB_PASSWORD:password,MONGODB_URI:'valor anterior inválido'});
 const parsed=new URL(uri);
 assert.equal(decodeURIComponent(parsed.password),password);
 assert.equal(parsed.hostname,'example.mongodb.net');
 assert.equal(parsed.username,'calendario_app');
});
test('la conexión completa sigue funcionando y rechaza configuración incompleta',()=>{
 assert.equal(mongoConnection({MONGODB_URI:'  mongodb://localhost:27017/test\n'}),'mongodb://localhost:27017/test');
 assert.throws(()=>mongoConnection({MONGODB_URI:'solo una contraseña'}));
 assert.throws(()=>mongoConnection({MONGODB_PASSWORD:'contraseña',MONGODB_HOST:'dominio/invalido'}));
});
