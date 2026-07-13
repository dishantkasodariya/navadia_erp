import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import { API_BASE_URL } from '../config/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { calculateDuration, formatDuration } from "@/lib/utils";
import {
  Utensils, LogOut, Play, CheckCircle2, Sparkles, Coffee,
  Timer, Clock, CalendarDays, Users, Phone, Activity,
  ChevronRight, AlertTriangle, TrendingUp, Briefcase, AlertCircle
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ShiftState {
  status: "idle" | "active" | "stepped_out" | "checked_out";
  checkInTimestamp: number | null;
  checkOutTimestamp: number | null;
  breakStartTime: number | null;
  accumulatedBreakTime: number;
  breakCount: number;
  breaks: { start: number; end: number | null; duration: number }[];
  notes: string;
  date: string;
}

interface HistoryRecord {
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  duration: string | null;
  timestamp: number;
}

const statusBadge: Record<string, string> = {
  "Arrived": "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
  "In Chair": "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
  "Confirmed": "bg-primary/10 text-primary border border-primary/20",
  "Scheduled": "bg-muted text-muted-foreground border-border",
  "Completed": "bg-neutral-100 text-neutral-800 border-neutral-200",
  "Cancelled": "bg-red-500/10 text-red-600 border border-red-500/20",
};

const quickLinks = [
  { label: "Appointments", icon: CalendarDays, color: "text-primary bg-primary/10", path: "/staff/appointments" },
  { label: "Leave", icon: Briefcase, color: "text-primary bg-primary/10", path: "/staff/leave-requests" },
  { label: "Messages", icon: Phone, color: "text-secondary bg-secondary/10", path: "/staff/messages" },
];

export default function ReceptionDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const todayDate = new Date().toISOString().split("T")[0];
  const storageKey = `navadia_staff_shift_${user?.id}`;
  const historyKey = `navadia_staff_history_${user?.id}`;

  const getPastDateString = (daysAgo: number) => {
    const d = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const [currentTime, setCurrentTime] = useState(new Date());
  const [shift, setShift] = useState<ShiftState>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.date === todayDate) return parsed;
    }
    return { status: "idle", checkInTimestamp: null, checkOutTimestamp: null, breakStartTime: null, accumulatedBreakTime: 0, breakCount: 0, breaks: [], notes: "", date: todayDate };
  });

  const [history, setHistory] = useState<HistoryRecord[]>(() => {
    const saved = localStorage.getItem(historyKey);
    if (saved) return JSON.parse(saved);
    const mock: HistoryRecord[] = [
      { date: getPastDateString(1), checkIn: "08:58 AM", checkOut: "05:15 PM", duration: "07h 42m 00s", timestamp: Date.now() - 86400000 },
      { date: getPastDateString(2), checkIn: "09:05 AM", checkOut: "05:30 PM", duration: "07h 55m 00s", timestamp: Date.now() - 172800000 },
      { date: getPastDateString(3), checkIn: "09:00 AM", checkOut: "05:00 PM", duration: "07h 30m 00s", timestamp: Date.now() - 259200000 },
      { date: getPastDateString(4), checkIn: "08:45 AM", checkOut: "05:10 PM", duration: "07h 55m 00s", timestamp: Date.now() - 345600000 },
      { date: getPastDateString(5), checkIn: "09:12 AM", checkOut: "05:35 PM", duration: "07h 38m 00s", timestamp: Date.now() - 432000000 },
    ];
    localStorage.setItem(historyKey, JSON.stringify(mock));
    return mock;
  });

  const [lunchDialogOpen, setLunchDialogOpen] = useState(false);
  const [breakReason, setBreakReason] = useState("Lunch Break");
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [handoverNotes, setHandoverNotes] = useState("");
  const [elapsedActiveTime, setElapsedActiveTime] = useState<number>(0);
  const [elapsedBreakTime, setElapsedBreakTime] = useState<number>(0);

  const [clinicSettings, setClinicSettings] = useState<any>(null);
  const [todayStatusInfo, setTodayStatusInfo] = useState<{
    status: "Holiday" | "Weekend" | "Leave" | "Tour" | "Normal";
    name?: string;
  }>({ status: "Normal" });

  const [monthlySummary, setMonthlySummary] = useState<any>({
    presentDays: 0,
    absentDays: 0,
    leaveDays: 0,
    tourDays: 0,
    holidayCount: 0,
    weekendCount: 0,
    totalHoursStr: "00h 00m",
    avgHoursStr: "00h 00m",
    attendanceRate: 0
  });

  const [historyList, setHistoryList] = useState<any[]>([]);
  const [checkoutLatitude, setCheckoutLatitude] = useState<number | undefined>(undefined);
  const [checkoutLongitude, setCheckoutLongitude] = useState<number | undefined>(undefined);

  const [selectedDetailRecord, setSelectedDetailRecord] = useState<any | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const [checkIns, setCheckIns] = useState<any[]>([]);

  useEffect(() => {
    const fetchCheckIns = async () => {
      const token = localStorage.getItem("navadia_token");
      if (!token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/api/appointments?date=${todayDate}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const mapped = data.map((a: any) => ({
            time: a.time,
            patient: a.patient,
            procedure: a.procedure,
            dentist: a.dentist,
            status: a.status === "inChair" ? "In Chair" : a.status.charAt(0).toUpperCase() + a.status.slice(1)
          }));
          setCheckIns(mapped);
        }
      } catch (e) {
        console.warn("Error fetching appointments for receptionist queue:", e);
      }
    };
    fetchCheckIns();
  }, [todayDate]);

  const [taskStats, setTaskStats] = useState({ total: 0, completed: 0, pending: 0 });
  const [attendanceStats, setAttendanceStats] = useState({
    workingDays: "26/24",
    absentPresentLeaveTour: "7/17/0/0",
    totalAverageHours: "132h 39m/07h 48m",
    todayBreak: "0 min",
    todayBreakValue: "--"
  });

  const fetchTodayTasks = async () => {
    const token = localStorage.getItem("navadia_token");
    if (!token || !user) return;
    try {
      const todayDateStr = new Date().toISOString().split("T")[0];
      const res = await fetch(`${API_BASE_URL}/api/tasks?todayDate=${todayDateStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const userTasks = data.filter((t: any) => 
          t.assignedTo === user.id || 
          t.assignedTo === user.email ||
          (!t.assignedTo && t.role?.toLowerCase() === user.role?.toLowerCase()) ||
          (t.isRecurring && t.role?.toLowerCase() === user.role?.toLowerCase())
        );
        const total = userTasks.length;
        const completed = userTasks.filter((t: any) => t.status === "completed").length;
        const pending = userTasks.filter((t: any) => t.status === "pending" || t.status === "in-progress").length;
        setTaskStats({ total, completed, pending });
      }
    } catch (e) {
      console.warn("Failed to fetch today's tasks:", e);
    }
  };

  useEffect(() => {
    fetchTodayTasks();
  }, [user]);

  const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const checkTodayStatus = (settings: any, userLeaves: any[]) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const todayDateObj = new Date();
    
    // 1. Check if today is a Holiday
    if (settings && settings.holidays) {
      const holiday = settings.holidays.find((h: any) => h.date === todayStr);
      if (holiday) {
        return { status: "Holiday" as const, name: holiday.name };
      }
    }

    // 2. Check if today is a Weekend
    const dayOfWeek = todayDateObj.getDay();
    const weekendDays = settings?.weekendDays || [0];
    if (weekendDays.includes(dayOfWeek)) {
      return { status: "Weekend" as const, name: dayOfWeek === 0 ? "Sunday" : "Saturday" };
    }

    // 3. Check approved leaves
    if (userLeaves && userLeaves.length > 0) {
      const activeLeave = userLeaves.find((l: any) => todayStr >= l.startDate && todayStr <= l.endDate);
      if (activeLeave) {
        const isTour = (activeLeave.type || "").toLowerCase().includes("tour");
        return { status: isTour ? "Tour" : "Leave" as const, name: activeLeave.reason };
      }
    }

    return { status: "Normal" as const };
  };

  const fetchAttendanceStats = async () => {
    const token = localStorage.getItem("navadia_token");
    if (!token || !user) return;
    
    let settings = clinicSettings;
    let userLeaves: any[] = [];
    let data: any[] = [];
    let loadFromCache = false;

    try {
      // Fetch clinic settings
      const settingsRes = await fetch(`${API_BASE_URL}/api/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (settingsRes.ok) {
        settings = await settingsRes.json();
        setClinicSettings(settings);
      }

      // Fetch approved leaves
      try {
        const leaveRes = await fetch(`${API_BASE_URL}/api/leave`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (leaveRes.ok) {
          const leaveData = await leaveRes.json();
          userLeaves = leaveData.filter((l: any) => l.userId === user.id && l.status === "Approved");
        }
      } catch (err) {
        console.warn("Failed to fetch leaves for stats:", err);
      }

      // Fetch attendance
      const res = await fetch(`${API_BASE_URL}/api/attendance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.ok) {
        data = await res.json();
        localStorage.setItem("navadia_attendance_raw", JSON.stringify(data));
      } else {
        loadFromCache = true;
      }
    } catch (e) {
      console.warn("Failed to fetch attendance stats from backend, falling back to local cache:", e);
      loadFromCache = true;
    }

    if (loadFromCache) {
      const cached = localStorage.getItem("navadia_attendance_raw");
      if (cached) {
        try {
          data = JSON.parse(cached);
        } catch (err) {
          console.error("Failed to parse cached attendance raw data", err);
        }
      }
    }

    // Now proceed to calculate stats using `data`
    const userRecords = data.filter((r: any) => r.userId === user.id);
    const todayStat = checkTodayStatus(settings, userLeaves);
    setTodayStatusInfo(todayStat);

    const currentMonthStr = new Date().toISOString().slice(0, 7);
    const monthlyRecords = userRecords.filter((r: any) => r.date && r.date.startsWith(currentMonthStr));
    
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const todayDateStr = now.toISOString().split("T")[0];

    let presentCount = 0;
    let absentCount = 0;
    let leaveCount = 0;
    let tourCount = 0;
    let holidayCount = 0;
    let weekendCount = 0;
    let requiredDays = 0;

    const recordsMap = new Map<string, any>();
    monthlyRecords.forEach((r: any) => {
      recordsMap.set(r.date, r);
    });

    const endLimit = lastDay < now ? lastDay : now;

    for (let d = new Date(firstDay); d <= endLimit; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split("T")[0];
      const dayOfWeek = d.getDay();

      const isHoliday = settings?.holidays?.some((h: any) => h.date === dateStr);
      if (isHoliday) {
        holidayCount++;
        continue;
      }

      const isWeekend = (settings?.weekendDays || [0]).includes(dayOfWeek);
      if (isWeekend) {
        weekendCount++;
        continue;
      }

      requiredDays++;

      if (recordsMap.has(dateStr)) {
        const r = recordsMap.get(dateStr);
        const statusStr = (r.status || "").toLowerCase();
        if (statusStr === "present" || statusStr === "late") {
          presentCount++;
        } else if (statusStr === "absent") {
          absentCount++;
        } else if (statusStr === "on leave" || statusStr === "on-leave" || statusStr === "leave") {
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
          if (dateStr < todayDateStr) {
            absentCount++;
          }
        }
      }
    }

    let totalMs = 0;
    let workedDaysWithDuration = 0;
    
    monthlyRecords.forEach((r: any) => {
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

    setAttendanceStats({
      workingDays: `${presentCount}/${requiredDays}`,
      absentPresentLeaveTour: `${absentCount}/${presentCount}/${leaveCount}/${tourCount}`,
      totalAverageHours: `${totalHoursStr}/${avgHoursStr}`,
      todayBreak: "0 min",
      todayBreakValue: "--"
    });

    setMonthlySummary({
      presentDays: presentCount,
      absentDays: absentCount,
      leaveDays: leaveCount,
      tourDays: tourCount,
      holidayCount: holidayCount,
      weekendCount: weekendCount,
      totalHoursStr,
      avgHoursStr,
      attendanceRate: requiredDays > 0 ? Math.round((presentCount / requiredDays) * 100) : 0
    });

    const sortedRecords = [...userRecords].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7);
    setHistoryList(sortedRecords);
  };

  useEffect(() => {
    fetchAttendanceStats();
    
    const handleSync = () => {
      setTimeout(() => fetchAttendanceStats(), 500);
    };
    window.addEventListener('attendance-synced', handleSync);
    return () => window.removeEventListener('attendance-synced', handleSync);
  }, [user]);

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(shift)); }, [shift, storageKey]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (shift.status === "active" && shift.checkInTimestamp) {
      interval = setInterval(() => {
        setElapsedActiveTime(Math.max(0, Date.now() - shift.checkInTimestamp! - shift.accumulatedBreakTime));
      }, 1000);
    } else if (shift.status === "stepped_out" && shift.breakStartTime && shift.checkInTimestamp) {
      interval = setInterval(() => {
        setElapsedActiveTime(Math.max(0, shift.breakStartTime! - shift.checkInTimestamp! - shift.accumulatedBreakTime));
        setElapsedBreakTime(Math.max(0, Date.now() - shift.breakStartTime!));
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [shift]);

  const formatMs = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m ${sec.toString().padStart(2, "0")}s`;
  };

  const getFormattedTime = (ts: number | null) => {
    if (!ts) return "—";
    return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  };

  const handleCheckIn = async () => {
    const token = localStorage.getItem("navadia_token");
    if (!token || !user) return;
    
    let settings = clinicSettings;
    if (!settings) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/settings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          settings = await res.json();
          setClinicSettings(settings);
        }
      } catch (err) {
        console.warn("Failed to fetch settings:", err);
      }
    }

    if (settings && settings.geofencingEnabled) {
      toast({ title: "Verifying Location...", description: "Retrieving browser GPS coordinates." });
      if (!navigator.geolocation) {
        if (settings.gpsVerificationEnabled) {
          toast({
            title: "Check In Blocked ❌",
            description: "Geolocation is not supported by your browser.",
            variant: "destructive"
          });
          return;
        } else {
          await executeCheckIn();
          return;
        }
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          
          if (settings.gpsVerificationEnabled) {
            const dist = getDistanceInMeters(lat, lon, settings.latitude, settings.longitude);
            if (dist > settings.allowedRadius) {
              toast({
                title: "Outside Clinic Geofence ❌",
                description: `You are outside the clinic location (${Math.round(dist)}m away). Allowed radius is ${settings.allowedRadius}m.`,
                variant: "destructive"
              });
              return;
            }
          }

          await executeCheckIn(lat, lon);
        },
        async (error) => {
          if (settings.gpsVerificationEnabled) {
            toast({
              title: "Location Permission Required 📍",
              description: "Please enable your device location to continue.",
              variant: "destructive"
            });
          } else {
            console.warn("Could not retrieve GPS coordinates:", error);
            await executeCheckIn();
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      await executeCheckIn();
    }
  };

  const executeCheckIn = async (latitude?: number, longitude?: number) => {
    const now = Date.now();
    const nowTimeStr = new Date(now).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    const browserInfo = navigator.userAgent;
    const deviceInfo = `${navigator.platform} (${navigator.vendor || 'Unknown Vendor'})`;

    const token = localStorage.getItem("navadia_token");
    let proceedWithCheckIn = false;
    let isOfflineFallback = false;
    let rejectMessage = "";

    if (token && user) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/attendance/check-in`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ 
            userId: user.id, 
            userName: user.name, 
            date: todayDate, 
            checkIn: nowTimeStr, 
            status: nowTimeStr > "09:00" ? "Late" : "Present",
            latitude,
            longitude,
            deviceInfo,
            browserInfo
          })
        });
        if (res.ok) {
          proceedWithCheckIn = true;
        } else {
          const errData = await res.json().catch(() => ({}));
          rejectMessage = errData.message || "Coordinates verification failed or error on server.";
        }
      } catch (e) {
        console.warn("Backend offline during check-in, running offline mode", e);
        proceedWithCheckIn = true;
        isOfflineFallback = true;
      }
    } else {
      proceedWithCheckIn = true;
    }

    if (proceedWithCheckIn) {
      const newShift = { 
        status: "active" as const, 
        checkInTimestamp: now, 
        checkOutTimestamp: null, 
        breakStartTime: null, 
        accumulatedBreakTime: 0, 
        breakCount: 0, 
        breaks: [],
        notes: "", 
        date: todayDate 
      };
      setShift(newShift);
      localStorage.setItem(storageKey, JSON.stringify(newShift));
      
      window.dispatchEvent(new CustomEvent('attendance-synced', { detail: { type: 'check-in', shift: newShift } }));
      toast({ 
        title: isOfflineFallback ? "Shift Started Offline ⚠️" : "Shift Started ✓", 
        description: `Checked in at ${getFormattedTime(now)}. ${isOfflineFallback ? "Saved locally." : ""}` 
      });
      fetchAttendanceStats();
    } else {
      toast({
        title: "Check In Blocked ❌",
        description: rejectMessage,
        variant: "destructive"
      });
    }
  };

  const confirmLunchBreak = async () => {
    const now = Date.now();
    const newBreak = { start: now, end: null, duration: 0, reason: breakReason };
    const updatedShift = {
      ...shift,
      status: "stepped_out" as const,
      breakStartTime: now,
      breakCount: (shift.breakCount || 0) + 1,
      breaks: [...(shift.breaks || []), newBreak]
    };

    // Sync break status with backend in real-time
    const token = localStorage.getItem("navadia_token");
    if (token && user) {
      try {
        const todayDate = new Date().toISOString().split("T")[0];
        await fetch(`${API_BASE_URL}/api/attendance/break`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            userId: user.id,
            date: todayDate,
            status: "On Break",
            breakCount: updatedShift.breakCount,
            breaks: updatedShift.breaks
          })
        });
      } catch (e) {
        console.warn("Failed to sync break status with backend:", e);
      }
    }

    setShift(updatedShift);
    localStorage.setItem(storageKey, JSON.stringify(updatedShift));
    setLunchDialogOpen(false);
    toast({ title: "Break Started", description: "Enjoy your break! 🍽️" });
  };

  const confirmResumeDuty = async () => {
    const now = Date.now();
    const breakStart = shift.breakStartTime || now;
    const durationMin = Math.round((now - breakStart) / 60000);
    
    const updatedBreaks = [...(shift.breaks || [])];
    if (updatedBreaks.length > 0) {
      updatedBreaks[updatedBreaks.length - 1] = {
        ...updatedBreaks[updatedBreaks.length - 1],
        end: now,
        duration: durationMin
      };
    }

    const updatedShift = {
      ...shift,
      status: "active" as const,
      breakStartTime: null,
      accumulatedBreakTime: (shift.accumulatedBreakTime || 0) + (now - breakStart),
      breaks: updatedBreaks
    };

    // Sync break resume status with backend in real-time
    const token = localStorage.getItem("navadia_token");
    if (token && user) {
      try {
        const todayDate = new Date().toISOString().split("T")[0];
        await fetch(`${API_BASE_URL}/api/attendance/break`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            userId: user.id,
            date: todayDate,
            status: "Present",
            breakTime: Math.round(updatedShift.accumulatedBreakTime / 60000),
            breakCount: updatedShift.breakCount,
            breaks: updatedShift.breaks
          })
        });
      } catch (e) {
        console.warn("Failed to sync break resume status with backend:", e);
      }
    }

    setShift(updatedShift);
    localStorage.setItem(storageKey, JSON.stringify(updatedShift));
    setResumeDialogOpen(false);
    toast({ title: "Shift Resumed", description: "Welcome back to duty! 💪" });
  };

  const handleResumeDuty = () => {
    setResumeDialogOpen(true);
  };

  const handleCheckOut = async () => {
    const token = localStorage.getItem("navadia_token");
    if (!token || !user) return;
    
    let settings = clinicSettings;
    if (!settings) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/settings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          settings = await res.json();
          setClinicSettings(settings);
        }
      } catch (err) {
        console.warn("Failed to fetch settings:", err);
      }
    }

    if (settings && settings.geofencingEnabled) {
      toast({ title: "Verifying Location...", description: "Retrieving browser GPS coordinates." });
      if (!navigator.geolocation) {
        if (settings.gpsVerificationEnabled) {
          toast({
            title: "Check Out Blocked ❌",
            description: "Geolocation is not supported by your browser.",
            variant: "destructive"
          });
          return;
        } else {
          setCheckoutLatitude(undefined);
          setCheckoutLongitude(undefined);
          setCheckoutDialogOpen(true);
          return;
        }
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          
          if (settings.gpsVerificationEnabled) {
            const dist = getDistanceInMeters(lat, lon, settings.latitude, settings.longitude);
            if (dist > settings.allowedRadius) {
              toast({
                title: "Outside Clinic Geofence ❌",
                description: `You are outside the clinic location (${Math.round(dist)}m away). Allowed radius is ${settings.allowedRadius}m.`,
                variant: "destructive"
              });
              return;
            }
          }

          setCheckoutLatitude(lat);
          setCheckoutLongitude(lon);
          setCheckoutDialogOpen(true);
        },
        async (error) => {
          if (settings.gpsVerificationEnabled) {
            toast({
              title: "Location Permission Required 📍",
              description: "Please enable your device location to check out.",
              variant: "destructive"
            });
          } else {
            console.warn("Could not retrieve GPS coordinates:", error);
            setCheckoutLatitude(undefined);
            setCheckoutLongitude(undefined);
            setCheckoutDialogOpen(true);
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setCheckoutLatitude(undefined);
      setCheckoutLongitude(undefined);
      setCheckoutDialogOpen(true);
    }
  };

  const confirmCheckOut = async () => {
    const now = Date.now();
    const nowTimeStr = new Date(now).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    
    const workDurationMs = now - shift.checkInTimestamp! - shift.accumulatedBreakTime;
    const breakTimeMins = Math.round(shift.accumulatedBreakTime / 60000);
    const workHoursMins = Math.round(workDurationMs / 60000);
    
    const overtimeMins = Math.max(0, workHoursMins - 480);

    const token = localStorage.getItem("navadia_token");
    let proceedWithCheckOut = false;
    let isOfflineFallback = false;
    let rejectMessage = "";

    if (token && user) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/attendance/check-out`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            userId: user.id,
            date: todayDate,
            checkOut: nowTimeStr,
            status: "Present",
            breakTime: breakTimeMins,
            latitude: checkoutLatitude,
            longitude: checkoutLongitude,
            workingHours: workHoursMins,
            overtime: overtimeMins,
            breakCount: shift.breakCount,
            breaks: shift.breaks
          })
        });
        if (res.ok) {
          proceedWithCheckOut = true;
        } else {
          const errData = await res.json().catch(() => ({}));
          rejectMessage = errData.message || "Check out coordinates verification failed or error on server.";
        }
      } catch (e) {
        console.warn("Check-out post failed, running offline fallback mode", e);
        proceedWithCheckOut = true;
        isOfflineFallback = true;
      }
    } else {
      proceedWithCheckOut = true;
    }

    if (proceedWithCheckOut) {
      const updatedShift = {
        ...shift,
        status: "checked_out" as const,
        checkOutTimestamp: now,
        notes: handoverNotes
      };
      setShift(updatedShift);
      localStorage.setItem(storageKey, JSON.stringify(updatedShift));
      
      window.dispatchEvent(new CustomEvent('attendance-synced', { detail: { type: 'check-out', shift: updatedShift } }));
      toast({ 
        title: isOfflineFallback ? "Shift Completed Offline ⚠️" : "Shift Completed ✓", 
        description: `Checked out at ${getFormattedTime(now)}. ${isOfflineFallback ? "Saved locally." : ""}` 
      });
      setCheckoutDialogOpen(false);
      fetchAttendanceStats();
    } else {
      toast({
        title: "Check Out Blocked ❌",
        description: rejectMessage,
        variant: "destructive"
      });
    }
  };

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const shiftProgress = shift.checkInTimestamp ? Math.min(100, (elapsedActiveTime / (9 * 3600 * 1000)) * 100) : 0;

  const [workedDaysVal, requiredDaysVal] = attendanceStats.workingDays.split("/");
  const [absentDaysVal, presentDaysVal, leaveDaysVal, tourDaysVal] = attendanceStats.absentPresentLeaveTour.split("/");
  const [totalHoursStr, avgHoursStr] = attendanceStats.totalAverageHours.split("/");

  const todayBreakMin = Math.floor(shift.accumulatedBreakTime / (60 * 1000)) + 
    (shift.status === "stepped_out" && shift.breakStartTime ? Math.floor(elapsedBreakTime / (60 * 1000)) : 0);

  const formattedDate = currentTime.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const formatTimeTo12h = (time24: string | null) => {
    if (!time24) return "—";
    if (time24.includes("AM") || time24.includes("PM")) return time24;
    const parts = time24.split(":");
    if (parts.length < 2) return time24;
    const h = parseInt(parts[0], 10);
    const m = parts[1];
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12.toString().padStart(2, "0")}:${m} ${ampm}`;
  };

  const statusHeaderColor = 
    shift.status === "active" ? "bg-emerald-600" :
    shift.status === "stepped_out" ? "bg-amber-500" :
    "bg-secondary";
  
  const statusHeaderText = 
    shift.status === "active" ? "Active" :
    shift.status === "stepped_out" ? "On Break" :
    shift.status === "checked_out" ? "Checked Out" :
    "Not Checked In";

  return (
    <div className="space-y-6">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse-ring { 0%{transform:scale(0.9);opacity:0.8} 70%{transform:scale(1.3);opacity:0} 100%{transform:scale(1.3);opacity:0} }
        @keyframes tick-glow { 0%,100%{text-shadow:0 0 8px rgba(217,147,33,0.3)} 50%{text-shadow:0 0 20px rgba(217,147,33,0.6)} }
        .fade-up { animation: fadeUp 0.4s ease both; }
        .tick-glow { animation: tick-glow 1s ease-in-out infinite; }
      ` }} />

      {/* ─── GREETING HEADER ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-0.5 fade-up">
        <p className="text-muted-foreground text-sm font-normal">Welcome back,</p>
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground font-serif">
          {user?.name}
        </h1>
      </div>

      {/* ─── MAIN GRID ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── LEFT COLUMN: SHIFT, TASKS & QUICK ACCESS ── */}
        <div className="lg:col-span-1 space-y-6">
          {/* Shift Control Check-In Widget */}
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden fade-up">
            <div className={`px-4 py-3 flex items-center justify-between text-white ${statusHeaderColor} transition-colors duration-300`}>
              <div className="flex items-center gap-2">
                <Clock className="h-4.5 w-4.5 animate-pulse" />
                <span className="text-sm font-semibold tracking-wide">{statusHeaderText}</span>
              </div>
              <span className="text-xs font-medium opacity-90">{formattedDate}</span>
            </div>
            
            <div className="p-6">
              <div className="flex flex-col items-center justify-center space-y-4">
                {/* Check In Info */}
                <div className="text-center">
                  <span className="text-xs font-semibold text-muted-foreground">Check In: </span>
                  <span className="text-sm font-bold text-foreground">
                    {shift.status === "idle" ? "--:--" : getFormattedTime(shift.checkInTimestamp)}
                  </span>
                </div>

                {/* Clock / Dial Counter */}
                <div className="relative flex items-center justify-center w-40 h-40 rounded-full border-4 border-dashed border-primary/30 bg-primary/5 shadow-inner">
                  {/* Dynamic Ring or Glowing circle */}
                  <div className="absolute inset-2 rounded-full border border-primary/10" />
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-primary font-mono tracking-wider">
                      {shift.status === "idle" ? "00:00:00" : 
                       shift.status === "checked_out" ? formatMs(shift.checkOutTimestamp! - shift.checkInTimestamp! - shift.accumulatedBreakTime).replace("h", ":").replace("m", ":").replace("s", "").replace(/ /g, "") :
                       formatMs(elapsedActiveTime).replace("h", ":").replace("m", ":").replace("s", "").replace(/ /g, "")}
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">Active Time</span>
                  </div>
                </div>

                {/* Break Tracker Display */}
                {shift.status !== "idle" && (
                  <div className="w-full grid grid-cols-2 gap-2 mt-2 pt-2 border-t">
                    <div className="text-center">
                      <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Break Duration</span>
                      <span className={`text-xs font-mono font-bold ${shift.status === "stepped_out" ? "text-amber-500 animate-pulse" : "text-neutral-500"}`}>
                        {formatMs(shift.accumulatedBreakTime + (shift.status === "stepped_out" ? elapsedBreakTime : 0)).replace("h", ":").replace("m", ":").replace("s", "").replace(/ /g, "")}
                      </span>
                    </div>
                    <div className="text-center border-l">
                      <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Breaks Taken</span>
                      <span className="text-xs font-mono font-bold text-neutral-600 dark:text-neutral-400">
                        {shift.breakCount || 0}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Actions Slot */}
              <div className="text-center mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800">
                {todayStatusInfo.status !== "Normal" ? (
                  <div className="py-3 px-4 rounded-lg bg-amber-500/5 border border-amber-500/10 text-neutral-800 dark:text-neutral-200">
                    <p className="text-sm font-extrabold text-amber-600 dark:text-amber-400 capitalize">{todayStatusInfo.status}</p>
                    <p className="text-xs text-neutral-400 mt-1">
                      {todayStatusInfo.status === "Holiday" ? `Clinic Holiday: ${todayStatusInfo.name}` :
                       todayStatusInfo.status === "Weekend" ? `Weekend Day Off` :
                       todayStatusInfo.status === "Leave" ? `Approved Leave: ${todayStatusInfo.name}` :
                       `Business Tour Assigned`}
                    </p>
                    <p className="text-[10px] text-neutral-400/80 mt-1 font-sans">Attendance marked automatically</p>
                  </div>
                ) : (
                  <>
                    {shift.status === "idle" && (
                      <Button 
                        onClick={handleCheckIn} 
                        className="w-full h-10 bg-yellow-500 hover:bg-yellow-600 text-neutral-900 rounded-lg font-bold text-sm shadow-sm gap-2"
                      >
                        <Play className="h-4 w-4 fill-current" /> Start Shift
                      </Button>
                    )}

                    {shift.status === "active" && (
                      <div className="grid grid-cols-2 gap-3">
                        <Button 
                          variant="outline" 
                          onClick={() => setLunchDialogOpen(true)} 
                          className="h-10 rounded-lg border-amber-200 text-amber-600 hover:bg-amber-50 text-xs font-semibold gap-1.5 dark:border-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-950/20"
                        >
                          <Coffee className="h-4 w-4" /> Break
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={handleCheckOut} 
                          className="h-10 rounded-lg border-red-200 text-red-500 hover:bg-red-50 text-xs font-semibold gap-1.5 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-950/20"
                        >
                          <LogOut className="h-4 w-4" /> Check Out
                        </Button>
                      </div>
                    )}

                    {shift.status === "stepped_out" && (
                      <div className="flex flex-col gap-2">
                        <Button 
                          onClick={handleResumeDuty} 
                          className="w-full h-10 bg-yellow-500 hover:bg-yellow-600 text-neutral-900 rounded-lg font-bold text-sm shadow-sm gap-1.5"
                        >
                          <Sparkles className="h-4 w-4" /> Resume Duty
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={handleCheckOut} 
                          className="w-full h-10 border-red-200 text-red-500 hover:bg-red-50 text-xs font-semibold gap-1.5 dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-950/20"
                        >
                          <LogOut className="h-4 w-4" /> Check Out
                        </Button>
                      </div>
                    )}

                    {shift.status === "checked_out" && (
                      <div className="py-2">
                        <p className="text-sm font-semibold text-emerald-600">Shift Completed</p>
                        <p className="text-xs text-neutral-400 mt-0.5">Good work today!</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Today's Tasks Summary Widget */}
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-5 fade-up">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <span className="text-sm font-bold text-foreground font-serif">Today's Tasks</span>
              <Link 
                to="/staff/tasks" 
                className="text-xs font-semibold text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
              >
                Overview
              </Link>
            </div>
            
            <div className="flex justify-between items-center py-2 text-center">
              {/* Total Tasks */}
              <div className="flex-1 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-neutral-800 dark:text-neutral-100 font-sans">{taskStats.total}</span>
                <span className="text-xs text-muted-foreground mt-1 font-semibold">Total Tasks</span>
              </div>
              
              {/* Divider */}
              <div className="w-[1px] h-10 bg-neutral-200/60 dark:bg-neutral-800" />
              
              {/* Completed */}
              <div className="flex-1 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-emerald-500 font-sans">{taskStats.completed}</span>
                <span className="text-xs text-muted-foreground mt-1 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Completed
                </span>
              </div>
              
              {/* Divider */}
              <div className="w-[1px] h-10 bg-neutral-200/60 dark:bg-neutral-800" />
              
              {/* Pending */}
              <div className="flex-1 flex flex-col items-center justify-center">
                <span className="text-3xl font-extrabold text-orange-500 font-sans">{taskStats.pending}</span>
                <span className="text-xs text-muted-foreground mt-1 font-semibold flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-orange-500" /> Pending
                </span>
              </div>
            </div>
          </div>

          {/* Quick Access Card */}
          <div className="bg-card text-card-foreground border rounded-xl p-5 shadow-sm fade-up">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 font-serif">Quick Access</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {quickLinks.map(link => (
                <Link
                  key={link.label}
                  to={link.path}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted/50 border hover:border-border transition-all duration-200 text-center"
                >
                  <div className={`p-2 rounded-lg ${link.color}`}>
                    <link.icon className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">{link.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: ATTENDANCE STATS & patient arrivals ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Ticking Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-4 border shadow-sm flex flex-col justify-center items-center">
              <span className="text-xs font-bold text-muted-foreground font-serif tracking-normal mb-1.5 text-center">Today's Working Time</span>
              <span className="text-2xl font-extrabold text-primary font-mono tracking-tight">
                {shift.status === "idle" ? "00h 00m 00s" : 
                 shift.status === "checked_out" ? formatMs(shift.checkOutTimestamp! - shift.checkInTimestamp! - shift.accumulatedBreakTime) :
                 formatMs(elapsedActiveTime)}
              </span>
            </Card>
            <Card className="p-4 border shadow-sm flex flex-col justify-center items-center">
              <span className="text-xs font-bold text-muted-foreground font-serif tracking-normal mb-1.5 text-center">Today's Break Time</span>
              <span className="text-2xl font-extrabold text-amber-500 font-mono tracking-tight">
                {shift.status === "idle" ? "00h 00m 00s" : 
                 formatMs(shift.accumulatedBreakTime + (shift.status === "stepped_out" ? elapsedBreakTime : 0))}
              </span>
            </Card>
            <Card className="p-4 border shadow-sm flex flex-col justify-center items-center">
              <span className="text-xs font-bold text-muted-foreground font-serif tracking-normal mb-1.5 text-center">Today's Overtime</span>
              <span className="text-2xl font-black text-purple-600 font-mono tracking-tight">
                {shift.status === "idle" ? "00h 00m 00s" : 
                 (shift.status === "checked_out" ? 
                   ((shift.checkOutTimestamp! - shift.checkInTimestamp! - shift.accumulatedBreakTime) > 8 * 3600 * 1000 ? 
                     formatMs(shift.checkOutTimestamp! - shift.checkInTimestamp! - shift.accumulatedBreakTime - 8 * 3600 * 1000) : "00h 00m 00s") :
                   (elapsedActiveTime > 8 * 3600 * 1000 ? formatMs(elapsedActiveTime - 8 * 3600 * 1000) : "00h 00m 00s")
                 )}
              </span>
            </Card>
          </div>

          {/* Monthly Attendance Breakdown Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-card text-card-foreground border rounded-xl p-4 flex flex-col items-center justify-center shadow-sm">
              <span className="text-xs font-bold text-muted-foreground font-serif tracking-normal mb-1.5 text-center">Present Days</span>
              <span className="text-2xl font-black text-emerald-500 font-sans">{monthlySummary.presentDays}</span>
            </div>
            <div className="bg-card text-card-foreground border rounded-xl p-4 flex flex-col items-center justify-center shadow-sm">
              <span className="text-xs font-bold text-muted-foreground font-serif tracking-normal mb-1.5 text-center">Absent Days</span>
              <span className="text-2xl font-black text-red-500 font-sans">{monthlySummary.absentDays}</span>
            </div>
            <div className="bg-card text-card-foreground border rounded-xl p-4 flex flex-col items-center justify-center shadow-sm">
              <span className="text-xs font-bold text-muted-foreground font-serif tracking-normal mb-1.5 text-center">Leave Days</span>
              <span className="text-2xl font-black text-blue-500 font-sans">{monthlySummary.leaveDays}</span>
            </div>
            <div className="bg-card text-card-foreground border rounded-xl p-4 flex flex-col items-center justify-center shadow-sm">
              <span className="text-xs font-bold text-muted-foreground font-serif tracking-normal mb-1.5 text-center">Tour Days</span>
              <span className="text-2xl font-black text-purple-500 font-sans">{monthlySummary.tourDays}</span>
            </div>
            <div className="bg-card text-card-foreground border rounded-xl p-4 flex flex-col items-center justify-center shadow-sm">
              <span className="text-xs font-bold text-muted-foreground font-serif tracking-normal mb-1.5 text-center">Holidays</span>
              <span className="text-2xl font-black text-amber-600 font-sans">{monthlySummary.holidayCount}</span>
            </div>
            <div className="bg-card text-card-foreground border rounded-xl p-4 flex flex-col items-center justify-center shadow-sm">
              <span className="text-xs font-bold text-muted-foreground font-serif tracking-normal mb-1.5 text-center">Weekends</span>
              <span className="text-2xl font-black text-neutral-500 font-sans">{monthlySummary.weekendCount}</span>
            </div>
            <div className="bg-card text-card-foreground border rounded-xl p-4 flex flex-col items-center justify-center shadow-sm">
              <span className="text-xs font-bold text-muted-foreground font-serif tracking-normal mb-1.5 text-center">Total Monthly Hours</span>
              <span className="text-sm font-black text-foreground font-mono">{monthlySummary.totalHoursStr}</span>
            </div>
            <div className="bg-card text-card-foreground border rounded-xl p-4 flex flex-col items-center justify-center shadow-sm">
              <span className="text-xs font-bold text-muted-foreground font-serif tracking-normal mb-1.5 text-center">Average Daily Hours</span>
              <span className="text-sm font-bold text-foreground font-mono">{monthlySummary.avgHoursStr}</span>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col items-center justify-center shadow-sm col-span-2 sm:col-span-1">
              <span className="text-xs font-bold text-primary font-serif tracking-normal mb-1.5 text-center">Attendance Percentage</span>
              <span className="text-2xl font-extrabold text-primary font-sans">{monthlySummary.attendanceRate}%</span>
            </div>
          </div>

          {/* Patient arrivals */}
          <Card className="bg-white dark:bg-neutral-900/50 border border-neutral-200/60 dark:border-neutral-800 shadow-sm rounded-xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <CalendarDays className="h-4.5 w-4.5" />
                </div>
                <div>
                  <CardTitle className="text-sm font-bold text-neutral-800 dark:text-neutral-200">Patient Queue</CardTitle>
                  <p className="text-xs text-neutral-400 mt-0.5 font-normal">Track arrivals & chair assignments</p>
                </div>
              </div>
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                {checkIns.filter(c => c.status === "Arrived" || c.status === "In Chair").length} Arrived
              </Badge>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="divide-y divide-neutral-200/60 dark:divide-neutral-800/60">
                {checkIns.length === 0 ? (
                  <p className="text-center text-muted-foreground text-sm py-8">No patient arrivals recorded for today.</p>
                ) : (
                  checkIns.map((c, idx) => (
                    <div key={idx} className="group flex items-center justify-between py-3.5 hover:bg-neutral-50/40 dark:hover:bg-neutral-900/40 transition-colors first:pt-0 last:pb-0">
                      <div className="flex items-center gap-4">
                        <div className="text-center shrink-0 w-14">
                          <p className="text-sm font-sans font-bold text-neutral-700 dark:text-neutral-300">{c.time}</p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                          {c.patient.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{c.patient}</p>
                          <p className="text-xs text-muted-foreground">{c.procedure} · <span className="font-medium text-foreground">{c.dentist}</span></p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${statusBadge[c.status] || "bg-muted text-muted-foreground"}`}>
                          {c.status}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── DIALOGS ─────────────────────────────────────────────────────── */}
      <Dialog open={lunchDialogOpen} onOpenChange={setLunchDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader className="flex flex-col items-center text-center space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 flex items-center justify-center text-amber-500">
              <Utensils className="h-7 w-7" />
            </div>
            <DialogTitle className="text-xl font-bold font-sans">Start Break</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-sans">Are you sure you want to start your break?</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-sans">Reason for leaving clinic</label>
            <Select value={breakReason} onValueChange={setBreakReason}>
              <SelectTrigger className="h-10 text-sm rounded-xl">
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Lunch Break">Lunch Break 🍽️</SelectItem>
                <SelectItem value="Stepped Out / Personal">Stepped Out (Personal) 🚶</SelectItem>
                <SelectItem value="Official Clinic Business">Official Clinic Duty 💼</SelectItem>
                <SelectItem value="Emergency">Emergency 🚨</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-center mt-2">
            <Button variant="outline" onClick={() => setLunchDialogOpen(false)} className="flex-1 rounded-xl font-sans">Cancel</Button>
            <Button onClick={confirmLunchBreak} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-sans font-bold">Start Break</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resumeDialogOpen} onOpenChange={setResumeDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader className="flex flex-col items-center text-center space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 flex items-center justify-center text-emerald-500">
              <Play className="h-7 w-7" />
            </div>
            <DialogTitle className="text-xl font-bold font-sans">Resume Work</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-sans">Do you want to resume your work?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-center mt-2">
            <Button variant="outline" onClick={() => setResumeDialogOpen(false)} className="flex-1 rounded-xl font-sans">Cancel</Button>
            <Button onClick={confirmResumeDuty} className="flex-1 bg-emerald-550 hover:bg-emerald-600 text-white rounded-xl font-sans font-bold">Resume</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader className="flex flex-col items-center text-center space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-100 flex items-center justify-center text-red-500">
              <LogOut className="h-7 w-7" />
            </div>
            <DialogTitle className="text-xl font-bold font-sans">Confirm Check Out</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground max-w-xs font-sans">Today's attendance will be completed. Are you sure?</DialogDescription>
          </DialogHeader>
          <div className="my-2 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide font-sans">Clock In</p>
                <p className="text-sm font-sans font-bold mt-1">{getFormattedTime(shift.checkInTimestamp)}</p>
              </div>
              <div className="bg-primary/5 rounded-xl p-3 border border-primary/15">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide font-sans">Duration</p>
                <p className="text-sm font-sans font-bold text-primary mt-1">{formatMs(elapsedActiveTime).split(" ").slice(0,2).join(" ")}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground font-sans">Handover Notes (Optional)</label>
              <Textarea placeholder="Pending cases, lab work, equipment notes..." value={handoverNotes} onChange={(e) => setHandoverNotes(e.target.value)} className="text-xs h-20 rounded-xl resize-none font-sans" />
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-center">
            <Button variant="outline" onClick={() => setCheckoutDialogOpen(false)} className="flex-1 rounded-xl font-sans">Cancel</Button>
            <Button onClick={confirmCheckOut} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl font-sans font-bold">Check Out</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attendance Details Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl rounded-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 font-sans">
              <Activity className="h-5 w-5 text-primary" /> Attendance Record Details
            </DialogTitle>
            <DialogDescription className="font-sans">
              Detailed logs and audits for {user?.name} on {selectedDetailRecord?.date}
            </DialogDescription>
          </DialogHeader>

          {selectedDetailRecord && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 text-sm font-sans">
              <div className="space-y-4 border-r border-neutral-100 dark:border-neutral-800 pr-0 md:pr-6">
                <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-400 font-sans">Work Metrics</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/40 p-3 rounded-xl text-center">
                    <span className="block text-[10px] text-muted-foreground font-semibold font-sans">Check In</span>
                    <span className="text-sm font-bold mt-1 inline-block font-mono">{selectedDetailRecord.checkIn ? formatTimeTo12h(selectedDetailRecord.checkIn) : "—"}</span>
                  </div>
                  <div className="bg-muted/40 p-3 rounded-xl text-center">
                    <span className="block text-[10px] text-muted-foreground font-semibold font-sans">Check Out</span>
                    <span className="text-sm font-bold mt-1 inline-block font-mono">{selectedDetailRecord.checkOut ? formatTimeTo12h(selectedDetailRecord.checkOut) : "—"}</span>
                  </div>
                  <div className="bg-muted/40 p-3 rounded-xl text-center">
                    <span className="block text-[10px] text-muted-foreground font-semibold font-sans">Working Time</span>
                    <span className="text-sm font-bold mt-1 inline-block font-mono">{selectedDetailRecord.workingHours ? formatMs(selectedDetailRecord.workingHours * 60 * 1000).replace("s", "").trim() : "—"}</span>
                  </div>
                  <div className="bg-muted/40 p-3 rounded-xl text-center">
                    <span className="block text-[10px] text-muted-foreground font-semibold font-sans">Break Time</span>
                    <span className="text-sm font-bold mt-1 inline-block font-mono">{selectedDetailRecord.breakTime ? `${selectedDetailRecord.breakTime}m` : "—"}</span>
                  </div>
                  <div className="bg-muted/40 p-3 rounded-xl text-center col-span-2">
                    <span className="block text-[10px] text-muted-foreground font-semibold font-sans">Overtime</span>
                    <span className="text-sm font-bold mt-1 inline-block text-purple-600 font-mono">{selectedDetailRecord.overtime ? formatMs(selectedDetailRecord.overtime * 60 * 1000).replace("s", "").trim() : "00h 00m"}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-xs uppercase tracking-wider text-neutral-400 font-sans">Verification & Logs</h4>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground font-medium font-sans">GPS Verification</span>
                    <span className={`text-xs font-bold font-sans ${selectedDetailRecord.locationVerified !== false ? "text-emerald-600" : "text-red-500"}`}>
                      {selectedDetailRecord.locationVerified !== false ? "Verified Inside Geofence" : "Location Failed / Override"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground font-medium font-sans">Coordinates (In)</span>
                    <span className="text-xs font-mono">{selectedDetailRecord.checkInLatitude ? `${selectedDetailRecord.checkInLatitude.toFixed(5)}, ${selectedDetailRecord.checkInLongitude?.toFixed(5)}` : "—"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground font-medium font-sans">Coordinates (Out)</span>
                    <span className="text-xs font-mono">{selectedDetailRecord.checkOutLatitude ? `${selectedDetailRecord.checkOutLatitude.toFixed(5)}, ${selectedDetailRecord.checkOutLongitude?.toFixed(5)}` : "—"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground font-medium font-sans">IP Address</span>
                    <span className="text-xs font-mono text-neutral-600 dark:text-neutral-400">{selectedDetailRecord.ipAddress || "—"}</span>
                  </div>
                  <div className="flex justify-between flex-col gap-1">
                    <span className="text-xs text-muted-foreground font-medium font-sans">Device & Browser Info</span>
                    <span className="text-[10px] bg-muted/40 p-2 rounded-lg leading-relaxed text-neutral-500 block truncate max-w-full font-mono" title={selectedDetailRecord.deviceInfo || selectedDetailRecord.browserInfo}>
                      {selectedDetailRecord.deviceInfo || selectedDetailRecord.browserInfo || "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-4 pt-4 border-t">
            <Button onClick={() => setDetailModalOpen(false)} className="w-full font-sans">Close Details</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
