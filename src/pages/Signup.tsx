import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  const { signup, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      const lower = user.role.toLowerCase();
      const prefix = lower === "receptionist" ? "reception" : lower;
      navigate(`/${prefix}/dashboard`, { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      role: "Admin"
    });
    
    setLoading(false);
    if (result.success) {
      toast({ title: "Welcome!", description: "Admin account created successfully" });
      navigate("/admin/dashboard", { replace: true });
    } else {
      toast({ title: "Signup failed", description: result.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 font-sans">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
              <span className="text-xl font-bold text-primary-foreground">N</span>
            </div>
            <h1 className="text-4xl text-foreground tracking-tight">Navadia</h1>
          </div>
          <p className="text-muted-foreground text-sm">Join the future of dental care</p>
        </div>

        <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl text-center">Admin Registration</CardTitle>
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

              <Button type="submit" className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]" disabled={loading}>
                {loading ? "Creating admin account..." : "Sign Up"}
              </Button>
            </form>
            
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/admin/login" className="text-primary hover:underline font-bold transition-colors">Sign in</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
