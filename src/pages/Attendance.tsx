import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { Clock, LogIn, LogOut, Search, Plus, Calendar, UserCheck, UserX } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

const INITIAL_RECORDS: AttendanceRecord[] = [
  { id: "1", staffId: "2", staffName: "Dr. Michael Ross", role: "dentist", date: today, checkIn: "08:55", checkOut: null, status: "present", notes: "" },
  { id: "2", staffId: "3", staffName: "Dr. Sofia Patel", role: "dentist", date: today, checkIn: "09:15", checkOut: null, status: "late", notes: "Traffic delay" },
  { id: "3", staffId: "4", staffName: "Emily Carter", role: "receptionist", date: today, checkIn: "08:50", checkOut: null, status: "present", notes: "" },
  { id: "4", staffId: "5", staffName: "James Wilson", role: "staff", date: today, checkIn: null, checkOut: null, status: "absent", notes: "Sick leave" },
];

export default function Attendance() {
  const { user, allUsers } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<AttendanceRecord[]>(INITIAL_RECORDS);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedDate, setSelectedDate] = useState(today);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);

  const [formData, setFormData] = useState({ staffId: "", status: "present" as AttendanceRecord["status"], notes: "" });

  const filtered = records.filter((r) => {
    const matchSearch = r.staffName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    const matchDate = r.date === selectedDate;
    return matchSearch && matchStatus && matchDate;
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif">Attendance</h1>
          <p className="text-muted-foreground text-sm mt-1">Track daily staff attendance</p>
        </div>
        {(user?.role === "admin" || user?.role === "receptionist") && (
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
                        {(user?.role === "admin") && (
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

      {/* Edit Dialog */}
      <Dialog open={!!editRecord} onOpenChange={(o) => !o && setEditRecord(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Attendance</DialogTitle></DialogHeader>
          {editRecord && (
            <div className="space-y-4 mt-2">
              <p className="font-medium">{editRecord.staffName}</p>
              <div>
                <Label>Status</Label>
                <Select value={editRecord.status} onValueChange={(v: any) => setEditRecord({ ...editRecord, status: v })}>
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
                <Input value={editRecord.notes} onChange={(e) => setEditRecord({ ...editRecord, notes: e.target.value })} />
              </div>
              <Button onClick={handleUpdate} className="w-full">Update</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
