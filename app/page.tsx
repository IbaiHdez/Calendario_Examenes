import CalendarApp from './calendar-app';
import {redirect} from 'next/navigation';
import {isConfigured} from '@/lib/config';
export const dynamic='force-dynamic';
// CalendarApp loads all protected data through /api/classroom, which validates
// the session and redirects unauthenticated visitors to /login. Rendering this
// empty shell must not create a second MongoDB connection from the page runtime.
export default function Home(){if(!isConfigured())redirect('/login');return <CalendarApp/>}
