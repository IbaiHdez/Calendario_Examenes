export function isConfigured(){return !!((process.env.MONGODB_URI||(process.env.MONGODB_HOST&&process.env.MONGODB_PASSWORD))&&process.env.BETTER_AUTH_SECRET&&process.env.BETTER_AUTH_URL)}

export function mongoConnection(env:Record<string,string|undefined>=process.env){
 if(env.MONGODB_PASSWORD){
  const host=env.MONGODB_HOST?.trim();
  if(!host||!/^([a-z0-9-]+\.)+mongodb\.net$/i.test(host))throw new Error('Configura MONGODB_HOST con el dominio del clúster Atlas.');
  const username=env.MONGODB_USER||'calendario_app';
  return `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(env.MONGODB_PASSWORD)}@${host}/?retryWrites=true&w=majority&appName=Calendario`;
 }
 const uri=env.MONGODB_URI?.trim();
 if(!uri||!/^mongodb(?:\+srv)?:\/\//.test(uri))throw new Error('Configura MONGODB_PASSWORD y MONGODB_HOST, o una MONGODB_URI completa.');
 return uri;
}
