import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import {
  getValidSession,
  isPermanentAuthError,
  isSupabaseConfigured,
  loadStoredSession,
  requestPasswordResetEmail,
  refreshAuthSession,
  signInWithPassword,
  signOutRemote,
  signUpWithPassword,
  storeSession,
  updatePasswordWithToken,
  type AuthSession
} from '../lib/supabase';

interface AuthResult {
  requiresEmailConfirmation?: boolean;
}

interface AuthStoreValue {
  configured: boolean;
  loading: boolean;
  session: AuthSession | null;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<AuthSession | null>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (accessToken: string, password: string) => Promise<void>;
  clearError: () => void;
}

const AuthStoreContext = createContext<AuthStoreValue | null>(null);

export const AuthStoreProvider = ({ children }: PropsWithChildren) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let active = true;
    const storedSession = loadStoredSession();
    getValidSession(storedSession)
      .then((nextSession) => {
        if (!active) return;
        setSession(nextSession);
        storeSession(nextSession);
      })
      .catch((sessionError) => {
        if (!active) return;
        if (isPermanentAuthError(sessionError)) {
          setSession(null);
          storeSession(null);
          return;
        }
        // Kegagalan jaringan tidak boleh menghapus sesi dan cache pengguna.
        // Access token lama mungkin belum dapat dipakai ke cloud, tetapi
        // AppStore masih bisa membuka data perangkat dalam mode offline.
        setSession(storedSession);
        setError('Tidak dapat memeriksa sesi. Ruang memakai data perangkat sampai koneksi kembali.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    const nextSession = await signInWithPassword(email.trim(), password);
    storeSession(nextSession);
    setSession(nextSession);
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    setError(null);
    const result = await signUpWithPassword(email.trim(), password, name);
    if (result.session) {
      storeSession(result.session);
      setSession(result.session);
      return {};
    }
    return { requiresEmailConfirmation: true };
  }, []);

  const signOut = useCallback(async () => {
    const current = session;
    setSession(null);
    storeSession(null);
    if (current) {
      try { await signOutRemote(current); } catch { /* Sesi lokal sudah dihapus. */ }
    }
  }, [session]);

  const refreshSession = useCallback(async () => {
    if (!session) return null;
    try {
      const nextSession = await refreshAuthSession(session.refresh_token);
      storeSession(nextSession);
      setSession(nextSession);
      return nextSession;
    } catch (refreshError) {
      if (isPermanentAuthError(refreshError)) {
        setSession(null);
        storeSession(null);
      } else {
        setError('Sesi belum dapat diperbarui. Perubahan tetap disimpan di perangkat.');
      }
      throw refreshError;
    }
  }, [session]);

  const requestPasswordReset = useCallback(async (email: string) => {
    setError(null);
    const redirectUrl = new URL(window.location.href);
    redirectUrl.search = '';
    redirectUrl.hash = '';
    await requestPasswordResetEmail(email.trim(), redirectUrl.toString());
  }, []);

  const updatePassword = useCallback(async (accessToken: string, password: string) => {
    setError(null);
    await updatePasswordWithToken(accessToken, password);
  }, []);

  useEffect(() => {
    if (!session) return;
    const refreshInMs = Math.max(1_000, session.expires_at * 1000 - Date.now() - 60_000);
    const timer = window.setTimeout(() => {
      void refreshSession().catch(() => undefined);
    }, refreshInMs);
    return () => window.clearTimeout(timer);
  }, [session?.expires_at, refreshSession]);

  const value = useMemo<AuthStoreValue>(() => ({
    configured: isSupabaseConfigured,
    loading,
    session,
    error,
    signIn: async (email, password) => {
      try {
        await signIn(email, password);
      } catch (authError) {
        const message = authError instanceof Error ? authError.message : 'Login gagal.';
        setError(message);
        throw authError;
      }
    },
    signUp: async (name, email, password) => {
      try {
        return await signUp(name, email, password);
      } catch (authError) {
        const message = authError instanceof Error ? authError.message : 'Pendaftaran gagal.';
        setError(message);
        throw authError;
      }
    },
    signOut,
    refreshSession,
    requestPasswordReset: async (email) => {
      try {
        await requestPasswordReset(email);
      } catch (authError) {
        setError(authError instanceof Error ? authError.message : 'Email pemulihan gagal dikirim.');
        throw authError;
      }
    },
    updatePassword: async (accessToken, password) => {
      try {
        await updatePassword(accessToken, password);
      } catch (authError) {
        setError(authError instanceof Error ? authError.message : 'Password gagal diperbarui.');
        throw authError;
      }
    },
    clearError: () => setError(null)
  }), [loading, session, error, signIn, signUp, signOut, refreshSession, requestPasswordReset, updatePassword]);

  return <AuthStoreContext.Provider value={value}>{children}</AuthStoreContext.Provider>;
};

export const useAuthStore = () => {
  const context = useContext(AuthStoreContext);
  if (!context) throw new Error('useAuthStore must be used inside AuthStoreProvider');
  return context;
};
