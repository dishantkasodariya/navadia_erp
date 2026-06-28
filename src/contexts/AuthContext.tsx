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
  aadhaarNo?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  alternatePhone?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  panNo?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  signup: (data: SignupData) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  allUsers: User[];
  addStaffMember: (data: Omit<User, "id"> & { password?: string }) => Promise<{ success: boolean; message: string }>;
  editStaffMember: (id: string, data: Partial<User>) => Promise<{ success: boolean; message: string }>;
  removeStaffMember: (id: string) => Promise<{ success: boolean; message: string }>;
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
  aadhaarNo?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  alternatePhone?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  panNo?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_USERS: (User & { password: string })[] = [
  { id: "super-1", name: "Super Admin", email: "super@navadia.com", password: "super", role: "Admin", phone: "+91 99999 99999" },
  { id: "1", name: "Dr. Jatin Navadia", email: "jatin@navadia.com", password: "jatin", role: "Admin", phone: "+91 98765 43210" },
  { id: "admin-2", name: "Dr. Dimpal Navadia", email: "dimpal@navadia.com", password: "dimpal", role: "Admin", phone: "+91 98765 43211" },
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
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed.map((u: any) => ({
          ...u,
          role: normalizeRole(u.role)
        })) as (User & { password: string })[];
      }
    } catch (e) {
      console.error("Failed to parse stored users:", e);
    }
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
        const res = await fetch(`${API_BASE_URL}/api/staff`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const backendStaff = await res.json();
          const mapped = backendStaff.map((u: Record<string, unknown>) => ({
            id: u._id as string,
            name: u.name as string,
            email: u.email as string,
            role: normalizeRole(u.role as string),
            phone: u.phone as string,
            specialization: u.specialization as string,
            licenseNo: u.licenseNo as string,
            aadhaarNo: u.aadhaarNo as string,
            address: u.address as string,
            city: u.city as string,
            state: u.state as string,
            country: u.country as string,
            pincode: u.pincode as string,
            alternatePhone: u.alternatePhone as string,
            dateOfBirth: u.dateOfBirth as string,
            gender: u.gender as string,
            bloodGroup: u.bloodGroup as string,
            panNo: u.panNo as string,
            emergencyContact: u.emergencyContact as string,
            emergencyPhone: u.emergencyPhone as string,
            password: "password123" // Placeholder for list
          }));
          
          // Use backend users directly as the source of truth, preserving local passwords for offline use
          const merged = mapped.map((b: User & { password?: string }) => {
            const existing = users.find((u) => u.email === b.email);
            return {
              ...b,
              password: existing ? existing.password : "password123"
            };
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
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
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
          licenseNo: data.licenseNo,
          aadhaarNo: data.aadhaarNo,
          address: data.address,
          city: data.city,
          state: data.state,
          country: data.country,
          pincode: data.pincode,
          alternatePhone: data.alternatePhone,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          bloodGroup: data.bloodGroup,
          panNo: data.panNo,
          emergencyContact: data.emergencyContact,
          emergencyPhone: data.emergencyPhone
        };
        setUser(normalized);
        localStorage.setItem("navadia_current_user", JSON.stringify(normalized));
        localStorage.setItem("navadia_token", data.token);
        return { success: true, message: "Login successful" };
      } else {
        const errorData = await res.json().catch(() => ({}));
        return { success: false, message: errorData.message || "Invalid email or password" };
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
      const res = await fetch(`${API_BASE_URL}/api/auth/signup`, {
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
      aadhaarNo: data.aadhaarNo,
      address: data.address,
      city: data.city,
      state: data.state,
      country: data.country,
      pincode: data.pincode,
      alternatePhone: data.alternatePhone,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender,
      bloodGroup: data.bloodGroup,
      panNo: data.panNo,
      emergencyContact: data.emergencyContact,
      emergencyPhone: data.emergencyPhone,
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

  const addStaffMember = async (data: Omit<User, "id"> & { password?: string }): Promise<{ success: boolean; message: string }> => {
    const finalRole = normalizeRole(data.role);
    const password = data.password || data.name.split(" ").pop()?.toLowerCase() || "password123";
    
    const token = localStorage.getItem("navadia_token");
    if (!token) return { success: false, message: "Authentication token missing. Please log in again." };

    try {
      const res = await fetch(`${API_BASE_URL}/api/staff`, {
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
          licenseNo: data.licenseNo,
          aadhaarNo: data.aadhaarNo,
          address: data.address,
          city: data.city,
          state: data.state,
          country: data.country,
          pincode: data.pincode,
          alternatePhone: data.alternatePhone,
          dateOfBirth: data.dateOfBirth,
          gender: data.gender,
          bloodGroup: data.bloodGroup,
          panNo: data.panNo,
          emergencyContact: data.emergencyContact,
          emergencyPhone: data.emergencyPhone
        })
      });
      
      const resData = await res.json();
      
      if (res.ok) {
        const newUser = {
          id: resData._id,
          name: resData.name,
          email: resData.email,
          role: normalizeRole(resData.role),
          phone: resData.phone,
          specialization: resData.specialization,
          licenseNo: resData.licenseNo,
          aadhaarNo: resData.aadhaarNo,
          address: resData.address,
          city: resData.city,
          state: resData.state,
          country: resData.country,
          pincode: resData.pincode,
          alternatePhone: resData.alternatePhone,
          dateOfBirth: resData.dateOfBirth,
          gender: resData.gender,
          bloodGroup: resData.bloodGroup,
          panNo: resData.panNo,
          emergencyContact: resData.emergencyContact,
          emergencyPhone: resData.emergencyPhone,
          password
        };
        const updated = [...users, newUser];
        setUsers(updated);
        saveUsers(updated);
        return { success: true, message: "Staff added successfully" };
      } else {
        return { success: false, message: resData.message || "Failed to add staff member" };
      }
    } catch (e) {
      console.error("Error adding staff:", e);
      return { success: false, message: "Cannot connect to server. Please try again later." };
    }
  };

  const editStaffMember = async (id: string, data: Partial<User>): Promise<{ success: boolean; message: string }> => {
    const token = localStorage.getItem("navadia_token");
    if (!token) return { success: false, message: "Authentication token missing. Please log in again." };

    try {
      const res = await fetch(`${API_BASE_URL}/api/staff/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      
      const resData = await res.json();
      
      if (res.ok) {
        const updatedUsers = users.map(u => {
          if (u.id === id) {
            return {
              ...u,
              ...resData,
              id: resData._id || u.id,
              role: normalizeRole(resData.role || u.role)
            };
          }
          return u;
        });
        setUsers(updatedUsers);
        saveUsers(updatedUsers);
        return { success: true, message: "Staff updated successfully" };
      } else {
        return { success: false, message: resData.message || "Failed to update staff member" };
      }
    } catch (e) {
      console.error("Error updating staff:", e);
      return { success: false, message: "Cannot connect to server. Please try again later." };
    }
  };

  const removeStaffMember = async (id: string): Promise<{ success: boolean; message: string }> => {
    // If the ID is a temporary local ID and not a valid 24-character hexadecimal Mongo ObjectId, remove it locally
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(id);
    if (!isMongoId) {
      const updated = users.filter((u) => u.id !== id);
      setUsers(updated);
      saveUsers(updated);
      return { success: true, message: "Staff removed successfully" };
    }

    const token = localStorage.getItem("navadia_token");
    if (!token) return { success: false, message: "Authentication token missing." };

    try {
      const res = await fetch(`${API_BASE_URL}/api/staff/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok || res.status === 404) {
        const updated = users.filter((u) => u.id !== id);
        setUsers(updated);
        saveUsers(updated);
        return { success: true, message: "Staff removed successfully" };
      } else {
        const resData = await res.json();
        return { success: false, message: resData.message || "Failed to remove staff" };
      }
    } catch (e) {
      console.error("Error removing staff:", e);
      return { success: false, message: "Cannot connect to server." };
    }
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
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, signup, logout, allUsers, addStaffMember, editStaffMember, removeStaffMember, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
