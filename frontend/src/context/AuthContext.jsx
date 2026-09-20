import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { api, tokenStore } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function restore() {
      if (!tokenStore.get()) {
        setLoading(false);
        return;
      }
      try {
        const { user: me } = await api.auth.me();
        if (!cancelled) setUser(me);
      } catch {
        tokenStore.clear();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    restore();
    window.addEventListener('EaseAT:signed-out', signOut);
    return () => {
      cancelled = true;
      window.removeEventListener('EaseAT:signed-out', signOut);
    };
  }, [signOut]);

  const value = useMemo(
    () => ({
      user,
      loading,
      setUser,
      async signIn(credentials) {
        const { user: me, token } = await api.auth.login(credentials);
        tokenStore.set(token);
        setUser(me);
      },
      async signUp(details) {
        const { user: me, token } = await api.auth.register(details);
        tokenStore.set(token);
        setUser(me);
      },
      signOut,
    }),
    [user, loading, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
