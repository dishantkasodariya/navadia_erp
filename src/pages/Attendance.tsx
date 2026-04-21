import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Clock, LogIn, LogOut, Search, Plus, Calendar, UserCheck, UserX, History, FileText, ChevronRight, Users } from "lucide-react";
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
const lastWeek = [1, 2, 3, 4, 5].map(d => {
  const date = new Date();
  date.setDate(date.getDate() - d);
  return date.toISOString().split("T")[0];
});

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

  const filtered = records.filter((r) => {
    const matchSearch = r.staffName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    const matchDate = r.date === selectedDate;
    const matchRole = roleFilter === "all" || r.role === roleFilter;
    return matchSearch && matchStatus && matchDate && matchRole;
  });

  const presentCount = records.filter((r) => r.date === selectedDate && (r.status === "present" || r.status === "late")).length;
  const absentCount = records.filter((r) => r.date === selectedDate && r.status === "absent").length;
  const lateCount = records.filter((r) => r.date === selectedDate && r.status === "late").length;

  const handleCheckIn = (id: string) => {
    const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    setRecords((prev) => prev.map((r) => r.id === id ? { ...r, checkIn: now, status: now > "09:00" ? "late" : "present" } : r));
    toast({ title: "Checked In", description: `Check-in recorded at ${now}` });
  };

  const handleCheckOut = (id: string) => {
    const now = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
    setRecords((prev) => prev.map((r) => r.id === id ? { ...r, checkOut: now } : r));
    toast({ title: "Checked Out", description: `Check-out recorded at ${now}` });
  };

  const handleAdd = () => {
    const staff = allUsers.find((u) => u.id === formData.staffId);
    if (!staff) return;
    const newRecord: AttendanceRecord = {
      id: crypto.randomUUID(),
      staffId: staff.id,
      staffName: staff.name,
      role: staff.role,
      date: selectedDate,
      checkIn: formData.status === "present" ? new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : null,
      checkOut: null,
      status: formData.status,
      notes: formData.notes,
    };
    setRecords((prev) => [...prev, newRecord]);
    setDialogOpen(false);
    setFormData({ staffId: "", status: "present", notes: "" });
    toast({ title: "Record Added" });
  };

  const handleUpdate = () => {
    if (!editRecord) return;
    setRecords((prev) => prev.map((r) => r.id === editRecord.id ? editRecord : r));
    setEditRecord(null);
    toast({ title: "Record Updated" });
  };

  const handleDelete = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    toast({ title: "Record Deleted", variant: "destructive" });
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

  const staffOptions = allUsers.filter((u) => u.role !== "admin");

  const isAdmin = !!(user && user.role === "admin");
  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);
  
  // Calculate summary for Admin
  const staffSummary = staffOptions
    .filter(staff => roleFilter === "all" || staff.role === roleFilter)
    .map(staff => {
      const staffRecords = (records || []).filter(r => r.staffId === staff.id);
      const todayRecord = staffRecords.find(r => r.date === today);
    
    // Monthly hours calculation with safety checks
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
        console.error("Error calculating hours for record:", r, e);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif">Attendance</h1>
          <p className="text-muted-foreground text-sm mt-1">Track daily staff attendance</p>
        </div>
        {(isAdmin || user?.role === "receptionist") && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Mark Attendance</Button>
            </DialogTrigger>
            <DialogContent>
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

      {isAdmin && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="daily" className="gap-2"><Clock className="h-4 w-4" /> Daily Log</TabsTrigger>
            <TabsTrigger value="overview" className="gap-2"><Users className="h-4 w-4" /> Staff Overview</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Monthly Payroll Readiness</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{staffOptions.length} Staff</div>
                  <p className="text-xs text-muted-foreground mt-1">Ready for payment processing</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Monthly Hours</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatDuration(staffSummary.reduce((acc, s) => acc + s.monthlyHours, 0))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Across all departments</p>
                </CardContent>
              </Card>
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Payroll Cycle</CardTitle></CardHeader>
                <CardContent>
                  <div className="text-lg font-semibold">{format(new Date(), "MMMM yyyy")}</div>
                  <p className="text-xs text-muted-foreground mt-1">Active period</p>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="All Roles" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="dentist">Dentists Only</SelectItem>
                  <SelectItem value="staff">Other Staff</SelectItem>
                  <SelectItem value="receptionist">Receptionists</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4">
              {staffSummary.map((staff) => (
                <Card key={staff.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {staff.name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="font-medium">{staff.name || "Unknown Staff"}</p>
                        <p className="text-xs text-muted-foreground capitalize">{staff.role}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:flex items-center gap-4 sm:gap-8 text-center sm:text-right">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Today</p>
                        <p className="text-sm font-semibold">{formatDuration(staff.todayHours)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">This Month</p>
                        <p className="text-sm font-semibold text-primary">{formatDuration(staff.monthlyHours)}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setViewStaffId(staff.id)} className="col-span-2 sm:col-auto gap-1">
                        <History className="h-3.5 w-3.5" /> History
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="daily">
            {/* Original content moves here */}
            {renderDailyLog()}
          </TabsContent>
        </Tabs>
      )}

      {!isAdmin && renderDailyLog()}

      {/* Staff History Modal */}
      <Dialog open={!!viewStaffId} onOpenChange={(o) => !o && setViewStaffId(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Attendance History: {selectedStaffName}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto mt-4 px-1">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background border-b z-10">
                <tr>
                  <th className="text-left py-2 font-medium">Date</th>
                  <th className="text-left py-2 font-medium">Check In</th>
                  <th className="text-left py-2 font-medium">Check Out</th>
                  <th className="text-left py-2 font-medium">Duration</th>
                  <th className="text-left py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {selectedStaffHistory.map((h) => (
                  <tr key={h.id} className="hover:bg-muted/30">
                    <td className="py-3 font-medium">{h.date}</td>
                    <td className="py-3 font-mono text-xs text-muted-foreground">{h.checkIn || "—"}</td>
                    <td className="py-3 font-mono text-xs text-muted-foreground">{h.checkOut || "—"}</td>
                    <td className="py-3 font-semibold">{formatDuration(calculateDuration(h.checkIn, h.checkOut))}</td>
                    <td className="py-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor(h.status)}`}>
                        {h.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {selectedStaffHistory.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No records found for this user</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-6 pt-4 border-t flex flex-col gap-2">
            <div className="flex justify-between items-center bg-primary/5 p-3 rounded-lg">
              <span className="text-sm font-medium">Total Accumulated Hours (All Time)</span>
              <span className="text-lg font-bold text-primary">
                {formatDuration(selectedStaffHistory.reduce((acc, h) => acc + calculateDuration(h.checkIn, h.checkOut), 0))}
              </span>
            </div>
            <Button variant="secondary" className="w-full mt-2" onClick={() => {
              toast({ title: "Export Scheduled", description: "The records will be sent to your email in PDF format." });
            }}>
              Generate Payroll Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  function renderDailyLog() {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-secondary/15 flex items-center justify-center"><UserCheck className="h-5 w-5 text-secondary" /></div>
              <div><p className="text-2xl font-bold font-serif">{presentCount}</p><p className="text-xs text-muted-foreground">Present</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/15 flex items-center justify-center"><UserX className="h-5 w-5 text-destructive" /></div>
              <div><p className="text-2xl font-bold font-serif">{absentCount}</p><p className="text-xs text-muted-foreground">Absent</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center"><Clock className="h-5 w-5 text-accent" /></div>
              <div><p className="text-2xl font-bold font-serif">{lateCount}</p><p className="text-xs text-muted-foreground">Late</p></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><Calendar className="h-5 w-5 text-primary" /></div>
              <div><p className="text-2xl font-bold font-serif">{selectedDate === today ? "Today" : selectedDate}</p><p className="text-xs text-muted-foreground">Date</p></div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search staff..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="dentist">Dentists</SelectItem>
              <SelectItem value="staff">Other Staff</SelectItem>
              <SelectItem value="receptionist">Receptionist</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="present">Present</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
              <SelectItem value="late">Late</SelectItem>
              <SelectItem value="half-day">Half Day</SelectItem>
              <SelectItem value="on-leave">On Leave</SelectItem>
            </SelectContent>
          </Select>
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full sm:w-[170px]" />
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left p-3 font-medium text-muted-foreground">Staff</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Role</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Check In</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Check Out</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="p-3 font-medium">{r.staffName}</td>
                      <td className="p-3 capitalize text-muted-foreground hidden sm:table-cell">{r.role}</td>
                      <td className="p-3 font-mono text-xs">{r.checkIn || "—"}</td>
                      <td className="p-3 font-mono text-xs hidden md:table-cell">{r.checkOut || "—"}</td>
                      <td className="p-3"><span className={`text-xs px-2 py-1 rounded-full ${statusColor(r.status)}`}>{r.status}</span></td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {!r.checkIn && (
                            <Button variant="ghost" size="sm" onClick={() => handleCheckIn(r.id)} title="Check In"><LogIn className="h-3.5 w-3.5" /></Button>
                          )}
                          {r.checkIn && !r.checkOut && (
                            <Button variant="ghost" size="sm" onClick={() => handleCheckOut(r.id)} title="Check Out"><LogOut className="h-3.5 w-3.5" /></Button>
                          )}
                          {(isAdmin) && (
                            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(r.id)}>✕</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No attendance records found</td></tr>
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
