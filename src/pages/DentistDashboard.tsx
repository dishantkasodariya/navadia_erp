import { useState, useEffect } from "react";

import { API_BASE_URL } from '../config/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarDays, Clock, Stethoscope, Utensils, LogOut, Play,
  CheckCircle2, Sparkles, Coffee, Timer, ChevronRight, Activity, 
  UserCheck, XCircle, RotateCcw, TrendingUp
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface ShiftState {
  status: "idle" | "active" | "stepped_out" | "checked_out";
  checkInTimestamp: number | null;
  checkOutTimestamp: number | null;
  breakStartTime: number | null;
  accumulatedBreakTime: number;
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

const myAppointments = [
  { time: "09:30 AM", patient: "Rajesh Patel", procedure: "Root Canal Therapy", status: "Confirmed" },
  { time: "11:00 AM", patient: "Priya Shah", procedure: "Dental Crown Fitting", status: "In Chair" },
  { time: "02:00 PM", patient: "Amit Mehta", procedure: "Teeth Whitening", status: "Confirmed" },
  { time: "04:15 PM", patient: "Sneha Reddy", procedure: "Routine Prophylaxis", status: "Pending" },
];

const statusStyle: Record<string, string> = {
  "In Chair": "bg-emerald-500/15 text-emerald-600 border border-emerald-500/20",
  "Confirmed": "bg-primary/10 text-primary border border-primary/20",
  "Pending": "bg-amber-500/10 text-amber-600 border border-amber-500/20",
};

export default function DentistDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();

  const todayDate = new Date().toISOString().split("T")[0];
  const storageKey = `navadia_dentist_shift_${user?.id}`;
  const historyKey = `navadia_dentist_history_${user?.id}`;

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
    return { status: "idle", checkInTimestamp: null, checkOutTimestamp: null, breakStartTime: null, accumulatedBreakTime: 0, notes: "", date: todayDate };
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
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [handoverNotes, setHandoverNotes] = useState("");
  const [elapsedActiveTime, setElapsedActiveTime] = useState<number>(0);
  const [elapsedBreakTime, setElapsedBreakTime] = useState<number>(0);

  useEffect(() => { localStorage.setItem(storageKey, JSON.stringify(shift)); }, [shift, storageKey]);

  // Sync with Attendance page - listen for changes from Attendance feature
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === storageKey && e.newValue) {
        try {
          const newShift = JSON.parse(e.newValue);
          setShift(newShift);
        } catch (err) {
          console.warn('Failed to parse shift state from storage');
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [storageKey]);

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

  const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();

  const handleCheckIn = async () => {
    const now = Date.now();
    const nowTimeStr = new Date(now).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    const newShift = { status: "active" as const, checkInTimestamp: now, checkOutTimestamp: null, breakStartTime: null, accumulatedBreakTime: 0, notes: "", date: todayDate };
    setShift(newShift);
    // Broadcast to other tabs/windows
    window.dispatchEvent(new CustomEvent('attendance-synced', { detail: { type: 'check-in', shift: newShift } }));
    toast({ title: "Shift Started ✓", description: `Checked in at ${getFormattedTime(now)}. Have a great day!` });
    const token = localStorage.getItem("navadia_token");
    if (token && user) {
      try {
        await fetch("${API_BASE_URL}/api/attendance/check-in", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ userId: user.id, userName: user.name, date: todayDate, checkIn: nowTimeStr, status: nowTimeStr > "09:00" ? "Late" : "Present" })
        });
      } catch (e) { console.warn("Backend offline"); }
    }
  };

  const confirmLunchBreak = () => {
    setShift(prev => ({ ...prev, status: "stepped_out", breakStartTime: Date.now() }));
    setLunchDialogOpen(false);
    toast({ title: "Break Started", description: "Enjoy your break! 🍽️" });
  };

  const handleResumeDuty = () => {
    const now = Date.now();
    if (shift.breakStartTime) {
      setShift(prev => ({ ...prev, status: "active", accumulatedBreakTime: prev.accumulatedBreakTime + (now - prev.breakStartTime!), breakStartTime: null }));
      setElapsedBreakTime(0);
      toast({ title: "Welcome Back! 👋", description: "Break ended. You're back on duty." });
    }
  };

  const confirmCheckOut = async () => {
    const now = Date.now();
    const nowTimeStr = new Date(now).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    const durationStr = formatMs(now - shift.checkInTimestamp! - shift.accumulatedBreakTime);
    const newShift = { status: "checked_out" as const, checkInTimestamp: shift.checkInTimestamp, checkOutTimestamp: now, breakStartTime: null, accumulatedBreakTime: shift.accumulatedBreakTime, notes: handoverNotes, date: todayDate };
    setShift(newShift);
    // Broadcast to other tabs/windows
    window.dispatchEvent(new CustomEvent('attendance-synced', { detail: { type: 'check-out', shift: newShift } }));
    setCheckoutDialogOpen(false);
    const todayRecord: HistoryRecord = {
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " (Today)",
      checkIn: getFormattedTime(shift.checkInTimestamp),
      checkOut: getFormattedTime(now),
      duration: durationStr,
      timestamp: now
    };
    const updatedHistory = [todayRecord, ...history.filter(h => !h.date.includes("Today"))].slice(0, 5);
    localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
    setHistory(updatedHistory);
    toast({ title: "Shift Complete 🎉", description: "Great work today! Logs saved." });
    const token = localStorage.getItem("navadia_token");
    if (token && user) {
      try {
        await fetch("${API_BASE_URL}/api/attendance/check-out", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ userId: user.id, date: todayDate, checkOut: nowTimeStr })
        });
      } catch (e) { console.warn("Backend offline"); }
    }
  };

  const shiftProgress = shift.checkInTimestamp
    ? Math.min(100, (elapsedActiveTime / (9 * 3600 * 1000)) * 100)
    : 0;

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <div className="space-y-6 font-sans">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse-ring { 0%{transform:scale(0.9);opacity:0.8} 70%{transform:scale(1.3);opacity:0} 100%{transform:scale(1.3);opacity:0} }
        @keyframes tick-glow { 0%,100%{text-shadow:0 0 8px rgba(217,147,33,0.3)} 50%{text-shadow:0 0 20px rgba(217,147,33,0.6)} }
        .fade-up { animation: fadeUp 0.4s ease both; }
        .tick-glow { animation: tick-glow 1s ease-in-out infinite; }
      ` }} />

      

      {/* ─── MAIN GRID ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── SHIFT CONTROL PANEL ── */}
        <div className="lg:col-span-1">
          <Card className="bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm border-0 shadow-md rounded-2xl">
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
              <Activity className="h-5 w-5 text-neutral-700 dark:text-neutral-300" />
              <CardTitle className="text-xl sm:text-2xl text-neutral-800 dark:text-neutral-200">Shift Control</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-5">Manage your daily attendance</p>
              
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Status</span>
                {shift.status === "idle" && <Badge variant="outline" className="border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400">Offline</Badge>}
                {shift.status === "active" && (
                  <Badge className="bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/50 dark:text-green-300 dark:border-green-800">
                    <span className="relative flex h-2 w-2 mr-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Active
                  </Badge>
                )}
                {shift.status === "stepped_out" && <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-800">On Break</Badge>}
                {shift.status === "checked_out" && <Badge className="bg-neutral-100 text-neutral-800 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700">Checked Out</Badge>}
              </div>

              {shift.status === "idle" && (
                <Button onClick={handleCheckIn} className="w-full h-12 bg-yellow-500 hover:bg-yellow-600 text-neutral-900 rounded-xl font-bold text-sm gap-2 shadow-md shadow-yellow-500/20">
                  <Play className="h-4 w-4 fill-current" /> Start Shift
                </Button>
              )}

              {shift.status === "active" && (
                <div className="p-4 bg-neutral-100/50 dark:bg-neutral-800/40 rounded-xl text-center space-y-3">
                   <div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Work Duration</p>
                    <p className="text-2xl font-bold font-sans text-neutral-800 dark:text-neutral-200">{formatMs(elapsedActiveTime)}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="outline" onClick={() => setLunchDialogOpen(true)} className="h-10 rounded-lg bg-white dark:bg-neutral-700/50 border-neutral-200 dark:border-neutral-700 text-xs gap-1.5">
                      <Coffee className="h-3.5 w-3.5" /> Break
                    </Button>
                    <Button variant="outline" onClick={() => setCheckoutDialogOpen(true)} className="h-10 rounded-lg bg-white dark:bg-neutral-700/50 border-neutral-200 dark:border-neutral-700 text-red-500 dark:text-red-400 text-xs gap-1.5">
                      <LogOut className="h-3.5 w-3.5" /> Check Out
                    </Button>
                  </div>
                </div>
              )}

              {shift.status === "stepped_out" && (
                 <div className="p-4 bg-yellow-100/50 dark:bg-yellow-800/30 rounded-xl text-center space-y-3">
                   <div>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">Break Duration</p>
                    <p className="text-2xl font-bold font-sans text-yellow-700 dark:text-yellow-300">{formatMs(elapsedBreakTime)}</p>
                  </div>
                  <Button onClick={handleResumeDuty} className="w-full h-11 bg-yellow-500 hover:bg-yellow-600 text-neutral-900 rounded-xl font-semibold gap-2">
                    <Sparkles className="h-4 w-4" /> Resume Duty
                  </Button>
                </div>
              )}

              {shift.status === "checked_out" && (
                <div className="text-center py-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">Shift Complete!</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Total work: {shift.checkOutTimestamp && shift.checkInTimestamp ? formatMs(shift.checkOutTimestamp - shift.checkInTimestamp - shift.accumulatedBreakTime).split(" ").slice(0,2).join(" ") : "—"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── SHIFT HISTORY ── */}
        <div className="lg:col-span-2">
           <Card className="bg-white/50 dark:bg-neutral-900/50 backdrop-blur-sm border-0 shadow-md rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-full bg-yellow-400/20 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-xl sm:text-2xl text-neutral-800 dark:text-neutral-200">Shift History</CardTitle>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Last 5 working days</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-neutral-500 dark:text-neutral-400">
                <TrendingUp className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-neutral-500 dark:text-neutral-400 border-b border-neutral-200/80 dark:border-neutral-800">
                    <th className="text-left font-medium py-2">Date</th>
                    <th className="text-center font-medium py-2">Check In</th>
                    <th className="text-center font-medium py-2">Check Out</th>
                    <th className="text-right font-medium py-2">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {shift.status !== "idle" && (
                    <tr className="font-semibold text-yellow-600 dark:text-yellow-400 border-b border-neutral-200/80 dark:border-neutral-800">
                      <td className="py-3">Today</td>
                      <td className="text-center font-sans">{getFormattedTime(shift.checkInTimestamp)}</td>
                      <td className="text-center font-sans">{shift.status === "checked_out" ? getFormattedTime(shift.checkOutTimestamp) : "—"}</td>
                      <td className="text-right font-sans">
                        {shift.status === "checked_out" ? formatMs(shift.checkOutTimestamp! - shift.checkInTimestamp! - shift.accumulatedBreakTime).split(" ").slice(0,2).join(" ") : formatMs(elapsedActiveTime).split(" ").slice(0,2).join(" ")}
                      </td>
                    </tr>
                  )}
                  {history.map((h, i) => (
                    <tr key={i} className="border-b border-neutral-200/80 dark:border-neutral-800 last:border-0">
                      <td className="py-3 font-medium text-neutral-700 dark:text-neutral-300">{h.date.replace(" (Today)", "")}</td>
                      <td className="text-center font-sans text-neutral-500 dark:text-neutral-400">{h.checkIn || "—"}</td>
                      <td className="text-center font-sans text-neutral-500 dark:text-neutral-400">{h.checkOut || "—"}</td>
                      <td className="text-right font-sans text-neutral-500 dark:text-neutral-400">{h.duration ? h.duration.split(" ").slice(0,2).join(" ") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            <DialogTitle className="text-xl">Step Out for Break?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">Your status will show as "On Break" to all staff.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-center mt-2">
            <Button variant="outline" onClick={() => setLunchDialogOpen(false)} className="flex-1 rounded-xl">Cancel</Button>
            <Button onClick={confirmLunchBreak} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl">Confirm Break</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader className="flex flex-col items-center text-center space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-100 flex items-center justify-center text-red-500">
              <LogOut className="h-7 w-7" />
            </div>
            <DialogTitle className="text-xl">End Shift & Clock Out?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground max-w-xs">Finalize your daily logs and submit your shift report.</DialogDescription>
          </DialogHeader>
          <div className="my-2 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Clock In</p>
                <p className="text-sm font-sans font-bold mt-1">{getFormattedTime(shift.checkInTimestamp)}</p>
              </div>
              <div className="bg-primary/5 rounded-xl p-3 border border-primary/15">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Duration</p>
                <p className="text-sm font-sans font-bold text-primary mt-1">{formatMs(elapsedActiveTime).split(" ").slice(0,2).join(" ")}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Handover Notes (Optional)</label>
              <Textarea placeholder="Pending cases, lab work, equipment notes..." value={handoverNotes} onChange={(e) => setHandoverNotes(e.target.value)} className="text-xs h-20 rounded-xl resize-none" />
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-center">
            <Button variant="outline" onClick={() => setCheckoutDialogOpen(false)} className="flex-1 rounded-xl">Cancel</Button>
            <Button onClick={confirmCheckOut} className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl">End Shift</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
