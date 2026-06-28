import { useState } from "react";
import { useAuth, UserRole, User } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, UserCog, Stethoscope, Users, Edit } from "lucide-react";
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
        <DialogContent className="w-[calc(100vw-2rem)] max-h-[calc(100svh-2rem)] overflow-y-auto rounded-lg p-4 sm:w-[calc(100vw-3rem)] sm:max-h-[calc(100svh-3rem)] sm:p-6 lg:w-full lg:max-h-none lg:overflow-visible">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit" : "Add New"} {role}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-base">Full Name *</Label>
                <Input className="h-10 sm:h-12 text-base" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-base">Email *</Label>
                <Input className="h-10 sm:h-12 text-base" type="email" placeholder="john@navadia.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              {!editId && (
                <div className="space-y-2">
                  <Label className="text-base">Password *</Label>
                  <Input className="h-10 sm:h-12 text-base" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-base">Mobile Number</Label>
                <Input className="h-10 sm:h-12 text-base" placeholder="+91 98765 43210" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-base">Aadhaar Card No.</Label>
                <Input className="h-10 sm:h-12 text-base" placeholder="1234 5678 9012" value={aadhaarNo} onChange={(e) => setAadhaarNo(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-base">Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                  <SelectTrigger className="h-10 sm:h-12 text-base"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dentist">Dentist</SelectItem>
                    <SelectItem value="Staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-base">Address</Label>
              <Input className="h-10 sm:h-12 text-base" placeholder="123 Street Name" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-base">City</Label>
                <Input className="h-10 sm:h-12 text-base" placeholder="Surat" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-base">State</Label>
                <Input className="h-10 sm:h-12 text-base" placeholder="Gujarat" value={stateName} onChange={(e) => setStateName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-base">Country</Label>
                <Input className="h-10 sm:h-12 text-base" placeholder="India" value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
            </div>

            {role.toLowerCase() === "dentist" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-base">Specialization</Label>
                  <Input className="h-10 sm:h-12 text-base" placeholder="e.g. Endodontics" value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-base">License No.</Label>
                  <Input className="h-10 sm:h-12 text-base" placeholder="DEN-2026-XXX" value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} />
                </div>
              </div>
            )}
            <Button onClick={handleSubmitForm} className="w-full h-10 sm:h-12 text-base">Confirm {editId ? "Edit" : "Add"} {role}</Button>
          </div>
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
            <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-3">
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
