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
import { Switch } from "@/components/ui/switch";
import { useLocation } from "react-router-dom";

interface Attachment {
  name: string;
  mimeType: string;
  dataUrl: string;
}

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
  isRecurring?: boolean;
  isPrivate?: boolean;
  role?: string;
  completedDates?: string[];
  attachments?: Attachment[];
}

const today = new Date().toISOString().split("T")[0];
const INITIAL_TASKS: Task[] = [];

export default function Tasks() {
  const { user, allUsers } = useAuth();
  const { socket } = useChat();
  const { toast } = useToast();
  const location = useLocation();
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);

  useEffect(() => {
    if (location.state?.selectTaskId && tasks.length > 0) {
      const foundTask = tasks.find(t => t.id === location.state.selectTaskId);
      if (foundTask) {
        setSelectedViewTask(foundTask);
        window.history.replaceState(null, '');
      }
    }
  }, [location.state, tasks]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [selectedViewTask, setSelectedViewTask] = useState<Task | null>(null);
  const [taskMenuOpen, setTaskMenuOpen] = useState(false);

  const [form, setForm] = useState({ title: "", description: "", role: "all", assignedTo: "", priority: "medium" as Task["priority"], dueDate: today, isPrivate: false, isRecurring: false });
  const [activeTab, setActiveTab] = useState("assigned-tasks");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [roleFilter, setRoleFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [editTaskRoleFilter, setEditTaskRoleFilter] = useState("all");

  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);
  const [, setAudioChunks] = useState<Blob[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [editAttachments, setEditAttachments] = useState<Attachment[]>([]);

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
    if (!token) return;
    try {
      const todayDateStr = new Date().toISOString().split("T")[0];
      const res = await fetch(`${API_BASE_URL}/api/tasks?todayDate=${todayDateStr}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const mapped = data.map((t: any) => ({
          id: t._id,
          title: t.title,
          description: t.description || "",
          assignedTo: t.assignedTo,
          assignedToName: t.isRecurring
            ? (t.assignedTo
              ? `${allUsers.find(u => u.id === t.assignedTo)?.name || t.assignedTo} (Repeating)`
              : `${t.role} (Repeating)`)
            : (t.assignedTo
              ? (allUsers.find(u => u.id === t.assignedTo)?.name || t.assignedTo)
              : (t.role === "all" ? "All Team" : `${t.role}s`)),
          assignedBy: t.createdBy || "Admin",
          assignedByName: allUsers.find(u => u.id === t.createdBy)?.name || t.createdByName || t.createdBy || "Admin",
          priority: (t.priority || "medium") as Task["priority"],
          status: (t.status || "pending") as Task["status"],
          dueDate: t.dueDate || "",
          createdAt: t.createdAt || today,
          voiceNote: t.voiceNote,
          isRecurring: t.isRecurring || false,
          isPrivate: t.isPrivate || false,
          role: t.role || (allUsers.find((u: any) => u.id === t.assignedTo)?.role) || "Staff",
          completedDates: t.completedDates || [],
          attachments: t.attachments || []
        }));
        const unique = Array.from(new Map(mapped.map((item: any) => [item.id, item])).values()) as Task[];
        setTasks(unique);
        localStorage.setItem("navadia_tasks", JSON.stringify(unique));
      }
    } catch (e) {
      console.warn("Backend offline, using local storage tasks fallback:", e);
      const cached = localStorage.getItem("navadia_tasks");
      if (cached) {
        try {
          const cachedList = JSON.parse(cached);
          const uniqueCached = Array.from(new Map(cachedList.map((item: any) => [item.id, item])).values()) as Task[];
          setTasks(uniqueCached);
        } catch (err) {
          console.error("Failed to parse cached tasks", err);
        }
      }
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [allUsers]);

  useEffect(() => {
    if (user) {
      setActiveTab("assigned-tasks");
    }
  }, [user]);

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
      const taskRole = t.assignedTo ? (userObj?.role || "") : t.role;
      const matchRole = roleFilter === "all" ||
        (taskRole && (taskRole.toLowerCase() === "all" || taskRole.toLowerCase() === roleFilter.toLowerCase()));
      const matchUser = userFilter === "all" || t.assignedTo === userFilter;

      const isPrivateTask = t.isPrivate || false;

      // Rule 1: Other people's private tasks must be hidden from everyone except owner/creator
      if (isPrivateTask && t.assignedTo !== user?.id && t.assignedBy !== user?.id) return false;

      // Handle Repeating Tasks isolation
      if (activeTab === "repeating-tasks") {
        if (!t.isRecurring) return false;
        if (user?.role.toLowerCase() !== "admin") {
          if (t.assignedTo) {
            if (t.assignedTo !== user?.id) return false;
          } else {
            const userRoleLower = user?.role?.toLowerCase();
            const taskRoleLower = t.role?.toLowerCase();
            if (taskRoleLower !== "all" && taskRoleLower !== userRoleLower) return false;
          }
        }
      } else {
        // All other tabs exclude recurring tasks
        if (t.isRecurring) return false;

        if (activeTab === "private-tasks") {
          // Private Tasks tab: only show explicit private tasks for current user
          if (!isPrivateTask || (t.assignedTo !== user?.id && t.assignedBy !== user?.id)) return false;
        } else if (activeTab === "assigned-tasks") {
          // Assigned Tasks tab: hide private tasks
          if (isPrivateTask) return false;

          const userRoleLower = user?.role?.toLowerCase();
          if (userRoleLower !== "admin") {
            // Staff/Dentist sees tasks assigned to them, assigned to their role/all, or assigned by them to others
            const isExplicitlyAssignedToMe = t.assignedTo === user?.id;
            const isAssignedToMyRoleOrAll = !t.assignedTo &&
              (t.role?.toLowerCase() === "all" || t.role?.toLowerCase() === userRoleLower);
            const isAssignedByMe = t.assignedBy === user?.id;

            if (!isExplicitlyAssignedToMe && !isAssignedToMyRoleOrAll && !isAssignedByMe) {
              return false;
            }
          }
        } else {
          // "all-tasks" (Admin only)
          if (isPrivateTask && t.assignedTo !== user?.id && t.assignedBy !== user?.id) return false;
          const userRoleLower = user?.role?.toLowerCase();
          if (userRoleLower !== "admin") {
            const isExplicitlyAssignedToMe = t.assignedTo === user?.id;
            const isAssignedToMyRoleOrAll = !t.assignedTo &&
              (t.role?.toLowerCase() === "all" || t.role?.toLowerCase() === userRoleLower);
            const isAssignedByMe = t.assignedBy === user?.id;
            if (!isExplicitlyAssignedToMe && !isAssignedToMyRoleOrAll && !isAssignedByMe) return false;
          }
        }
      }

      return matchSearch && matchStatus && matchPriority && matchRole && matchUser;
    });
  }, [tasks, search, filterStatus, filterPriority, roleFilter, userFilter, user, activeTab, staffOptions]);

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
    if (!form.title) return;

    let staff = null;
    let assignedToId = "";
    let roleName = form.role;

    if (form.isPrivate) {
      staff = user;
      assignedToId = user?.id || "";
      roleName = user?.role || "";
    } else {
      staff = allUsers.find((u) => u.id === form.assignedTo);
      if (staff) {
        assignedToId = staff.id;
        roleName = staff.role;
      } else {
        assignedToId = "";
        roleName = form.role;
      }
    }

    const token = localStorage.getItem("navadia_token");
    let proceed = false;
    let isOffline = false;

    if (token) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/tasks`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            title: form.title,
            description: form.description,
            assignedTo: assignedToId,
            role: roleName,
            priority: form.priority,
            dueDate: form.dueDate,
            isRecurring: form.isRecurring,
            isPrivate: form.isPrivate,
            attachments
          })
        });
        if (res.ok) {
          proceed = true;
        }
      } catch (e) {
        console.warn("Backend offline, falling back to local tasks:", e);
        proceed = true;
        isOffline = true;
      }
    } else {
      proceed = true;
    }

    if (proceed) {
      let updatedTasks = [...tasks];
      if (form.isRecurring) {
        const localTask = {
          id: crypto.randomUUID(),
          title: form.title,
          description: form.description,
          assignedTo: "",
          assignedToName: `${form.role} (Repeating)`,
          assignedBy: user!.id,
          assignedByName: user!.name,
          priority: form.priority,
          status: "pending" as Task["status"],
          dueDate: "",
          createdAt: today,
          voiceNote: voiceNote || undefined,
          isRecurring: true,
          isPrivate: false,
          completedDates: [],
          attachments: attachments
        };
        updatedTasks = [localTask, ...updatedTasks];
      } else {
        const newTask: Task = {
          id: crypto.randomUUID(),
          title: form.title,
          description: form.description,
          assignedTo: assignedToId,
          assignedToName: staff
            ? staff.name
            : (roleName === "all" ? "All Team" : `${roleName}s`),
          assignedBy: user!.id,
          assignedByName: user!.name,
          priority: form.priority,
          status: "pending",
          dueDate: form.dueDate,
          createdAt: today,
          voiceNote: voiceNote || undefined,
          isRecurring: false,
          isPrivate: form.isPrivate,
          completedDates: [],
          attachments: attachments
        };
        updatedTasks = [newTask, ...updatedTasks];
      }
      setTasks(updatedTasks);
      localStorage.setItem("navadia_tasks", JSON.stringify(updatedTasks));
      setDialogOpen(false);
      setForm({ title: "", description: "", role: "all", assignedTo: "", priority: "medium", dueDate: today, isPrivate: false, isRecurring: false });
      setVoiceNote(null);
      setAttachments([]);
      toast({ title: isOffline ? "Task Created Offline ⚠️" : "Task Created ✓" });
      if (!isOffline) {
        fetchTasks();
      }
    }
  };

  const handleStatusChange = async (id: string, status: Task["status"]) => {
    const token = localStorage.getItem("navadia_token");
    let proceed = false;
    let isOffline = false;

    if (token && id.length > 20) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            status,
            completedDate: new Date().toISOString().split("T")[0]
          })
        });
        if (res.ok) {
          proceed = true;
        }
      } catch (e) {
        console.warn("Backend offline, fallback status update:", e);
        proceed = true;
        isOffline = true;
      }
    } else {
      proceed = true;
    }

    if (proceed) {
      const newTasks = tasks.map((t) => {
        if (t.id === id) {
          if (t.isRecurring) {
            const todayStr = new Date().toISOString().split("T")[0];
            const newDates = status === "completed"
              ? (t.completedDates?.includes(todayStr) ? t.completedDates : [...(t.completedDates || []), todayStr])
              : (t.completedDates || []).filter(d => d !== todayStr);
            return { ...t, status, completedDates: newDates };
          }
          return { ...t, status };
        }
        return t;
      });
      setTasks(newTasks);
      localStorage.setItem("navadia_tasks", JSON.stringify(newTasks));
      toast({ title: isOffline ? `Task marked as ${status} Offline ⚠️` : `Task marked as ${status} ✓` });
      if (!isOffline) {
        fetchTasks();
      }
    }
  };

  const handleDelete = async (id: string) => {
    const token = localStorage.getItem("navadia_token");
    let proceed = false;
    let isOffline = false;

    if (token && id.length > 20) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/tasks/${id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          proceed = true;
        }
      } catch (e) {
        console.warn("Backend offline, fallback task delete:", e);
        proceed = true;
        isOffline = true;
      }
    } else {
      proceed = true;
    }

    if (proceed) {
      const newTasks = tasks.filter((t) => t.id !== id);
      setTasks(newTasks);
      localStorage.setItem("navadia_tasks", JSON.stringify(newTasks));
      toast({ title: isOffline ? "Task Deleted Offline ⚠️" : "Task Deleted ✓", variant: "destructive" });
      if (!isOffline) {
        fetchTasks();
      }
    }
  };

  const handleStartEdit = (t: Task) => {
    const assignee = allUsers.find(u => u.id === t.assignedTo);
    if (t.isRecurring) {
      setEditTaskRoleFilter("Staff");
    } else if (assignee) {
      setEditTaskRoleFilter(assignee.role);
    } else if (t.role) {
      setEditTaskRoleFilter(t.role);
    } else {
      setEditTaskRoleFilter("all");
    }
    setEditTask(t);
    setEditAttachments(t.attachments || []);
  };

  const handleUpdate = async () => {
    if (!editTask) return;

    const token = localStorage.getItem("navadia_token");
    let proceed = false;
    let isOffline = false;

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
            role: editTask.role,
            priority: editTask.priority,
            status: editTask.status,
            dueDate: editTask.dueDate,
            isRecurring: editTask.isRecurring,
            isPrivate: editTask.isPrivate,
            completedDate: new Date().toISOString().split("T")[0],
            attachments: editAttachments
          })
        });
        if (res.ok) {
          proceed = true;
        }
      } catch (e) {
        console.warn("Backend offline, fallback update:", e);
        proceed = true;
        isOffline = true;
      }
    } else {
      proceed = true;
    }

    if (proceed) {
      const assignee = allUsers.find(u => u.id === editTask.assignedTo);
      const assignedToName = assignee
        ? assignee.name
        : (editTask.role === "all" ? "All Staff" : `${editTask.role}s`);
      const newTasks = tasks.map((t) => t.id === editTask.id ? {
        ...editTask,
        assignedToName,
        voiceNote: voiceNote !== null ? voiceNote : t.voiceNote,
        attachments: editAttachments
      } : t);
      setTasks(newTasks);
      localStorage.setItem("navadia_tasks", JSON.stringify(newTasks));
      setEditTask(null);
      setVoiceNote(null);
      setEditAttachments([]);
      toast({ title: isOffline ? "Task Updated Offline ⚠️" : "Task Updated ✓" });
      if (!isOffline) {
        fetchTasks();
      }
    }
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
            <table className="w-full text-sm sm:text-base">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left p-2 sm:p-3 font-medium text-muted-foreground text-sm sm:text-base">Task</th>
                  <th className="text-left p-2 sm:p-3 font-medium text-muted-foreground hidden sm:table-cell text-sm sm:text-base">Assigned To</th>
                  <th className="text-left p-2 sm:p-3 font-medium text-muted-foreground text-sm sm:text-base">Priority</th>
                  <th className="text-left p-2 sm:p-3 font-medium text-muted-foreground hidden md:table-cell text-sm sm:text-base">Status</th>
                  <th className="text-left p-2 sm:p-3 font-medium text-muted-foreground hidden lg:table-cell text-sm sm:text-base">Due</th>
                  <th className="text-right p-2 sm:p-3 font-medium text-muted-foreground text-sm sm:text-base">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/10 cursor-pointer" onClick={() => setSelectedViewTask(t)}>
                    <td className="p-2 sm:p-3">
                      <p className="font-medium text-sm sm:text-base">{t.title}</p>
                      {t.description && <p className="text-xs sm:text-sm text-muted-foreground truncate max-w-[150px] sm:max-w-[200px]">{t.description}</p>}
                    </td>
                    <td className="p-2 sm:p-3 hidden sm:table-cell">
                      <div className="flex flex-col gap-1">
                        <p className="font-medium text-xs">{t.assignedToName}</p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded capitalize font-semibold text-muted-foreground border">
                            {t.role && t.role.toLowerCase() === "all" ? "All Team" : t.role || "All Team"}
                          </span>
                          <span className="text-xs text-muted-foreground">by {t.assignedByName}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-2 sm:p-3">
                      <Badge variant="outline" className={`text-xs sm:text-xs ${priorityColor(t.priority)}`}>
                        {t.priority}
                      </Badge>
                    </td>
                    <td className="p-2 sm:p-3 hidden md:table-cell">
                      <div className="flex items-center gap-1 capitalize text-xs">
                        {statusIcon(t.status)} {t.status}
                      </div>
                    </td>
                    <td className="p-2 sm:p-3 text-sm text-muted-foreground hidden lg:table-cell">{t.dueDate}</td>
                    <td className="p-2 sm:p-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {(isAdmin || t.assignedBy === user?.id || t.assignedTo === user?.id) && (
                          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={(e) => { e.stopPropagation(); handleStartEdit(t); }}><Edit2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" /></Button>
                        )}
                        {(isAdmin || t.assignedBy === user?.id) && (
                          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}><Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" /></Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="p-4 sm:p-8 text-center text-muted-foreground text-sm sm:text-base">No tasks matching filters</td></tr>
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
          <Card key={t.id} className="hover:shadow-md hover:border-primary/20 transition-all cursor-pointer" onClick={() => setSelectedViewTask(t)}>
            <CardContent className="p-3 sm:p-4 flex flex-col h-full">
              <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2 sm:mb-3">
                <button
                  onClick={(e) => { e.stopPropagation(); handleStatusChange(t.id, t.status === "completed" ? "pending" : "completed"); }}
                  className="mt-1 shrink-0"
                >
                  {statusIcon(t.status)}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-medium leading-none mb-1 text-sm sm:text-base">{t.title}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Due: {t.dueDate}</p>
                </div>
                <div className="flex flex-col gap-1 items-end shrink-0">
                  <Badge variant="outline" className={`text-[10px] sm:text-[11px] shrink-0 font-medium py-0.5 px-1.5 ${priorityColor(t.priority)}`}>
                    {t.priority}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] capitalize font-medium py-0.5 px-1.5 border border-muted-foreground/10 shrink-0">
                    {t.role && t.role.toLowerCase() === "all" ? "All Team" : t.role || "All Team"}
                  </Badge>
                </div>
              </div>

              {t.description && <p className="text-sm sm:text-base text-muted-foreground mb-3 sm:mb-4 line-clamp-2">{t.description}</p>}

              {t.voiceNote && (
                <div className="mb-3 sm:mb-4 bg-muted/40 p-2 rounded-lg" onClick={(e) => e.stopPropagation()}>
                  <audio src={t.voiceNote} className="h-5 sm:h-6 w-full" controls />
                </div>
              )}

              <div className="mt-auto pt-2 sm:pt-3 border-t flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
                <span className="truncate">To: {t.assignedToName}</span>
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {(isAdmin || t.assignedBy === user?.id || t.assignedTo === user?.id) && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0" onClick={(e) => { e.stopPropagation(); handleStartEdit(t); }}><Edit2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" /></Button>
                  )}
                  {(isAdmin || t.assignedBy === user?.id) && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 p-0 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}><Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" /></Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card className="col-span-full"><CardContent className="p-4 sm:p-8 text-center text-muted-foreground text-sm sm:text-base">No tasks matching filters</CardContent></Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl">Tasks</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Assign and coordinate duties</p>
        </div>
        {canAssign && (
          <div className="flex items-center sm:justify-end">
            {canAssignOthers ? (
              <>
                <Popover open={taskMenuOpen} onOpenChange={setTaskMenuOpen}>
                  <PopoverTrigger asChild>
                    <Button size="sm" className="w-full sm:hidden">
                      <Plus className="h-4 w-4 mr-1" /> Add Task
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-56 p-2 flex flex-col gap-1 sm:hidden">
                    <Button variant="ghost" size="sm" className="justify-start w-full font-normal" onClick={() => { setTaskMenuOpen(false); setForm({ title: "", description: "", role: "all", assignedTo: "", priority: "medium", dueDate: today, isPrivate: false, isRecurring: false }); setDialogOpen(true); }}>
                      Assign Task to Others
                    </Button>
                    {isAdmin && (
                      <Button variant="ghost" size="sm" className="justify-start w-full font-normal" onClick={() => { setTaskMenuOpen(false); setForm({ title: "", description: "", role: "Staff", assignedTo: "", priority: "medium", dueDate: "", isPrivate: false, isRecurring: true }); setDialogOpen(true); }}>
                        Create Repeating Task
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" className="justify-start w-full font-normal" onClick={() => { setTaskMenuOpen(false); setForm({ title: "", description: "", role: "all", assignedTo: user?.id || "", priority: "medium", dueDate: today, isPrivate: true, isRecurring: false }); setDialogOpen(true); }}>
                      Create Private Task
                    </Button>
                  </PopoverContent>
                </Popover>

                <div className="hidden sm:block">
                  <HoverCard openDelay={100} closeDelay={200}>
                    <HoverCardTrigger asChild>
                      <Button size="sm" className="w-full sm:w-auto" onClick={() => { setForm({ title: "", description: "", role: "all", assignedTo: "", priority: "medium", dueDate: today, isPrivate: false, isRecurring: false }); setDialogOpen(true); }}>
                        <Plus className="h-4 w-4 mr-1" /> Add Task
                      </Button>
                    </HoverCardTrigger>
                    <HoverCardContent align="end" className="w-48 p-2 flex flex-col gap-1">
                      <Button variant="ghost" size="sm" className="justify-start w-full font-normal" onClick={() => { setForm({ title: "", description: "", role: "all", assignedTo: "", priority: "medium", dueDate: today, isPrivate: false, isRecurring: false }); setDialogOpen(true); }}>
                        Assign Task to Others
                      </Button>
                      {isAdmin && (
                        <Button variant="ghost" size="sm" className="justify-start w-full font-normal" onClick={() => { setForm({ title: "", description: "", role: "Staff", assignedTo: "", priority: "medium", dueDate: "", isPrivate: false, isRecurring: true }); setDialogOpen(true); }}>
                          Create Repeating Task
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="justify-start w-full font-normal" onClick={() => { setForm({ title: "", description: "", role: "all", assignedTo: user?.id || "", priority: "medium", dueDate: today, isPrivate: true, isRecurring: false }); setDialogOpen(true); }}>
                        Create Private Task
                      </Button>
                    </HoverCardContent>
                  </HoverCard>
                </div>
              </>
            ) : (
              <Button size="sm" className="w-full sm:w-auto" onClick={() => { setForm({ title: "", description: "", role: "all", assignedTo: user?.id || "", priority: "medium", dueDate: today, isPrivate: true, isRecurring: false }); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Add Task
              </Button>
            )}

            <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setVoiceNote(null); setAttachments([]); } }}>
              <DialogContent className="w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto rounded-lg p-4 sm:w-full sm:max-w-[480px] sm:p-6">
                <DialogHeader><DialogTitle>{form.isPrivate ? "Create Private Task" : (form.isRecurring ? "Create Repeating Task" : "Create New Task")}</DialogTitle></DialogHeader>
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
                    <div className={canAssignOthers ? "grid grid-cols-1 gap-4 sm:grid-cols-2" : "space-y-2"}>
                      {canAssignOthers && (
                        <div className="space-y-2">
                          <Label>Assign by Role</Label>
                          <Select value={form.role === "all" && form.isRecurring ? "Staff" : form.role} onValueChange={(v) => setForm({ ...form, role: v, assignedTo: "" })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {!form.isRecurring && <SelectItem value="all">All Team (Staff & Dentists)</SelectItem>}
                              <SelectItem value="Dentist">Dentist</SelectItem>
                              <SelectItem value="Staff">Staff</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label>Select Assignee</Label>
                        <Select
                          value={form.assignedTo || "all-role-members"}
                          onValueChange={(v) => {
                            if (v === "all-role-members") {
                              setForm({ ...form, assignedTo: "" });
                            } else {
                              const selectedUser = allUsers.find(u => u.id === v);
                              setForm({ ...form, assignedTo: v, role: selectedUser ? selectedUser.role : form.role });
                            }
                          }}
                        >
                          <SelectTrigger><SelectValue placeholder="All members (Default)" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all-role-members">All Role Members</SelectItem>
                            {targetUsers.map((s) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                  <div className={form.isRecurring ? "space-y-2" : "grid grid-cols-1 gap-4 sm:grid-cols-2"}>
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
                    {!form.isRecurring && (
                      <div className="space-y-2">
                        <Label className="block mb-1.5">Due Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "group w-full min-w-0 justify-start overflow-hidden text-left font-normal h-10 rounded-xl border-muted bg-[#f5f5f4] text-[#1c1917] hover:bg-[#e7b008] hover:text-white transition-all",
                                !form.dueDate && "text-muted-foreground hover:text-white"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4 text-[#e7b008] group-hover:text-white transition-colors" />
                              <span className="min-w-0 truncate">{form.dueDate ? format(parseISO(form.dueDate), "PPP") : "Pick a date"}</span>
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
                    )}
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
                      <span className="text-sm text-muted-foreground">{isRecording ? "Recording..." : voiceNote ? "Voice note captured" : "No recording"}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Attachments (Optional)</Label>
                    <div className="flex items-center gap-3 p-3 border rounded-xl bg-muted/30">
                      <Input
                        type="file"
                        multiple
                        onChange={(e) => {
                          if (!e.target.files) return;
                          const filesArray = Array.from(e.target.files);
                          filesArray.forEach((file) => {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setAttachments((prev) => [
                                ...prev,
                                {
                                  name: file.name,
                                  mimeType: file.type,
                                  dataUrl: reader.result as string
                                }
                              ]);
                            };
                            reader.readAsDataURL(file);
                          });
                        }}
                        className="hidden"
                        id="task-file-upload"
                      />
                      <Label
                        htmlFor="task-file-upload"
                        className="inline-flex items-center justify-center rounded-xl text-sm font-medium border border-muted bg-[#f5f5f4] text-[#1c1917] hover:bg-[#e7b008] hover:text-white transition-all h-10 px-4 cursor-pointer"
                      >
                        Choose Files
                      </Label>
                      <span className="text-xs text-muted-foreground">Images, PDFs, documents...</span>
                    </div>
                    {attachments.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {attachments.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between border p-2 rounded-xl bg-muted/40 text-xs">
                            <span className="truncate max-w-[120px]">{file.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                              onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <Button onClick={handleAdd} className="w-full" disabled={!form.title}>Create Task</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>

      <div className="grid gap-2 sm:gap-3 sm:grid-cols-3">
        <Card><CardContent className="pt-3 sm:pt-4 text-center">
          <p className="text-lg sm:text-2xl font-bold text-accent">{pendingCount}</p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Pending</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 sm:pt-4 text-center">
          <p className="text-lg sm:text-2xl font-bold text-primary">{inProgressCount}</p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">In Progress</p>
        </CardContent></Card>
        <Card><CardContent className="pt-3 sm:pt-4 text-center">
          <p className="text-lg sm:text-2xl font-bold text-secondary">{completedCount}</p>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Completed</p>
        </CardContent></Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 md:max-lg:flex-row md:max-lg:justify-between">
          <TabsList>
            <TabsTrigger value="assigned-tasks">Assigned Tasks</TabsTrigger>
            <TabsTrigger value="repeating-tasks">Repeating Tasks</TabsTrigger>
            <TabsTrigger value="private-tasks">Private Tasks</TabsTrigger>
          </TabsList>
          <div className="hidden md:max-lg:flex items-center gap-1 border rounded-lg p-0.5 bg-muted/20">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-9 w-24 rounded-md text-sm"
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-4 w-4 mr-1.5" /> Grid
            </Button>
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="icon"
              className="h-9 w-24 rounded-md text-sm"
              onClick={() => setViewMode("table")}
            >
              <List className="h-4 w-4 mr-1.5" /> Table
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-3 sm:space-y-4">
          {/* Search and Filters Row */}
          <div className="flex flex-col gap-3 sm:gap-4 md:max-lg:grid md:max-lg:grid-cols-[minmax(0,1fr)_auto] md:max-lg:items-start lg:flex-row lg:items-center">
            {/* Search - Left on tablet+ */}
            <div className="relative flex-1 order-2 md:max-lg:order-1 lg:order-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="h-11 pl-9 text-sm lg:h-10" placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            {/* Filters and Toggle - Right on tablet+ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:flex gap-2 sm:gap-3 items-stretch lg:items-center order-1 md:max-lg:order-2 md:max-lg:min-w-[340px] md:max-lg:justify-end lg:order-2 lg:justify-end">
              {/* Grid/Table Toggle - Primary on mobile */}
              <div className="flex md:hidden items-center gap-1 border rounded-lg p-0.5 bg-muted/20 w-full sm:col-span-2">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-9 w-full flex-1 rounded-md text-sm"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-4 w-4 mr-1.5" /> Grid
                </Button>
                <Button
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-9 w-full flex-1 rounded-md text-sm"
                  onClick={() => setViewMode("table")}
                >
                  <List className="h-4 w-4 mr-1.5" /> Table
                </Button>
              </div>

              {/* Status & Priority Filters - Always visible */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-11 w-full text-sm md:max-lg:w-[160px] lg:h-10 lg:w-auto"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="h-11 w-full text-sm md:max-lg:w-[160px] lg:h-10 lg:w-auto"><SelectValue placeholder="Priority" /></SelectTrigger>
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
                    <SelectTrigger className="h-11 w-full text-sm md:max-lg:w-[160px] lg:h-10 lg:w-auto"><SelectValue placeholder="Role" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="Dentist">Dentist</SelectItem>
                      <SelectItem value="Staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={userFilter} onValueChange={setUserFilter}>
                    <SelectTrigger className="h-11 w-full text-sm md:max-lg:w-[160px] lg:h-10 lg:w-auto"><SelectValue placeholder="Assignee" /></SelectTrigger>
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
              <div className="hidden lg:flex items-center gap-1 border rounded-lg p-0.5 bg-muted/20">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-9 w-7 sm:w-8 rounded-md"
                  onClick={() => setViewMode("grid")}
                >
                  <LayoutGrid className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                </Button>
                <Button
                  variant={viewMode === "table" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-9 w-7 sm:w-8 rounded-md"
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

      <Dialog open={!!editTask} onOpenChange={(o) => { if (!o) { setEditTask(null); setVoiceNote(null); setEditAttachments([]); } }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto rounded-lg p-4 sm:w-full sm:max-w-[480px] sm:p-6">
          <DialogHeader><DialogTitle>Edit {editTask?.assignedTo === editTask?.assignedBy ? "Private Task" : (editTask?.isRecurring ? "Repeating Task" : "Task")}</DialogTitle></DialogHeader>
          {editTask && (() => {
            const isCreatorOfEditTask = editTask.assignedBy === user?.id;
            const canEditAllFields = isAdmin || isCreatorOfEditTask;
            return (
              <div className="space-y-4 mt-2">
                {!canEditAllFields && (
                  <div className="p-3 border border-amber-500/30 rounded-xl bg-amber-500/10 text-amber-800 dark:text-amber-400 text-xs">
                    This task was assigned to you by <strong>{editTask.assignedByName}</strong>. You are only authorized to update its status.
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Task Title</Label>
                  <Input disabled={!canEditAllFields} placeholder="Enter title" value={editTask.title} onChange={(e) => setEditTask({ ...editTask, title: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea disabled={!canEditAllFields} placeholder="Details about the task..." value={editTask.description} onChange={(e) => setEditTask({ ...editTask, description: e.target.value })} />
                </div>

                {!(editTask.assignedTo === editTask.assignedBy) && canAssignOthers && canEditAllFields && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Assign by Role</Label>
                      <Select
                        value={editTaskRoleFilter === "all" && editTask.isRecurring ? "Staff" : editTaskRoleFilter}
                        onValueChange={(v) => {
                          setEditTaskRoleFilter(v);
                          setEditTask({ ...editTask, role: v, assignedTo: "" });
                        }}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {!editTask.isRecurring && <SelectItem value="all">All Team (Staff & Dentists)</SelectItem>}
                          <SelectItem value="Dentist">Dentist</SelectItem>
                          <SelectItem value="Staff">Staff</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Select Assignee</Label>
                      <Select
                        value={editTask.assignedTo || "all-role-members"}
                        onValueChange={(v) => {
                          if (v === "all-role-members") {
                            setEditTask({ ...editTask, assignedTo: "" });
                          } else {
                            const selectedUser = allUsers.find(u => u.id === v);
                            if (selectedUser) {
                              setEditTask({
                                ...editTask,
                                assignedTo: v,
                                role: selectedUser.role
                              });
                            }
                          }
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="All members (Default)" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all-role-members">All Role Members</SelectItem>
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
                    <Select disabled={!canEditAllFields} value={editTask.priority} onValueChange={(v) => setEditTask({ ...editTask, priority: v as Task["priority"] })}>
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

                {!editTask.isRecurring && (
                  <div className="space-y-2">
                    <Label className="block mb-1.5">Due Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          disabled={!canEditAllFields}
                          variant="outline"
                          className={cn(
                            "group w-full justify-start text-left font-normal h-10 rounded-xl border-muted bg-[#f5f5f4] text-[#1c1917] hover:bg-[#e7b008] hover:text-white transition-all",
                            !editTask.dueDate && "text-muted-foreground hover:text-white"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4 text-[#e7b008] group-hover:text-white transition-colors" />
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
                )}

                <div className="space-y-2">
                  <Label>Attachments (Optional)</Label>
                  <div className="flex items-center gap-3 p-3 border rounded-xl bg-muted/30">
                    <Input
                      type="file"
                      multiple
                      onChange={(e) => {
                        if (!e.target.files) return;
                        const filesArray = Array.from(e.target.files);
                        filesArray.forEach((file) => {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setEditAttachments((prev) => [
                              ...prev,
                              {
                                name: file.name,
                                mimeType: file.type,
                                dataUrl: reader.result as string
                              }
                            ]);
                          };
                          reader.readAsDataURL(file);
                        });
                      }}
                      className="hidden"
                      id="edit-task-file-upload"
                    />
                    <Label
                      htmlFor="edit-task-file-upload"
                      className="inline-flex items-center justify-center rounded-xl text-sm font-medium border border-muted bg-[#f5f5f4] text-[#1c1917] hover:bg-[#e7b008] hover:text-white transition-all h-10 px-4 cursor-pointer"
                    >
                      Choose Files
                    </Label>
                    <span className="text-xs text-muted-foreground">Images, PDFs, documents...</span>
                  </div>
                  {editAttachments.length > 0 && (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {editAttachments.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between border p-2 rounded-xl bg-muted/40 text-xs">
                          <span className="truncate max-w-[120px]">{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10"
                            onClick={() => setEditAttachments((prev) => prev.filter((_, i) => i !== idx))}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button onClick={handleUpdate} className="w-full" disabled={!editTask.title}>Update Task</Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedViewTask} onOpenChange={(o) => { if (!o) setSelectedViewTask(null); }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-h-[90vh] overflow-y-auto rounded-2xl p-5 sm:w-full sm:max-w-[500px] sm:p-6 bg-card border shadow-xl">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className={cn("text-xs capitalize py-0.5 px-2", priorityColor(selectedViewTask?.priority || "medium"))}>
                {selectedViewTask?.priority} Priority
              </Badge>
              {selectedViewTask?.isRecurring && (
                <Badge variant="secondary" className="text-xs bg-amber-500/10 text-amber-700 dark:text-amber-400 dark:bg-amber-500/20 border-amber-500/20 py-0.5 px-2 font-medium">
                  🔄 Repeating
                </Badge>
              )}
            </div>
            <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground pr-6 leading-snug">
              {selectedViewTask?.title}
            </DialogTitle>
          </DialogHeader>

          {selectedViewTask && (
            <div className="space-y-5 mt-4">
              {/* Description */}
              {selectedViewTask.description ? (
                <div className="space-y-1.5 bg-muted/30 p-3.5 rounded-xl border border-muted/50">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Description</span>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {selectedViewTask.description}
                  </p>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground italic bg-muted/25 p-3.5 rounded-xl border border-dashed text-center">
                  No description provided.
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 bg-muted/10 p-4 rounded-xl border">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground block">Status</span>
                  <div className="flex items-center gap-1.5">
                    {statusIcon(selectedViewTask.status)}
                    <span className="text-sm font-medium capitalize text-foreground">{selectedViewTask.status}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground block">Assigned To</span>
                  <span className="text-sm font-medium text-foreground truncate block">
                    {selectedViewTask.assignedToName}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground block">Assigned By</span>
                  <span className="text-sm font-medium text-foreground truncate block">
                    {selectedViewTask.assignedByName}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground block">{selectedViewTask.isRecurring ? "Due" : "Due Date"}</span>
                  <span className="text-sm font-medium text-foreground block">
                    {selectedViewTask.isRecurring ? "Daily Task" : (selectedViewTask.dueDate ? format(parseISO(selectedViewTask.dueDate), "PPP") : "No due date")}
                  </span>
                </div>
              </div>

              {/* Voice Note */}
              {selectedViewTask.voiceNote && (
                <div className="space-y-2 bg-primary/5 p-3.5 rounded-xl border border-primary/10">
                  <span className="text-xs font-semibold text-primary uppercase tracking-wider block">Voice Instructions</span>
                  <audio src={selectedViewTask.voiceNote} className="h-8 w-full" controls />
                </div>
              )}

              {/* Attachments Section */}
              {selectedViewTask.attachments && selectedViewTask.attachments.length > 0 && (
                <div className="space-y-2 bg-muted/20 p-3.5 rounded-xl border">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Attachments ({selectedViewTask.attachments.length})</span>
                  <div className="grid grid-cols-2 gap-3">
                    {selectedViewTask.attachments.map((att, idx) => {
                      const isImage = att.mimeType && att.mimeType.startsWith('image/');
                      return (
                        <div key={idx} className="flex flex-col border rounded-xl bg-card overflow-hidden shadow-sm">
                          {isImage ? (
                            <img src={att.dataUrl} alt={att.name} className="h-24 w-full object-cover border-b" />
                          ) : (
                            <div className="h-24 w-full bg-muted flex items-center justify-center border-b">
                              <span className="text-xs font-bold text-muted-foreground uppercase">{att.name.split('.').pop() || 'file'}</span>
                            </div>
                          )}
                          <div className="p-2 flex items-center justify-between gap-1">
                            <span className="text-xs truncate font-medium flex-1" title={att.name}>{att.name}</span>
                            <a
                              href={att.dataUrl}
                              download={att.name}
                              className="text-xs font-bold text-[#e7b008] hover:text-[#c59606] transition-colors hover:underline shrink-0"
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t font-sans">
                {(isAdmin || selectedViewTask.assignedBy === user?.id || selectedViewTask.assignedTo === user?.id) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 px-4 rounded-xl font-medium"
                    onClick={() => {
                      const taskToEdit = selectedViewTask;
                      setSelectedViewTask(null);
                      handleStartEdit(taskToEdit);
                    }}
                  >
                    <Edit2 className="h-4 w-4 mr-1.5" /> Edit Task
                  </Button>
                )}
                <Button
                  className="h-9 px-4 rounded-xl font-medium bg-[#e7b008] hover:bg-[#c59606] text-white"
                  onClick={() => setSelectedViewTask(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
