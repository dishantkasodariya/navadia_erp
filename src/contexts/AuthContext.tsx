import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

import { API_BASE_URL } from '../config/api';

export type UserRole = "Admin" | "Staff" | "Dentist" | "admin" | "staff" | "dentist" | "superadmin" | "receptionist";

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
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  signup: (data: SignupData) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  allUsers: User[];
  addStaffMember: (data: Omit<User, "id"> & { password?: string }) => void;
  removeStaffMember: (id: string) => void;
  updateUser: (updatedUser: Partial<User>) => void;
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
  { id: "super-1", name: "Super Admin", email: "super@navadia.com", password: "super", role: "Admin", phone: "+91 99999 99999" },
  { id: "1", name: "Dr. Jatin Navadia", email: "jatin@navadia.com", password: "jatin", role: "Admin", phone: "+91 98765 43210" },
  { id: "admin-2", name: "Dr. Dimpal Navadia", email: "dimpal@navadia.com", password: "dimpal", role: "Admin", phone: "+91 98765 43211" },
  { id: "dentist-eva", name: "Dr. Eva", email: "eva@navadia.com", password: "eva", role: "Dentist", phone: "+91 00000 00001" },
  { id: "dentist-archita", name: "Dr. Archita", email: "archita@navadia.com", password: "archita", role: "Dentist", phone: "+91 00000 00002" },
  { id: "dentist-sejal", name: "Dr. Sejal", email: "sejal@navadia.com", password: "sejal", role: "Dentist", phone: "+91 00000 00003" },
  { id: "dentist-shruti", name: "Dr. Shruti", email: "shruti@navadia.com", password: "shruti", role: "Dentist", phone: "+91 00000 00004" },
  { id: "dentist-pooja", name: "Dr. Pooja", email: "pooja@navadia.com", password: "pooja", role: "Dentist", phone: "+91 00000 00005" },
  { id: "dentist-mosam", name: "Dr. Mosam", email: "mosam@navadia.com", password: "mosam", role: "Dentist", phone: "+91 00000 00006" },
];

function normalizeRole(role: string): UserRole {
  const lower = role.toLowerCase();
  if (lower === "admin" || lower === "superadmin") return "Admin";
  if (lower === "dentist") return "Dentist";
  return "Staff";
}

