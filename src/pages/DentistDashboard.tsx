import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
    setShift(prev => ({ ...prev, status: "active", checkInTimestamp: now, date: todayDate }));
    toast({ title: "Shift Started ✓", description: `Checked in at ${getFormattedTime(now)}. Have a great day!` });
    const token = localStorage.getItem("navadia_token");
    if (token && user) {
      try {
        await fetch("http://localhost:5000/api/attendance/check-in", {
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
    setShift(prev => ({ ...prev, status: "checked_out", checkOutTimestamp: now, notes: handoverNotes }));
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
        await fetch("http://localhost:5000/api/attendance/check-out", {
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ── SHIFT CONTROL PANEL ── */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
            <div className="bg-primary/5 p-5 border-b">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Shift Control</h2>
              </div>
              <p className="text-xs text-muted-foreground">Manage your daily attendance</p>
            </div>

            <div className="p-5 space-y-4">
              {/* Status Badge */}
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">Status</span>
                {shift.status === "idle" && <Badge variant="secondary" className="text-xs">Offline</Badge>}
                {shift.status === "active" && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                    </span>
                    Active
                  </span>
                )}
                {shift.status === "stepped_out" && <Badge className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">On Break</Badge>}
                {shift.status === "checked_out" && <Badge className="text-xs bg-slate-500/10 text-slate-500 border-slate-500/20">Checked Out</Badge>}
              </div>

              {/* Timer Display */}
              {shift.status !== "idle" && shift.status !== "checked_out" && (
                <div className="text-center py-3 bg-muted/30 rounded-xl">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-1">
                    {shift.status === "stepped_out" ? "Break Duration" : "Work Duration"}
                  </p>
                  <p className={`text-3xl font-mono font-bold tracking-wider ${shift.status === "stepped_out" ? "text-amber-500" : "text-primary"}`}>
                    {shift.status === "stepped_out" ? formatMs(elapsedBreakTime) : formatMs(elapsedActiveTime)}
                  </p>
                </div>
              )}

              {/* Shift progress bar */}
              {shift.status === "active" && (
                <div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Shift Progress</span>
                    <span>{Math.round(shiftProgress)}% of 9h</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all duration-1000" style={{ width: `${shiftProgress}%` }} />
                  </div>
                </div>
              )}

              {/* Check-in time */}
              {shift.checkInTimestamp && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Checked in at</span>
                  <span className="font-mono font-semibold">{getFormattedTime(shift.checkInTimestamp)}</span>
                </div>
              )}

              {/* Action Buttons */}
              {shift.status === "idle" && (
                <Button onClick={handleCheckIn} className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold gap-2 shadow-lg shadow-primary/20">
                  <Play className="h-4 w-4 fill-current" /> Start Shift
                </Button>
              )}

              {shift.status === "active" && (
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => setLunchDialogOpen(true)} className="h-10 rounded-xl border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-950/20 text-xs gap-1.5">
                    <Utensils className="h-3.5 w-3.5" /> Break
                  </Button>
                  <Button variant="outline" onClick={() => setCheckoutDialogOpen(true)} className="h-10 rounded-xl border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-950/20 text-xs gap-1.5">
                    <LogOut className="h-3.5 w-3.5" /> Check Out
                  </Button>
                </div>
              )}

              {shift.status === "stepped_out" && (
                <Button onClick={handleResumeDuty} className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold gap-2">
                  <Sparkles className="h-4 w-4" /> Resume Duty
                </Button>
              )}

              {shift.status === "checked_out" && (
                <div className="text-center py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-1" />
                  <p className="text-xs font-semibold text-emerald-600">Shift Complete!</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Worked {shift.checkOutTimestamp && shift.checkInTimestamp ? formatMs(shift.checkOutTimestamp - shift.checkInTimestamp - shift.accumulatedBreakTime).split(" ").slice(0,2).join(" ") : "—"}
                  </p>
                </div>
              )}
            </div>
          </div>

         
        </div>

        {/* ── APPOINTMENTS + SHIFT LOG ── */}
        <div className="lg:col-span-8 space-y-4">

        
          {/* Shift History */}
          <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">Shift History</h2>
                  <p className="text-xs text-muted-foreground">Last 5 working days</p>
                </div>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-muted/30 border-b text-muted-foreground">
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Check In</th>
                    <th className="px-5 py-3 font-semibold">Check Out</th>
                    <th className="px-5 py-3 font-semibold text-right">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {shift.status !== "idle" && (
                    <tr className="bg-primary/5 border-b border-primary/10">
                      <td className="px-5 py-3 font-semibold text-primary">Today</td>
                      <td className="px-5 py-3 font-mono">{getFormattedTime(shift.checkInTimestamp)}</td>
                      <td className="px-5 py-3 font-mono text-muted-foreground">{shift.status === "checked_out" ? getFormattedTime(shift.checkOutTimestamp) : <span className="text-muted-foreground/50">—</span>}</td>
                      <td className="px-5 py-3 font-mono text-right text-primary font-semibold">
                        {shift.status === "checked_out" ? formatMs(shift.checkOutTimestamp! - shift.checkInTimestamp! - shift.accumulatedBreakTime).split(" ").slice(0,2).join(" ") : formatMs(elapsedActiveTime).split(" ").slice(0,2).join(" ")}
                      </td>
                    </tr>
                  )}
                  {history.map((h, i) => (
                    <tr key={i} className="hover:bg-muted/10 transition-colors">
                      <td className="px-5 py-3 font-medium">{h.date.replace(" (Today)", "")}</td>
                      <td className="px-5 py-3 font-mono text-muted-foreground">{h.checkIn || "—"}</td>
                      <td className="px-5 py-3 font-mono text-muted-foreground">{h.checkOut || "—"}</td>
                      <td className="px-5 py-3 font-mono text-right text-muted-foreground">{h.duration ? h.duration.split(" ").slice(0,2).join(" ") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ─── DIALOGS ─────────────────────────────────────────────────────── */}
      <Dialog open={lunchDialogOpen} onOpenChange={setLunchDialogOpen}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader className="flex flex-col items-center text-center space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 flex items-center justify-center text-amber-500">
              <Utensils className="h-7 w-7" />
            </div>
            <DialogTitle className="font-serif text-xl">Step Out for Break?</DialogTitle>
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
            <DialogTitle className="font-serif text-xl">End Shift & Clock Out?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground max-w-xs">Finalize your daily logs and submit your shift report.</DialogDescription>
          </DialogHeader>
          <div className="my-2 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-muted/40 rounded-xl p-3">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Clock In</p>
                <p className="text-sm font-mono font-bold mt-1">{getFormattedTime(shift.checkInTimestamp)}</p>
              </div>
              <div className="bg-primary/5 rounded-xl p-3 border border-primary/15">
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Duration</p>
                <p className="text-sm font-mono font-bold text-primary mt-1">{formatMs(elapsedActiveTime).split(" ").slice(0,2).join(" ")}</p>
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
