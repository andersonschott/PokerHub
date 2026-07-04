import { AuthLayout } from '@/features/auth/auth-layout';
import { ResetPasswordForm } from '@/features/auth/reset-password-form';

export default function RedefinirSenhaRoute() {
  return (
    <AuthLayout>
      <ResetPasswordForm />
    </AuthLayout>
  );
}
