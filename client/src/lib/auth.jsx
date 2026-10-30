import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!getToken());

  useEffect(() => {
    if (!getToken()) return;
    api('/auth/me').then(setUser).catch(() => setToken(null)).finally(() => setReady(true));
  }, []);

  const login = async (email, password, turnstile) => {
    const r = await api('/auth/login', { method: 'POST', body: { email, password, turnstile } });
    setToken(r.token);
    setUser(await api('/auth/me'));
    return r.user;
  };
  const logout = () => { setToken(null); setUser(null); };
  return <Ctx.Provider value={{ user, ready, login, logout, setUser }}>{children}</Ctx.Provider>;
}

export const HOME = { admin: '/admin', regulator: '/admin', institution: '/institution', verifier: '/verify', student: '/me' };
