import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  setAuthTokenGetter,
  useGetMe,
  useLogin,
  useSignup,
  type AuthUser,
  type SoldierSignupInput,
} from "@workspace/api-client-react";
import { queryClient } from "@/lib/queryClient";
import { deleteItem, getItem, setItem } from "@/lib/storage";

const TOKEN_KEY = "fit-force-auth-token";

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isBootstrapping: boolean;
  isLoadingUser: boolean;
  isRefetchingUser: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SoldierSignupInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    setAuthTokenGetter(async () => token);
  }, [token]);

  useEffect(() => {
    (async () => {
      const stored = await getItem(TOKEN_KEY);
      setToken(stored);
      setIsBootstrapping(false);
    })();
  }, []);

  const {
    data: user,
    isFetching: isRefetchingUser,
    isLoading: isLoadingUser,
    refetch,
  } = useGetMe({
    query: {
      enabled: !!token && !isBootstrapping,
      retry: false,
    } as never,
  });

  const loginMutation = useLogin();
  const signupMutation = useSignup();

  const login = useCallback(
    async (email: string, password: string) => {
      const session = await loginMutation.mutateAsync({ data: { email, password } });
      await setItem(TOKEN_KEY, session.token);
      setToken(session.token);
      // Manually set the user data in the cache to avoid a refetch delay
      queryClient.setQueryData(["getMe"], session.user);
    },
    [loginMutation],
  );

  const signup = useCallback(
    async (data: SoldierSignupInput) => {
      await signupMutation.mutateAsync({ data });
    },
    [signupMutation],
  );

  const logout = useCallback(async () => {
    await deleteItem(TOKEN_KEY);
    setToken(null);
    queryClient.clear();
  }, []);

  const refreshUser = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const value = useMemo(
    () => ({
      user: user ?? null,
      token,
      isBootstrapping,
      isLoadingUser: isBootstrapping || (!!token && isLoadingUser),
      isRefetchingUser,
      login,
      signup,
      logout,
      refreshUser,
    }),
    [user, token, isBootstrapping, isLoadingUser, isRefetchingUser, login, signup, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
