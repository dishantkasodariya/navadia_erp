import { useState } from "react";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, UserCog, Stethoscope, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  dentist: <Stethoscope className="h-3 w-3" />,
  Dentist: <Stethoscope className="h-3 w-3" />,
  receptionist: <UserCog className="h-3 w-3" />,
  staff: <Users className="h-3 w-3" />,
  Staff: <Users className="h-3 w-3" />,
};

export default function StaffManagement() {
  const { allUsers, addStaffMember, removeStaffMember } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("Staff");
  const [password, setPassword] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const staffMembers = allUsers.filter((u) => u.role.toLowerCase() !== "admin");
  const filtered = filter === "all" ? staffMembers : staffMembers.filter((u) => u.role.toLowerCase() === filter.toLowerCase());

  const handleOpenAddDialog = (selectedRole: UserRole) => {
    setRole(selectedRole);
    setOpen(true);
  };

  const handleAdd = () => {
    if (!name || !email || !password) {
      toast({ title: "Error", description: "Name, email, and password are required", variant: "destructive" });
      return;
    }
    addStaffMember({ 
      name, 
      email, 
      role, 
      phone, 
      password, 
      specialization: role.toLowerCase() === "dentist" ? specialization : undefined, 
      licenseNo: role.toLowerCase() === "dentist" ? licenseNo : undefined 
    });
    toast({ title: "Staff added", description: `${name} has been added as ${role}` });
    setName(""); setEmail(""); setPhone(""); setRole("Staff"); setPassword(""); setSpecialization(""); setLicenseNo("");
    setOpen(false);
  };

  const handleRemove = (id: string, memberName: string) => {
    removeStaffMember(id);
    toast({ title: "Staff removed", description: `${memberName} has been removed` });
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-serif">Employee Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage team members, Dentists, and support Staff roles</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="default" className="gap-1.5" onClick={() => handleOpenAddDialog("Dentist")}>
            <Stethoscope className="h-4 w-4" /> Add Dentist
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleOpenAddDialog("Staff")}>
            <Plus className="h-4 w-4" /> Add Staff
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New {role}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="john@navadia.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dentist">Dentist</SelectItem>
                  <SelectItem value="Staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {role.toLowerCase() === "dentist" && (
              <>
                <div className="space-y-2">
                  <Label>Specialization</Label>
                  <Input placeholder="e.g. Endodontics" value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>License No.</Label>
                  <Input placeholder="DEN-2026-XXX" value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} />
                </div>
              </>
            )}
            <Button onClick={handleAdd} className="w-full">Confirm Add {role}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-sans text-muted-foreground">Dentists Registered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif text-primary">{staffMembers.filter((u) => u.role.toLowerCase() === "dentist").length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-sans text-muted-foreground">Staff & Support Registered</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-serif text-secondary">{staffMembers.filter((u) => u.role.toLowerCase() === "staff").length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
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
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No staff members found</TableCell>
                </TableRow>
              ) : (
                filtered.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell className="text-muted-foreground">{member.email}</TableCell>
                    <TableCell className="text-muted-foreground">{member.phone || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={roleBadgeVariant[member.role] || "outline"} className="gap-1 capitalize">
                        {roleIcons[member.role]}
                        {member.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{member.specialization || "—"}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleRemove(member.id, member.name)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
