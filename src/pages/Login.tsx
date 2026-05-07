import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginType, setLoginType] = useState<"STAFF" | "DENTIST">("STAFF");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password, loginType);
    setLoading(false);
    if (result.success) {
      toast({ title: "Welcome back!", description: result.message });
      // Redirect based on role
      const stored = localStorage.getItem("navadia_current_user");
      if (stored) {
        const user = JSON.parse(stored);
        const prefix = user.role === "receptionist" ? "reception" : user.role;
        navigate(`/${prefix}/dashboard`, { replace: true });
      }
    } else {
      toast({ title: "Login failed", description: result.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/20">
              <span className="text-xl font-bold text-primary-foreground">N</span>
            </div>
            <h1 className="text-4xl font-serif text-foreground tracking-tight">Navadia</h1>
          </div>
          <p className="text-muted-foreground text-sm">Welcome back! Please enter your details.</p>
        </div>

        {/* Toggle Section Outside Card */}
        <div className="flex items-center justify-center pt-2">
          <div className="bg-muted p-1 rounded-md flex relative w-full h-[52px] border border-muted-foreground/10">
            {/* Animated Slider */}
            <div 
              className={cn(
                "absolute top-1 bottom-1 w-[calc(50%-4px)] bg-background rounded-sm shadow-md transition-all duration-300 ease-in-out",
                loginType === "STAFF" ? "left-1" : "left-[calc(50%+2px)]"
              )}
            />
            <button 
              type="button"
              className={cn(
                "flex-1 relative z-10 text-sm font-bold transition-colors duration-200",
                loginType === "STAFF" ? "text-primary" : "text-muted-foreground"
              )}
              onClick={() => setLoginType("STAFF")}
            >
              Staff
            </button>
            <button 
              type="button"
              className={cn(
                "flex-1 relative z-10 text-sm font-bold transition-colors duration-200",
                loginType === "DENTIST" ? "text-primary" : "text-muted-foreground"
              )}
              onClick={() => setLoginType("DENTIST")}
            >
              Dentist
            </button>
          </div>
        </div>


        <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl font-sans text-center">Login</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-6 border-t border-dashed border-muted-foreground/20"></div>

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
            
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary hover:underline font-bold transition-colors">Sign up</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}




