import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Login({ isAdmin = false }: { isAdmin?: boolean }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
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
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      toast({ title: "Welcome back!", description: result.message });
      const stored = localStorage.getItem("navadia_current_user");
      if (stored) {
        const currentUserObj = JSON.parse(stored);
        const lower = currentUserObj.role.toLowerCase();
        const prefix = lower === "receptionist" ? "reception" : lower;
        navigate(`/${prefix}/dashboard`, { replace: true });
      }
    } else {
      toast({ title: "Login failed", description: result.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-[90vh] md:min-h-screen flex items-center justify-center bg-background p-4 font-sans">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="flex h-12 w-12 items-center justify-center">
              <img src="/logo.png" alt="Navadia logo" className="h-12 w-12 object-contain" />
            </div>
            <h1 className="text-4xl text-foreground tracking-tight">Navadia</h1>
          </div>
        </div>

        <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl text-center">
              {isAdmin ? "Admin Login Portal" : "Dentist & Staff Login"}
            </CardTitle>
          </CardHeader>

          <div className="mx-4 pt-2 border-t border-dashed border-muted-foreground/20"></div>


          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
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
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                    id="password" 
                    type="password" 
                    placeholder="Enter your password" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    required 
                    className="h-11 bg-background/50"
                    autoComplete="off"
                />
              </div>
              <Button type="submit" className="w-full h-11 text-base font-semibold shadow-lg shadow-primary/20 transition-all active:scale-[0.98]" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            
            {isAdmin && (
              <div className="mt-6 text-center text-sm text-muted-foreground pt-2 border-t border-dashed border-muted-foreground/20">
                Don't have an account?{" "}
                <Link to="/admin/signup" className="text-primary hover:underline font-bold transition-colors">Sign up</Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
