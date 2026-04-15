import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type UserRole = "admin" | "dentist" | "receptionist" | "staff";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  specialization?: string;
  licenseNo?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  signup: (data: SignupData) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  allUsers: User[];
  addStaffMember: (data: Omit<User, "id">) => void;
  removeStaffMember: (id: string) => void;
}

interface SignupData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  specialization?: string;
  licenseNo?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_USERS: (User & { password: string })[] = [
  { id: "1", name: "Dr. Admin", email: "admin@dentaclinic.com", password: "admin123", role: "admin", phone: "+1 555-0100" },
  { id: "2", name: "Dr. Michael Ross", email: "michael@dentaclinic.com", password: "dentist123", role: "dentist", phone: "+1 555-0101", specialization: "Endodontics", licenseNo: "DEN-2024-001" },
  { id: "3", name: "Dr. Sofia Patel", email: "sofia@dentaclinic.com", password: "dentist123", role: "dentist", phone: "+1 555-0102", specialization: "Orthodontics", licenseNo: "DEN-2024-002" },
  { id: "4", name: "Emily Carter", email: "emily@dentaclinic.com", password: "reception123", role: "receptionist", phone: "+1 555-0103" },
  { id: "5", name: "James Wilson", email: "james@dentaclinic.com", password: "staff123", role: "staff", phone: "+1 555-0104" },
];

function getStoredUsers(): (User & { password: string })[] {
  const stored = localStorage.getItem("dentaclinic_users");
  if (stored) return JSON.parse(stored);
  localStorage.setItem("dentaclinic_users", JSON.stringify(DEFAULT_USERS));
  return DEFAULT_USERS;
}

function saveUsers(users: (User & { password: string })[]) {
  localStorage.setItem("dentaclinic_users", JSON.stringify(users));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<(User & { password: string })[]>(getStoredUsers);

  useEffect(() => {
    const stored = localStorage.getItem("dentaclinic_current_user");
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  const login = async (email: string, password: string) => {
    const found = users.find((u) => u.email === email && u.password === password);
    if (!found) return { success: false, message: "Invalid email or password" };
    const { password: _, ...userData } = found;
    setUser(userData);
    localStorage.setItem("dentaclinic_current_user", JSON.stringify(userData));
    return { success: true, message: "Login successful" };
  };

  const signup = async (data: SignupData) => {
    const exists = users.find((u) => u.email === data.email);
    if (exists) return { success: false, message: "Email already registered" };
    const newUser: User & { password: string } = {
      id: crypto.randomUUID(),
      name: data.name,
      email: data.email,
      password: data.password,
      role: data.role,
      phone: data.phone,
      specialization: data.specialization,
      licenseNo: data.licenseNo,
    };
    const updated = [...users, newUser];
    setUsers(updated);
    saveUsers(updated);
    const { password: _, ...userData } = newUser;
    setUser(userData);
    localStorage.setItem("dentaclinic_current_user", JSON.stringify(userData));
    return { success: true, message: "Account created successfully" };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("dentaclinic_current_user");
  };

  const allUsers: User[] = users.map(({ password: _, ...u }) => u);

  const addStaffMember = (data: Omit<User, "id">) => {
    const newUser: User & { password: string } = {
      id: crypto.randomUUID(),
      ...data,
      password: "changeme123",
    };
    const updated = [...users, newUser];
    setUsers(updated);
    saveUsers(updated);
  };

  const removeStaffMember = (id: string) => {
    const updated = users.filter((u) => u.id !== id);
    setUsers(updated);
    saveUsers(updated);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, signup, logout, allUsers, addStaffMember, removeStaffMember }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
