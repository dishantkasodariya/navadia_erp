import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Utensils, LogOut, Play, CheckCircle2, Sparkles, Coffee,
  Timer, Clock, CalendarDays, Users, Phone, Activity,
  ChevronRight, AlertTriangle, TrendingUp, Briefcase
} from "lucide-react";

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

const myCheckIns = [
  { time: "09:30 AM", patient: "Rajesh Patel", procedure: "Root Canal Therapy", dentist: "Dr. Eva", status: "Arrived" },
  { time: "11:00 AM", patient: "Priya Shah", procedure: "Dental Crown Fitting", dentist: "Dr. Archita", status: "En Route" },
  { time: "02:00 PM", patient: "Amit Mehta", procedure: "Teeth Whitening", dentist: "Dr. Sejal", status: "Confirmed" },
  { time: "04:15 PM", patient: "Sneha Reddy", procedure: "Routine Prophylaxis", dentist: "Dr. Pooja", status: "Confirmed" },
];

const statusBadge: Record<string, string> = {
  "Arrived": "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20",
  "En Route": "bg-amber-500/10 text-amber-600 border border-amber-500/20",
  "Confirmed": "bg-primary/10 text-primary border border-primary/20",
};

const quickLinks = [
  { label: "Appointments", icon: CalendarDays, color: "text-primary bg-primary/10", path: "/staff/appointments" },
  { label: "Patients", icon: Users, color: "text-secondary bg-secondary/10", path: "/staff/patients" },
  { label: "Leave Request", icon: Briefcase, color: "text-primary bg-primary/10", path: "/staff/leave-requests" },
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

  const handleCheckIn = async () => {
    const now = Date.now();
    const nowTimeStr = new Date(now).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    setShift(prev => ({ ...prev, status: "active", checkInTimestamp: now, date: todayDate }));
    toast({ title: "Checked In ✓", description: `Shift started at ${getFormattedTime(now)}. Have a great day!` });
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
    toast({ title: "Break Started 🍽️", description: "Enjoy your lunch!" });
  };

  const handleResumeDuty = () => {
    const now = Date.now();
    if (shift.breakStartTime) {
      setShift(prev => ({ ...prev, status: "active", accumulatedBreakTime: prev.accumulatedBreakTime + (now - prev.breakStartTime!), breakStartTime: null }));
      setElapsedBreakTime(0);
      toast({ title: "Welcome Back! 👋", description: "Break ended. You're active again." });
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
    toast({ title: "Shift Complete 🎉", description: "Logs saved. Great work today!" });
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

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const shiftProgress = shift.checkInTimestamp ? Math.min(100, (elapsedActiveTime / (9 * 3600 * 1000)) * 100) : 0;

  return (
    <div className="space-y-5 font-sans">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes countUp { from{opacity:0;transform:scale(0.9)} to{opacity:1;transform:scale(1)} }
        .fade-up { animation: fadeUp 0.4s ease both; }
      ` }} />

      {/* ─── HERO ────────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-secondary via-secondary/95 to-secondary/90 p-6 shadow-xl text-secondary-foreground">
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 h-32 w-32 rounded-full bg-primary/5 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start justify-between gap-5">
          <div className="fade-up">
            <p className="text-primary-foreground/80 text-xs font-semibold uppercase tracking-widest mb-1">Reception Desk</p>
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-white">
              {greeting}, {user?.name?.split(" ")[0] || "Staff"} 👋
            </h1>
            <p className="text-primary-foreground/60 text-xs mt-2">
              {now.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            </p>

            {/* Inline shift status in hero */}
            <div className="flex items-center gap-3 mt-4 flex-wrap">
              {shift.status === "idle" && (
                <span className="text-xs text-primary-foreground/40 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">Not checked in yet</span>
              )}
              {shift.status === "active" && (
                <span className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                  </span>
                  Active · {formatMs(elapsedActiveTime).split(" ").slice(0,2).join(" ")} worked
                </span>
              )}
              {shift.status === "stepped_out" && (
                <span className="flex items-center gap-2 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
                  <Coffee className="h-3 w-3 animate-pulse" />
                  On Break · {formatMs(elapsedBreakTime).split(" ").slice(0,2).join(" ")}
                </span>
              )}
              {shift.status === "checked_out" && (
                <span className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full">
                  <CheckCircle2 className="h-3 w-3" /> Shift Complete
                </span>
              )}
            </div>
          </div>

          {/* Live clock */}
          <div className="text-right fade-up shrink-0">
            <p className="text-xs uppercase tracking-widest text-primary-foreground/60 font-semibold mb-1">Live Clock</p>
            <p className="text-4xl font-mono font-bold text-primary tick-glow">
              {currentTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
            </p>
            <p className="text-xs font-mono text-primary-foreground/60 mt-0.5">
              :{currentTime.getSeconds().toString().padStart(2, "0")}
            </p>
          </div>
        </div>
      </div>

      {/* ─── MAIN GRID ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ── LEFT: SHIFT CARD ── */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden fade-up">
            <div className="p-5 border-b bg-primary/5">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Attendance</h2>
              </div>
              <p className="text-xs text-muted-foreground">Track your daily shift</p>
            </div>

            <div className="p-5 space-y-4">
              {/* Timer */}
              {(shift.status === "active" || shift.status === "stepped_out") && (
                <div className={`text-center py-4 rounded-xl ${shift.status === "stepped_out" ? "bg-amber-500/5 border border-amber-500/15" : "bg-primary/5 border border-primary/15"}`}>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">
                    {shift.status === "stepped_out" ? "Break Time" : "Work Time"}
                  </p>
                  <p className={`text-3xl font-mono font-bold ${shift.status === "stepped_out" ? "text-amber-500" : "text-primary"}`}>
                    {shift.status === "stepped_out" ? formatMs(elapsedBreakTime) : formatMs(elapsedActiveTime)}
                  </p>
                </div>
              )}

              {/* Shift progress */}
              {shift.status === "active" && (
                <div>
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
                    <span>Shift Progress</span>
                    <span>{Math.round(shiftProgress)}% of 9h target</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all duration-1000" style={{ width: `${shiftProgress}%` }} />
                  </div>
                </div>
              )}

              {/* Timestamps */}
              {shift.checkInTimestamp && (
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="bg-muted/30 rounded-lg p-2.5">
                    <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">In</p>
                    <p className="font-mono font-bold mt-1">{getFormattedTime(shift.checkInTimestamp)}</p>
                  </div>
                  <div className="bg-muted/30 rounded-lg p-2.5">
                    <p className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">Out</p>
                    <p className="font-mono font-bold mt-1">{shift.status === "checked_out" ? getFormattedTime(shift.checkOutTimestamp) : "—"}</p>
                  </div>
                </div>
              )}

              {/* Buttons */}
              {shift.status === "idle" && (
                <Button onClick={handleCheckIn} className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold gap-2 shadow-lg shadow-primary/20">
                  <Play className="h-4 w-4 fill-current" /> Clock In Now
                </Button>
              )}

              {shift.status === "active" && (
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => setLunchDialogOpen(true)} className="h-10 rounded-xl border-amber-200 text-amber-600 hover:bg-amber-50 dark:border-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-950/20 text-xs gap-1">
                    <Utensils className="h-3.5 w-3.5" /> Break
                  </Button>
                  <Button variant="outline" onClick={() => setCheckoutDialogOpen(true)} className="h-10 rounded-xl border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-950/20 text-xs gap-1">
                    <LogOut className="h-3.5 w-3.5" /> Clock Out
                  </Button>
                </div>
              )}

              {shift.status === "stepped_out" && (
                <Button onClick={handleResumeDuty} className="w-full h-11 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold gap-2">
                  <Sparkles className="h-4 w-4" /> Resume Duty
                </Button>
              )}

              {shift.status === "checked_out" && (
                <div className="text-center py-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-emerald-600">Shift Complete!</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Total: {shift.checkOutTimestamp && shift.checkInTimestamp ? formatMs(shift.checkOutTimestamp - shift.checkInTimestamp - shift.accumulatedBreakTime).split(" ").slice(0,2).join(" ") : "—"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Quick links */}
          <div className="rounded-2xl border border-border/50 bg-card shadow-sm p-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Access</h3>
            <div className="grid grid-cols-2 gap-2">
              {quickLinks.map(link => (
                <button
                  key={link.label}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted/50 border border-border/40 hover:border-border/80 transition-all duration-200 text-center"
                >
                  <div className={`p-2 rounded-lg ${link.color}`}>
                    <link.icon className="h-4 w-4" />
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground">{link.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── RIGHT: SCHEDULE + HISTORY ── */}
        <div className="lg:col-span-8 space-y-4">

          {/* Patient arrivals */}
          <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden fade-up">
            <div className="flex items-center justify-between p-5 border-b">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">Patient Queue</h2>
                  <p className="text-xs text-muted-foreground">Track arrivals & chair assignments</p>
                </div>
              </div>
              <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                {myCheckIns.filter(c => c.status === "Arrived").length} Arrived
              </Badge>
            </div>
            <div className="divide-y divide-border/40">
              {myCheckIns.map((c) => (
                <div key={c.time} className="group flex items-center justify-between px-5 py-3.5 hover:bg-muted/15 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="text-center shrink-0 w-14">
                      <p className="text-xs font-mono font-bold text-muted-foreground">{c.time.split(" ")[0]}</p>
                      <p className="text-[10px] text-muted-foreground">{c.time.split(" ")[1]}</p>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-bold font-serif flex items-center justify-center shrink-0">
                      {c.patient.split(" ").map(n => n[0]).join("").slice(0,2)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{c.patient}</p>
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
              ))}
            </div>
          </div>

          {/* Shift History Table */}
          <div className="rounded-2xl border border-border/50 bg-card shadow-sm overflow-hidden fade-up">
            <div className="flex items-center justify-between p-5 border-b">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">Attendance Log</h2>
                  <p className="text-xs text-muted-foreground">Your recent shift records</p>
                </div>
              </div>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/30 border-b text-muted-foreground text-left">
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Clock In</th>
                    <th className="px-5 py-3 font-semibold">Clock Out</th>
                    <th className="px-5 py-3 font-semibold text-right">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {shift.status !== "idle" && (
                    <tr className="bg-primary/5">
                      <td className="px-5 py-3 font-semibold text-primary">Today</td>
                      <td className="px-5 py-3 font-mono">{getFormattedTime(shift.checkInTimestamp)}</td>
                      <td className="px-5 py-3 font-mono text-muted-foreground">{shift.status === "checked_out" ? getFormattedTime(shift.checkOutTimestamp) : <span className="text-muted-foreground/40">—</span>}</td>
                      <td className="px-5 py-3 font-mono text-right font-semibold text-primary">
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
            <div className="h-14 w-14 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 flex items-center justify-center text-amber-500">
              <Utensils className="h-7 w-7" />
            </div>
            <DialogTitle className="font-serif text-xl">Step Out for Lunch?</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground max-w-xs">
              Your status will update to "On Break" on all tracking boards.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 bg-amber-50/60 dark:bg-amber-950/10 border border-amber-100/40 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
            <span><strong>Note:</strong> Ensure phone lines are covered or forwarded before stepping away.</span>
          </div>
          <DialogFooter className="flex gap-2 sm:justify-center mt-2">
            <Button variant="outline" onClick={() => setLunchDialogOpen(false)} className="flex-1 rounded-xl">Cancel</Button>
            <Button onClick={confirmLunchBreak} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl">Confirm</Button>
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
            <DialogDescription className="text-xs text-muted-foreground max-w-xs">Finalize your attendance record for today.</DialogDescription>
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
              <Textarea placeholder="Pending tasks, patient calls, unresolved issues..." value={handoverNotes} onChange={(e) => setHandoverNotes(e.target.value)} className="text-xs h-20 rounded-xl resize-none" />
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
