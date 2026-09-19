import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, Role } from '../types';
import { api, setAccessToken, setOnAuthFailed, getAccessToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (...roles: Role[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const scheduleTokenRefresh = useCallback((expiresInMs: number = 13 * 60 * 1000) => {
    clearRefreshTimer();
    // Proactively refresh 2 minutes before the 15-minute token expires
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const res = await api.post('/auth/refresh');
        const newToken = res.data.accessToken;
        setAccessToken(newToken);
        setTokenState(newToken);
        scheduleTokenRefresh();
      } catch {
        setUser(null);
        setAccessToken(null);
        setTokenState(null);
      }
    }, expiresInMs);
  }, [clearRefreshTimer]);

  const handleAuthSuccess = useCallback((receivedUser: User, receivedToken: string) => {
    setUser(receivedUser);
    setAccessToken(receivedToken);
    setTokenState(receivedToken);
    scheduleTokenRefresh();
  }, [scheduleTokenRefresh]);

  // Initial silent refresh on page load (via HttpOnly cookie)
  useEffect(() => {
    let isMounted = true;

    async function checkAuth() {
      try {
        const res = await api.post('/auth/refresh');
        if (isMounted) {
          const receivedToken = res.data.accessToken;
          setAccessToken(receivedToken);
          setTokenState(receivedToken);

          // Fetch current user details
          const meRes = await api.get('/auth/me');
          setUser(meRes.data.user);
          scheduleTokenRefresh();
        }
      } catch {
        // No valid session cookie found; user will remain logged out
        if (isMounted) {
          setUser(null);
          setAccessToken(null);
          setTokenState(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    setOnAuthFailed(() => {
      clearRefreshTimer();
      setUser(null);
      setAccessToken(null);
      setTokenState(null);
    });

    checkAuth();

    return () => {
      isMounted = false;
      clearRefreshTimer();
    };
  }, [clearRefreshTimer, scheduleTokenRefresh]);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    handleAuthSuccess(res.data.user, res.data.accessToken);
  };

  const logout = async () => {
    clearRefreshTimer();
    try {
      await api.post('/auth/logout');
    } catch {
      // Continue cleanup regardless of network response
    } finally {
      setUser(null);
      setAccessToken(null);
      setTokenState(null);
    }
  };

  const hasRole = (...roles: Role[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken: token || getAccessToken(),
        isLoading,
        login,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
