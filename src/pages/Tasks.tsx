import { useState, useMemo, useEffect } from "react";

import { API_BASE_URL } from '../config/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, CheckCircle2, Circle, Clock, AlertTriangle, Trash2, Edit2, Mic, Square, Calendar as CalendarIcon, LayoutGrid, List } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  assignedToName: string;
  assignedBy: string;
  assignedByName: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in-progress" | "completed" | "cancelled";
  dueDate: string;
  createdAt: string;
  voiceNote?: string;
}

const today = new Date().toISOString().split("T")[0];
const INITIAL_TASKS: Task[] = [];

export default function Tasks() {
  const { user, allUsers } = useAuth();
  const { socket } = useChat();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const [form, setForm] = useState({ title: "", description: "", role: "all", assignedTo: "", priority: "medium" as Task["priority"], dueDate: today, isPrivate: false });
  const [activeTab, setActiveTab] = useState("all-tasks");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [roleFilter, setRoleFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [editTaskRoleFilter, setEditTaskRoleFilter] = useState("all");

  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [, setAudioChunks] = useState<Blob[]>([]);

  const staffOptions = allUsers.filter((u) => u.role.toLowerCase() !== "admin");
  const filteredUsersForFilter = roleFilter === "all" ? staffOptions : staffOptions.filter(u => u.role.toLowerCase() === roleFilter.toLowerCase());
  const editTaskFilteredUsers = useMemo(() => {
    const staff = allUsers.filter((u) => u.role.toLowerCase() !== "admin");
    if (editTaskRoleFilter === "all") return staff;
    return staff.filter(u => u.role.toLowerCase() === editTaskRoleFilter.toLowerCase());
  }, [allUsers, editTaskRoleFilter]);
  
  const isAdmin = !!(user && user.role.toLowerCase() === "admin");
  const isDentist = !!(user && user.role.toLowerCase() === "dentist");
  const canAssignOthers = isAdmin || isDentist;

  const targetUsers = canAssignOthers 
    ? (form.role === "all" ? staffOptions : staffOptions.filter(u => u.role.toLowerCase() === form.role.toLowerCase()))
    : (user ? [user] : []);

  const canAssign = true;

  // Sync with MongoDB backend in real-time
  const fetchTasks = async () => {
    const token = localStorage.getItem("navadia_token");
    try {
      const res = await fetch("${API_BASE_URL}/api/tasks", {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((t: any) => ({
          id: t._id,
          title: t.title,
          description: t.description || "",
          assignedTo: t.assignedTo,
          assignedToName: allUsers.find(u => u.id === t.assignedTo)?.name || t.assignedTo,
          assignedBy: t.createdBy || "Admin",
          assignedByName: t.createdBy || "Admin",
          priority: (t.priority || "medium") as Task["priority"],
          status: (t.status || "pending") as Task["status"],
          dueDate: t.dueDate || "",
          createdAt: t.createdAt || today,
          voiceNote: t.voiceNote
        }));
        setTasks(mapped);
      }
    } catch (e) {
      console.warn("Backend offline, using local storage tasks fallback:", e);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [allUsers]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = () => fetchTasks();
    socket.on("task_assigned", handleUpdate);
    return () => {
      socket.off("task_assigned", handleUpdate);
    };
  }, [socket]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (!t) return false;
      const matchSearch = (t.title?.toLowerCase().includes(search.toLowerCase())) || 
                         (t.assignedToName?.toLowerCase().includes(search.toLowerCase())) ||
                         (t.assignedByName?.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = filterStatus === "all" || t.status === filterStatus;
      const matchPriority = filterPriority === "all" || t.priority === filterPriority;
      
      const userObj = staffOptions.find(u => u.id === t.assignedTo);
      const matchRole = roleFilter === "all" || (userObj && userObj.role.toLowerCase() === roleFilter.toLowerCase());
      const matchUser = userFilter === "all" || t.assignedTo === userFilter;

      const isPrivateTask = t.assignedTo === t.assignedBy;
      
      if (activeTab === "my-tasks") {
        if (!isPrivateTask || t.assignedTo !== user?.id) return false;
      } else {
        if (isPrivateTask) return false;
        const userRoleLower = user?.role.toLowerCase();
        if (userRoleLower !== "admin") {
          // Employees only see their own tasks
          if (t.assignedTo !== user?.id) return false;
        }
      }

      return matchSearch && matchStatus && matchPriority && matchRole && matchUser;
    });
  }, [tasks, search, filterStatus, filterPriority, roleFilter, userFilter, user, isAdmin, activeTab, staffOptions]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => setVoiceNote(reader.result as string);
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      setIsRecording(true);
      toast({ title: "Recording started", description: "Speak your task instructions..." });
    } catch {
      toast({ title: "Microphone access denied", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setIsRecording(false);
    setMediaRecorder(null);
  };

  const handleAdd = async () => {
    const staff = form.isPrivate ? user : allUsers.find((u) => u.id === form.assignedTo);
    if (!staff || !form.title) return;
    
    const token = localStorage.getItem("navadia_token");
    if (token) {
      try {
        const res = await fetch("${API_BASE_URL}/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            title: form.title,
            description: form.description,
            assignedTo: staff.id,
            role: staff.role,
            priority: form.priority,
            dueDate: form.dueDate
          })
        });
        if (res.ok) {
          fetchTasks();
          setDialogOpen(false);
          setForm({ title: "", description: "", role: "all", assignedTo: "", priority: "medium", dueDate: today, isPrivate: false });
          setVoiceNote(null);
          toast({ title: "Task Created" });
          return;
        }
      } catch (e) {
        console.warn("Backend offline, falling back to local tasks:", e);
      }
    }

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: form.title,
      description: form.description,
      assignedTo: staff.id,
      assignedToName: staff.name,
      assignedBy: user!.id,
      assignedByName: user!.name,
      priority: form.priority,
      status: "pending",
      dueDate: form.dueDate,
      createdAt: today,
      voiceNote: voiceNote || undefined,
    };
    setTasks((prev) => [newTask, ...prev]);
    setDialogOpen(false);
    setForm({ title: "", description: "", role: "all", assignedTo: "", priority: "medium", dueDate: today, isPrivate: false });
    setVoiceNote(null);
    toast({ title: "Task Created" });
  };

  const handleStatusChange = async (id: string, status: Task["status"]) => {
    const token = localStorage.getItem("navadia_token");
    if (token && id.length > 20) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ status })
        });
        if (res.ok) {
          fetchTasks();
          toast({ title: `Task marked as ${status}` });
          return;
        }
      } catch (e) {
        console.warn("Backend offline, fallback status update:", e);
      }
    }

    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status } : t));
    toast({ title: `Task marked as ${status}` });
  };

  const handleDelete = async (id: string) => {
    const token = localStorage.getItem("navadia_token");
    if (token && id.length > 20) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          fetchTasks();
          toast({ title: "Task Deleted", variant: "destructive" });
          return;
        }
      } catch (e) {
        console.warn("Backend offline, fallback task delete:", e);
      }
    }

    setTasks((prev) => prev.filter((t) => t.id !== id));
    toast({ title: "Task Deleted", variant: "destructive" });
  };

  const handleStartEdit = (t: Task) => {
    const assignee = allUsers.find(u => u.id === t.assignedTo);
    if (assignee) {
      setEditTaskRoleFilter(assignee.role);
    } else {
      setEditTaskRoleFilter("all");
    }
    setEditTask(t);
  };

  const handleUpdate = async () => {
    if (!editTask) return;
    
    const token = localStorage.getItem("navadia_token");
    if (token && editTask.id.length > 20) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/tasks/${editTask.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            title: editTask.title,
            description: editTask.description,
            assignedTo: editTask.assignedTo,
            priority: editTask.priority,
            status: editTask.status,
            dueDate: editTask.dueDate
          })
         });
         if (res.ok) {
           fetchTasks();
           setEditTask(null);
           setVoiceNote(null);
           toast({ title: "Task Updated" });
           return;
         }
      } catch (e) {
        console.warn("Backend offline, fallback update:", e);
      }
    }

    setTasks((prev) => prev.map((t) => t.id === editTask.id ? { ...editTask, voiceNote: voiceNote !== null ? voiceNote : t.voiceNote } : t));
    setEditTask(null);
    setVoiceNote(null);
    toast({ title: "Task Updated" });
  };

  const priorityColor = (p: string) => {
    switch (p) {
      case "urgent": return "bg-destructive/15 text-destructive border-destructive/30";
      case "high": return "bg-accent/15 text-accent border-accent/30";
      case "medium": return "bg-primary/10 text-primary border-primary/30";
      case "low": return "bg-muted text-muted-foreground border-border";
      default: return "";
    }
  };

  const statusIcon = (s: string) => {
    switch (s) {
      case "completed": return <CheckCircle2 className="h-4 w-4 text-secondary" />;
      case "in-progress": return <Clock className="h-4 w-4 text-accent" />;
      case "cancelled": return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default: return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const inProgressCount = tasks.filter((t) => t.status === "in-progress").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  function renderTaskTable() {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-2 sm:p-3 font-medium text-muted-foreground text-xs sm:text-sm">Task</th>
                  <th className="text-left p-2 sm:p-3 font-medium text-muted-foreground hidden sm:table-cell text-xs sm:text-sm">Assigned To</th>
                  <th className="text-left p-2 sm:p-3 font-medium text-muted-foreground text-xs sm:text-sm">Priority</th>
                  <th className="text-left p-2 sm:p-3 font-medium text-muted-foreground hidden md:table-cell text-xs sm:text-sm">Status</th>
                  <th className="text-left p-2 sm:p-3 font-medium text-muted-foreground hidden lg:table-cell text-xs sm:text-sm">Due</th>
                  <th className="text-right p-2 sm:p-3 font-medium text-muted-foreground text-xs sm:text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/10">
                    <td className="p-2 sm:p-3">
                      <p className="font-medium text-xs sm:text-sm">{t.title}</p>
                      {t.description && <p className="text-[9px] sm:text-[10px] text-muted-foreground truncate max-w-[150px] sm:max-w-[200px]">{t.description}</p>}
                    </td>
                    <td className="p-2 sm:p-3 hidden sm:table-cell">
                      <p className="font-medium text-xs">{t.assignedToName}</p>
                      <p className="text-[9px] text-muted-foreground">by {t.assignedByName}</p>
                    </td>
                    <td className="p-2 sm:p-3">
                      <Badge variant="outline" className={`text-[8px] sm:text-[10px] ${priorityColor(t.priority)}`}>
                        {t.priority}
                      </Badge>
                    </td>
                    <td className="p-2 sm:p-3 hidden md:table-cell">
                      <div className="flex items-center gap-1 capitalize text-xs">
                        {statusIcon(t.status)} {t.status}
                      </div>
                    </td>
                    <td className="p-2 sm:p-3 text-xs text-muted-foreground hidden lg:table-cell">{t.dueDate}</td>
                    <td className="p-2 sm:p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-7 w-7 sm:h-8 sm:w-8 p-0" onClick={() => handleStartEdit(t)}><Edit2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 sm:h-8 sm:w-8 p-0 text-destructive" onClick={() => handleDelete(t.id)}><Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="p-4 sm:p-8 text-center text-muted-foreground text-xs sm:text-sm">No tasks matching filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    );
  }

  function renderTaskGrid() {
    return (
      <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t) => (
          <Card key={t.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-3 sm:p-4 flex flex-col h-full">
              <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2 sm:mb-3">
                <button onClick={() => handleStatusChange(t.id, t.status === "completed" ? "pending" : "completed")} className="mt-1 shrink-0">
                  {statusIcon(t.status)}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-medium leading-none mb-1 text-xs sm:text-sm">{t.title}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Due: {t.dueDate}</p>
                </div>
                <Badge variant="outline" className={`text-[8px] sm:text-[10px] shrink-0 ${priorityColor(t.priority)}`}>
                  {t.priority}
                </Badge>
              </div>

              {t.description && <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-2">{t.description}</p>}

              {t.voiceNote && (
                <div className="mb-3 sm:mb-4 bg-muted/40 p-2 rounded-lg">
                  <audio src={t.voiceNote} className="h-5 sm:h-6 w-full" controls />
                </div>
              )}

              <div className="mt-auto pt-2 sm:pt-3 border-t flex items-center justify-between text-[10px] sm:text-xs text-muted-foreground">
                <span className="truncate">To: {t.assignedToName}</span>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7 p-0" onClick={() => handleStartEdit(t)}><Edit2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7 p-0 text-destructive" onClick={() => handleDelete(t.id)}><Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card className="col-span-full"><CardContent className="p-4 sm:p-8 text-center text-muted-foreground text-xs sm:text-sm">No tasks matching filters</CardContent></Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-serif">Tasks</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Assign and coordinate duties</p>
        </div>
        {canAssign && (
          <div className="flex items-center">
            <HoverCard openDelay={100} closeDelay={200}>
              <HoverCardTrigger asChild>
                <Button size="sm" onClick={() => { setForm(prev => ({ ...prev, isPrivate: false })); setDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Add Task
                </Button>
              </HoverCardTrigger>
              <HoverCardContent align="end" className="w-48 p-2 flex flex-col gap-1">
                {canAssignOthers && (
                  <Button variant="ghost" size="sm" className="justify-start w-full font-normal" onClick={() => { setForm(prev => ({ ...prev, isPrivate: false })); setDialogOpen(true); }}>
                    Assign Task to Others
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="justify-start w-full font-normal" onClick={() => { setForm(prev => ({ ...prev, isPrivate: true })); setDialogOpen(true); }}>
                  Create Private Task
                </Button>
              </HoverCardContent>
            </HoverCard>

            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setVoiceNote(null); }}>
              <DialogContent>
                <DialogHeader><DialogTitle>{form.isPrivate ? "Create Private Task" : "Create New Task"}</DialogTitle></DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="space-y-2">
                    <Label>Task Title</Label>
                    <Input placeholder="Enter title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea placeholder="Details about the task..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                  </div>
                {!form.isPrivate && (
                  <div className={canAssignOthers ? "grid grid-cols-2 gap-4" : "space-y-2"}>
                    {canAssignOthers && (
                      <div className="space-y-2">
                        <Label>Assign by Role</Label>
                        <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v, assignedTo: "" })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Staff</SelectItem>
                            <SelectItem value="Dentist">Dentist</SelectItem>
                            <SelectItem value="Staff">Staff</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Select Assignee</Label>
                      <Select value={form.assignedTo} onValueChange={(v) => setForm({ ...form, assignedTo: v })}>
                        <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                        <SelectContent>
                          {targetUsers.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as Task["priority"] })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="block mb-1.5">Due Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "group w-full justify-start text-left font-normal h-10 rounded-xl border-muted bg-[#f5f5f4] text-[#1c1917] hover:bg-[#d97706] hover:text-white transition-all",
                            !form.dueDate && "text-muted-foreground hover:text-white"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-[#d97706] group-hover:text-white transition-colors" />
                          {form.dueDate ? format(parseISO(form.dueDate), "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-xl shadow-lg border bg-popover z-[100]" align="start">
                        <Calendar
                          mode="single"
                          selected={form.dueDate ? parseISO(form.dueDate) : undefined}
                          onSelect={(newDate) => {
                            if (newDate) {
                              const localDateStr = format(newDate, "yyyy-MM-dd");
                              setForm({ ...form, dueDate: localDateStr });
                            }
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Voice Instructions (Optional)</Label>
                  <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                    {!isRecording && !voiceNote && (
                      <Button type="button" size="sm" onClick={startRecording}><Mic className="h-4 w-4 mr-1.5" /> Record</Button>
                    )}
                    {isRecording && (
                      <Button type="button" variant="destructive" size="sm" onClick={stopRecording} className="animate-pulse"><Square className="h-4 w-4 mr-1.5" /> Stop</Button>
                    )}
                    {voiceNote && (
                      <div className="flex items-center gap-2 w-full">
                        <audio src={voiceNote} className="h-6 w-full max-w-[200px]" controls />
                        <Button type="button" variant="outline" size="sm" onClick={() => setVoiceNote(null)}>Clear</Button>
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground">{isRecording ? "Recording..." : voiceNote ? "Voice note captured" : "No recording"}</span>
                  </div>
                </div>

                <Button onClick={handleAdd} className="w-full" disabled={(!form.isPrivate && !form.assignedTo) || !form.title}>Create Task</Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
        )}
      </div>

      <div className="grid gap-2 sm:gap-3 sm:grid-cols-3">
        <Card><CardContent className="pt-3 sm:pt-4 text-center">
          <p className="text-lg sm:text-2xl font-bold font-serif text-accent">{pendingCount}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Pending</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 sm:pt-4 text-center">
          <p className="text-lg sm:text-2xl font-bold font-serif text-primary">{inProgressCount}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">In Progress</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 sm:pt-4 text-center">
          <p className="text-lg sm:text-2xl font-bold font-serif text-secondary">{completedCount}</p>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">Completed</p>
        </CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="all-tasks">Tasks</TabsTrigger>
            <TabsTrigger value="my-tasks">My Tasks</TabsTrigger>
          </TabsList>
        </div>

        <div className="mt-4 space-y-3 sm:space-y-4">
          {/* Search and Filters Row */}
          <div className="flex flex-col md:flex-row md:items-center gap-3 sm:gap-4">
            {/* Search - Left on tablet+ */}
            <div className="relative flex-1 order-2 md:order-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9 text-sm" placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            {/* Filters and Toggle - Right on tablet+ */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-wrap items-start sm:items-center order-1 md:order-2 md:justify-end">
              {/* Grid/Table Toggle - Primary on mobile */}
              <div className="flex md:hidden items-center gap-1 border rounded-lg p-0.5 bg-muted/20 w-full">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-7 w-7 flex-1 rounded-md text-xs"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-3.5 w-3.5 mr-1" /> Grid
                </Button>
                <Button
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-7 w-7 flex-1 rounded-md text-xs"
                  onClick={() => setViewMode("table")}
                >
                  <List className="h-3.5 w-3.5 mr-1" /> Table
                </Button>
              </div>

              {/* Status & Priority Filters - Always visible */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[110px] md:w-auto text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-full sm:w-[110px] md:w-auto text-sm"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>

              {/* Admin-only Filters */}
              {isAdmin && (
                <>
                  <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setUserFilter("all"); }}>
                    <SelectTrigger className="w-full sm:w-[110px] md:w-auto text-sm"><SelectValue placeholder="Role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="Dentist">Dentist</SelectItem>
                      <SelectItem value="Staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={userFilter} onValueChange={setUserFilter}>
                    <SelectTrigger className="w-full sm:w-[130px] md:w-auto text-sm"><SelectValue placeholder="Assignee" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      {filteredUsersForFilter.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              
              {/* Grid/Table Toggle - Hidden on mobile, shown on tablet+ */}
              <div className="hidden md:flex items-center gap-1 border rounded-lg p-0.5 bg-muted/20">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-7 sm:h-8 w-7 sm:w-8 rounded-md"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                </Button>
                <Button
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-7 sm:h-8 w-7 sm:w-8 rounded-md"
                  onClick={() => setViewMode("table")}
                >
                  <List className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                </Button>
              </div>
            </div>
          </div>

          {viewMode === "grid" ? renderTaskGrid() : renderTaskTable()}
        </div>
      </Tabs>

      <Dialog open={!!editTask} onOpenChange={(o) => { if (!o) { setEditTask(null); setVoiceNote(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
          {editTask && (
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Task Title</Label>
                <Input placeholder="Enter title" value={editTask.title} onChange={(e) => setEditTask({ ...editTask, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="Details about the task..." value={editTask.description} onChange={(e) => setEditTask({ ...editTask, description: e.target.value })} />
              </div>
              
              {!(editTask.assignedTo === editTask.assignedBy) && canAssignOthers && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Assign by Role</Label>
                    <Select value={editTaskRoleFilter} onValueChange={(v) => { setEditTaskRoleFilter(v); setEditTask({ ...editTask, assignedTo: "" }); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Staff</SelectItem>
                        <SelectItem value="Dentist">Dentist</SelectItem>
                        <SelectItem value="Staff">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Select Assignee</Label>
                    <Select 
                      value={editTask.assignedTo} 
                      onValueChange={(v) => {
                        const selectedUser = allUsers.find(u => u.id === v);
                        if (selectedUser) {
                          setEditTask({ ...editTask, assignedTo: v, assignedToName: selectedUser.name });
                        }
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                      <SelectContent>
                        {editTaskFilteredUsers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={editTask.priority} onValueChange={(v) => setEditTask({ ...editTask, priority: v as Task["priority"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editTask.status} onValueChange={(v) => setEditTask({ ...editTask, status: v as Task["status"] })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="block mb-1.5">Due Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "group w-full justify-start text-left font-normal h-10 rounded-xl border-muted bg-[#f5f5f4] text-[#1c1917] hover:bg-[#d97706] hover:text-white transition-all",
                        !editTask.dueDate && "text-muted-foreground hover:text-white"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-[#d97706] group-hover:text-white transition-colors" />
                      {editTask.dueDate ? format(parseISO(editTask.dueDate), "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 rounded-xl shadow-lg border bg-popover z-[100]" align="start">
                    <Calendar
                      mode="single"
                      selected={editTask.dueDate ? parseISO(editTask.dueDate) : undefined}
                      onSelect={(newDate) => {
                        if (newDate) {
                          const localDateStr = format(newDate, "yyyy-MM-dd");
                          setEditTask({ ...editTask, dueDate: localDateStr });
                        }
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <Button onClick={handleUpdate} className="w-full" disabled={!(editTask.assignedTo) || !editTask.title}>Update Task</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
