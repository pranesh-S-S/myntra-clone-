import { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { getUserData, saveUserData, clearUserData } from "@/utils/storage";
import React from "react";
import axios from "axios";
type AuthContextType = {
  isAuthenticated: boolean;
  user: { _id: string; name: string; email: string } | null;
  Signup: (fullName: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  registerLoginSync: (cb: (userId: string) => Promise<void>) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{
    _id: string;
    name: string;
    email: string;
  } | null>(null);
  const loginSyncCallbacks = useRef<((userId: string) => Promise<void>)[]>([]);

  const registerLoginSync = useCallback((cb: (userId: string) => Promise<void>) => {
    loginSyncCallbacks.current.push(cb);
  }, []);

  useEffect(() => {
    (async () => {
      const data = await getUserData();
      if (data._id && data.name && data.email) {
        setUser({ _id: data._id, name: data.name, email: data.email });
        setIsAuthenticated(true);
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await axios.post(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'}/user/login`, {
      email,
      password,
    });

    const data = res.data;
    if (data.user && data.user.fullName) {
      await saveUserData(data.user._id, data.user.fullName, data.user.email);
      setUser({ _id: data.user._id, name: data.user.fullName, email: data.user.email });
      setIsAuthenticated(true);
      // Fire login sync callbacks (e.g., recently viewed merge)
      for (const cb of loginSyncCallbacks.current) {
        cb(data.user._id).catch(console.warn);
      }
    } else {
      throw new Error(data.message || "Login failed");
    }
  };
  const Signup = async (fullName: string, email: string, password: string) => {
    const res = await axios.post(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'}/user/signup`, {
      fullName,
      email,
      password,
    });
    const data = res.data;
    if (data.user && data.user.fullName) {
      await saveUserData(data.user._id, data.user.fullName, data.user.email);
      setUser({ _id: data.user._id, name: data.user.fullName, email: data.user.email });
      setIsAuthenticated(true);
      // Fire login sync callbacks (e.g., recently viewed merge)
      for (const cb of loginSyncCallbacks.current) {
        cb(data.user._id).catch(console.warn);
      }
    } else {
      throw new Error(data.message || "Signup failed");
    }
  };
  const logout = async () => {
    await clearUserData();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, user, Signup, login, logout, registerLoginSync }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext)!;
