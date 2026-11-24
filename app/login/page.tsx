import LoginForm from './login-form';
import {isConfigured} from '@/lib/config';
export default function Login(){return <LoginForm configured={isConfigured()}/>}

