import {z} from 'zod';
export const examSchema=z.object({id:z.string().uuid().optional().or(z.literal('')),title:z.string().trim().min(1).max(100),subject:z.string().trim().min(1).max(60),type:z.literal('Examen'),date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s=>{const d=new Date(s+'T12:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===s},'Fecha no válida'),time:z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),description:z.string().max(3000).default(''),location:z.string().max(100).default('')});
export const actionSchema=z.discriminatedUnion('action',[
 z.object({action:z.literal('create'),name:z.string().trim().min(1).max(70)}),
 z.object({action:z.literal('join'),code:z.string().trim().transform(s=>s.toUpperCase()).pipe(z.string().regex(/^[A-F0-9]{12}$/))}),
 z.object({action:z.literal('save'),classId:z.string().uuid(),event:examSchema}),
 z.object({action:z.literal('delete'),classId:z.string().uuid(),id:z.string().uuid()})
]);
export function safeNext(value:string|null){return value==='/reset-password'?value:'/'}
