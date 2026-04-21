import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("staff");
  const [phone, setPhone] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    const result = await signup({ name, email, password, role, phone, specialization: role === "dentist" ? specialization : undefined, licenseNo: role === "dentist" ? licenseNo : undefined });
    setLoading(false);
    if (result.success) {
      toast({ title: "Welcome!", description: "Account created successfully" });
      const prefix = role === "receptionist" ? "reception" : role;
      navigate(`/${prefix}/dashboard`, { replace: true });
    } else {
      toast({ title: "Signup failed", description: result.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">N</span>
            </div>
            <h1 className="text-3xl font-serif text-foreground">Navadia</h1>
          </div>
          <p className="text-muted-foreground text-sm">Create your account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-sans">Sign Up</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="Dr. John Doe" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@navadia.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" placeholder="+1 555-0100" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="dentist">Dentist</SelectItem>
                    <SelectItem value="receptionist">Receptionist</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {role === "dentist" && (
                <>
                  <div className="space-y-2">
                    <Label>Specialization</Label>
                    <Input placeholder="e.g. Endodontics" value={specialization} onChange={(e) => setSpecialization(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>License No.</Label>
                    <Input placeholder="DEN-2024-XXX" value={licenseNo} onChange={(e) => setLicenseNo(e.target.value)} />
                  </div>
                </>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating account..." : "Create Account"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
