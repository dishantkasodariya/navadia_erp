import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, CheckCircle2, Circle, Clock, AlertTriangle, Trash2, Edit2, Mic, Square, Play } from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, isToday, isTomorrow, parseISO } from "date-fns";

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
  voiceNote?: string; // base64 audio data URL
}

const today = new Date().toISOString().split("T")[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

const INITIAL_TASKS: Task[] = [];

export default function Tasks() {
  const { user, allUsers } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const [form, setForm] = useState({ title: "", description: "", role: "staff", assignedTo: "", priority: "medium" as Task["priority"], dueDate: today });

  const [activeTab, setActiveTab] = useState("all-tasks");
  const [roleFilter, setRoleFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

  const staffOptions = allUsers.filter((u) => u.role !== "admin");
  const filteredUsersForFilter = roleFilter === "all" ? staffOptions : staffOptions.filter(u => u.role === roleFilter);
  const targetUsers = form.role === "all" ? staffOptions : staffOptions.filter(u => u.role === form.role);
  const isAdmin = !!(user && user.role === "admin");
  const canAssign = isAdmin || user?.role === "dentist";

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (!t) return false;
      const matchSearch = (t.title?.toLowerCase().includes(search.toLowerCase())) || 
                         (t.assignedToName?.toLowerCase().includes(search.toLowerCase())) ||
                         (t.assignedByName?.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = filterStatus === "all" || t.status === filterStatus;
      const matchPriority = filterPriority === "all" || t.priority === filterPriority;
      
      // Role & User filters for Admin
      const userObj = staffOptions.find(u => u.id === t.assignedTo);
      const matchRole = roleFilter === "all" || userObj?.role === roleFilter;
      const matchUser = userFilter === "all" || t.assignedTo === userFilter;

      // Staff/receptionist only see their own tasks
      if (user?.role === "staff" || user?.role === "receptionist") {
        return matchSearch && matchStatus && matchPriority && t.assignedTo === user?.id;
      }

      // Filter by tab if admin
      if (isAdmin && activeTab === "my-tasks") {
        const isMine = t.assignedTo === user?.id || t.assignedBy === user?.id;
        return matchSearch && matchStatus && matchPriority && isMine;
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
        reader.onloadend = () => {
          setVoiceNote(reader.result as string);
        };
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

  const handleAdd = () => {
    const staff = allUsers.find((u) => u.id === form.assignedTo);
    if (!staff || !form.title) return;
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
    setForm({ title: "", description: "", assignedTo: "", priority: "medium", dueDate: today });
    setVoiceNote(null);
    toast({ title: "Task Created" });
  };

  const handleStatusChange = (id: string, status: Task["status"]) => {
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, status } : t));
    toast({ title: `Task marked as ${status}` });
  };

  const handleDelete = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    toast({ title: "Task Deleted", variant: "destructive" });
  };

  const handleUpdate = () => {
    if (!editTask) return;
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
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-3 font-medium text-muted-foreground w-1/4">Task</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Assigned To</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Priority</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Due</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/10">
                    <td className="p-3">
                      <p className="font-medium">{t.title}</p>
                      {t.description && <p className="text-[10px] text-muted-foreground truncate max-w-[200px]">{t.description}</p>}
                    </td>
                    <td className="p-3">
                      <p className="font-medium">{t.assignedToName}</p>
                      <p className="text-[10px] text-muted-foreground">by {t.assignedByName}</p>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className={`text-[10px] ${priorityColor(t.priority)}`}>
                        {t.priority}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5 capitalize text-xs">
                        {statusIcon(t.status)} {t.status}
                      </div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground">{t.dueDate}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setEditTask(t)}><Edit2 className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">No tasks matching filters</td></tr>
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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((t) => (
          <Card key={t.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4 flex flex-col h-full">
              <div className="flex items-start justify-between gap-3 mb-3">
                <button onClick={() => handleStatusChange(t.id, t.status === "completed" ? "pending" : "completed")} className="mt-1 shrink-0">
                  {statusIcon(t.status)}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${t.status === "completed" ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
                </div>
                <Badge variant="outline" className={`text-[10px] shrink-0 ${priorityColor(t.priority)}`}>
                  {t.priority}
                </Badge>
              </div>
              
              {t.description && <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{t.description}</p>}
              
              <div className="mt-auto pt-3 border-t border-muted-foreground/10 space-y-2">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <p>Assigned To</p>
                  <p className="font-medium text-foreground">{t.assignedToName}</p>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <p>Due Date</p>
                  <p className="font-medium text-foreground">{t.dueDate}</p>
                </div>
                
                {t.voiceNote && (
                  <audio controls src={t.voiceNote} className="h-7 w-full mt-2" />
                )}

                <div className="flex items-center justify-end gap-1 mt-3">
                  <Select value={t.status} onValueChange={(v: any) => handleStatusChange(t.id, v)}>
                    <SelectTrigger className="h-7 text-[10px] w-[100px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-progress">In-Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  {canAssign && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(t.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif">Tasks</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {canAssign ? "Assign and manage staff tasks" : "View your assigned tasks"}
          </p>
        </div>
        {canAssign && (
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) setVoiceNote(null); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New Task</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Create Task</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div>
                  <Label>Title</Label>
                  <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Task title" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Details..." rows={3} />
                </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Select Role</Label>
                      <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v, assignedTo: "" })}>
                        <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Roles</SelectItem>
                          <SelectItem value="dentist">Dentist</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="receptionist">Receptionist</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Assign To User</Label>
                      <Select value={form.assignedTo} onValueChange={(v) => setForm({ ...form, assignedTo: v })}>
                        <SelectTrigger><SelectValue placeholder="Select person" /></SelectTrigger>
                        <SelectContent>
                          {targetUsers.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={form.priority} onValueChange={(v: any) => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                <div>
                  <Label>Due Date</Label>
                  <Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
                </div>
                {/* Voice Note */}
                <div>
                  <Label>Voice Note (optional)</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {!isRecording ? (
                      <Button type="button" variant="outline" size="sm" onClick={startRecording}>
                        <Mic className="h-4 w-4 mr-1" />Record Voice
                      </Button>
                    ) : (
                      <Button type="button" variant="destructive" size="sm" onClick={stopRecording}>
                        <Square className="h-4 w-4 mr-1" />Stop
                      </Button>
                    )}
                    {voiceNote && (
                      <audio controls src={voiceNote} className="h-8 flex-1" />
                    )}
                  </div>
                </div>
                <Button onClick={handleAdd} className="w-full" disabled={!form.title || !form.assignedTo}>Create Task</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4 grid-cols-3">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold font-serif">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold font-serif text-accent">{inProgressCount}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold font-serif text-secondary">{completedCount}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {isAdmin && activeTab === "all-tasks" && (
          <>
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setUserFilter("all"); }}>
              <SelectTrigger className="w-full md:w-[130px] text-xs"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="dentist">Dentist</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="receptionist">Receptionist</SelectItem>
              </SelectContent>
            </Select>
            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger className="w-full md:w-[160px] text-xs"><SelectValue placeholder="User" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All People</SelectItem>
                {filteredUsersForFilter.map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full md:w-[130px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in-progress">In-Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-full md:w-[130px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Priorities</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isAdmin ? (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="all-tasks" className="gap-2">All Staff Tasks</TabsTrigger>
            <TabsTrigger value="my-tasks" className="gap-2">My Tasks</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all-tasks" className="space-y-4">
            {renderTaskTable()}
          </TabsContent>
          
          <TabsContent value="my-tasks" className="space-y-4">
            {renderTaskGrid()}
          </TabsContent>
        </Tabs>
      ) : (
        renderTaskGrid()
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editTask} onOpenChange={(o) => !o && setEditTask(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
          {editTask && (
            <div className="space-y-4 mt-2">
              <div><Label>Title</Label><Input value={editTask.title} onChange={(e) => setEditTask({ ...editTask, title: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={editTask.description} onChange={(e) => setEditTask({ ...editTask, description: e.target.value })} rows={3} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Priority</Label>
                  <Select value={editTask.priority} onValueChange={(v: any) => setEditTask({ ...editTask, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input type="date" value={editTask.dueDate} onChange={(e) => setEditTask({ ...editTask, dueDate: e.target.value })} />
                </div>
                <div>
                  <Label>Voice Note</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {!isRecording ? (
                      <Button type="button" variant="outline" size="sm" onClick={startRecording}>
                        <Mic className="h-4 w-4 mr-1" /> Re-record Voice
                      </Button>
                    ) : (
                      <Button type="button" variant="destructive" size="sm" onClick={stopRecording}>
                        <Square className="h-4 w-4 mr-1" /> Stop
                      </Button>
                    )}
                    {(voiceNote || editTask.voiceNote) && (
                      <audio controls src={voiceNote || editTask.voiceNote} className="h-8 flex-1" />
                    )}
                  </div>
                </div>
              </div>
              <Button onClick={handleUpdate} className="w-full">Update Task</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
