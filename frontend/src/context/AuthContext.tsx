/**
 * Authentication context – manages JWT tokens, user state, login/logout.
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User, AuthTokens } from '@/types';
import { authService, profileService } from '@/lib/services';

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: Record<string, unknown>) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load stored auth state on mount
  useEffect(() => {
    const storedTokens = localStorage.getItem('notehub_tokens');
    const storedUser = localStorage.getItem('notehub_user');
    if (storedTokens && storedUser) {
      setTokens(JSON.parse(storedTokens));
      setUser(JSON.parse(storedUser));
      // Verify token is still valid by fetching profile
      profileService.get()
        .then((res) => {
          setUser(res.data);
          localStorage.setItem('notehub_user', JSON.stringify(res.data));
        })
        .catch(() => {
          // Token expired, clear state
          localStorage.removeItem('notehub_tokens');
          localStorage.removeItem('notehub_user');
          setUser(null);
          setTokens(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authService.login(email, password);
    const { user: userData, tokens: tokenData } = res.data;
    setUser(userData);
    setTokens(tokenData);
    localStorage.setItem('notehub_tokens', JSON.stringify(tokenData));
    localStorage.setItem('notehub_user', JSON.stringify(userData));
  }, []);

  const register = useCallback(async (data: Record<string, unknown>) => {
    const res = await authService.register(data as any);
    const { user: userData, tokens: tokenData } = res.data;
    setUser(userData);
    setTokens(tokenData);
    localStorage.setItem('notehub_tokens', JSON.stringify(tokenData));
    localStorage.setItem('notehub_user', JSON.stringify(userData));
  }, []);

  const logout = useCallback(async () => {
    try {
      if (tokens?.refresh) {
        await authService.logout(tokens.refresh);
      }
    } catch {
      // Ignore logout errors
    } finally {
      setUser(null);
      setTokens(null);
      localStorage.removeItem('notehub_tokens');
      localStorage.removeItem('notehub_user');
    }
  }, [tokens]);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('notehub_user', JSON.stringify(updatedUser));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin' || false,
        isLoading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
