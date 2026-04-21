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
  { id: "1", name: "Dr. Jatin Navadia", email: "jatin@navadia.com", password: "jatin", role: "admin", phone: "+91 98765 43210" },
  { id: "admin-2", name: "Dr. Dimpal Navadia", email: "dimpal@navadia.com", password: "dimpal", role: "admin", phone: "+91 98765 43211" },
  { id: "dentist-eva", name: "Dr. Eva", email: "eva@navadia.com", password: "eva", role: "dentist", phone: "+91 00000 00001" },
  { id: "dentist-archita", name: "Dr. Archita", email: "archita@navadia.com", password: "archita", role: "dentist", phone: "+91 00000 00002" },
  { id: "dentist-sejal", name: "Dr. Sejal", email: "sejal@navadia.com", password: "sejal", role: "dentist", phone: "+91 00000 00003" },
  { id: "dentist-shruti", name: "Dr. Shruti", email: "shruti@navadia.com", password: "shruti", role: "dentist", phone: "+91 00000 00004" },
  { id: "dentist-pooja", name: "Dr. Pooja", email: "pooja@navadia.com", password: "pooja", role: "dentist", phone: "+91 00000 00005" },
  { id: "dentist-mosam", name: "Dr. Mosam", email: "mosam@navadia.com", password: "mosam", role: "dentist", phone: "+91 00000 00006" },
];

function getStoredUsers(): (User & { password: string })[] {
  const stored = localStorage.getItem("navadia_users");
  if (stored) {
    const parsed = JSON.parse(stored);
    // Force refresh if the first user email doesn't match current DEFAULT (simple check for dev)
    if (parsed[0]?.email !== "jatin@navadia.com") {
       localStorage.setItem("navadia_users", JSON.stringify(DEFAULT_USERS));
       return DEFAULT_USERS;
    }
    return parsed;
  }
  localStorage.setItem("navadia_users", JSON.stringify(DEFAULT_USERS));
  return DEFAULT_USERS;
}

function saveUsers(users: (User & { password: string })[]) {
  localStorage.setItem("navadia_users", JSON.stringify(users));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<(User & { password: string })[]>(getStoredUsers);

  useEffect(() => {
    const stored = localStorage.getItem("navadia_current_user");
    if (stored) {
      setUser(JSON.parse(stored));
    }
  }, []);

  const login = async (email: string, password: string) => {
    const found = users.find((u) => u.email === email && u.password === password);
    if (!found) return { success: false, message: "Invalid email or password" };
    const { password: _, ...userData } = found;
    setUser(userData);
    localStorage.setItem("navadia_current_user", JSON.stringify(userData));
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
    localStorage.setItem("navadia_current_user", JSON.stringify(userData));
    return { success: true, message: "Account created successfully" };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("navadia_current_user");
  };

  const allUsers: User[] = users.map(({ password: _, ...u }) => u);

  const addStaffMember = (data: Omit<User, "id">) => {
    const password = data.name.split(" ").pop()?.toLowerCase() || "password123"; // Using last name or similar logic
    const newUser: User & { password: string } = {
      id: crypto.randomUUID(),
      ...data,
      password: password,
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
