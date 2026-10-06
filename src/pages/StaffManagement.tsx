import { useState, useEffect } from "react";
import { useAuth, UserRole, User } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Plus, Trash2, UserCog, Stethoscope, Users, Edit,
  Clock, History, Calendar, FileText, Printer, Check, X, Search, FileDown, LogIn, LogOut, Trash, PlusCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { calculateDuration, formatDuration } from "@/lib/utils";
import { API_BASE_URL } from "../config/api";

const roleBadgeVariant: Record<string, "default" | "secondary" | "outline"> = {
  dentist: "default",
  receptionist: "secondary",
  staff: "outline",
  admin: "default",
  Dentist: "default",
  Staff: "outline",
  Admin: "default"
};

const roleIcons: Record<string, React.ReactNode> = {
  dentist: <Stethoscope className="h-4 w-4" />,
  Dentist: <Stethoscope className="h-4 w-4" />,
  receptionist: <UserCog className="h-4 w-4" />,
  staff: <Users className="h-4 w-4" />,
  Staff: <Users className="h-4 w-4" />,
};

export default function StaffManagement() {
  const { allUsers, addStaffMember, removeStaffMember, editStaffMember } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  // Attendance history and audit log states
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [leaveRecords, setLeaveRecords] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isHistLoading, setIsHistLoading] = useState(false);

  // Filters for history
  const [logStatusFilter, setLogStatusFilter] = useState("all");
  const [timelineFilter, setTimelineFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");

  // CRUD for individual logs
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [logCheckIn, setLogCheckIn] = useState("");
  const [logCheckOut, setLogCheckOut] = useState("");
  const [logStatus, setLogStatus] = useState("Present");
  const [logDate, setLogDate] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<{ id: string; name: string } | null>(null);
  const [updateConfirmOpen, setUpdateConfirmOpen] = useState(false);
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("Staff");
  const [password, setPassword] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [aadhaarNo, setAadhaarNo] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [country, setCountry] = useState("India");
  const [filter, setFilter] = useState<string>("all");

  const staffMembers = allUsers.filter((u) => u.role.toLowerCase() !== "admin");
  const filtered = filter === "all" ? staffMembers : staffMembers.filter((u) => u.role.toLowerCase() === filter.toLowerCase());

  // Load historical attendance logs, approved leaves, and audit logs
  const fetchHistory = async () => {
    if (!editId) return;
    setIsHistLoading(true);
    const token = localStorage.getItem("navadia_token");
    if (!token) return;
    try {
      // Fetch attendance
      const attRes = await fetch(`${API_BASE_URL}/api/attendance?userId=${editId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (attRes.ok) {
        const data = await attRes.json();
        setAttendanceRecords(data);
      }
      
      // Fetch leaves
      const leaveRes = await fetch(`${API_BASE_URL}/api/leave`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (leaveRes.ok) {
        const data = await leaveRes.json();
        const userLeaves = data.filter((l: any) => l.userId === editId);
        setLeaveRecords(userLeaves);
      }

      // Fetch audit logs
      const auditRes = await fetch(`${API_BASE_URL}/api/audit-logs?employeeId=${editId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (auditRes.ok) {
        const data = await auditRes.json();
        setAuditLogs(data);
      }
    } catch (err) {
      console.error("Failed to fetch historical attendance data:", err);
    } finally {
      setIsHistLoading(false);
    }
  };

  useEffect(() => {
    if (open && editId) {
      fetchHistory();
    } else {
      setAttendanceRecords([]);
      setLeaveRecords([]);
      setAuditLogs([]);
    }
  }, [open, editId]);

  // Attendance CRUD Handlers
  const handleApproveAttendance = async (recordId: string) => {
    const token = localStorage.getItem("navadia_token");
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/attendance/approve/${recordId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast({ title: "Approved ✓", description: "Attendance record approved successfully" });
        await fetchHistory();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteAttendance = async (recordId: string) => {
    const token = localStorage.getItem("navadia_token");
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/attendance/${recordId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        toast({ title: "Deleted ✓", description: "Attendance record deleted successfully" });
        await fetchHistory();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenEditLog = (record: any) => {
    setEditingLogId(record._id);
    setLogCheckIn(record.checkIn || "");
    setLogCheckOut(record.checkOut || "");
    setLogStatus(record.status || "Present");
    setLogDate(record.date || "");
    setLogNotes(record.notes || "");
  };

  const handleOpenAddLog = () => {
    setEditingLogId("new");
    setLogCheckIn("09:00");
    setLogCheckOut("17:00");
    setLogStatus("Present");
    setLogDate(new Date().toISOString().split("T")[0]);
    setLogNotes("");
  };

  const handleSaveLog = async () => {
    const token = localStorage.getItem("navadia_token");
    if (!token || !editId) return;

    try {
      if (editingLogId === "new") {
        const res = await fetch(`${API_BASE_URL}/api/attendance/check-in`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            userId: editId,
            userName: name,
            date: logDate,
            checkIn: logCheckIn || null,
            status: logStatus
          })
        });
        if (res.ok) {
          toast({ title: "Log Created ✓", description: "Manual attendance record created" });
          setEditingLogId(null);
          await fetchHistory();
        } else {
          const err = await res.json();
          toast({ title: "Error", description: err.message || "Failed to create log", variant: "destructive" });
        }
      } else {
        const res = await fetch(`${API_BASE_URL}/api/attendance/${editingLogId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            checkIn: logCheckIn || null,
            checkOut: logCheckOut || null,
            status: logStatus
          })
        });
        if (res.ok) {
          toast({ title: "Log Updated ✓", description: "Attendance record updated successfully" });
          setEditingLogId(null);
          await fetchHistory();
        } else {
          const err = await res.json();
          toast({ title: "Error", description: err.message || "Failed to update log", variant: "destructive" });
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "A network error occurred", variant: "destructive" });
    }
  };

  // Export as CSV (Excel)
  const exportToCSV = () => {
    const headers = ["Date", "Employee Name", "Employee ID", "Role", "Check-In", "Check-Out", "Working Hours", "Break Time", "Status", "Approved"];
    const rows = filteredLogs.map(r => [
      r.date,
      name,
      editId,
      role,
      r.checkIn || "—",
      r.checkOut || "—",
      formatDuration(Math.max(0, calculateDuration(r.checkIn, r.checkOut) - (r.breakTime || 0) / 60)),
      r.breakTime ? `${r.breakTime}m` : "0m",
      r.status || "Present",
      r.isApproved ? "Approved" : "Pending"
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.map(val => `"${val}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Attendance_History_${name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print Report / PDF
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    
    const logsHtml = filteredLogs.map(r => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${r.date}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${r.checkIn || '—'}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${r.checkOut || '—'}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${formatDuration(Math.max(0, calculateDuration(r.checkIn, r.checkOut) - (r.breakTime || 0) / 60))}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${r.breakTime ? r.breakTime + 'm' : '—'}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${r.status}</td>
        <td style="padding: 8px; border: 1px solid #ddd;">${r.isApproved ? 'Approved' : 'Pending'}</td>
      </tr>
    `).join("");
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Attendance Report - ${name}</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f2f2f2; text-align: left; padding: 10px; border: 1px solid #ddd; }
            h2 { margin-bottom: 5px; }
            p { margin: 5px 0; font-size: 14px; }
          </style>
        </head>
        <body>
          <h2>Attendance Report</h2>
          <p><strong>Employee:</strong> ${name} (ID: ${editId})</p>
          <p><strong>Role:</strong> ${role}</p>
          <p><strong>Report Date:</strong> ${new Date().toLocaleDateString()}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Check-In</th>
                <th>Check-Out</th>
                <th>Working Hours</th>
                <th>Break Time</th>
                <th>Status</th>
                <th>Approval</th>
              </tr>
            </thead>
            <tbody>
              ${logsHtml}
            </tbody>
          </table>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Helper selectors and filters
  const filteredLogs = attendanceRecords.filter(r => {
    if (logStatusFilter !== "all" && (r.status || "").toLowerCase() !== logStatusFilter.toLowerCase()) return false;
    
    if (timelineFilter === "today") {
      const todayStr = new Date().toISOString().split("T")[0];
      if (r.date !== todayStr) return false;
    } else if (timelineFilter === "yesterday") {
      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      if (r.date !== yesterday) return false;
    } else if (timelineFilter === "7days") {
      const limit = new Date(Date.now() - 7 * 86400000).toISOString().split("T")[0];
      if (r.date < limit) return false;
    } else if (timelineFilter === "month") {
      const currentMonth = new Date().toISOString().substring(0, 7);
      if (!r.date.startsWith(currentMonth)) return false;
    } else if (timelineFilter === "custom") {
      if (fromDate && r.date < fromDate) return false;
      if (toDate && r.date > toDate) return false;
    } else if (timelineFilter === "month-year") {
      if (selectedMonth !== "all") {
        const monthStr = `-${selectedMonth.padStart(2, "0")}-`;
        if (!r.date.includes(monthStr)) return false;
      }
      if (selectedYear !== "all") {
        if (!r.date.startsWith(selectedYear)) return false;
      }
    }
    return true;
  });

  const getStats = () => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let halfDay = 0;
    let totalMs = 0;
    let breakMins = 0;
    let outsideMins = 0;
    let presentDaysWithDuration = 0;
    let lastDate = "—";

    attendanceRecords.forEach(r => {
      const statusLower = (r.status || "").toLowerCase();
      if (statusLower === "present") present++;
      else if (statusLower === "late") { late++; present++; }
      else if (statusLower === "absent") absent++;
      else if (statusLower === "half-day" || statusLower === "half day") halfDay++;

      if (r.checkIn && r.checkOut) {
        const [inH, inM] = r.checkIn.split(":").map(Number);
        const [outH, outM] = r.checkOut.split(":").map(Number);
        let durationMs = ((outH * 60 + outM) - (inH * 60 + inM)) * 60 * 1000;
        if (r.breakTime) {
          durationMs -= r.breakTime * 60 * 1000;
          breakMins += r.breakTime;
        }
        if (durationMs > 0) {
          totalMs += durationMs;
          presentDaysWithDuration++;
        }
      }

      if (r.breaks && Array.isArray(r.breaks)) {
        r.breaks.forEach((b: any) => {
          if (b.duration) {
            outsideMins += b.duration;
          }
        });
      }

      if (r.date && (lastDate === "—" || r.date > lastDate)) {
        lastDate = r.date;
      }
    });

    const totalHours = totalMs / (3600 * 1000);
    const avgHours = presentDaysWithDuration > 0 ? (totalHours / presentDaysWithDuration) : 0;

    return {
      present,
      absent,
      late,
      halfDay,
      totalHours,
      breakHours: breakMins / 60,
      outsideHours: outsideMins / 60,
      avgHours,
      lastDate
    };
  };

  const stats = getStats();

  const getOutsideLogs = () => {
    const list: any[] = [];
    attendanceRecords.forEach(r => {
      if (r.breaks && Array.isArray(r.breaks)) {
        r.breaks.forEach((b: any) => {
          list.push({
            date: r.date,
            start: b.start,
            end: b.end,
            duration: b.duration,
            reason: b.reason || "Lunch Break"
          });
        });
      }
    });
    return list.sort((a, b) => b.date.localeCompare(a.date));
  };
  const outsideLogs = getOutsideLogs();

  const renderAttendanceHistory = () => {
    return (
      <div className="space-y-4 sm:space-y-6 w-full min-w-0">
        {/* Uniform Clean Stats Cards (Fixed same height, not big, not small) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 w-full min-w-0">
          <Card className="h-[78px] sm:h-[84px] bg-card border border-border/70 p-2 sm:p-2.5 text-center min-w-0 shadow-xs flex flex-col justify-center items-center">
            <div className="h-6 sm:h-7 flex items-center justify-center w-full">
              <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center leading-tight">Present Days</p>
            </div>
            <p className="text-lg sm:text-xl font-bold text-foreground leading-none mt-1">{stats.present}</p>
          </Card>
          <Card className="h-[78px] sm:h-[84px] bg-card border border-border/70 p-2 sm:p-2.5 text-center min-w-0 shadow-xs flex flex-col justify-center items-center">
            <div className="h-6 sm:h-7 flex items-center justify-center w-full">
              <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center leading-tight">Absent Days</p>
            </div>
            <p className="text-lg sm:text-xl font-bold text-foreground leading-none mt-1">{stats.absent}</p>
          </Card>
          <Card className="h-[78px] sm:h-[84px] bg-card border border-border/70 p-2 sm:p-2.5 text-center min-w-0 shadow-xs flex flex-col justify-center items-center">
            <div className="h-6 sm:h-7 flex items-center justify-center w-full">
              <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center leading-tight">Late / Half Days</p>
            </div>
            <p className="text-lg sm:text-xl font-bold text-foreground leading-none mt-1">{stats.late} / {stats.halfDay}</p>
          </Card>
          <Card className="h-[78px] sm:h-[84px] bg-card border border-border/70 p-2 sm:p-2.5 text-center min-w-0 shadow-xs flex flex-col justify-center items-center">
            <div className="h-6 sm:h-7 flex items-center justify-center w-full">
              <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center leading-tight">Avg Work Hours</p>
            </div>
            <p className="text-lg sm:text-xl font-bold text-foreground leading-none mt-1">{stats.avgHours.toFixed(1)}h/day</p>
          </Card>
          <Card className="h-[78px] sm:h-[84px] bg-card border border-border/70 p-2 sm:p-2.5 text-center min-w-0 shadow-xs flex flex-col justify-center items-center">
            <div className="h-6 sm:h-7 flex items-center justify-center w-full">
              <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center leading-tight">Total Work Hours</p>
            </div>
            <p className="text-lg sm:text-xl font-bold text-foreground leading-none mt-1">{stats.totalHours.toFixed(1)}h</p>
          </Card>
          <Card className="h-[78px] sm:h-[84px] bg-card border border-border/70 p-2 sm:p-2.5 text-center min-w-0 shadow-xs flex flex-col justify-center items-center">
            <div className="h-6 sm:h-7 flex items-center justify-center w-full">
              <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center leading-tight">Total Break Hours</p>
            </div>
            <p className="text-lg sm:text-xl font-bold text-foreground leading-none mt-1">{stats.breakHours.toFixed(1)}h</p>
          </Card>
          <Card className="h-[78px] sm:h-[84px] bg-card border border-border/70 p-2 sm:p-2.5 text-center min-w-0 shadow-xs flex flex-col justify-center items-center">
            <div className="h-6 sm:h-7 flex items-center justify-center w-full">
              <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center leading-tight">Outside Hours</p>
            </div>
            <p className="text-lg sm:text-xl font-bold text-foreground leading-none mt-1">{stats.outsideHours.toFixed(1)}h</p>
          </Card>
          <Card className="h-[78px] sm:h-[84px] bg-card border border-border/70 p-2 sm:p-2.5 text-center min-w-0 shadow-xs flex flex-col justify-center items-center">
            <div className="h-6 sm:h-7 flex items-center justify-center w-full">
              <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center leading-tight">Last Active Date</p>
            </div>
            <p className="text-sm sm:text-base font-bold text-foreground leading-none mt-1">{stats.lastDate}</p>
          </Card>
        </div>

        {/* Filter Controls with proper width and aligned buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-muted/20 p-3 sm:p-4 rounded-xl border w-full min-w-0">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
            <Select value={timelineFilter} onValueChange={setTimelineFilter}>
              <SelectTrigger className="h-9 text-xs w-full sm:w-[135px] bg-background">
                <SelectValue placeholder="Timeline" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Entire History</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="month-year">By Month/Year</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            <Select value={logStatusFilter} onValueChange={setLogStatusFilter}>
              <SelectTrigger className="h-9 text-xs w-full sm:w-[125px] bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="late">Late</SelectItem>
                <SelectItem value="half-day">Half Day</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
              </SelectContent>
            </Select>

            {timelineFilter === "month-year" && (
              <div className="col-span-2 flex items-center gap-2 w-full sm:w-auto">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="h-9 text-xs flex-1 sm:w-[95px] bg-background"><SelectValue placeholder="Month" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Months</SelectItem>
                    <SelectItem value="01">Jan</SelectItem>
                    <SelectItem value="02">Feb</SelectItem>
                    <SelectItem value="03">Mar</SelectItem>
                    <SelectItem value="04">Apr</SelectItem>
                    <SelectItem value="05">May</SelectItem>
                    <SelectItem value="06">Jun</SelectItem>
                    <SelectItem value="07">Jul</SelectItem>
                    <SelectItem value="08">Aug</SelectItem>
                    <SelectItem value="09">Sep</SelectItem>
                    <SelectItem value="10">Oct</SelectItem>
                    <SelectItem value="11">Nov</SelectItem>
                    <SelectItem value="12">Dec</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="h-9 text-xs flex-1 sm:w-[85px] bg-background"><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {timelineFilter === "custom" && (
              <div className="col-span-2 flex items-center gap-1 w-full sm:w-auto">
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9 text-xs flex-1 sm:w-[120px] bg-background" />
                <span className="text-xs text-muted-foreground">to</span>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9 text-xs flex-1 sm:w-[120px] bg-background" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 sm:flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button size="sm" variant="outline" onClick={handlePrint} className="h-9 text-xs gap-1 px-2.5 sm:px-3 bg-background font-medium">
              <Printer className="h-3.5 w-3.5" /> Print
            </Button>
            <Button size="sm" variant="outline" onClick={exportToCSV} className="h-9 text-xs gap-1 px-2.5 sm:px-3 bg-background font-medium">
              <FileDown className="h-3.5 w-3.5" /> Excel
            </Button>
            <Button size="sm" variant="outline" onClick={handleOpenAddLog} className="h-9 text-xs gap-1 px-2.5 sm:px-3 bg-primary/10 text-primary border-primary/30 hover:bg-primary hover:text-primary-foreground font-semibold">
              <PlusCircle className="h-3.5 w-3.5" /> Add Log
            </Button>
          </div>
        </div>

        {editingLogId && (
          <Card className="p-3 sm:p-4 border-primary/30 bg-muted/20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-end w-full min-w-0">
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">Date</Label>
              <Input type="date" value={logDate} disabled={editingLogId !== "new"} onChange={(e) => setLogDate(e.target.value)} className="h-9 text-xs bg-background" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">Check-In</Label>
              <Input type="text" placeholder="09:00" value={logCheckIn} onChange={(e) => setLogCheckIn(e.target.value)} className="h-9 text-xs font-mono bg-background" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">Check-Out</Label>
              <Input type="text" placeholder="17:00" value={logCheckOut} onChange={(e) => setLogCheckOut(e.target.value)} className="h-9 text-xs font-mono bg-background" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-bold">Status</Label>
              <Select value={logStatus} onValueChange={setLogStatus}>
                <SelectTrigger className="h-9 text-xs bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Present">Present</SelectItem>
                  <SelectItem value="Late">Late</SelectItem>
                  <SelectItem value="Half Day">Half Day</SelectItem>
                  <SelectItem value="Absent">Absent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 justify-end sm:col-span-2 md:col-span-1">
              <Button size="sm" variant="outline" className="h-9 text-xs flex-1 bg-background" onClick={() => setEditingLogId(null)}>Cancel</Button>
              <Button size="sm" className="h-9 text-xs flex-1 bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSaveLog}>Save</Button>
            </div>
          </Card>
        )}

        {/* Mobile View: Clean Responsive Cards */}
        <div className="sm:hidden space-y-2.5 w-full min-w-0">
          {isHistLoading ? (
            <div className="p-6 text-center text-xs text-muted-foreground">Loading logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground border rounded-xl bg-muted/10">
              No attendance logs found matching filters
            </div>
          ) : (
            filteredLogs.map((r, i) => {
              const durationVal = calculateDuration(r.checkIn, r.checkOut);
              const netDurationVal = Math.max(0, durationVal - (r.breakTime || 0) / 60);
              const formattedDurationStr = r.checkIn && r.checkOut ? formatDuration(netDurationVal) : "—";
              
              let badgeClass = "bg-muted text-muted-foreground";
              if (r.status === "Present") badgeClass = "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border-emerald-200/50";
              else if (r.status === "Late") badgeClass = "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border-amber-200/50";
              else if (r.status === "Absent") badgeClass = "bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-400 border-red-200/50";
              else if (r.status === "Half Day") badgeClass = "bg-primary/10 text-primary border-primary/20";
              else if (r.status === "On Leave") badgeClass = "bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-400 border-blue-200/50";

              return (
                <div key={i} className="p-3 rounded-xl border bg-card shadow-xs space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm text-foreground">{r.date}</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeClass}`}>
                        {r.status}
                      </span>
                      {r.isApproved ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">Approved</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">Pending</Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-border/40">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Time In - Out</span>
                      <span className="font-mono font-medium">{r.checkIn || "—"} to {r.checkOut || "—"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Work & Break</span>
                      <span className="font-medium">{formattedDurationStr} {r.breakTime ? `(${r.breakTime}m brk)` : ""}</span>
                    </div>
                  </div>

                  <div className="flex justify-end gap-1 pt-1.5 border-t border-border/40">
                    {!r.isApproved && (
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-emerald-600 hover:text-emerald-700 gap-1 px-2" onClick={() => handleApproveAttendance(r._id)}>
                        <Check className="h-3.5 w-3.5" /> Approve
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1 px-2" onClick={() => handleOpenEditLog(r)}>
                      <Edit className="h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive gap-1 px-2" onClick={() => handleDeleteAttendance(r._id)}>
                      <Trash className="h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop / Tablet Table View */}
        <div className="hidden sm:block rounded-lg border overflow-x-auto w-full min-w-0 max-w-full">
          <Table className="min-w-[650px] w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Check-In</TableHead>
                <TableHead>Check-Out</TableHead>
                <TableHead>Working Hours</TableHead>
                <TableHead>Break</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Approval</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isHistLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6">Loading logs...</TableCell>
                </TableRow>
              ) : filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No attendance logs found matching filters</TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((r, i) => {
                  const durationVal = calculateDuration(r.checkIn, r.checkOut);
                  const netDurationVal = Math.max(0, durationVal - (r.breakTime || 0) / 60);
                  const formattedDurationStr = r.checkIn && r.checkOut ? formatDuration(netDurationVal) : "—";
                  
                  let badgeClass = "bg-muted text-muted-foreground";
                  if (r.status === "Present") badgeClass = "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border-emerald-200/50";
                  else if (r.status === "Late") badgeClass = "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 border-amber-200/50";
                  else if (r.status === "Absent") badgeClass = "bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-400 border-red-200/50";
                  else if (r.status === "Half Day") badgeClass = "bg-primary/10 text-primary border-primary/20";
                  else if (r.status === "On Leave") badgeClass = "bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-400 border-blue-200/50";

                  return (
                    <TableRow key={i}>
                      <TableCell className="font-semibold">{r.date}</TableCell>
                      <TableCell className="font-mono text-xs">{r.checkIn || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{r.checkOut || "—"}</TableCell>
                      <TableCell className="font-medium">{formattedDurationStr}</TableCell>
                      <TableCell className="text-orange-655 font-semibold">{r.breakTime ? `${r.breakTime}m` : "—"}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold inline-block ${badgeClass} font-sans`}>
                          {r.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {r.isApproved ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">Approved</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">Pending Approval</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {!r.isApproved && (
                            <Button size="sm" variant="ghost" className="h-8 w-8 text-emerald-600 hover:text-emerald-700" onClick={() => handleApproveAttendance(r._id)}>
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleOpenEditLog(r)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteAttendance(r._id)}>
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  const renderOutsideClinicHistory = () => {
    const totalMinutes = outsideLogs.reduce((acc, curr) => acc + (curr.duration || 0), 0);
    const formatTimestamp = (ts: string) => {
      if (!ts) return "—";
      if (isNaN(Number(ts))) return ts;
      return new Date(Number(ts)).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    };

    return (
      <div className="space-y-4 w-full min-w-0">
        {/* Uniform Summary Cards (Fixed same height, not big, not small) */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full min-w-0">
          <Card className="h-[78px] sm:h-[84px] bg-card border border-border/70 p-2 sm:p-2.5 text-center min-w-0 shadow-xs flex flex-col justify-center items-center">
            <div className="h-6 sm:h-7 flex items-center justify-center w-full">
              <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center leading-tight">Total Outings</p>
            </div>
            <p className="text-lg sm:text-xl font-bold text-foreground leading-none mt-1">{outsideLogs.length}</p>
          </Card>
          <Card className="h-[78px] sm:h-[84px] bg-card border border-border/70 p-2 sm:p-2.5 text-center min-w-0 shadow-xs flex flex-col justify-center items-center">
            <div className="h-6 sm:h-7 flex items-center justify-center w-full">
              <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center leading-tight">Total Outside Time</p>
            </div>
            <p className="text-lg sm:text-xl font-bold text-foreground leading-none mt-1">{totalMinutes}m</p>
          </Card>
          <Card className="h-[78px] sm:h-[84px] bg-card border border-border/70 p-2 sm:p-2.5 text-center min-w-0 shadow-xs flex flex-col justify-center items-center">
            <div className="h-6 sm:h-7 flex items-center justify-center w-full">
              <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center leading-tight">Average Outing</p>
            </div>
            <p className="text-lg sm:text-xl font-bold text-foreground leading-none mt-1">
              {outsideLogs.length > 0 ? Math.round(totalMinutes / outsideLogs.length) : 0}m
            </p>
          </Card>
          <Card className="h-[78px] sm:h-[84px] bg-card border border-border/70 p-2 sm:p-2.5 text-center min-w-0 shadow-xs flex flex-col justify-center items-center">
            <div className="h-6 sm:h-7 flex items-center justify-center w-full">
              <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center leading-tight">Active Outings</p>
            </div>
            <p className="text-lg sm:text-xl font-bold text-foreground leading-none mt-1">
              {outsideLogs.filter(l => !l.end).length}
            </p>
          </Card>
        </div>

        {/* Mobile View: Clean Responsive Cards */}
        <div className="sm:hidden space-y-2.5 w-full min-w-0">
          {outsideLogs.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground border rounded-xl bg-muted/10">
              No stepped out clinic records found for this employee
            </div>
          ) : (
            outsideLogs.map((log, i) => (
              <div key={i} className="p-3 rounded-xl border bg-card shadow-xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sm text-foreground">{log.date}</span>
                  <Badge variant="outline" className="text-[10px] font-semibold">
                    {log.duration ? `${log.duration} Minutes` : "In Progress"}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-border/40">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Exit Time</span>
                    <span className="font-mono font-medium">{formatTimestamp(log.start)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Return Time</span>
                    <span className="font-mono font-medium">{formatTimestamp(log.end)}</span>
                  </div>
                </div>
                {log.reason && (
                  <div className="pt-1.5 border-t border-border/40 text-xs">
                    <span className="text-muted-foreground block text-[10px]">Reason</span>
                    <p className="font-medium text-foreground">{log.reason}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Desktop / Tablet Table View */}
        <div className="hidden sm:block rounded-lg border overflow-x-auto w-full min-w-0 max-w-full">
          <Table className="min-w-[550px] w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Exit Time</TableHead>
                <TableHead>Return Time</TableHead>
                <TableHead>Total Outside Time</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {outsideLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No stepped out clinic records found for this employee</TableCell>
                </TableRow>
              ) : (
                outsideLogs.map((log, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-semibold">{log.date}</TableCell>
                    <TableCell className="font-mono text-xs">{formatTimestamp(log.start)}</TableCell>
                    <TableCell className="font-mono text-xs">{formatTimestamp(log.end)}</TableCell>
                    <TableCell className="font-bold">{log.duration ? `${log.duration} Minutes` : "In Progress"}</TableCell>
                    <TableCell className="font-medium text-neutral-700">{log.reason}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  const renderAuditLogHistory = () => {
    const updateCount = auditLogs.filter(l => l.action.toLowerCase().includes("update") || l.action.toLowerCase().includes("edit") || l.action.toLowerCase().includes("modify")).length;
    const createCount = auditLogs.filter(l => l.action.toLowerCase().includes("create") || l.action.toLowerCase().includes("add")).length;

    return (
      <div className="space-y-4 w-full min-w-0">
        {/* Uniform Summary Cards (Fixed same height, not big, not small) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 w-full min-w-0">
          <Card className="h-[78px] sm:h-[84px] bg-card border border-border/70 p-2 sm:p-2.5 text-center min-w-0 shadow-xs flex flex-col justify-center items-center">
            <div className="h-6 sm:h-7 flex items-center justify-center w-full">
              <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center leading-tight">Total Logs</p>
            </div>
            <p className="text-lg sm:text-xl font-bold text-foreground leading-none mt-1">{auditLogs.length}</p>
          </Card>
          <Card className="h-[78px] sm:h-[84px] bg-card border border-border/70 p-2 sm:p-2.5 text-center min-w-0 shadow-xs flex flex-col justify-center items-center">
            <div className="h-6 sm:h-7 flex items-center justify-center w-full">
              <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center leading-tight">Created</p>
            </div>
            <p className="text-lg sm:text-xl font-bold text-foreground leading-none mt-1">{createCount}</p>
          </Card>
          <Card className="h-[78px] sm:h-[84px] bg-card border border-border/70 p-2 sm:p-2.5 text-center min-w-0 shadow-xs flex flex-col justify-center items-center">
            <div className="h-6 sm:h-7 flex items-center justify-center w-full">
              <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center leading-tight">Updated</p>
            </div>
            <p className="text-lg sm:text-xl font-bold text-foreground leading-none mt-1">{updateCount}</p>
          </Card>
          <Card className="h-[78px] sm:h-[84px] bg-card border border-border/70 p-2 sm:p-2.5 text-center min-w-0 shadow-xs flex flex-col justify-center items-center">
            <div className="h-6 sm:h-7 flex items-center justify-center w-full">
              <p className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-center leading-tight">Deleted</p>
            </div>
            <p className="text-lg sm:text-xl font-bold text-foreground leading-none mt-1">{Math.max(0, auditLogs.length - createCount - updateCount)}</p>
          </Card>
        </div>

        {/* Mobile View: Clean Responsive Cards */}
        <div className="sm:hidden space-y-2.5 w-full min-w-0">
          {auditLogs.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground border rounded-xl bg-muted/10">
              No audit logs found for this employee
            </div>
          ) : (
            auditLogs.map((log, i) => {
              const dateStr = new Date(log.timestamp).toLocaleString();
              return (
                <div key={i} className="p-3 rounded-xl border bg-card shadow-xs space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-[10px] font-semibold">{log.action}</Badge>
                    <span className="text-[11px] text-muted-foreground font-medium">{dateStr}</span>
                  </div>
                  <div className="text-xs pt-1.5 border-t border-border/40">
                    <span className="text-muted-foreground block text-[10px]">Performed By</span>
                    <span className="font-semibold text-foreground">{log.performedByName || "Admin"}</span>
                  </div>
                  <div className="text-xs pt-1 border-t border-border/40">
                    <span className="text-muted-foreground block text-[10px]">Activity</span>
                    <div className="mt-0.5">
                      {log.previousValue && log.newValue ? (
                        <span className="text-muted-foreground">Modified values: <span className="font-mono text-[10px] break-all">{log.newValue}</span></span>
                      ) : log.newValue ? (
                        <span className="text-muted-foreground">Created record</span>
                      ) : (
                        <span className="text-muted-foreground">Deleted record</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop / Tablet Table View */}
        <div className="hidden sm:block rounded-lg border overflow-x-auto w-full min-w-0 max-w-full">
          <Table className="min-w-[500px] w-full">
            <TableHeader>
              <TableRow>
                <TableHead>Date & Time</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead>Changes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No audit logs found for this employee</TableCell>
                </TableRow>
              ) : (
                auditLogs.map((log, i) => {
                  const dateStr = new Date(log.timestamp).toLocaleString();
                  return (
                    <TableRow key={i}>
                      <TableCell className="font-medium whitespace-nowrap">{dateStr}</TableCell>
                      <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                      <TableCell>{log.performedByName}</TableCell>
                      <TableCell className="max-w-xs truncate" title={`Prev: ${log.previousValue}\nNew: ${log.newValue}`}>
                        {log.previousValue && log.newValue ? (
                          <span className="text-xs text-muted-foreground">Modified values</span>
                        ) : log.newValue ? (
                          <span className="text-xs text-emerald-600">Created record</span>
                        ) : (
                          <span className="text-xs text-red-600">Deleted record</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  };

  const renderEditForm = () => {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-base">Full Name *</Label>
            <Input className="h-10 text-base" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-base">Email *</Label>
            <Input className="h-10 text-base" type="email" placeholder="john@navadia.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-base">Mobile Number</Label>
            <Input className="h-10 text-base" placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-base">Aadhaar Card No.</Label>
            <Input className="h-10 text-base" placeholder="1234 5678 9012" value={aadhaarNo} onChange={(e) => setAadhaarNo(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-base">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger className="h-10 text-base"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Dentist">Dentist</SelectItem>
                <SelectItem value="Staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-base">Address</Label>
          <Input className="h-10 text-base" placeholder="123 Street Name" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-base">City</Label>
            <Input className="h-10 text-base" placeholder="Surat" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-base">State</Label>
            <Input className="h-10 text-base" placeholder="Gujarat" value={stateName} onChange={(e) => setStateName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-base">Country</Label>
            <Input className="h-10 text-base" placeholder="India" value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>
        </div>

        {role.toLowerCase() === "dentist" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-base">Specialization</Label>
              <Input className="h-10 text-base" placeholder="e.g. Endodontics" value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-base">License No.</Label>
              <Input className="h-10 text-base" placeholder="DEN-2026-XXX" value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} />
            </div>
          </div>
        )}
        <Button onClick={handleSubmitForm} className="w-full h-10 text-base mt-2">Confirm Edit {role}</Button>
      </div>
    );
  };

  const renderAddForm = () => {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-base">Full Name *</Label>
            <Input className="h-10 text-base" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-base">Email *</Label>
            <Input className="h-10 text-base" type="email" placeholder="john@navadia.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-base">Password *</Label>
            <Input className="h-10 text-base" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-base">Mobile Number</Label>
            <Input className="h-10 text-base" placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-base">Aadhaar Card No.</Label>
            <Input className="h-10 text-base" placeholder="1234 5678 9012" value={aadhaarNo} onChange={(e) => setAadhaarNo(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-base">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger className="h-10 text-base"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Dentist">Dentist</SelectItem>
                <SelectItem value="Staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-base">Address</Label>
          <Input className="h-10 text-base" placeholder="123 Street Name" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="text-base">City</Label>
            <Input className="h-10 text-base" placeholder="Surat" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-base">State</Label>
            <Input className="h-10 text-base" placeholder="Gujarat" value={stateName} onChange={(e) => setStateName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label className="text-base">Country</Label>
            <Input className="h-10 text-base" placeholder="India" value={country} onChange={(e) => setCountry(e.target.value)} />
          </div>
        </div>

        {role.toLowerCase() === "dentist" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-base">Specialization</Label>
              <Input className="h-10 text-base" placeholder="e.g. Endodontics" value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-base">License No.</Label>
              <Input className="h-10 text-base" placeholder="DEN-2026-XXX" value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} />
            </div>
          </div>
        )}
        <Button onClick={handleSubmitForm} className="w-full h-10 text-base mt-2">Confirm Add {role}</Button>
      </div>
    );
  };

  const resetForm = () => {
    setName(""); setEmail(""); setPhone(""); setRole("Staff"); setPassword(""); 
    setSpecialization(""); setLicenseNo(""); setAadhaarNo(""); setAddress(""); 
    setCity(""); setStateName(""); setCountry("India");
    setEditId(null);
  };

  const handleOpenAddDialog = (selectedRole: UserRole) => {
    resetForm();
    setRole(selectedRole);
    setOpen(true);
  };

  const handleOpenEditDialog = (user: User) => {
    resetForm();
    setEditId(user.id);
    setName(user.name || "");
    setEmail(user.email || "");
    setPhone(user.phone || "");
    setRole(user.role);
    setSpecialization(user.specialization || "");
    setLicenseNo(user.licenseNo || "");
    setAadhaarNo(user.aadhaarNo || "");
    setAddress(user.address || "");
    setCity(user.city || "");
    setStateName(user.state || "");
    setCountry(user.country || "India");
    setOpen(true);
  };

  const handleSave = async () => {
    if (!name || !email || (!editId && !password)) {
      toast({ title: "Error", description: "Name, email, and password are required", variant: "destructive" });
      return;
    }

    const payload = {
      name, 
      email, 
      role, 
      phone, 
      aadhaarNo,
      address,
      city,
      state: stateName,
      country,
      specialization: role.toLowerCase() === "dentist" ? specialization : undefined, 
      licenseNo: role.toLowerCase() === "dentist" ? licenseNo : undefined 
    };

    if (editId) {
      const res = await editStaffMember(editId, payload);
      if (res.success) {
        toast({ title: "Success", description: res.message });
        setOpen(false);
      } else {
        toast({ title: "Error", description: res.message, variant: "destructive" });
      }
    } else {
      const res = await addStaffMember({ ...payload, password });
      if (res.success) {
        toast({ title: "Success", description: res.message });
        setOpen(false);
      } else {
        toast({ title: "Error", description: res.message, variant: "destructive" });
      }
    }
  };

  const handleSubmitForm = () => {
    if (!name || !email || (!editId && !password)) {
      toast({ title: "Error", description: "Name, email, and password are required", variant: "destructive" });
      return;
    }

    if (editId) {
      setUpdateConfirmOpen(true);
    } else {
      handleSave();
    }
  };

  const handleConfirmUpdate = () => {
    setUpdateConfirmOpen(false);
    handleSave();
  };

  const handleRemove = (id: string, memberName: string) => {
    setMemberToDelete({ id, name: memberName });
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!memberToDelete) return;
    const { id, name: memberName } = memberToDelete;
    setDeleteConfirmOpen(false);
    const res = await removeStaffMember(id);
    if (res.success) {
      toast({ title: "Staff removed", description: `${memberName} has been removed` });
    } else {
      toast({ title: "Error", description: res.message, variant: "destructive" });
    }
    setMemberToDelete(null);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl">Employee Management</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage team members, Dentists, and support Staff roles</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:items-center gap-2">
          <Button size="sm" variant="default" className="gap-1.5 text-base w-full lg:w-auto" onClick={() => handleOpenAddDialog("Dentist") }>
            <Stethoscope className="h-4 w-4" /> Add Dentist
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-base w-full lg:w-auto" onClick={() => handleOpenAddDialog("Staff") }>
            <Plus className="h-4 w-4" /> Add Staff
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={`${editId ? 'sm:max-w-6xl' : 'sm:max-w-xl'} w-[calc(100vw-1.5rem)] sm:w-full max-h-[calc(100svh-2rem)] overflow-y-auto p-3.5 sm:p-6 rounded-xl`}>
          <DialogHeader className="pr-8 text-left sm:text-left">
            <DialogTitle className="text-base sm:text-lg font-bold font-sans truncate pr-2">
              {editId ? `Employee Dashboard: ${name}` : `Add New ${role}`}
            </DialogTitle>
          </DialogHeader>
          
          {editId ? (
            <Tabs defaultValue="details" className="w-full min-w-0 mt-3">
              <div className="w-full px-1 sm:px-0 pb-1">
                <TabsList className="grid grid-cols-4 w-full p-1.5 bg-muted/60 rounded-xl h-auto gap-1">
                  <TabsTrigger
                    value="details"
                    className="h-9 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground transition-all flex items-center justify-center"
                  >
                    <span className="sm:hidden">Profile</span>
                    <span className="hidden sm:inline">Profile Details</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="history"
                    className="h-9 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground transition-all flex items-center justify-center"
                  >
                    <span className="sm:hidden">Attendance</span>
                    <span className="hidden sm:inline">Attendance History</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="outside"
                    className="h-9 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground transition-all flex items-center justify-center"
                  >
                    <span className="sm:hidden">Outside</span>
                    <span className="hidden sm:inline">Outside Clinic History</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="audit"
                    className="h-9 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-foreground text-muted-foreground transition-all flex items-center justify-center"
                  >
                    <span className="sm:hidden">Audit</span>
                    <span className="hidden sm:inline">Audit Trail</span>
                  </TabsTrigger>
                </TabsList>
              </div>
              
              <TabsContent value="details" className="mt-3 min-w-0 w-full focus-visible:outline-none">
                {renderEditForm()}
              </TabsContent>
              
              <TabsContent value="history" className="mt-3 min-w-0 w-full focus-visible:outline-none">
                {renderAttendanceHistory()}
              </TabsContent>

              <TabsContent value="outside" className="mt-3 min-w-0 w-full focus-visible:outline-none">
                {renderOutsideClinicHistory()}
              </TabsContent>

              <TabsContent value="audit" className="mt-3 min-w-0 w-full focus-visible:outline-none">
                {renderAuditLogHistory()}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="space-y-4 mt-2">
              {renderAddForm()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm rounded-lg p-6">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription className="pt-2 text-base">
              Are you sure you want to remove <span className="font-semibold text-foreground">{memberToDelete?.name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end mt-4">
            <Button variant="outline" size="sm" onClick={() => { setDeleteConfirmOpen(false); setMemberToDelete(null); }}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleConfirmDelete}>
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={updateConfirmOpen} onOpenChange={setUpdateConfirmOpen}>
        <DialogContent className="max-w-sm rounded-lg p-6">
          <DialogHeader>
            <DialogTitle>Confirm Update</DialogTitle>
            <DialogDescription className="pt-2 text-base">
              Are you sure you want to update the details of <span className="font-semibold text-foreground">{name}</span>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end mt-4">
            <Button variant="outline" size="sm" onClick={() => setUpdateConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="default" size="sm" onClick={handleConfirmUpdate}>
              Confirm Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Dentists Registered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl sm:text-4xl font-bold text-primary">{staffMembers.filter((u) => u.role.toLowerCase() === "dentist").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Staff & Support Registered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl sm:text-4xl font-bold text-secondary">{staffMembers.filter((u) => u.role.toLowerCase() === "staff").length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full sm:w-[220px] lg:w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="dentist">Dentists</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 lg:hidden">
          {filtered.length === 0 ? (
            <div className="rounded-lg border bg-muted/20 py-8 text-center text-base text-muted-foreground">No staff members found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map((member) => (
                <div 
                  key={member.id} 
                  onClick={() => handleOpenEditDialog(member)}
                  className="rounded-lg border bg-card p-4 shadow-sm hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold">{member.name}</p>
                      <p className="mt-1 break-all text-sm text-muted-foreground">{member.email}</p>
                    </div>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground" onClick={() => handleOpenEditDialog(member)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-destructive hover:text-destructive" onClick={() => handleRemove(member.id, member.name)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Phone</span>
                      <span className="text-right font-medium">{member.phone || "-"}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Role</span>
                      <Badge variant={roleBadgeVariant[member.role] || "outline"} className="gap-1 capitalize">
                        {roleIcons[member.role]}
                        {member.role}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">Specialization</span>
                      <span className="text-right font-medium">{member.specialization || "-"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        <CardContent className="hidden p-0 lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-sm sm:text-base font-medium">Name</TableHead>
                <TableHead className="text-sm sm:text-base font-medium">Email</TableHead>
                <TableHead className="text-sm sm:text-base font-medium">Phone</TableHead>
                <TableHead className="text-sm sm:text-base font-medium">Role</TableHead>
                <TableHead className="text-sm sm:text-base font-medium">Specialization</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8 text-base">No staff members found</TableCell>
                </TableRow>
              ) : (
                filtered.map((member) => (
                  <TableRow 
                    key={member.id} 
                    onClick={() => handleOpenEditDialog(member)}
                    className="cursor-pointer hover:bg-muted/40 transition-colors"
                  >
                    <TableCell className="font-medium text-base">{member.name}</TableCell>
                    <TableCell className="text-muted-foreground text-base">{member.email}</TableCell>
                    <TableCell className="text-muted-foreground text-base">{member.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant[member.role] || "outline"} className="gap-1 capitalize">
                        {roleIcons[member.role]}
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-base">{member.specialization || "—"}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleOpenEditDialog(member)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleRemove(member.id, member.name)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
