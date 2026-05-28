import { useState, useEffect } from "react";

import { API_BASE_URL } from '../config/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Clock, LogIn, LogOut, Search, Plus, Calendar, UserCheck, UserX, History, FileText, Users } from "lucide-react";
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
  status: "present" | "absent" | "late" | "half-day" | "on-leave";
  notes: string;
}

const today = new Date().toISOString().split("T")[0];
const INITIAL_RECORDS: AttendanceRecord[] = [];

export default function Attendance() {
  const { user, allUsers } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<AttendanceRecord[]>(INITIAL_RECORDS);
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
    try {
      const res = await fetch("${API_BASE_URL}/api/attendance", {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
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
          status: (a.status || "Present").toLowerCase() === "on leave" ? "on-leave" : (a.status || "Present").toLowerCase(),
          notes: ""
        }));
        setRecords(mapped);
      }
    } catch (e) {
      console.warn("Backend offline, fallback loading mock attendance:", e);
    }
  };

  useEffect(() => {
    fetchAttendance();
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
        setTimeout(() => fetchAttendance(), 500);
      } else if (e instanceof CustomEvent && e.detail?.type === 'check-out') {
        // Dashboard checked out, refetch attendance to show updated records
        setTimeout(() => fetchAttendance(), 500);
      }
    };
    window.addEventListener('attendance-synced', handleAttendanceSync);
    
    // Also listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes('navadia_dentist_shift') && e.newValue) {
        setTimeout(() => fetchAttendance(), 500);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('attendance-synced', handleAttendanceSync);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const filtered = records.filter((r) => {
    const matchSearch = r.staffName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    const matchDate = r.date === selectedDate;
    const matchRole = roleFilter === "all" || r.role.toLowerCase() === roleFilter.toLowerCase();
    
    // Non-Admin employees only see their own attendance status
    if (user?.role.toLowerCase() !== "admin" && r.staffId !== user?.id) return false;
    return matchSearch && matchStatus && matchDate && matchRole;
  });

  const presentCount = records.filter((r) => r.date === selectedDate && (r.status === "present" || r.status === "late")).length;
  const absentCount = records.filter((r) => r.date === selectedDate && r.status === "absent").length;
  const lateCount = records.filter((r) => r.date === selectedDate && r.status === "late").length;

  const handleCheckIn = async (recordId: string) => {
    const record = records.find(r => r.id === recordId);
    if (!record) return;
    const nowTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    const isLate = nowTime > "09:00";
    const statusVal = isLate ? "Late" : "Present";

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

    const token = localStorage.getItem("navadia_token");
    if (token) {
      try {
        const res = await fetch("${API_BASE_URL}/api/attendance/check-in", {
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
            status: statusVal
          })
        });
        if (res.ok) {
          fetchAttendance();
          toast({ title: "Checked In", description: `Check-in recorded at ${nowTime}` });
          return;
        }
      } catch (e) {
        console.warn("Backend offline, fallback local checkin:", e);
      }
    }

    setRecords((prev) => prev.map((r) => r.id === recordId ? { ...r, checkIn: nowTime, status: isLate ? "late" : "present" } : r));
    toast({ title: "Checked In", description: `Check-in recorded at ${nowTime}` });
    
    // Broadcast to DentistDashboard
    if (user && user.id) {
      window.dispatchEvent(new CustomEvent('attendance-synced', {
        detail: { type: 'check-in', shift: { status: "active", checkInTimestamp: Date.now(), date: record.date } }
      }));
    }
  };

  const handleCheckOut = async (recordId: string) => {
    const record = records.find(r => r.id === recordId);
    if (!record) return;
    const nowTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });

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

    const token = localStorage.getItem("navadia_token");
    if (token) {
      try {
        const res = await fetch("${API_BASE_URL}/api/attendance/check-out", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            userId: record.staffId,
            date: record.date,
            checkOut: nowTime
          })
        });
        if (res.ok) {
          fetchAttendance();
          toast({ title: "Checked Out", description: `Check-out recorded at ${nowTime}` });
          return;
        }
      } catch (e) {
        console.warn("Backend offline, fallback local checkout:", e);
      }
    }

    setRecords((prev) => prev.map((r) => r.id === recordId ? { ...r, checkOut: nowTime } : r));
    toast({ title: "Checked Out", description: `Check-out recorded at ${nowTime}` });
    
    // Broadcast to DentistDashboard
    if (user && user.id) {
      window.dispatchEvent(new CustomEvent('attendance-synced', {
        detail: { type: 'check-out', shift: { status: "checked_out", checkOutTimestamp: Date.now(), date: record.date } }
      }));
    }
  };

  const handleAdd = async () => {
    if (!formData.staffId) return;
    const staff = allUsers.find(u => u.id === formData.staffId);
    if (!staff) return;

    const formattedStatus = formData.status === "present" ? "Present" : formData.status === "absent" ? "Absent" : formData.status === "half-day" ? "Half Day" : "On Leave";
    const nowTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    const token = localStorage.getItem("navadia_token");
    if (token) {
      try {
        const res = await fetch("${API_BASE_URL}/api/attendance/check-in", {
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
          fetchAttendance();
          setDialogOpen(false);
          setFormData({ staffId: "", status: "present", notes: "" });
          toast({ title: "Record Added" });
          return;
        }
      } catch (e) {
        console.warn("Backend offline, fallback local add:", e);
      }
    }

    const newRecord: AttendanceRecord = {
      id: crypto.randomUUID(),
      staffId: staff.id,
      staffName: staff.name,
      role: staff.role,
      date: selectedDate,
      checkIn: formData.status === "present" ? nowTime : null,
      checkOut: null,
      status: formData.status,
      notes: formData.notes,
    };
    setRecords((prev) => [...prev, newRecord]);
    setDialogOpen(false);
    setFormData({ staffId: "", status: "present", notes: "" });
    toast({ title: "Record Added" });
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "present": return "bg-secondary/15 text-secondary";
      case "late": return "bg-accent/15 text-accent";
      case "absent": return "bg-destructive/15 text-destructive";
      case "half-day": return "bg-primary/10 text-primary";
      case "on-leave": return "bg-muted text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const staffOptions = allUsers.filter((u) => u.role.toLowerCase() !== "admin");
  const isAdmin = user?.role.toLowerCase() === "admin";
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
            monthlyHours += calculateDuration(r.checkIn, r.checkOut);
          }
        } catch (e) {
          console.error("Error calculating hours:", e);
        }
      });

      return {
        ...staff,
        todayHours: calculateDuration(todayRecord?.checkIn || null, todayRecord?.checkOut || null),
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
        personalMonthlyHours += calculateDuration(r.checkIn, r.checkOut);
      }
    } catch (e) {
      console.error("Error calculating personal monthly hours:", e);
    }
  });

  const personalTodayHours = calculateDuration(personalTodayRecord?.checkIn || null, personalTodayRecord?.checkOut || null);

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl md:max-lg:text-2xl">Attendance Management</h1>
          <p className="text-muted-foreground text-sm sm:text-base md:max-lg:text-sm mt-1">Track and manage daily check-ins and hours</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-fit md:max-lg:h-10 md:max-lg:px-4 md:max-lg:text-sm lg:w-auto"><Plus className="h-4 w-4 mr-2" />Mark Attendance</Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100vw-2rem)] max-h-[calc(100svh-2rem)] overflow-y-auto rounded-lg p-4 sm:w-[calc(100vw-3rem)] sm:max-h-[calc(100svh-3rem)] sm:p-6 lg:w-full lg:max-h-none lg:overflow-visible">
              <DialogHeader><DialogTitle>Mark Attendance</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Staff Member</Label>
                  <Select value={formData.staffId} onValueChange={(v) => setFormData({ ...formData, staffId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger>
                    <SelectContent>
                      {staffOptions.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.role})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(v: any) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="present">Present</SelectItem>
                      <SelectItem value="absent">Absent</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                      <SelectItem value="half-day">Half Day</SelectItem>
                      <SelectItem value="on-leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Optional notes" />
                </div>
                <Button onClick={handleAdd} className="w-full" disabled={!formData.staffId}>Save</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isAdmin ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4 w-full justify-between lg:w-auto lg:justify-start">
            <TabsTrigger value="daily" className="flex-1 gap-2 lg:flex-none"><Clock className="h-4 w-4" /> Daily Log</TabsTrigger>
            <TabsTrigger value="overview" className="flex-1 gap-2 lg:flex-none"><Users className="h-4 w-4" /> Staff Overview</TabsTrigger>
          </TabsList>
          
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
        </Tabs>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="daily" className="gap-2"><Clock className="h-4 w-4" /> Daily Log</TabsTrigger>
            <TabsTrigger value="overview" className="gap-2"><UserCheck className="h-4 w-4" /> My Overview</TabsTrigger>
          </TabsList>

          <TabsContent value="daily">
            {renderDailyLog()}
          </TabsContent>

          <TabsContent value="overview">
            <div className="space-y-6">
              <Card className="transition-shadow border-muted/50 rounded-lg bg-card shadow-sm overflow-hidden">
                <CardContent className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(220px,1fr)_minmax(320px,auto)] md:max-lg:p-3 sm:items-center">
                  {/* Profile Details */}
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-amber-500/10 flex items-center justify-center font-bold text-amber-600 text-sm">
                      {user?.name?.charAt(0) || "?"}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-medium text-sm text-foreground">{user?.name}</h3>
                      <p className="text-sm text-muted-foreground capitalize mt-0.5">{user?.role}</p>
                    </div>
                  </div>
                  
                  {/* Statistics & Actions */}
                  <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center sm:justify-end sm:gap-3 lg:gap-4 md:max-lg:gap-2">
                    <div className="rounded-md bg-muted/30 px-3 py-2 text-center sm:min-w-24">
                      <p className="text-xs sm:text-xs uppercase tracking-wider text-muted-foreground font-semibold">Today</p>
                      <p className="text-sm sm:text-base font-semibold text-foreground mt-1">{formatDuration(personalTodayHours)}</p>
                    </div>
                    <div className="rounded-md bg-primary/5 px-3 py-2 text-center sm:min-w-28">
                      <p className="text-xs sm:text-xs uppercase tracking-wider text-muted-foreground font-semibold">This Month</p>
                      <p className="text-sm sm:text-base font-semibold text-primary mt-1">{formatDuration(personalMonthlyHours)}</p>
                    </div>
                    
                    <Button 
                      onClick={() => setViewStaffId(user?.id || null)}
                      className="col-span-2 h-9 gap-1.5 rounded-lg border border-gray-200/80 bg-[#f5f5f4] text-[#1c1917] hover:bg-amber-500 hover:text-white hover:border-amber-500 shadow-sm transition-all duration-200 text-xs sm:col-auto sm:min-w-24 md:max-lg:h-8 md:max-lg:px-3 md:max-lg:text-[11px]"
                    >
                      <History className="h-3 w-3 sm:h-3.5 sm:w-3.5 transition-colors" /> History
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Staff History Modal */}
      <Dialog open={!!viewStaffId} onOpenChange={(o) => !o && setViewStaffId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Attendance History: {selectedStaffName}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto mt-4 px-1">
            <table className="w-full text-sm sm:text-base">
              <thead className="sticky top-0 bg-background border-b z-10">
                <tr>
                  <th className="text-left py-2 font-medium">Date</th>
                  <th className="text-left py-2 font-medium hidden sm:table-cell">Check In</th>
                  <th className="text-left py-2 font-medium hidden sm:table-cell">Check Out</th>
                  <th className="text-left py-2 font-medium">Duration</th>
                  <th className="text-left py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {selectedStaffHistory.map((h) => (
                  <tr key={h.id} className="hover:bg-muted/30">
                    <td className="py-2 sm:py-3 font-medium text-sm sm:text-base">{h.date}</td>
                    <td className="py-2 sm:py-3 font-sans text-xs sm:text-sm text-muted-foreground hidden sm:table-cell">{h.checkIn || "—"}</td>
                    <td className="py-2 sm:py-3 font-sans text-xs sm:text-sm text-muted-foreground hidden sm:table-cell">{h.checkOut || "—"}</td>
                    <td className="py-2 sm:py-3 font-semibold text-sm sm:text-base">{formatDuration(calculateDuration(h.checkIn, h.checkOut))}</td>
                    <td className="py-2 sm:py-3">
                      <span className={`text-xs sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full ${statusColor(h.status)}`}>
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {selectedStaffHistory.length === 0 && (
                  <tr><td colSpan={5} className="py-6 sm:py-8 text-center text-muted-foreground text-sm sm:text-base">No records found for this user</td></tr>
                )}
              </tbody>
            </table>
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
          {isAdmin && <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="h-11 w-full sm:col-span-2 md:col-span-1 lg:h-10 lg:w-[170px]" />}
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-[640px] text-sm sm:text-base lg:min-w-0 lg:w-full">
                <thead>
                  <tr className="border-b bg-muted/30 text-left">
                    <th className="p-2 sm:p-3 font-medium text-muted-foreground">Staff</th>
                    <th className="p-2 sm:p-3 font-medium text-muted-foreground hidden sm:table-cell text-xs">Role</th>
                    <th className="p-2 sm:p-3 font-medium text-muted-foreground">Check In</th>
                    <th className="p-2 sm:p-3 font-medium text-muted-foreground hidden sm:table-cell">Check Out</th>
                    <th className="p-2 sm:p-3 font-medium text-muted-foreground">Status</th>
                    <th className="p-2 sm:p-3 font-medium text-muted-foreground text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-2 sm:p-3 font-medium text-sm sm:text-base">{r.staffName}</td>
                      <td className="p-2 sm:p-3 capitalize text-muted-foreground hidden sm:table-cell text-base">s{r.role}</td>
                      <td className="p-2 sm:p-3 font-sans text-xs sm:text-xs">{r.checkIn || "—"}</td>
                      <td className="p-2 sm:p-3 font-sans text-xs sm:text-xs hidden sm:table-cell">{r.checkOut || "—"}</td>
                      <td className="p-2 sm:p-3"><span className={`text-xs sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${statusColor(r.status)}`}>{r.status}</span></td>
                      <td className="p-2 sm:p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!r.checkIn && (
                            <Button variant="outline" size="sm" className="gap-1 h-9 text-xs sm:text-xs px-2" onClick={() => handleCheckIn(r.id)} title="Check In">
                              <LogIn className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">Check In</span>
                            </Button>
                          )}
                          {r.checkIn && !r.checkOut && (
                            <Button variant="outline" size="sm" className="gap-1 h-9 text-xs sm:text-xs px-2" onClick={() => handleCheckOut(r.id)} title="Check Out">
                              <LogOut className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> <span className="hidden sm:inline">Check Out</span>
                            </Button>
                          )}
                          {r.checkIn && r.checkOut && (
                            <span className="text-xs sm:text-sm text-muted-foreground">Done</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="p-6 sm:p-8 text-center text-muted-foreground text-sm sm:text-base">No attendance records found</td></tr>
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
