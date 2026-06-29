import { AuthLayout } from '@/features/auth/auth-layout';
import { ForgotPasswordForm } from '@/features/auth/forgot-password-form';

export default function RecuperarSenhaRoute() {
  return (
    <AuthLayout>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
