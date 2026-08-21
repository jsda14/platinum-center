import { supabase } from '../../infrastructure/supabase/client';

export async function registerUserByEmail(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const redirectTo = `${window.location.origin}/setup-profile`;
    const tempPassword = window.crypto && window.crypto.randomUUID
      ? window.crypto.randomUUID() + 'Aa1!'
      : Math.random().toString(36).substring(2) + 'Aa1!';

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password: tempPassword,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('User already registered')) {
        return { success: false, error: 'Este correo electrónico ya se encuentra registrado.' };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error inesperado al registrar el usuario';
    return { success: false, error: msg };
  }
}
