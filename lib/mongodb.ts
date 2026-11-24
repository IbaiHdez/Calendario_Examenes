import {MongoClient} from 'mongodb';
import {mongoConnection} from './config';
const cache=globalThis as typeof globalThis & {calendarMongo?:MongoClient};
export function mongoClient(){
 const uri=mongoConnection();
 if(!cache.calendarMongo)cache.calendarMongo=new MongoClient(uri,{maxPoolSize:10,serverSelectionTimeoutMS:8000});
 return cache.calendarMongo;
}
export function database(){return mongoClient().db(process.env.MONGODB_DB||'calendario_examenes')}

