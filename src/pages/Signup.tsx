import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth, UserRole } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [loading, setLoading] = useState(false);
  const [portalType, setPortalType] = useState<"STAFF" | "DENTIST">("STAFF");
  
  const { signup } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Reset internal role when portal type changes to help user
  useEffect(() => {
    if (portalType === "DENTIST") setRole("dentist");
    else setRole("");
  }, [portalType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!role) {
      toast({ title: "Error", description: "Please select a role", variant: "destructive" });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setLoading(true);
    
    const result = await signup({ 
      name, 
      email, 
      password, 
      role: role as UserRole
    });
    
    setLoading(false);
    if (result.success) {
      toast({ title: "Welcome!", description: "Account created successfully" });
      const stored = localStorage.getItem("navadia_current_user");
      if (stored) {
        const user = JSON.parse(stored);
        const prefix = user.role === "receptionist" ? "reception" : user.role;
        navigate(`/${prefix}/dashboard`, { replace: true });
      }
    } else {
      toast({ title: "Signup failed", description: result.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <span className="text-xl font-bold text-primary-foreground">N</span>
            </div>
            <h1 className="text-4xl font-serif text-foreground">Navadia</h1>
          </div>
          <p className="text-muted-foreground text-sm">Join the future of dental care</p>
        </div>

        {/* Toggle Section Outside Card */}
        <div className="flex items-center justify-center pt-2">
          <div className="bg-muted p-1 rounded-md flex relative w-full h-[52px] border border-muted-foreground/10">
            {/* Animated Slider */}
            <div 
              className={cn(
                "absolute top-1 bottom-1 w-[calc(50%-4px)] bg-background rounded-sm shadow-sm transition-all duration-300 ease-in-out",
                portalType === "STAFF" ? "left-1" : "left-[calc(50%+2px)]"
              )}
            />
            <button 
              type="button"
              className={cn(
                "flex-1 relative z-10 text-sm font-bold transition-colors duration-200",
                portalType === "STAFF" ? "text-primary" : "text-muted-foreground"
              )}
              onClick={() => setPortalType("STAFF")}
            >
              Staff
            </button>
            <button 
              type="button"
              className={cn(
                "flex-1 relative z-10 text-sm font-bold transition-colors duration-200",
                portalType === "DENTIST" ? "text-primary" : "text-muted-foreground"
              )}
              onClick={() => setPortalType("DENTIST")}
            >
              Dentist
            </button>
          </div>
        </div>


        <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-sans text-center">Create Account</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6 border-t border-dashed border-muted-foreground/20"></div>

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input 
                    id="name" 
                    placeholder="Enter your full name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                    className="h-11 bg-background/50"
                    autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                    id="email" 
                    type="email" 
                    placeholder="you@navadia.com" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                    className="h-11 bg-background/50"
                    autoComplete="off"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                      id="password" 
                      type="password" 
                      placeholder="••••••••" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required 
                      className="h-11 bg-background/50"
                      autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm</Label>
                  <Input 
                      id="confirmPassword" 
                      type="password" 
                      placeholder="••••••••" 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      required 
                      className="h-11 bg-background/50"
                      autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                  <SelectTrigger className="h-11 bg-background/50">
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="dentist">Dentist</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]" disabled={loading}>
                {loading ? "Creating account..." : "Sign Up"}
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-bold transition-colors">Sign in</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}



