import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabase/client';
import type { Profile } from '../../domain/member/member.types';

export interface AuthState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  profile: null,
  loading: true,
  error: null,
};

export const fetchProfile = createAsyncThunk<Profile, string, { rejectValue: string }>(
  'auth/fetchProfile',
  async (userId, { rejectWithValue }) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        return rejectWithValue(error.message);
      }

      return data as Profile;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al obtener perfil';
      return rejectWithValue(message);
    }
  }
);

export const loginWithEmail = createAsyncThunk<
  { user: User; profile: Profile | null },
  { email: string; password: string },
  { rejectValue: string }
>('auth/loginWithEmail', async ({ email, password }, { dispatch, rejectWithValue }) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return rejectWithValue(error.message);
    }

    if (!data.user) {
      return rejectWithValue('No se pudo autenticar al usuario');
    }

    let profile: Profile | null = null;
    const profileResult = await dispatch(fetchProfile(data.user.id));
    if (fetchProfile.fulfilled.match(profileResult)) {
      profile = profileResult.payload;
    }

    return { user: data.user, profile };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error inesperado al iniciar sesión';
    return rejectWithValue(message);
  }
});

export const loginWithGoogle = createAsyncThunk<void, void, { rejectValue: string }>(
  'auth/loginWithGoogle',
  async (_, { rejectWithValue }) => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        return rejectWithValue(error.message);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión con Google';
      return rejectWithValue(message);
    }
  }
);

export const logout = createAsyncThunk<void, void, { rejectValue: string }>(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        return rejectWithValue(error.message);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cerrar sesión';
      return rejectWithValue(message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser(state, action: PayloadAction<{ user: User | null; profile: Profile | null }>) {
      state.user = action.payload.user;
      state.profile = action.payload.profile;
      state.loading = false;
      state.error = null;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loginWithEmail.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(loginWithEmail.fulfilled, (state, action) => {
      state.loading = false;
      state.user = action.payload.user;
      state.profile = action.payload.profile;
    });
    builder.addCase(loginWithEmail.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Error al iniciar sesión';
    });

    builder.addCase(loginWithGoogle.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(loginWithGoogle.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload || 'Error al iniciar sesión con Google';
    });

    builder.addCase(logout.fulfilled, (state) => {
      state.user = null;
      state.profile = null;
      state.loading = false;
      state.error = null;
    });
  },
});

export const { setUser, clearError } = authSlice.actions;
export default authSlice.reducer;
