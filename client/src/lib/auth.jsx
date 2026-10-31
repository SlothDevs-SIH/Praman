import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!getToken());

  const reloadMe = async () => {
    if (!getToken()) {
      setUser(null);
      setReady(true);
      return null;
    }
    try {
      const me = await api('/auth/me');
      setUser(me);
      return me;
    } catch {
      setToken(null);
      setUser(null);
      return null;
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    if (!getToken()) return;
    reloadMe();
  }, []);

  const login = async (email, password, turnstile) => {
    const r = await api('/auth/login', { method: 'POST', body: { email, password, turnstile } });
    setToken(r.token);
    const me = await api('/auth/me');
    setUser(me);
    return me;
  };

  const register = async (name, email, password) => {
    const r = await api('/auth/register', { method: 'POST', body: { name, email, password } });
    setToken(r.token);
    const me = await api('/auth/me');
    setUser(me);
    return me;
  };

  const chooseRole = async (role, institution_id) => {
    const r = await api('/auth/role', { method: 'POST', body: { role, institution_id } });
    setToken(r.token);
    setUser(r.user);
    return r.user;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, me: user, ready, login, register, chooseRole, reloadMe, logout, setUser }}>
      {children}
    </Ctx.Provider>
  );
}

export const HOME = {
  admin: '/admin',
  regulator: '/admin',
  institution: '/institution',
  verifier: '/verify',
  student: '/me',
  new: '/onboarding',
};
