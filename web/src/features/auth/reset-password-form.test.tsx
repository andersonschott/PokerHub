import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ResetPasswordForm } from './reset-password-form';

function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <ResetPasswordForm />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ResetPasswordForm', () => {
  it('shows an invalid-link message when code/email are missing', () => {
    renderAt('/redefinir-senha');
    expect(screen.getByText(/Link inválido ou incompleto/i)).toBeTruthy();
    expect(screen.queryByLabelText(/Nova senha/i)).toBeNull();
  });

  it('renders the password fields when email and code are present', () => {
    renderAt('/redefinir-senha?email=a%40b.com&code=XYZ');
    expect(screen.getByLabelText('Nova senha')).toBeTruthy();
    expect(screen.getByLabelText('Confirmar nova senha')).toBeTruthy();
  });
});
