import { useState, useEffect } from "react";

import { API_BASE_URL } from '../config/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Calendar as CalendarIcon, CheckCircle, XCircle, Clock } from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

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
const INITIAL_REQUESTS: LeaveRequest[] = [];

export default function LeaveRequests() {
  const { user, allUsers } = useAuth();
  const { socket } = useChat();
  const { toast } = useToast();
  const [requests, setRequests] = useState<LeaveRequest[]>(INITIAL_REQUESTS);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const [form, setForm] = useState({ leaveType: "casual" as LeaveRequest["leaveType"], startDate: today, endDate: today, reason: "" });

  const fetchLeaveRequests = async () => {
    const token = localStorage.getItem("navadia_token");
    try {
      const res = await fetch("${API_BASE_URL}/api/leave", {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((l: any) => ({
          id: l._id,
          staffId: l.userId,
          staffName: l.userName,
          role: allUsers.find(u => u.id === l.userId)?.role || "Staff",
          leaveType: (l.type || "casual").toLowerCase(),
          startDate: l.startDate,
          endDate: l.endDate,
          reason: l.reason || "",
          status: (l.status || "Pending").toLowerCase() as any,
          appliedOn: l.createdAt ? new Date(l.createdAt).toISOString().split("T")[0] : today
        }));
        setRequests(mapped);
      }
    } catch (e) {
      console.warn("Backend offline, fallback loading mock leaves:", e);
    }
  };

  useEffect(() => {
    fetchLeaveRequests();
  }, [allUsers]);

  useEffect(() => {
    if (!socket) return;

    const handleSocketUpdate = () => {
      fetchLeaveRequests();
    };

    socket.on("leave_applied", handleSocketUpdate);
    socket.on("leave_updated", handleSocketUpdate);

    return () => {
      socket.off("leave_applied", handleSocketUpdate);
      socket.off("leave_updated", handleSocketUpdate);
    };
  }, [socket]);

  const canApprove = user?.role.toLowerCase() === "admin";

  const filtered = requests.filter((r) => {
    const matchSearch = r.staffName.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    
    // Employees only see their own leave requests
    if (user?.role.toLowerCase() !== "admin" && r.staffId !== user?.id) {
      return false;
    }
    return matchSearch && matchStatus;
  });

  const handleApply = async () => {
    if (!user || !form.reason) return;

    const token = localStorage.getItem("navadia_token");
    if (token) {
      try {
        const res = await fetch("${API_BASE_URL}/api/leave", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            type: form.leaveType.charAt(0).toUpperCase() + form.leaveType.slice(1),
            startDate: form.startDate,
            endDate: form.endDate,
            reason: form.reason,
            status: "Pending"
          })
        });
        if (res.ok) {
          fetchLeaveRequests();
          setDialogOpen(false);
          setForm({ leaveType: "casual", startDate: today, endDate: today, reason: "" });
          toast({ title: "Leave Request Submitted" });
          return;
        }
      } catch (e) {
        console.warn("Backend offline, fallback local add:", e);
      }
    }

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

  const handleApprove = async (id: string) => {
    const token = localStorage.getItem("navadia_token");
    if (token) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/leave/${id}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ status: "Approved" })
        });
        if (res.ok) {
          fetchLeaveRequests();
          toast({ title: "Leave Approved" });
          return;
        }
      } catch (e) {
        console.warn("Backend offline, fallback local approve:", e);
      }
    }

    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "approved", approvedBy: user?.name } : r));
    toast({ title: "Leave Approved" });
  };

  const handleReject = async (id: string) => {
    const token = localStorage.getItem("navadia_token");
    if (token) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/leave/${id}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ status: "Rejected" })
        });
        if (res.ok) {
          fetchLeaveRequests();
          toast({ title: "Leave Rejected", variant: "destructive" });
          return;
        }
      } catch (e) {
        console.warn("Backend offline, fallback local reject:", e);
      }
    }

    setRequests((prev) => prev.map((r) => r.id === id ? { ...r, status: "rejected", approvedBy: user?.name } : r));
    toast({ title: "Leave Rejected", variant: "destructive" });
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

  const bookedDates: Date[] = [];
  if (user?.id) {
    requests.forEach(r => {
      if (r.staffId === user.id && r.status !== "rejected") {
        const start = parseISO(r.startDate);
        const end = parseISO(r.endDate);
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          let current = new Date(start);
          while (current <= end) {
            bookedDates.push(new Date(current));
            current.setDate(current.getDate() + 1);
          }
        }
      }
    });
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl">Leave Management</h1>
          <p className="text-muted-foreground text-sm sm:text-base mt-1">
            {canApprove ? "Manage and review staff leave applications" : "Apply for leaves and track approval status"}
          </p>
        </div>
        {user?.role.toLowerCase() !== "admin" && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />Apply Leave</Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100vw-2rem)] max-h-[calc(100svh-2rem)] overflow-y-auto rounded-lg p-4 sm:w-full sm:max-h-none sm:overflow-visible sm:p-6">
              <DialogHeader><DialogTitle>Apply for Leave</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label className="text-sm sm:text-base">Leave Type</Label>
                    <Select value={form.leaveType} onValueChange={(v: any) => setForm({ ...form, leaveType: v })}>
                      <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="casual">Casual Leave</SelectItem>
                        <SelectItem value="sick">Sick Leave</SelectItem>
                        <SelectItem value="earned">Earned Leave</SelectItem>
                        <SelectItem value="unpaid">Unpaid Leave</SelectItem>
                        <SelectItem value="maternity">Maternity Leave</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="block mb-1.5 text-sm sm:text-base">Leave Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "group w-full justify-start text-left font-normal h-10 rounded-xl border-muted bg-[#f5f5f4] text-[#1c1917] hover:bg-[#D9A520] hover:text-white transition-all",
                            !form.startDate && "text-muted-foreground hover:text-white"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-[#d97706] group-hover:text-white transition-colors" />
                          {form.startDate ? format(parseISO(form.startDate), "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-xl shadow-lg border bg-popover z-[100]" align="start">
                        <Calendar
                          mode="single"
                          selected={form.startDate ? parseISO(form.startDate) : undefined}
                          onSelect={(newDate) => {
                            if (newDate) {
                              const localDateStr = format(newDate, "yyyy-MM-dd");
                              setForm({ ...form, startDate: localDateStr, endDate: localDateStr });
                            }
                          }}
                          disabled={bookedDates}
                          modifiers={{ booked: bookedDates }}
                          modifiersClassNames={{ booked: "line-through opacity-50 text-muted-foreground" }}
                          className="rounded-xl border-none"
                        />
                      </PopoverContent>
                    </Popover>
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
        )}
      </div>

      <div className="grid gap-2 sm:gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-3 sm:pt-4 text-center">
            <Clock className="h-4 sm:h-5 w-4 sm:w-5 mx-auto text-accent mb-1" />
            <p className="text-lg sm:text-2xl font-bold text-accent">{pendingCount}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 sm:pt-4 text-center">
            <CheckCircle className="h-4 sm:h-5 w-4 sm:w-5 mx-auto text-secondary mb-1" />
            <p className="text-lg sm:text-2xl font-bold text-secondary">{approvedCount}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 sm:pt-4 text-center">
            <XCircle className="h-4 sm:h-5 w-4 sm:w-5 mx-auto text-destructive mb-1" />
            <p className="text-lg sm:text-2xl font-bold text-destructive">{rejectedCount}</p>
            <p className="text-xs sm:text-sm text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-3 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9 text-sm" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[150px] text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 sm:space-y-3">
        {filtered.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm sm:text-base font-medium">{r.staffName}</p>
                    <span className="text-xs sm:text-xs px-2 py-0.5 rounded-full bg-muted capitalize">{r.role}</span>
                    <span className={`text-xs sm:text-xs px-2 py-0.5 rounded-full capitalize ${statusColor(r.status)}`}>{r.status}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5 text-xs sm:text-sm text-muted-foreground">
                    <span className="capitalize">{r.leaveType} Leave</span>
                    <span className="break-words">
                      {r.startDate === r.endDate ? r.startDate : `${r.startDate} → ${r.endDate}`} ({getDays(r.startDate, r.endDate)} day{getDays(r.startDate, r.endDate) > 1 ? "s" : ""})
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">{r.reason}</p>
                  {r.approvedBy && <p className="text-xs sm:text-sm text-muted-foreground mt-1">Reviewed by: {r.approvedBy}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {canApprove && r.status === "pending" && (
                    <>
                      <Button size="sm" variant="outline" className="text-secondary border-secondary/30 h-9 text-xs" onClick={() => handleApprove(r.id)}>
                        <CheckCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="outline" className="text-destructive border-destructive/30 h-9 text-xs" onClick={() => handleReject(r.id)}>
                        <XCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1" />Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card><CardContent className="p-4 sm:p-8 text-center text-muted-foreground text-sm sm:text-base">No leave requests found</CardContent></Card>
        )}
      </div>
    </div>
  );
}
