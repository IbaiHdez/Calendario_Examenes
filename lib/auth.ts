import {betterAuth} from 'better-auth';
import {mongodbAdapter} from '@better-auth/mongo-adapter';
import {anonymous} from 'better-auth/plugins';
import {database,mongoClient} from './mongodb';
export function createAuth(allowSignUp=false){
 const secret=process.env.BETTER_AUTH_SECRET,baseURL=process.env.BETTER_AUTH_URL;
 if(!secret||secret.length<32||!baseURL)throw new Error('Configura BETTER_AUTH_SECRET (32 caracteres o más) y BETTER_AUTH_URL.');
 return betterAuth({
  appName:'Calendario de exámenes',secret,baseURL,trustedOrigins:[baseURL],
  database:mongodbAdapter(database(),{client:mongoClient()}),
  emailAndPassword:{enabled:true,disableSignUp:!allowSignUp,minPasswordLength:12,maxPasswordLength:128},
  session:{expiresIn:60*60*24*7,updateAge:60*60*24},
  rateLimit:{enabled:true,storage:'database',window:60,max:60,customRules:{'/sign-in/email':{window:60,max:5},'/sign-in/anonymous':{window:60,max:10}}},
  plugins:[anonymous()],
 });
}
let cached:ReturnType<typeof createAuth>|undefined;
export function getAuth(){return cached??=createAuth()}
