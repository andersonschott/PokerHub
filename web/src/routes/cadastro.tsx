import { AuthLayout } from '@/features/auth/auth-layout';
import { RegisterForm } from '@/features/auth/register-form';

export default function CadastroRoute() {
  return (
    <AuthLayout>
      <RegisterForm />
    </AuthLayout>
  );
}
