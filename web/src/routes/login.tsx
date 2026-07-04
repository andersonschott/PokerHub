import { AuthLayout } from '@/features/auth/auth-layout';
import { LoginForm } from '@/features/auth/login-form';

export default function LoginRoute() {
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
}
