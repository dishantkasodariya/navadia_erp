import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Calendar, CheckCircle, XCircle, Clock, Trash2 } from "lucide-react";

interface LeaveRequest {
  id: string;
  staffId: string;
  staffName: string;
  role: string;
  leaveType: "casual" | "sick" | "earned" | "unpaid" | "maternity";
  startDate: string;
  endDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  appliedOn: string;
  approvedBy?: string;
}

const today = new Date().toISOString().split("T")[0];

const INITIAL_REQUESTS: LeaveRequest[] = [
  { id: "1", staffId: "5", staffName: "James Wilson", role: "staff", leaveType: "sick", startDate: today, endDate: today, reason: "Not feeling well, fever", status: "pending", appliedOn: today },
  { id: "2", staffId: "4", staffName: "Emily Carter", role: "receptionist", leaveType: "casual", startDate: "2026-04-20", endDate: "2026-04-21", reason: "Family function", status: "approved", appliedOn: "2026-04-10", approvedBy: "Dr. Admin" },
  { id: "3", staffId: "3", staffName: "Dr. Sofia Patel", role: "dentist", leaveType: "earned", startDate: "2026-04-25", endDate: "2026-04-28", reason: "Conference travel", status: "pending", appliedOn: "2026-04-12" },
];

export default function LeaveRequests() {
  const { user, allUsers } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<LeaveRequest[]>(INITIAL_REQUESTS);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const [form, setForm] = useState({ leaveType: "casual" as LeaveRequest["leaveType"], startDate: today, endDate: today, reason: "" });

  const canApprove = user?.role === "admin" || user?.role === "dentist";

  const filtered = requests.filter((r) => {
    const matchSearch = r.staffName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    if (user?.role === "staff" || user?.role === "receptionist") {
      return matchSearch && matchStatus && r.staffId === user.id;
    }
    return matchSearch && matchStatus;
  });

  const handleApply = () => {
    if (!user || !form.reason) return;
    const newReq: LeaveRequest = {
      id: crypto.randomUUID(),
      staffId: user.id,
      staffName: user.name,
      role: user.role,
      leaveType: form.leaveType,
      startDate: form.startDate,
      endDate: form.endDate,
      reason: form.reason,
      status: "pending",
      appliedOn: today,
    };
    setRequests((prev) => [newReq, ...prev]);
    setDialogOpen(false);
    setForm({ leaveType: "casual", startDate: today, endDate: today, reason: "" });
    toast({ title: "Leave Request Submitted" });
  };

  const handleApprove = (id: string) => {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "approved", approvedBy: user?.name } : r));
    toast({ title: "Leave Approved" });
  };

  const handleReject = (id: string) => {
    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "rejected", approvedBy: user?.name } : r));
    toast({ title: "Leave Rejected", variant: "destructive" });
  };

  const handleDelete = (id: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
    toast({ title: "Request Deleted", variant: "destructive" });
  };

  const getDays = (start: string, end: string) => {
    const diff = (new Date(end).getTime() - new Date(start).getTime()) / 86400000;
    return Math.max(1, diff + 1);
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const rejectedCount = requests.filter((r) => r.status === "rejected").length;

  const statusColor = (s: string) => {
    switch (s) {
      case "approved": return "bg-secondary/15 text-secondary";
      case "rejected": return "bg-destructive/15 text-destructive";
      default: return "bg-accent/15 text-accent";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif">Leave Requests</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {canApprove ? "Manage staff leave applications" : "Apply and track your leaves"}
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Apply Leave</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Leave Type</Label>
                <Select value={form.leaveType} onValueChange={(v: any) => setForm({ ...form, leaveType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="casual">Casual Leave</SelectItem>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                    <SelectItem value="earned">Earned Leave</SelectItem>
                    <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                    <SelectItem value="maternity">Maternity Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Reason</Label>
                <Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Reason for leave" rows={3} />
              </div>
              <Button onClick={handleApply} className="w-full" disabled={!form.reason}>Submit Request</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 grid-cols-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <Clock className="h-5 w-5 mx-auto text-accent mb-1" />
            <p className="text-2xl font-bold font-serif">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <CheckCircle className="h-5 w-5 mx-auto text-secondary mb-1" />
            <p className="text-2xl font-bold font-serif">{approvedCount}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <XCircle className="h-5 w-5 mx-auto text-destructive mb-1" />
            <p className="text-2xl font-bold font-serif">{rejectedCount}</p>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{r.staffName}</p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted capitalize">{r.role}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor(r.status)}`}>{r.status}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span className="capitalize">{r.leaveType} Leave</span>
                    <span>{r.startDate} → {r.endDate} ({getDays(r.startDate, r.endDate)} day{getDays(r.startDate, r.endDate) > 1 ? "s" : ""})</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{r.reason}</p>
                  {r.approvedBy && <p className="text-[10px] text-muted-foreground mt-1">Reviewed by: {r.approvedBy}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {canApprove && r.status === "pending" && (
                    <>
                      <Button size="sm" variant="outline" className="text-secondary border-secondary/30 h-8" onClick={() => handleApprove(r.id)}>
                        <CheckCircle className="h-3.5 w-3.5 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive border-destructive/30 h-8" onClick={() => handleReject(r.id)}>
                        <XCircle className="h-3.5 w-3.5 mr-1" />Reject
                      </Button>
                    </>
                  )}
                  {(user?.role === "admin" || r.staffId === user?.id) && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(r.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No leave requests found</CardContent></Card>
        )}
      </div>
    </div>
  );
}
