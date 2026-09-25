import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { findUserByEmail, initStorage, getUsers, getSoldiers } from '@/lib/storage';
import type { User } from '@/lib/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_KEY = 'fitforce:session_user_id';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        await initStorage();
        const savedId = await AsyncStorage.getItem(SESSION_KEY);
        if (savedId) {
          const users = await getUsers();
          const found = users.find(u => u.id === savedId);
          if (found) {
            setUser(found);
          }
        }
      } catch (_) {}
      setIsLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const found = await findUserByEmail(email);
    if (!found) return { success: false, error: 'No account found with this email.' };
    if (found.password !== password) return { success: false, error: 'Incorrect password.' };

    // For self-registered soldiers, check Adjutant approval
    if (found.role === 'soldier') {
      // Check isApproved on the User record (false = pending approval)
      if (found.isApproved === false) {
        // Double-check the Soldier record too
        const soldiers = await getSoldiers();
        const soldierRecord = soldiers.find(s => s.userId === found.id);
        if (!soldierRecord || !soldierRecord.isApproved) {
          return {
            success: false,
            error: 'Your account is pending approval by the Adjutant. Please wait for approval before signing in.',
          };
        }
      }
    }

    setUser(found);
    await AsyncStorage.setItem(SESSION_KEY, found.id);
    return { success: true };
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem(SESSION_KEY);
  };

  const refreshUser = async () => {
    const savedId = await AsyncStorage.getItem(SESSION_KEY);
    if (!savedId) return;
    const users = await getUsers();
    const found = users.find(u => u.id === savedId);
    if (found) setUser(found);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
