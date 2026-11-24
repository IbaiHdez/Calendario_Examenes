import {MongoClient} from 'mongodb';
const cache=globalThis as typeof globalThis & {calendarMongo?:MongoClient};
export function mongoClient(){
 const uri=process.env.MONGODB_URI;if(!uri)throw new Error('Falta MONGODB_URI.');
 if(!cache.calendarMongo)cache.calendarMongo=new MongoClient(uri,{maxPoolSize:10,serverSelectionTimeoutMS:8000});
 return cache.calendarMongo;
}
export function database(){return mongoClient().db(process.env.MONGODB_DB||'calendario_examenes')}

