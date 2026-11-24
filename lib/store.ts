import {database} from './mongodb';
import {classroom} from './classroom';
let ready:Promise<void>|undefined;
export async function store(){const service=classroom(database());if(!ready)ready=service.indexes().catch(e=>{ready=undefined;throw e});await ready;return service}
