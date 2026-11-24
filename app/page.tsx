import CalendarApp from './calendar-app';
import {redirect} from 'next/navigation';
import {headers} from 'next/headers';
import {getAuth} from '@/lib/auth';
import {isConfigured} from '@/lib/config';
export const dynamic='force-dynamic';
export default async function Home(){if(!isConfigured())redirect('/login');const session=await getAuth().api.getSession({headers:await headers()});if(!session)redirect('/login');return <CalendarApp/>}