function getStoredUsers(): (User & { password: string })[] {
  const stored = localStorage.getItem("navadia_users");
  if (stored) {
    const parsed = JSON.parse(stored);
    if (parsed[0]?.email !== "super@navadia.com" && parsed[0]?.email !== "jatin@navadia.com") {
      localStorage.setItem("navadia_users", JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    return parsed.map((u: any) => ({
      ...u,
      role: normalizeRole(u.role)
    }));
  }
  localStorage.setItem("navadia_users", JSON.stringify(DEFAULT_USERS));
  return DEFAULT_USERS;
}

function saveUsers(users: (User & { password: string })[]) {
  localStorage.setItem("navadia_users", JSON.stringify(users));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("navadia_current_user");
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...parsed,
        role: normalizeRole(parsed.role)
      };
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<(User & { password: string })[]>(getStoredUsers);

  useEffect(() => {
    setIsLoading(false);
    // Sync backend list of users if backend is up (All roles for chat contacts)
    const fetchUsers = async () => {
      const token = localStorage.getItem("navadia_token");
      if (!token) return;
      try {
        const res = await fetch("${API_BASE_URL}/api/staff", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const backendStaff = await res.json();
          const mapped = backendStaff.map((u: any) => ({
            id: u._id,
            name: u.name,
            email: u.email,
            role: normalizeRole(u.role),
            phone: u.phone,
            specialization: u.specialization,
            licenseNo: u.licenseNo,
            password: "password123" // Placeholder for list
          }));
          
          // Merge with defaults
          const merged = [...getStoredUsers()];
          mapped.forEach((b: any) => {
            const idx = merged.findIndex((u) => u.email === b.email);
            if (idx >= 0) {
              const existingPassword = merged[idx].password;
              merged[idx] = { 
                ...merged[idx], 
                ...b,
                password: existingPassword && existingPassword !== "password123" ? existingPassword : b.password
              };
            } else {
              merged.push(b);
            }
          });
          setUsers(merged);
          saveUsers(merged);
        }
      } catch (e) {
        console.warn("Backend offline, users loaded from local storage:", e);
      }
    };
    fetchUsers();
  }, [user]);

  const login = async (email: string, password: string) => {
    let backendFailed = false;
    try {
      const res = await fetch("${API_BASE_URL}/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (res.ok) {
        const data = await res.json();
        const normalized = {
          id: data._id,
          name: data.name,
          email: data.email,
          role: normalizeRole(data.role),
          phone: data.phone,
          specialization: data.specialization,
          licenseNo: data.licenseNo
        };
        setUser(normalized);
        localStorage.setItem("navadia_current_user", JSON.stringify(normalized));
        localStorage.setItem("navadia_token", data.token);
        return { success: true, message: "Login successful" };
      } else {
        backendFailed = true;
      }
    } catch (e) {
      console.warn("Backend offline, falling back to local storage:", e);
      backendFailed = true;
    }

    if (backendFailed) {
      const found = users.find((u) => u.email === email && u.password === password);
      if (found) {
        const { password: _, ...userData } = found;
        const normalizedUser = {
          ...userData,
          role: normalizeRole(userData.role)
        };
        setUser(normalizedUser);
        localStorage.setItem("navadia_current_user", JSON.stringify(normalizedUser));
        return { success: true, message: "Login successful (local offline fallback)" };
      }
    }

    return { success: false, message: "Invalid email or password" };
  };

  const signup = async (data: SignupData) => {
    try {
      const res = await fetch("${API_BASE_URL}/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          role: data.role
        })
      });
      if (res.ok) {
        const resData = await res.json();
        const normalized = {
          id: resData._id,
          name: resData.name,
          email: resData.email,
          role: normalizeRole(resData.role),
          token: resData.token
        };
        setUser(normalized);
        localStorage.setItem("navadia_current_user", JSON.stringify(normalized));
        localStorage.setItem("navadia_token", resData.token);
        return { success: true, message: "Account created successfully" };
      }
    } catch (e) {
      console.warn("Backend offline, falling back to local storage signup:", e);
    }

    const exists = users.find((u) => u.email === data.email);
    if (exists) return { success: false, message: "Email already registered" };
    
    const finalRole = normalizeRole(data.role);

    const newUser: User & { password: string } = {
      id: crypto.randomUUID(),
      name: data.name,
      email: data.email,
      password: data.password,
      role: finalRole,
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
    localStorage.removeItem("navadia_token");
  };

  const allUsers: User[] = users.map(({ password: _, ...u }) => ({
    ...u,
    role: normalizeRole(u.role)
  }));

  const addStaffMember = async (data: Omit<User, "id"> & { password?: string }) => {
    const finalRole = normalizeRole(data.role);
    const password = data.password || data.name.split(" ").pop()?.toLowerCase() || "password123";
    
    const token = localStorage.getItem("navadia_token");
    if (token) {
      try {
        const res = await fetch("${API_BASE_URL}/api/staff", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            name: data.name,
            email: data.email,
            password: password,
            role: finalRole,
            phone: data.phone,
            specialization: data.specialization,
            licenseNo: data.licenseNo
          })
        });
        if (res.ok) {
          const created = await res.json();
          const newUser = {
            id: created._id,
            name: created.name,
            email: created.email,
            role: normalizeRole(created.role),
            phone: data.phone,
            specialization: data.specialization,
            licenseNo: data.licenseNo,
            password
          };
          const updated = [...users, newUser];
          setUsers(updated);
          saveUsers(updated);
          return;
        }
      } catch (e) {
        console.warn("Backend offline, adding to local storage fallback:", e);
      }
    }

    const newUser: User & { password: string } = {
      id: crypto.randomUUID(),
      name: data.name,
      email: data.email,
      role: finalRole,
      phone: data.phone,
      specialization: data.specialization,
      licenseNo: data.licenseNo,
      password: password,
    };
    const updated = [...users, newUser];
    setUsers(updated);
    saveUsers(updated);
  };

  const removeStaffMember = async (id: string) => {
    const token = localStorage.getItem("navadia_token");
    if (token) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/staff/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const updated = users.filter((u) => u.id !== id);
          setUsers(updated);
          saveUsers(updated);
          return;
        }
      } catch (e) {
        console.warn("Backend offline, removing from local storage fallback:", e);
      }
    }

    const updated = users.filter((u) => u.id !== id);
    setUsers(updated);
    saveUsers(updated);
  };

  const updateUser = (updatedUser: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return null;
      const nextUser = { ...prev, ...updatedUser };
      localStorage.setItem("navadia_current_user", JSON.stringify(nextUser));
      return nextUser;
    });
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, signup, logout, allUsers, addStaffMember, removeStaffMember, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
