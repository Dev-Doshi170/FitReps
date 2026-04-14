import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../services/supabase';

export type AuthState = {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
};

const initialState: AuthState = {
  user: null,
  session: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue },
  ) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      return rejectWithValue(error.message);
    }
    return { session: data.session, user: data.user };
  },
);

export const registerUser = createAsyncThunk(
  'auth/registerUser',
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue },
  ) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return rejectWithValue(error.message);
    }
    return { session: data.session, user: data.user };
  },
);

export const logoutUser = createAsyncThunk(
  'auth/logoutUser',
  async (_, { rejectWithValue }) => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return rejectWithValue(error.message);
    }
    return true;
  },
);

export const restoreSession = createAsyncThunk(
  'auth/restoreSession',
  async (_, { rejectWithValue }) => {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return rejectWithValue(error.message);
    }
    return {
      session: data.session,
      user: data.session?.user ?? null,
    };
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(loginUser.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.session = action.payload.session;
        state.user = action.payload.user;
        state.isAuthenticated = Boolean(action.payload.session);
        state.error = null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Login failed';
      })
      .addCase(registerUser.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.session = action.payload.session;
        state.user = action.payload.user;
        state.isAuthenticated = Boolean(action.payload.session);
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Registration failed';
      })
      .addCase(logoutUser.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(logoutUser.fulfilled, state => {
        state.loading = false;
        state.user = null;
        state.session = null;
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Logout failed';
      })
      .addCase(restoreSession.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.loading = false;
        state.session = action.payload.session;
        state.user = action.payload.user;
        state.isAuthenticated = Boolean(action.payload.session);
        state.error = null;
      })
      .addCase(restoreSession.rejected, (state, action) => {
        state.loading = false;
        state.session = null;
        state.user = null;
        state.isAuthenticated = false;
        state.error = (action.payload as string) ?? 'Session restore failed';
      });
  },
});

export const { clearAuthError } = authSlice.actions;
export default authSlice.reducer;
