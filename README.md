# Calendario de exámenes

Calendario de clase con una interfaz sencilla. Next.js + MongoDB Atlas + Better Auth, preparado para Vercel.

- Todos los profesores acceden con el usuario compartido `profesores` y una misma contraseña, crean varias clases y publican exámenes.
- Cada clase genera un código aleatorio de 12 caracteres.
- Los alumnos entran con ese código, sin correo ni contraseña. Solo pueden consultar las clases a las que se han unido.
- Las asignaturas son libres: sirve para ESO, Bachillerato, DAW y otros cursos.
- Vista mensual, lista, filtro de asignatura y formulario de examen con fecha, hora y tema.

## Ejecutar en local

Requiere Node.js 22 o superior.

```sh
npm ci
```

Copia `.env.example` a `.env.local` y completa:

```dotenv
MONGODB_URI=mongodb+srv://USUARIO:CONTRASEÑA@HOST/
MONGODB_DB=calendario_examenes
BETTER_AUTH_SECRET=SECRETO_ALEATORIO_DE_AL_MENOS_32_CARACTERES
BETTER_AUTH_URL=http://localhost:3000
```

Genera el secreto con:

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

No subas `.env.local`, contraseñas ni cadenas de conexión al repositorio. Si una contraseña de Atlas contiene caracteres especiales, codifícala para usarla en la URI.

```sh
npm run dev
```

Abre http://localhost:3000. Sin las variables configuradas, el login muestra «Configuración pendiente» y no simula un acceso.

## MongoDB Atlas

1. Crea un proyecto y un clúster gratuito M0.
2. Crea un usuario de base de datos con acceso `readWrite` únicamente a `calendario_examenes`.
3. Autoriza la IP de desarrollo y las IP de salida del alojamiento en Network Access. Si tu alojamiento requiere una lista más amplia, decide esa configuración conscientemente: no desactives la autenticación ni TLS.
4. En **Connect → Drivers**, copia la conexión y guárdala como `MONGODB_URI`.

La aplicación crea sus colecciones e índices al usarse. MongoDB Atlas ofrece las transacciones que utiliza Better Auth. No hay SQL ni migraciones de Supabase.

## Crear la cuenta compartida de profesores

El registro público de profesores está desactivado. No basta con cambiar un rol en el navegador: la autorización se comprueba en la colección `teachers`, accesible solo desde el servidor.

Desde un equipo autorizado, con `.env.local` apuntando a la base de datos:

```sh
npm run teacher:create
```

El asistente solicita nombre, correo y contraseña oculta. Para la cuenta compartida usa el nombre `Profesores` y el correo interno `profesores@calendario.local`; la pantalla de acceso acepta el usuario `profesores`. Este correo es un identificador interno y no recibe mensajes. Guarda la contraseña mediante Better Auth, nunca en texto plano. Para restablecerla, ejecuta el mismo comando con ese correo; pide confirmación y revoca las sesiones anteriores.

El administrador entrega las mismas credenciales a todos los profesores. Todos gestionan las clases de esta cuenta. Los alumnos solo acceden a las clases mediante sus códigos y no pueden modificar exámenes. No se necesita un proveedor de correo ni se envían emails automáticamente.

## Desplegar en Vercel

1. Sube los archivos de este proyecto a `IbaiHdez/Calendario_Examenes`.
2. Importa el repositorio en Vercel. Framework: **Next.js**. Root Directory: la raíz del repositorio. Build: `npm run build`.
3. Añade las cuatro variables de `.env.example` a Vercel. Las credenciales y el secreto son variables del servidor, sin prefijo `NEXT_PUBLIC_`.
4. Para el proyecto actual, usa `BETTER_AUTH_URL=https://calendario-six-peach.vercel.app` si ese sigue siendo el dominio asignado. Cambia el valor si eliges otro dominio. Sin barra final.
5. Despliega. Al modificar variables después, vuelve a desplegar para aplicarlas.
6. Crea la primera cuenta docente con `npm run teacher:create` y prueba el acceso. Crea una clase y usa su código desde una ventana privada para probar el acceso del alumno.

Los despliegues Preview necesitan su propia URL autorizada y, preferiblemente, una base de datos de prueba. No expongas las credenciales de producción a ramas no confiables.

## Seguridad y comprobaciones

```sh
npm run typecheck
npm test
npm run build
```

Las pruebas levantan un MongoDB temporal local y comprueban contraseñas cifradas mediante hash, sesiones, cierre de sesión, registro público bloqueado, múltiples clases, códigos únicos, lectura por pertenencia, edición solo por el profesor propietario y fechas válidas. No acceden a Atlas.

Better Auth administra las sesiones y limita los intentos de acceso. Los intentos de código de clase se limitan por alumno a 10 por minuto. Los alumnos conservan su sesión en este navegador; al cerrar sesión o borrar las cookies pueden volver a entrar con el código. No se guardan notas ni datos personales de los alumnos.

## Datos de la versión anterior

Este proyecto es independiente del prototipo publicado en Sites. Sus datos no se copian automáticamente desde la base D1 anterior. No se han borrado las clases del prototipo.

## Referencias

- [Better Auth con MongoDB](https://better-auth.com/docs/adapters/mongo)
- [Better Auth con Next.js](https://better-auth.com/docs/integrations/next)
- [MongoDB Atlas](https://www.mongodb.com/docs/atlas/)
- [Next.js en Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)
