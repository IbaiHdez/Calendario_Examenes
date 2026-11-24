'use client';
import {useState} from 'react';
import {CalendarDays,GraduationCap,Users} from 'lucide-react';
import {authClient} from '@/lib/auth-client';
export default function LoginForm({configured}:{configured:boolean}){
 const [mode,setMode]=useState<'teacher'|'student'>('teacher'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function submit(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();if(!configured)return;const form=new FormData(e.currentTarget);setBusy(true);setError('');
  try{
   if(mode==='student'){
    const {data:session}=await authClient.getSession();if(!session){const {error}=await authClient.signIn.anonymous();if(error)throw new Error('No se pudo iniciar el acceso de alumno. Inténtalo más tarde.')}
    const r=await fetch('/api/classroom',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'join',code:String(form.get('code')||'').trim()})});const data=await r.json();if(!r.ok)throw new Error(data.error||'No se pudo entrar en la clase.');sessionStorage.setItem('selected-class',data.id);window.location.assign('/');return;
   }
   const username=String(form.get('email')||'').trim().toLowerCase();
   const {error:loginError}=await authClient.signIn.email({email:username==='profesores'?'profesores@calendario.local':username,password:String(form.get('password')||'')});if(loginError)throw new Error(loginError.status>=500?'No se pudo conectar al servicio de acceso. Inténtalo más tarde.':loginError.status===429?'Demasiados intentos. Espera un minuto.':'Usuario o contraseña incorrectos.');
   const r=await fetch('/api/classroom');const data=await r.json();if(!r.ok||data.user?.role!=='teacher'){await authClient.signOut();throw new Error('Esta cuenta no está autorizada como profesor. Pide acceso al administrador.')}
   sessionStorage.removeItem('selected-class');window.location.assign('/');
  }catch(e:unknown){setError(e instanceof Error?e.message:'No se pudo acceder. Inténtalo de nuevo.')}finally{setBusy(false)}
 }
 return <main className="login-page"><div className="login-brand"><span><CalendarDays size={25}/></span>Calendario de exámenes</div><section className="login-card"><h1>Entra en tu clase</h1><p>Un acceso sencillo para cada uno.</p><div className="login-tabs"><button aria-pressed={mode==='teacher'} onClick={()=>{setMode('teacher');setError('')}}><GraduationCap size={19}/>Profesor</button><button aria-pressed={mode==='student'} onClick={()=>{setMode('student');setError('')}}><Users size={19}/>Alumno</button></div>
 <form onSubmit={submit}>{mode==='teacher'?<><label>Usuario<input name="email" required type="text" autoComplete="username" placeholder="profesores" disabled={!configured}/></label><label>Contraseña<input name="password" required type="password" autoComplete="current-password" placeholder="Contraseña compartida" disabled={!configured}/></label></>:<label>Código de clase<input className="code-input" name="code" required minLength={12} maxLength={12} pattern="[a-fA-F0-9]{12}" placeholder="Código de 12 caracteres" autoComplete="off" disabled={!configured}/></label>}
 {error&&<p className="error" role="alert">{error}</p>}<button className="primary full" disabled={busy||!configured}>{busy?'Conectando…':mode==='teacher'?'Entrar como profesor':'Entrar en la clase'}</button></form>
 <p className="login-footnote">{mode==='teacher'?'Todos los profesores usan la misma cuenta y gestionan las clases.':'Pide el código a tu profesor. No necesitas correo ni contraseña.'}</p>
 {!configured&&<div className="setup-notice" role="status"><strong>Configuración pendiente</strong><p>El acceso se activará al conectar MongoDB Atlas. Sigue los pasos del README del proyecto.</p></div>}</section></main>
}
