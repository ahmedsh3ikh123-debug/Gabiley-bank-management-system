"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import api, { setLoggingOut } from "@/lib/api";
import type { User } from "@/types";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
  isAdmin: boolean;
  isEmployee: boolean;
  isCustomer: boolean;
  isStaff: boolean;
}

interface RegisterData {
  username?: string;
  email: string;
  password: string;
  confirm_password?: string;
  full_name: string;
  phone: string;
  address?: string;
  dob?: string;
  gender?: string;
  national_id?: string;
  pin: string;
  role?: string;
  mother_name?: string;
  id_card_image?: string;
  account_type?: string;
  purpose?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_ROLES = ["super_admin", "branch_manager", "manager"];
const EMPLOYEE_ROLES = ["teller", "customer_service", "accountant", "ict_staff"];
const STAFF_ROLES = [...ADMIN_ROLES, ...EMPLOYEE_ROLES];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedRefreshToken = localStorage.getItem("refreshToken");
    const storedUser = localStorage.getItem("user");
    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
      }
    }
    setLoading(false);
  }, []);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await api.post("/auth/login", { username, password });
      const { token: newToken, refreshToken: newRefreshToken, user: userData } = res.data;
      localStorage.setItem("token", newToken);
      localStorage.setItem("refreshToken", newRefreshToken);
      localStorage.setItem("user", JSON.stringify(userData));
      setToken(newToken);
      setUser(userData);
      router.push("/dashboard");
    },
    [router]
  );

  const register = useCallback(
    async (data: RegisterData) => {
      const res = await api.post("/auth/register", data);
      return res.data;
    },
    []
  );

  const logout = useCallback(async () => {
    setLoggingOut(true);
    const refreshToken = localStorage.getItem("refreshToken");
    try {
      await api.post("/auth/logout", { refreshToken });
    } catch {
      // ignore - token may already be expired
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      setToken(null);
      setUser(null);
      router.push("/login");
      setTimeout(() => setLoggingOut(false), 1000);
    }
  }, [router]);

  const updateUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  }, []);

  const isAdmin = user ? ADMIN_ROLES.includes(user.role) : false;
  const isEmployee = user ? EMPLOYEE_ROLES.includes(user.role) : false;
  const isCustomer = user?.role === "customer";
  const isStaff = user ? STAFF_ROLES.includes(user.role) : false;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        updateUser,
        isAdmin,
        isEmployee,
        isCustomer,
        isStaff,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
