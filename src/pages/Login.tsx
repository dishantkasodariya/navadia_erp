import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      toast({ title: "Welcome back!", description: result.message });
      // Redirect based on role - get from localStorage since state may not have updated yet
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">N</span>
            </div>
            <h1 className="text-3xl font-serif text-foreground">Navadia</h1>
          </div>
          <p className="text-muted-foreground text-sm">Sign in to your account</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-sans">Login</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@navadia.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" placeholder="Enter your password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary hover:underline font-medium">Sign up</Link>
            </div>

            <div className="mt-8 space-y-3 pt-6 border-t border-dashed">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold text-center">Temporary Staff Access</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="text-[10px] h-auto py-2 flex-col gap-1 border-primary/20 hover:bg-primary/5" onClick={() => { setEmail("jatin@navadia.com"); setPassword("jatin"); }}>
                  <span className="font-bold">Dr. Jatin</span>
                  <span className="opacity-60 font-mono">Admin</span>
                </Button>
                <Button variant="outline" size="sm" className="text-[10px] h-auto py-2 flex-col gap-1 border-secondary/20 hover:bg-secondary/5" onClick={() => { setEmail("eva@navadia.com"); setPassword("eva"); }}>
                  <span className="font-bold">Dr. Eva</span>
                  <span className="opacity-60 font-mono">Dentist</span>
                </Button>
                <Button variant="outline" size="sm" className="text-[10px] h-auto py-2 flex-col gap-1 border-secondary/20 hover:bg-secondary/5" onClick={() => { setEmail("archita@navadia.com"); setPassword("archita"); }}>
                  <span className="font-bold">Dr. Archita</span>
                  <span className="opacity-60 font-mono">Dentist</span>
                </Button>
                <Button variant="outline" size="sm" className="text-[10px] h-auto py-2 flex-col gap-1 border-secondary/20 hover:bg-secondary/5" onClick={() => { setEmail("sejal@navadia.com"); setPassword("sejal"); }}>
                  <span className="font-bold">Dr. Sejal</span>
                  <span className="opacity-60 font-mono">Dentist</span>
                </Button>
              </div>
              <p className="text-[9px] text-center text-muted-foreground italic mt-2">Click to auto-fill. Password is the same as the name.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
