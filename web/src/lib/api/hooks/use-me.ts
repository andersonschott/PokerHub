import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../client';

/** Espelha PokerHub.Application.DTOs.Me.MyContactDto (PixKeyType serializado como int). */
export interface MyContactDto {
  pixKey: string | null;
  pixKeyType: number | null;
  phone: string | null;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export const meKeys = {
  contact: ['me', 'contact'] as const,
};

/** GET /api/me/contact — PIX/telefone do usuário logado. */
export function useMyContact() {
  return useQuery({
    queryKey: meKeys.contact,
    queryFn: () => api<MyContactDto>('/me/contact'),
  });
}

/** PUT /api/me/contact — grava PIX/telefone em todas as ligas do usuário. */
export function useUpdateMyContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: MyContactDto) =>
      api<MyContactDto>('/me/contact', { method: 'PUT', body: dto }),
    onSuccess: (data) => {
      qc.setQueryData(meKeys.contact, data);
    },
  });
}

/** POST /api/auth/change-password — troca de senha do usuário logado. */
export function useChangePassword() {
  return useMutation({
    mutationFn: (dto: ChangePasswordDto) =>
      api<void>('/auth/change-password', { method: 'POST', body: dto }),
  });
}
