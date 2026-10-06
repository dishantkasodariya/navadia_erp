import { useState, useEffect, useMemo } from "react";

import { API_BASE_URL } from '../config/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Clock, LogIn, LogOut, Search, Plus, Calendar, UserCheck, UserX, History, FileText, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { calculateDuration, formatDuration } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO } from "date-fns";

interface AttendanceRecord {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  breakTime?: number; // Break time in minutes
  status: "present" | "absent" | "late" | "half-day" | "on-leave" | "tour";
  notes: string;
}

const today = new Date().toISOString().split("T")[0];
const INITIAL_RECORDS: AttendanceRecord[] = [];

export default function Attendance() {
  const { user, allUsers } = useAuth();
  const staffOptions = allUsers.filter((u) => u.role.toLowerCase() !== "admin");
  const isAdmin = user?.role.toLowerCase() === "admin";
  const { toast } = useToast();
  const [records, setRecords] = useState<AttendanceRecord[]>(INITIAL_RECORDS);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date());
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedDate, setSelectedDate] = useState(today);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  const [viewStaffId, setViewStaffId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("daily");
  const [roleFilter, setRoleFilter] = useState("all");

  const [formData, setFormData] = useState({ staffId: "", status: "present" as AttendanceRecord["status"], notes: "" });

  const fetchAttendance = async () => {
    const token = localStorage.getItem("navadia_token");
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/attendance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((a: any) => ({
            id: a._id,
            staffId: a.userId,
            staffName: a.userName,
            role: allUsers.find(u => u.id === a.userId)?.role || "Staff",
            date: a.date,
            checkIn: a.checkIn || null,
            checkOut: a.checkOut || null,
            breakTime: a.breakTime || 0,
            status: (a.status || "Present").toLowerCase() === "on leave" 
              ? "on-leave" 
              : (a.status || "Present").toLowerCase() === "half day" 
              ? "half-day" 
              : (a.status || "Present").toLowerCase(),
            notes: ""
          }));
        setRecords(mapped);
        localStorage.setItem("navadia_attendance", JSON.stringify(mapped));
      }
    } catch (e) {
      console.warn("Backend offline, fallback loading cached attendance:", e);
      const cached = localStorage.getItem("navadia_attendance");
      if (cached) {
        try {
          setRecords(JSON.parse(cached));
        } catch (err) {
          console.error("Failed to parse cached attendance", err);
        }
      }
    }
  };

  const fetchLeaves = async () => {
    const token = localStorage.getItem("navadia_token");
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/leave`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const approved = data.filter((l: any) => l.status === "Approved");
        setLeaves(approved);
        localStorage.setItem("navadia_leaves", JSON.stringify(approved));
      }
    } catch (e) {
      console.warn("Failed to fetch leaves, loading cache:", e);
      const cached = localStorage.getItem("navadia_leaves");
      if (cached) {
        try {
          setLeaves(JSON.parse(cached));
        } catch (err) {
          console.error("Failed to parse cached leaves", err);
        }
      }
    }
  };

  useEffect(() => {
    fetchAttendance();
    fetchLeaves();
  }, [allUsers]);

  // Ensure current logged-in employee has an attendance record placeholder for today so they can clock in/out
  useEffect(() => {
    if (user && user.role.toLowerCase() !== "admin") {
      const todayExists = records.some(r => r.staffId === user.id && r.date === today);
      if (!todayExists) {
        const placeholder: AttendanceRecord = {
          id: `placeholder-${user.id}-${today}`,
          staffId: user.id,
          staffName: user.name,
          role: user.role,
          date: today,
          checkIn: null,
          checkOut: null,
          breakTime: 0,
          status: "absent",
          notes: ""
        };
        setRecords(prev => [placeholder, ...prev]);
      }
    }
  }, [user, records]);

  // Sync with DentistDashboard - listen for check-in/check-out events from Dashboard
  useEffect(() => {
    const handleAttendanceSync = (e: Event) => {
      if (e instanceof CustomEvent && e.detail?.type === 'check-in') {
        // Dashboard checked in, refetch attendance to show updated records
        setTimeout(() => { fetchAttendance(); fetchLeaves(); }, 500);
      } else if (e instanceof CustomEvent && e.detail?.type === 'check-out') {
        // Dashboard checked out, refetch attendance to show updated records
        setTimeout(() => { fetchAttendance(); fetchLeaves(); }, 500);
      }
    };
    window.addEventListener('attendance-synced', handleAttendanceSync);
    
    // Also listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes('navadia_dentist_shift') && e.newValue) {
        setTimeout(() => { fetchAttendance(); fetchLeaves(); }, 500);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('attendance-synced', handleAttendanceSync);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const formatTimeTo12h = (time24: string | null) => {
    if (!time24) return "—";
    if (time24.includes("AM") || time24.includes("PM")) return time24; // already formatted
    const parts = time24.split(":");
    if (parts.length < 2) return time24;
    const h = parseInt(parts[0], 10);
    const m = parts[1];
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12.toString().padStart(2, "0")}:${m} ${ampm}`;
  };

  const getDayStatus = (userId: string, dateStr: string) => {
    // 1. Check records
    const record = records.find(r => r.staffId === userId && r.date === dateStr);
    if (record) {
      const statusVal = record.status.toLowerCase();
      let mappedStatus = "Present";
      if (statusVal === "present") mappedStatus = "Present";
      else if (statusVal === "late") mappedStatus = "Late";
      else if (statusVal === "absent") mappedStatus = "Absent";
      else if (statusVal === "on-leave" || statusVal === "on leave") mappedStatus = "On Leave";
      else if (statusVal === "tour") mappedStatus = "Tour";
      else if (statusVal === "on break" || statusVal === "on-break") mappedStatus = "On Break";

      return {
        status: mappedStatus,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        breakTime: record.breakTime || 0,
        recordId: record.id
      };
    }
    
    // 2. Check approved leaves
    const approvedLeave = leaves.find(l => l.userId === userId && dateStr >= l.startDate && dateStr <= l.endDate);
    if (approvedLeave) {
      const isTour = (approvedLeave.type || "").toLowerCase().includes("tour");
      return {
        status: isTour ? "Tour" : "On Leave",
        checkIn: null,
        checkOut: null,
        breakTime: 0,
        recordId: null
      };
    }

    // 3. Sundays
    const dayOfWeek = parseISO(dateStr).getDay();
    if (dayOfWeek === 0) {
      return {
        status: "Holiday",
        checkIn: null,
        checkOut: null,
        breakTime: 0,
        recordId: null
      };
    }

    // 4. Past vs Future
    const todayStr = new Date().toISOString().split("T")[0];
    if (dateStr < todayStr) {
      return {
        status: "Absent",
        checkIn: null,
        checkOut: null,
        breakTime: 0,
        recordId: null
      };
    }

    return {
      status: "Pending",
      checkIn: null,
      checkOut: null,
      breakTime: 0,
      recordId: null
    };
  };

  const adminDailyLogs = useMemo(() => {
    if (!isAdmin) return [];
    return staffOptions.map((s) => {
      const dayStatus = getDayStatus(s.id, selectedDate);
      return {
        id: dayStatus.recordId || `placeholder-${s.id}-${selectedDate}`,
        staffId: s.id,
        staffName: s.name,
        role: s.role,
        date: selectedDate,
        checkIn: dayStatus.checkIn,
        checkOut: dayStatus.checkOut,
        breakTime: dayStatus.breakTime,
        status: dayStatus.status.toLowerCase() as AttendanceRecord["status"],
        notes: ""
      };
    });
  }, [isAdmin, staffOptions, records, selectedDate, leaves]);

  const filtered = useMemo(() => {
    if (isAdmin) {
      return adminDailyLogs.filter((r) => {
        const matchSearch = r.staffName.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === "all" || r.status === filterStatus;
        const matchRole = roleFilter === "all" || r.role.toLowerCase() === roleFilter.toLowerCase();
        return matchSearch && matchStatus && matchRole;
      });
    } else {
      return records.filter((r) => r.staffId === user?.id && r.date === selectedDate);
    }
  }, [isAdmin, adminDailyLogs, records, user, selectedDate, search, filterStatus, roleFilter]);

  const presentCount = useMemo(() => {
    if (isAdmin) {
      return adminDailyLogs.filter(r => r.status === "present" || r.status === "late").length;
    }
    return records.filter((r) => r.staffId === user?.id && r.date === selectedDate && (r.status === "present" || r.status === "late")).length;
  }, [isAdmin, adminDailyLogs, records, user, selectedDate]);

  const absentCount = useMemo(() => {
    if (isAdmin) {
      return adminDailyLogs.filter(r => r.status === "absent").length;
    }
    return records.filter((r) => r.staffId === user?.id && r.date === selectedDate && r.status === "absent").length;
  }, [isAdmin, adminDailyLogs, records, user, selectedDate]);

  const lateCount = useMemo(() => {
    if (isAdmin) {
      return adminDailyLogs.filter(r => r.status === "late").length;
    }
    return records.filter((r) => r.staffId === user?.id && r.date === selectedDate && r.status === "late").length;
  }, [isAdmin, adminDailyLogs, records, user, selectedDate]);

  const handleCheckIn = async (recordId: string) => {
    let record = records.find(r => r.id === recordId);
    if (!record && recordId.startsWith("placeholder-")) {
      const staffId = recordId.substring("placeholder-".length, recordId.length - 11);
      const dateVal = recordId.substring(recordId.length - 10);
      const staff = allUsers.find(u => u.id === staffId);
      if (staff) {
        record = {
          id: recordId,
          staffId,
          staffName: staff.name,
          role: staff.role,
          date: dateVal,
          checkIn: null,
          checkOut: null,
          breakTime: 0,
          status: "absent",
          notes: ""
        };
      }
    }
    if (!record) return;
    const nowTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    const isLate = nowTime > "09:00";
    const statusVal = isLate ? "Late" : "Present";
    
    const token = localStorage.getItem("navadia_token");
    let proceed = false;
    let isOffline = false;
    let rejectMessage = "";
    
    let latitude: number | undefined;
    let longitude: number | undefined;

    if (user?.role.toLowerCase() !== "admin" && navigator.geolocation) {
      toast({ title: "Verifying Location...", description: "Retrieving browser GPS coordinates." });
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000 });
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch (err) {
        console.warn("Could not retrieve GPS coordinates:", err);
      }
    }

    if (token) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/attendance/check-in`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            userId: record.staffId,
            userName: record.staffName,
            date: record.date,
            checkIn: nowTime,
            status: statusVal,
            latitude,
            longitude
          })
        });
        if (res.ok) {
          proceed = true;
        } else {
          const errData = await res.json().catch(() => ({}));
          rejectMessage = errData.message || "Coordinates verification failed or error on server.";
        }
      } catch (e) {
        console.warn("Backend offline, fallback local checkin:", e);
        proceed = true;
        isOffline = true;
      }
    } else {
      proceed = true;
    }

    if (proceed) {
      // Sync to local storage dashboard key if current user is checking in
      if (user && record.staffId === user.id) {
        const storageKey = `navadia_dentist_shift_${user.id}`;
        const shiftState = {
          status: "active" as const,
          checkInTimestamp: Date.now(),
          checkOutTimestamp: null,
          breakStartTime: null,
          accumulatedBreakTime: 0,
          notes: "",
          date: record.date
        };
        localStorage.setItem(storageKey, JSON.stringify(shiftState));
      }

      const newRecords = records.map((r) => r.id === recordId ? { ...r, checkIn: nowTime, status: isLate ? ("late" as const) : ("present" as const) } : r);
      setRecords(newRecords);
      localStorage.setItem("navadia_attendance", JSON.stringify(newRecords));

      toast({ 
        title: isOffline ? "Checked In Offline ⚠️" : "Checked In ✓", 
        description: `Check-in recorded at ${nowTime}. ${isOffline ? "Saved locally." : ""}` 
      });

      // Broadcast to DentistDashboard
      if (user && user.id) {
        window.dispatchEvent(new CustomEvent('attendance-synced', {
          detail: { type: 'check-in', shift: { status: "active", checkInTimestamp: Date.now(), date: record.date } }
        }));
      }
      
      if (!isOffline) {
        fetchAttendance();
      }
    } else {
      toast({
        title: "Check In Failed ❌",
        description: rejectMessage,
        variant: "destructive"
      });
    }
  };

  const handleCheckOut = async (recordId: string) => {
    let record = records.find(r => r.id === recordId);
    if (!record && recordId.startsWith("placeholder-")) {
      const staffId = recordId.substring("placeholder-".length, recordId.length - 11);
      const dateVal = recordId.substring(recordId.length - 10);
      const staff = allUsers.find(u => u.id === staffId);
      if (staff) {
        record = {
          id: recordId,
          staffId,
          staffName: staff.name,
          role: staff.role,
          date: dateVal,
          checkIn: null,
          checkOut: null,
          breakTime: 0,
          status: "absent",
          notes: ""
        };
      }
    }
    if (!record) return;
    const nowTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

    const token = localStorage.getItem("navadia_token");
    let proceed = false;
    let isOffline = false;
    let rejectMessage = "";

    let latitude: number | undefined;
    let longitude: number | undefined;

    if (user?.role.toLowerCase() !== "admin" && navigator.geolocation) {
      toast({ title: "Verifying Location...", description: "Retrieving browser GPS coordinates." });
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 8000 });
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch (err) {
        console.warn("Could not retrieve GPS coordinates:", err);
      }
    }

    if (token) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/attendance/check-out`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            userId: record.staffId,
            date: record.date,
            checkOut: nowTime,
            latitude,
            longitude
          })
        });
        if (res.ok) {
          proceed = true;
        } else {
          const errData = await res.json().catch(() => ({}));
          rejectMessage = errData.message || "Coordinates verification failed or error on server.";
        }
      } catch (e) {
        console.warn("Backend offline, fallback local checkout:", e);
        proceed = true;
        isOffline = true;
      }
    } else {
      proceed = true;
    }

    if (proceed) {
      // Sync to local storage dashboard key if current user is checking out
      if (user && record.staffId === user.id) {
        const storageKey = `navadia_dentist_shift_${user.id}`;
        const saved = localStorage.getItem(storageKey);
        const nowVal = Date.now();
        let checkInVal = nowVal - 8 * 60 * 60 * 1000;
        let accumulatedBreak = 0;
        let notes = "";
        if (saved) {
          const parsed = JSON.parse(saved);
          checkInVal = parsed.checkInTimestamp || checkInVal;
          accumulatedBreak = parsed.accumulatedBreakTime || 0;
          notes = parsed.notes || "";
        }
        const shiftState = {
          status: "checked_out" as const,
          checkInTimestamp: checkInVal,
          checkOutTimestamp: nowVal,
          breakStartTime: null,
          accumulatedBreakTime: accumulatedBreak,
          notes: notes,
          date: record.date
        };
        localStorage.setItem(storageKey, JSON.stringify(shiftState));
      }

      const newRecords = records.map((r) => r.id === recordId ? { ...r, checkOut: nowTime } : r);
      setRecords(newRecords);
      localStorage.setItem("navadia_attendance", JSON.stringify(newRecords));

      toast({ 
        title: isOffline ? "Checked Out Offline ⚠️" : "Checked Out ✓", 
        description: `Check-out recorded at ${nowTime}. ${isOffline ? "Saved locally." : ""}` 
      });

      // Broadcast to DentistDashboard
      if (user && user.id) {
        window.dispatchEvent(new CustomEvent('attendance-synced', {
          detail: { type: 'check-out', shift: { status: "checked_out", checkOutTimestamp: Date.now(), date: record.date } }
        }));
      }
      
      if (!isOffline) {
        fetchAttendance();
      }
    } else {
      toast({
        title: "Check Out Failed ❌",
        description: rejectMessage,
        variant: "destructive"
      });
    }
  };

  const handleAdd = async () => {
    if (!formData.staffId) return;
    const staff = allUsers.find(u => u.id === formData.staffId);
    if (!staff) return;

    const formattedStatus = formData.status === "present" ? "Present" : formData.status === "absent" ? "Absent" : formData.status === "half-day" ? "Half Day" : "On Leave";
    const nowTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    const token = localStorage.getItem("navadia_token");
    let proceed = false;
    let isOffline = false;

    if (token) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/attendance/check-in`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            userId: staff.id,
            userName: staff.name,
            date: selectedDate,
            checkIn: formData.status === "present" ? nowTime : null,
            status: formattedStatus
          })
        });
        if (res.ok) {
          proceed = true;
        }
      } catch (e) {
        console.warn("Backend offline, fallback local add:", e);
        proceed = true;
        isOffline = true;
      }
    } else {
      proceed = true;
    }

    if (proceed) {
      const newRecord: AttendanceRecord = {
        id: crypto.randomUUID(),
        staffId: staff.id,
        staffName: staff.name,
        role: staff.role,
        date: selectedDate,
        checkIn: formData.status === "present" ? nowTime : null,
        checkOut: null,
        breakTime: 0,
        status: formData.status,
        notes: formData.notes,
      };
      const updated = [...records, newRecord];
      setRecords(updated);
      localStorage.setItem("navadia_attendance", JSON.stringify(updated));
      setDialogOpen(false);
      setFormData({ staffId: "", status: "present", notes: "" });
      toast({ title: isOffline ? "Record Added Offline ⚠️" : "Record Added ✓" });
      if (!isOffline) {
        fetchAttendance();
      }
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "present": return "bg-secondary/15 text-secondary";
      case "late": return "bg-accent/15 text-accent";
      case "absent": return "bg-destructive/15 text-destructive";
      case "half-day": return "bg-primary/10 text-primary";
      case "on-leave": return "bg-muted text-muted-foreground";
      case "on break":
      case "on-break":
        return "bg-amber-500/15 text-amber-600 border border-amber-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  
  const staffSummary = staffOptions
    .filter(staff => roleFilter === "all" || staff.role.toLowerCase() === roleFilter.toLowerCase())
    .map(staff => {
      const staffRecords = (records || []).filter(r => r.staffId === staff.id);
      const todayRecord = staffRecords.find(r => r.date === today);
    
      let monthlyHours = 0;
      staffRecords.forEach(r => {
        try {
          if (!r.date) return;
          const d = parseISO(r.date);
          if (isNaN(d.getTime())) return;
          
          if (isWithinInterval(d, { start, end })) {
            const rawDuration = calculateDuration(r.checkIn, r.checkOut);
            const breakHours = (r.breakTime || 0) / 60;
            monthlyHours += Math.max(0, rawDuration - breakHours);
          }
        } catch (e) {
          console.error("Error calculating hours:", e);
        }
      });

      const rawTodayDuration = calculateDuration(todayRecord?.checkIn || null, todayRecord?.checkOut || null);
      const todayBreakHours = (todayRecord?.breakTime || 0) / 60;
      const todayHoursVal = Math.max(0, rawTodayDuration - todayBreakHours);

      return {
        ...staff,
        todayHours: todayHoursVal,
        monthlyHours: monthlyHours,
        totalRecords: staffRecords.length
      };
    });

  const selectedStaffHistory = viewStaffId 
    ? records.filter(r => r.staffId === viewStaffId).sort((a, b) => b.date.localeCompare(a.date))
    : [];
  const selectedStaffName = allUsers.find(u => u.id === viewStaffId)?.name;

  const personalRecords = (records || []).filter(r => r.staffId === user?.id);
  const personalTodayRecord = personalRecords.find(r => r.date === today);
  
  let personalMonthlyHours = 0;
  personalRecords.forEach(r => {
    try {
      if (!r.date) return;
      const d = parseISO(r.date);
      if (isNaN(d.getTime())) return;
      
      if (isWithinInterval(d, { start, end })) {
        const rawDuration = calculateDuration(r.checkIn, r.checkOut);
        const breakHours = (r.breakTime || 0) / 60;
        personalMonthlyHours += Math.max(0, rawDuration - breakHours);
      }
    } catch (e) {
      console.error("Error calculating personal monthly hours:", e);
    }
  });

  const rawPersonalTodayDuration = calculateDuration(personalTodayRecord?.checkIn || null, personalTodayRecord?.checkOut || null);
  const personalTodayBreakHours = (personalTodayRecord?.breakTime || 0) / 60;
  const personalTodayHours = Math.max(0, rawPersonalTodayDuration - personalTodayBreakHours);

  const renderStaffAttendanceOverview = (userId: string) => {
    // 1. Calculate dates for selected month
    const startOfCalMonth = startOfMonth(currentCalendarMonth);
    const endOfCalMonth = endOfMonth(currentCalendarMonth);
    const monthStr = format(currentCalendarMonth, "yyyy-MM");
    const todayStr = new Date().toISOString().split("T")[0];
    
    // Find all attendance records for this month
    const userRecords = records.filter(r => r.staffId === userId && r.date.startsWith(monthStr));
    const userLeaves = leaves.filter(l => l.userId === userId && l.status === "Approved");

    // Calculate dynamic stats for this selected month
    let presentCount = 0;
    let absentCount = 0;
    let leaveCount = 0;
    let tourCount = 0;
    let lateCount = 0;
    let requiredDays = 0;
    
    const todayDate = new Date();
    const endStatLimit = endOfCalMonth < todayDate ? endOfCalMonth : todayDate;
    
    // Calculate total required days for the whole month
    for (let d = new Date(startOfCalMonth); d <= endOfCalMonth; d.setDate(d.getDate() + 1)) {
      if (d.getDay() !== 0) requiredDays++;
    }
    if (requiredDays <= 0) requiredDays = 24;

    // Calculate actual statuses up to endStatLimit
    const recordsMap = new Map<string, any>();
    userRecords.forEach((r: any) => {
      recordsMap.set(r.date, r);
    });

    for (let d = new Date(startOfCalMonth); d <= endStatLimit; d.setDate(d.getDate() + 1)) {
      if (d.getDay() === 0) continue; // skip Sunday
      const dateStr = d.toISOString().split("T")[0];

      if (recordsMap.has(dateStr)) {
        const r = recordsMap.get(dateStr);
        const statusStr = (r.status || "").toLowerCase();
        if (statusStr === "present") {
          presentCount++;
        } else if (statusStr === "late") {
          lateCount++;
          presentCount++;
        } else if (statusStr === "absent") {
          absentCount++;
        } else if (statusStr === "on leave" || statusStr === "on-leave") {
          leaveCount++;
        } else if (statusStr === "tour") {
          tourCount++;
        } else {
          presentCount++;
        }
      } else {
        const isOnApprovedLeave = userLeaves.find((l: any) => dateStr >= l.startDate && dateStr <= l.endDate);
        if (isOnApprovedLeave) {
          const leaveType = (isOnApprovedLeave.type || "").toLowerCase();
          if (leaveType.includes("tour")) {
            tourCount++;
          } else {
            leaveCount++;
          }
        } else {
          if (dateStr < todayStr) {
            absentCount++;
          }
        }
      }
    }

    // Calculate total hours
    let totalMs = 0;
    let workedDaysWithDuration = 0;
    
    userRecords.forEach((r: any) => {
      if (r.checkIn && r.checkOut) {
        const [inH, inM] = r.checkIn.split(":").map(Number);
        const [outH, outM] = r.checkOut.split(":").map(Number);
        let durationMs = ((outH * 60 + outM) - (inH * 60 + inM)) * 60 * 1000;
        if (r.breakTime) {
          durationMs -= r.breakTime * 60 * 1000;
        }
        if (durationMs > 0) {
          totalMs += durationMs;
          workedDaysWithDuration++;
        }
      }
    });

    const totalHours = Math.floor(totalMs / (3600 * 1000));
    const totalMins = Math.floor((totalMs % (3600 * 1000)) / (60 * 1000));
    const totalHoursStr = `${totalHours}h ${totalMins}m`;

    let avgHoursStr = "00h 00m";
    if (workedDaysWithDuration > 0) {
      const avgMs = totalMs / workedDaysWithDuration;
      const avgHours = Math.floor(avgMs / (3600 * 1000));
      const avgMins = Math.floor((avgMs % (3600 * 1000)) / (60 * 1000));
      avgHoursStr = `${avgHours.toString().padStart(2, "0")}h ${avgMins.toString().padStart(2, "0")}m`;
    }

    const attendanceRate = requiredDays > 0 ? Math.round((presentCount / requiredDays) * 100) : 0;

    // Generate Calendar Grid
    const startDayIndex = startOfCalMonth.getDay(); // 0: Sun, 1: Mon, etc.
    const daysInMonth = endOfCalMonth.getDate();
    const calendarCells: { dateStr: string | null; dayNum: number | null }[] = [];
    
    // Empty cells before start of month
    for (let i = 0; i < startDayIndex; i++) {
      calendarCells.push({ dateStr: null, dayNum: null });
    }
    
    // Month days
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(startOfCalMonth);
      d.setDate(i);
      calendarCells.push({
        dateStr: d.toISOString().split("T")[0],
        dayNum: i
      });
    }

    // Week-wise Log records
    const logRecords: any[] = [];
    for (let i = daysInMonth; i >= 1; i--) {
      const d = new Date(startOfCalMonth);
      d.setDate(i);
      const dateStr = d.toISOString().split("T")[0];
      if (dateStr > todayStr) continue; // skip future dates
      
      const dayStatus = getDayStatus(userId, dateStr);
      if (dayStatus.status !== "Holiday" && dayStatus.status !== "Pending") {
        logRecords.push({
          date: dateStr,
          ...dayStatus
        });
      }
    }

    return (
      <div className="space-y-6">
        {/* Month Selector & Rate Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-muted/20 p-4 rounded-xl border border-muted/30">
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setCurrentCalendarMonth(prev => {
                const next = new Date(prev);
                next.setMonth(prev.getMonth() - 1);
                return next;
              })}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h3 className="text-base font-bold min-w-32 text-center text-neutral-800 dark:text-neutral-200">
              {format(currentCalendarMonth, "MMMM yyyy")}
            </h3>
            <Button 
              variant="outline" 
              size="icon" 
              disabled={startOfCalMonth > todayDate}
              onClick={() => setCurrentCalendarMonth(prev => {
                const next = new Date(prev);
                next.setMonth(prev.getMonth() + 1);
                return next;
              })}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 sm:gap-6">
            <div className="text-center">
              <span className="block text-[10px] text-muted-foreground font-semibold uppercase tracking-wider font-sans">Attendance Rate</span>
              <span className="text-xl font-extrabold text-primary font-sans">{attendanceRate}%</span>
            </div>
            <div className="h-8 w-[1px] bg-border hidden sm:block" />
            <div className="text-center">
              <span className="block text-[10px] text-muted-foreground font-semibold uppercase tracking-wider font-sans">Total / Avg Hours</span>
              <span className="text-sm font-bold text-foreground font-mono">{totalHoursStr} / {avgHoursStr}</span>
            </div>
          </div>
        </div>

        {/* Breakdown Stats Cards - Unified elegant styling, no rainbow colors */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
          <div className="bg-card border border-border/70 rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-center text-center shadow-xs min-w-0 h-[82px] sm:h-[88px]">
            <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 font-sans text-center leading-tight">Present Days</span>
            <span className="text-xl sm:text-2xl font-bold text-foreground font-sans leading-none">{presentCount}</span>
            <span className="text-[9px] sm:text-[10px] text-muted-foreground/80 mt-1 font-medium font-sans">{requiredDays > 0 ? Math.round((presentCount / requiredDays)*100) : 0}% of target</span>
          </div>
          <div className="bg-card border border-border/70 rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-center text-center shadow-xs min-w-0 h-[82px] sm:h-[88px]">
            <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 font-sans text-center leading-tight">Absent Days</span>
            <span className="text-xl sm:text-2xl font-bold text-foreground font-sans leading-none">{absentCount}</span>
            <span className="text-[9px] sm:text-[10px] text-muted-foreground/80 mt-1 font-medium font-sans">{requiredDays > 0 ? Math.round((absentCount / requiredDays)*100) : 0}% rate</span>
          </div>
          <div className="bg-card border border-border/70 rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-center text-center shadow-xs min-w-0 h-[82px] sm:h-[88px]">
            <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 font-sans text-center leading-tight">Leaves Approved</span>
            <span className="text-xl sm:text-2xl font-bold text-foreground font-sans leading-none">{leaveCount}</span>
            <span className="text-[9px] sm:text-[10px] text-muted-foreground/80 mt-1 font-medium font-sans">Leave periods</span>
          </div>
          <div className="bg-card border border-border/70 rounded-xl p-2.5 sm:p-3 flex flex-col items-center justify-center text-center shadow-xs min-w-0 h-[82px] sm:h-[88px]">
            <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 font-sans text-center leading-tight">Tour Days</span>
            <span className="text-xl sm:text-2xl font-bold text-foreground font-sans leading-none">{tourCount}</span>
            <span className="text-[9px] sm:text-[10px] text-muted-foreground/80 mt-1 font-medium font-sans">Out of clinic</span>
          </div>
        </div>

        {/* Layout Grid: Calendar & Log Table */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Calendar Widget */}
          <Card className="lg:col-span-5 p-3 sm:p-4 border border-border/70 shadow-sm rounded-xl">
            <CardHeader className="p-0 pb-3 border-b mb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-sans">Monthly Calendar</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted-foreground mb-1 font-sans">
              <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((cell, idx) => {
                if (cell.dayNum === null || cell.dateStr === null) {
                  return <div key={`empty-${idx}`} className="aspect-square bg-muted/5 rounded" />;
                }
                const dayStatus = getDayStatus(userId, cell.dateStr);
                let bgStyle = "bg-muted/10 text-muted-foreground";
                let dotStyle = "";

                if (dayStatus.status === "Present") {
                  bgStyle = "bg-primary/5 text-foreground font-bold border border-primary/20";
                  dotStyle = "bg-primary";
                } else if (dayStatus.status === "Late") {
                  bgStyle = "bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/20";
                  dotStyle = "bg-amber-500";
                } else if (dayStatus.status === "Absent") {
                  bgStyle = "bg-destructive/10 text-destructive font-semibold border border-destructive/20";
                  dotStyle = "bg-destructive";
                } else if (dayStatus.status === "On Leave") {
                  bgStyle = "bg-muted text-muted-foreground border border-border";
                  dotStyle = "bg-blue-500";
                } else if (dayStatus.status === "Tour") {
                  bgStyle = "bg-muted text-muted-foreground border border-border";
                  dotStyle = "bg-purple-500";
                } else if (dayStatus.status === "On Break") {
                  bgStyle = "bg-muted text-muted-foreground border border-border";
                  dotStyle = "bg-amber-500";
                } else if (dayStatus.status === "Holiday") {
                  bgStyle = "bg-muted/20 text-muted-foreground/50 border border-transparent";
                }

                const isToday = cell.dateStr === todayStr;

                return (
                  <div 
                    key={`day-${cell.dayNum}`} 
                    className={`aspect-square flex flex-col items-center justify-between p-1 rounded-lg text-xs relative cursor-help transition-all duration-200 ${bgStyle} ${isToday ? "ring-2 ring-primary" : ""}`}
                    title={`${cell.dateStr}: ${dayStatus.status}${dayStatus.checkIn ? ` (${dayStatus.checkIn} - ${dayStatus.checkOut || 'Active'})` : ''}`}
                  >
                    <span className="font-semibold">{cell.dayNum}</span>
                    {dotStyle && <span className={`h-1.5 w-1.5 rounded-full ${dotStyle}`} />}
                  </div>
                );
              })}
            </div>
            
            {/* Legend */}
            <div className="mt-4 pt-3 border-t flex flex-wrap items-center justify-between gap-2 text-[9px] font-semibold text-muted-foreground font-sans">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-primary inline-block" /> Present</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500 inline-block" /> Late</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive inline-block" /> Absent</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500 inline-block" /> Leave</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-purple-500 inline-block" /> Tour</span>
            </div>
          </Card>

          {/* Week-wise Table Log (Mobile Cards + Desktop Table) */}
          <Card className="lg:col-span-7 p-3 sm:p-4 border border-border/70 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="p-0 pb-3 border-b mb-3">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-sans">Attendance Log (Week-Wise)</CardTitle>
            </CardHeader>
            
            {/* Mobile Card List View (< sm) */}
            <div className="sm:hidden space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {logRecords.map((r, i) => {
                const formattedDateStr = format(parseISO(r.date), "eee, MMM d, yyyy");
                const durationVal = calculateDuration(r.checkIn, r.checkOut);
                const formattedDurationStr = r.checkIn ? formatDuration(durationVal) : "—";
                const formattedBreakStr = r.breakTime ? `${r.breakTime}m` : "—";

                let badgeClass = "bg-muted text-muted-foreground";
                if (r.status === "Present") badgeClass = "bg-primary/10 text-primary border border-primary/20";
                else if (r.status === "Late") badgeClass = "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20";
                else if (r.status === "Absent") badgeClass = "bg-destructive/10 text-destructive border border-destructive/20";
                else if (r.status === "On Leave") badgeClass = "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20";
                else if (r.status === "Tour") badgeClass = "bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20";
                else if (r.status === "On Break") badgeClass = "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20";

                return (
                  <div key={`mobile-log-${i}`} className="p-2.5 rounded-lg border border-border/70 bg-card/60 flex flex-col gap-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-foreground">{formattedDateStr}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${badgeClass}`}>
                        {r.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                      <div>
                        <span>Check In: </span>
                        <span className="font-mono font-medium text-foreground">{formatTimeTo12h(r.checkIn)}</span>
                      </div>
                      <div>
                        <span>Check Out: </span>
                        <span className="font-mono font-medium text-foreground">{formatTimeTo12h(r.checkOut)}</span>
                      </div>
                      <div>
                        <span>Duration: </span>
                        <span className="font-medium text-foreground">{formattedDurationStr}</span>
                      </div>
                      <div>
                        <span>Break: </span>
                        <span className="font-medium text-foreground">{formattedBreakStr}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {logRecords.length === 0 && (
                <div className="p-6 text-center text-muted-foreground text-xs">
                  No records for this month
                </div>
              )}
            </div>

            {/* Desktop Table View (>= sm) */}
            <div className="hidden sm:block overflow-x-auto max-h-[350px]">
              <table className="w-full text-xs text-left min-w-[500px]">
                <thead>
                  <tr className="bg-muted/30 border-b text-muted-foreground">
                    <th className="px-3 py-2.5 font-semibold font-sans">Date</th>
                    <th className="px-3 py-2.5 font-semibold font-sans">Status</th>
                    <th className="px-3 py-2.5 font-semibold font-sans">Check-In</th>
                    <th className="px-3 py-2.5 font-semibold font-sans">Check-Out</th>
                    <th className="px-3 py-2.5 font-semibold font-sans">Duration</th>
                    <th className="px-3 py-2.5 font-semibold font-sans">Break</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {logRecords.map((r, i) => {
                    const formattedDateStr = format(parseISO(r.date), "eee, MMM d, yyyy");
                    const durationVal = calculateDuration(r.checkIn, r.checkOut);
                    const formattedDurationStr = r.checkIn ? formatDuration(durationVal) : "—";
                    const formattedBreakStr = r.breakTime ? `${r.breakTime}m` : "—";

                    let badgeClass = "bg-muted text-muted-foreground";
                    if (r.status === "Present") badgeClass = "bg-primary/10 text-primary border border-primary/20";
                    else if (r.status === "Late") badgeClass = "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20";
                    else if (r.status === "Absent") badgeClass = "bg-destructive/10 text-destructive border border-destructive/20";
                    else if (r.status === "On Leave") badgeClass = "bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20";
                    else if (r.status === "Tour") badgeClass = "bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/20";
                    else if (r.status === "On Break") badgeClass = "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20";

                    return (
                      <tr key={`log-${i}`} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2.5 font-bold text-foreground font-sans">{formattedDateStr}</td>
                        <td className="px-3 py-2.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold inline-block ${badgeClass} font-sans`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-muted-foreground">{formatTimeTo12h(r.checkIn)}</td>
                        <td className="px-3 py-2.5 font-mono text-muted-foreground">{formatTimeTo12h(r.checkOut)}</td>
                        <td className="px-3 py-2.5 font-bold text-foreground font-sans">{formattedDurationStr}</td>
                        <td className="px-3 py-2.5 text-foreground font-semibold font-sans">{formattedBreakStr}</td>
                      </tr>
                    );
                  })}
                  {logRecords.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground font-sans">
                        No records for this month
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:max-lg:text-2xl">Attendance</h1>
        </div>
      </div>

      {isAdmin ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full min-w-0">
          <div className="w-full overflow-x-auto no-scrollbar pb-1 mb-4">
            <TabsList className="grid grid-cols-3 w-full sm:w-auto sm:inline-flex h-auto p-1 gap-1">
              <TabsTrigger value="daily" className="whitespace-nowrap gap-1.5 sm:gap-2 text-[11px] sm:text-sm px-1.5 sm:px-3 py-1.5 sm:py-2">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span>Daily Log</span>
              </TabsTrigger>
              <TabsTrigger value="overview" className="whitespace-nowrap gap-1.5 sm:gap-2 text-[11px] sm:text-sm px-1.5 sm:px-3 py-1.5 sm:py-2">
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span>Staff Overview</span>
              </TabsTrigger>
              <TabsTrigger value="my-overview" className="whitespace-nowrap gap-1.5 sm:gap-2 text-[11px] sm:text-sm px-1.5 sm:px-3 py-1.5 sm:py-2">
                <UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                <span>My Overview</span>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="overview">
            <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 md:max-lg:grid-cols-2 mb-6">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm sm:text-base font-medium">Active Personnel</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">{staffOptions.length} Staff</div>
                  <p className="text-sm text-muted-foreground mt-1">Clock-in and payroll operational</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm sm:text-base font-medium">Total Monthly Hours Worked</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold">
                    {formatDuration(staffSummary.reduce((acc, s) => acc + s.monthlyHours, 0))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">Accumulated hours</p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20 sm:col-span-2 xl:col-span-1">
                <CardHeader className="pb-2"><CardTitle className="text-sm sm:text-base font-medium">Active Period</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-lg sm:text-xl font-semibold">{format(new Date(), "MMMM yyyy")}</div>
                  <p className="text-sm text-muted-foreground mt-1">Payroll Cycle</p>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:max-lg:flex-wrap mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9 text-sm md:max-lg:text-sm" placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[140px] md:max-lg:w-[160px] text-sm"><SelectValue placeholder="All Roles" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="dentist">Dentists</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3 sm:gap-4 md:grid-cols-2 md:max-lg:grid-cols-2 2xl:grid-cols-3">
              {staffSummary.map((staff) => (
                <Card key={staff.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="grid gap-4 p-4 md:max-lg:p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {staff.name?.charAt(0) || "?"}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{staff.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">{staff.role}</p>
                      </div>
                    </div>
                    <div className="grid w-full grid-cols-2 gap-2 md:max-lg:gap-1.5">
                      <div className="rounded-md bg-muted/30 px-3 py-2 text-center sm:min-w-24">
                        <p className="text-xs sm:text-xs uppercase tracking-wider text-muted-foreground">Today</p>
                        <p className="text-sm sm:text-base font-semibold">{formatDuration(staff.todayHours)}</p>
                      </div>
                      <div className="rounded-md bg-primary/5 px-3 py-2 text-center sm:min-w-28">
                        <p className="text-xs sm:text-xs uppercase tracking-wider text-muted-foreground">This Month</p>
                        <p className="text-sm sm:text-base font-semibold text-primary">{formatDuration(staff.monthlyHours)}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setViewStaffId(staff.id)} className="col-span-2 h-9 gap-1 text-xs md:max-lg:h-8 md:max-lg:text-[11px]">
                        <History className="h-3 w-3" /> History
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="daily">
            {renderDailyLog()}
          </TabsContent>

          <TabsContent value="my-overview">
            <div className="space-y-6">
              {user && renderStaffAttendanceOverview(user.id)}
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full min-w-0">
          <div className="w-full overflow-x-auto no-scrollbar pb-1 mb-4">
            <TabsList className="grid grid-cols-2 w-full sm:w-auto sm:inline-flex h-auto p-1 gap-1">
              <TabsTrigger value="daily" className="whitespace-nowrap gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2">
                <Clock className="h-4 w-4 shrink-0" /> Daily Log
              </TabsTrigger>
              <TabsTrigger value="overview" className="whitespace-nowrap gap-1.5 sm:gap-2 text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2">
                <UserCheck className="h-4 w-4 shrink-0" /> My Overview
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="daily">
            {renderDailyLog()}
          </TabsContent>

          <TabsContent value="overview">
            <div className="space-y-6">
              <Card className="transition-shadow border-muted/50 rounded-lg bg-card shadow-sm overflow-hidden">
                <CardContent className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(220px,1fr)_minmax(320px,auto)] md:max-lg:p-3 sm:items-center">
                  {/* Profile Details */}
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-amber-500/10 flex items-center justify-center font-bold text-amber-600 text-sm font-sans">
                      {user?.name?.charAt(0) || "?"}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-medium text-sm text-foreground font-sans">{user?.name}</h3>
                      <p className="text-sm text-muted-foreground capitalize mt-0.5 font-sans">{user?.role}</p>
                    </div>
                  </div>
                  
                  {/* Statistics */}
                  <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center sm:justify-end sm:gap-3 lg:gap-4 md:max-lg:gap-2">
                    <div className="rounded-md bg-muted/30 px-3 py-2 text-center sm:min-w-24">
                      <p className="text-xs sm:text-xs uppercase tracking-wider text-muted-foreground font-semibold font-sans">Today</p>
                      <p className="text-sm sm:text-base font-semibold text-foreground mt-1 font-sans">{formatDuration(personalTodayHours)}</p>
                    </div>
                    <div className="rounded-md bg-primary/5 px-3 py-2 text-center sm:min-w-28">
                      <p className="text-xs sm:text-xs uppercase tracking-wider text-muted-foreground font-semibold font-sans">This Month</p>
                      <p className="text-sm sm:text-base font-semibold text-primary mt-1 font-sans">{formatDuration(personalMonthlyHours)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {user && renderStaffAttendanceOverview(user.id)}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Staff History Modal */}
      <Dialog open={!!viewStaffId} onOpenChange={(o) => !o && setViewStaffId(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-5xl max-h-[90vh] p-3.5 sm:p-6 flex flex-col overflow-y-auto rounded-xl">
          <DialogHeader className="pr-8 sm:pr-0">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-xl font-bold font-sans break-words">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary shrink-0 animate-pulse" />
              <span className="truncate">Attendance Overview: {selectedStaffName}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 sm:mt-4">
            {viewStaffId && renderStaffAttendanceOverview(viewStaffId)}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  function renderDailyLog() {
    return (
      <div className="space-y-6">
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="pt-3 sm:pt-4 flex items-center gap-2 sm:gap-3">
              <div className="h-10 w-10 rounded-lg bg-secondary/15 flex items-center justify-center flex-shrink-0"><UserCheck className="h-4 sm:h-5 w-4 sm:w-5 text-secondary" /></div>
              <div><p className="text-lg sm:text-2xl font-bold">{presentCount}</p><p className="text-xs sm:text-sm text-muted-foreground">Present</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 sm:pt-4 flex items-center gap-2 sm:gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/15 flex items-center justify-center flex-shrink-0"><UserX className="h-4 sm:h-5 w-4 sm:w-5 text-destructive" /></div>
              <div><p className="text-lg sm:text-2xl font-bold">{absentCount}</p><p className="text-xs sm:text-sm text-muted-foreground">Absent</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-3 sm:pt-4 flex items-center gap-2 sm:gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center flex-shrink-0"><Clock className="h-4 sm:h-5 w-4 sm:w-5 text-accent" /></div>
              <div><p className="text-lg sm:text-2xl font-bold">{lateCount}</p><p className="text-xs sm:text-sm text-muted-foreground">Late</p></div>
            </CardContent>
          </Card>
          <Card >
            <CardContent className="pt-3 sm:pt-4 flex items-center gap-2 sm:gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0"><Calendar className="h-4 sm:h-5 w-4 sm:w-5 text-primary" /></div>
              <div><p className="text-lg sm:text-2xl font-bold">{selectedDate === today ? "Today" : selectedDate}</p><p className="text-xs sm:text-sm text-muted-foreground">Date</p></div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:flex lg:items-center">
          <div className="relative sm:col-span-2 md:col-span-3 lg:col-span-1 lg:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="h-11 pl-9 lg:h-10" placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {isAdmin && (
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-11 w-full lg:h-10 lg:w-[180px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="dentist">Dentists</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          )}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-11 w-full lg:h-10 lg:w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
              <SelectItem value="late">Late</SelectItem>
              <SelectItem value="half-day">Half Day</SelectItem>
              <SelectItem value="on-leave">On Leave</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="h-11 w-full sm:col-span-2 md:col-span-1 lg:h-10 lg:w-[170px]" />
        </div>

        <Card>
          <CardContent className="p-3 sm:p-0">
            {/* Mobile Card List (< sm) */}
            <div className="sm:hidden space-y-2.5">
              {filtered.map((r) => {
                const formattedDateStr = r.date ? format(parseISO(r.date), "eee, MMM d, yyyy") : "—";
                const durationVal = calculateDuration(r.checkIn, r.checkOut);
                const netDurationVal = Math.max(0, durationVal - (r.breakTime || 0) / 60);
                const formattedDurationStr = r.checkIn && r.checkOut ? formatDuration(netDurationVal) : "—";
                const formattedBreakStr = r.breakTime ? `${r.breakTime}m` : "—";

                return (
                  <div key={`mobile-daily-${r.id}`} className="p-3 rounded-lg border border-border/70 bg-card/60 flex flex-col gap-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {isAdmin && <p className="font-bold text-foreground text-sm">{r.staffName}</p>}
                        {isAdmin && <p className="text-[11px] text-muted-foreground capitalize">{r.role}</p>}
                        <p className={`font-semibold text-foreground ${isAdmin ? "text-xs mt-0.5" : "text-sm"}`}>{formattedDateStr}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColor(r.status)} shrink-0`}>
                        {r.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-1.5 border-t border-border/40">
                      <div>
                        <span>Check In: </span>
                        <span className="font-mono font-medium text-foreground">{formatTimeTo12h(r.checkIn)}</span>
                      </div>
                      <div>
                        <span>Check Out: </span>
                        <span className="font-mono font-medium text-foreground">{formatTimeTo12h(r.checkOut)}</span>
                      </div>
                      <div>
                        <span>Hours: </span>
                        <span className="font-medium text-foreground">{formattedDurationStr}</span>
                      </div>
                      <div>
                        <span>Break: </span>
                        <span className="font-medium text-foreground">{formattedBreakStr}</span>
                      </div>
                    </div>
                    {!isAdmin && (
                      <div className="pt-2 border-t border-border/40 flex justify-end">
                        {!r.checkIn && (
                          <Button variant="outline" size="sm" className="gap-1 h-8 text-xs w-full" onClick={() => handleCheckIn(r.id)}>
                            <LogIn className="h-3.5 w-3.5" /> <span>Check In</span>
                          </Button>
                        )}
                        {r.checkIn && !r.checkOut && (
                          <Button variant="outline" size="sm" className="gap-1 h-8 text-xs w-full" onClick={() => handleCheckOut(r.id)}>
                            <LogOut className="h-3.5 w-3.5" /> <span>Check Out</span>
                          </Button>
                        )}
                        {r.checkIn && r.checkOut && (
                          <span className="text-xs text-muted-foreground font-medium">Completed</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {filtered.length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-xs font-sans">
                  No attendance records found
                </div>
              )}
            </div>

            {/* Desktop Table (>= sm) */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-xs text-left min-w-[800px]">
                <thead>
                  <tr className="border-b bg-muted/30 text-left text-muted-foreground">
                    {isAdmin && <th className="p-3 font-semibold font-sans">Staff</th>}
                    {isAdmin && <th className="p-3 font-semibold font-sans hidden sm:table-cell">Role</th>}
                    <th className="p-3 font-semibold font-sans">Date</th>
                    <th className="p-3 font-semibold font-sans">Check In</th>
                    <th className="p-3 font-semibold font-sans">Check Out</th>
                    <th className="p-3 font-semibold font-sans">Working Hours</th>
                    <th className="p-3 font-semibold font-sans">Break Time</th>
                    <th className="p-3 font-semibold font-sans">Status</th>
                    {!isAdmin && <th className="p-3 font-semibold font-sans text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filtered.map((r) => {
                    const formattedDateStr = r.date ? format(parseISO(r.date), "eee, MMM d, yyyy") : "—";
                    const durationVal = calculateDuration(r.checkIn, r.checkOut);
                    const netDurationVal = Math.max(0, durationVal - (r.breakTime || 0) / 60);
                    const formattedDurationStr = r.checkIn && r.checkOut ? formatDuration(netDurationVal) : "—";
                    const formattedBreakStr = r.breakTime ? `${r.breakTime}m` : "—";

                    return (
                      <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                        {isAdmin && <td className="p-3 font-medium text-foreground font-sans">{r.staffName}</td>}
                        {isAdmin && <td className="p-3 capitalize text-muted-foreground hidden sm:table-cell font-sans">{r.role}</td>}
                        <td className="p-3 font-bold text-foreground font-sans">{formattedDateStr}</td>
                        <td className="p-3 font-mono text-muted-foreground">{formatTimeTo12h(r.checkIn)}</td>
                        <td className="p-3 font-mono text-muted-foreground">{formatTimeTo12h(r.checkOut)}</td>
                        <td className="p-3 font-bold text-foreground font-sans">{formattedDurationStr}</td>
                        <td className="p-3 text-foreground font-semibold font-sans">{formattedBreakStr}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold inline-block ${statusColor(r.status)} font-sans`}>
                            {r.status}
                          </span>
                        </td>
                        {!isAdmin && (
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {!r.checkIn && (
                                <Button variant="outline" size="sm" className="gap-1 h-9 text-xs px-2" onClick={() => handleCheckIn(r.id)} title="Check In">
                                  <LogIn className="h-3.5 w-3.5" /> <span>Check In</span>
                                </Button>
                              )}
                              {r.checkIn && !r.checkOut && (
                                <Button variant="outline" size="sm" className="gap-1 h-9 text-xs px-2" onClick={() => handleCheckOut(r.id)} title="Check Out">
                                  <LogOut className="h-3.5 w-3.5" /> <span>Check Out</span>
                                </Button>
                              )}
                              {r.checkIn && r.checkOut && (
                                <span className="text-xs text-muted-foreground font-medium pr-2">Done</span>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={isAdmin ? 8 : 7} className="p-8 text-center text-muted-foreground font-sans">
                        No attendance records found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}
