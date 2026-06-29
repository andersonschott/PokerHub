import { useMutation } from '@tanstack/react-query';
import { api } from '../client';

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  email: string;
  code: string;
  newPassword: string;
}

/** POST /api/auth/forgot-password — sempre 200 (anti-enumeração). */
export function useForgotPassword() {
  return useMutation({
    mutationFn: (dto: ForgotPasswordDto) =>
      api<void>('/auth/forgot-password', { method: 'POST', body: dto }),
  });
}

/** POST /api/auth/reset-password — redefine a senha via token do email. */
export function useResetPassword() {
  return useMutation({
    mutationFn: (dto: ResetPasswordDto) =>
      api<void>('/auth/reset-password', { method: 'POST', body: dto }),
  });
}
