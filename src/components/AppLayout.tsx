import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet, useNavigate } from "react-router-dom";
import { Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

export function AppLayout() {
  const { user, logout } = useAuth();
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead, clearNotifications } = useChat();
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const navigate = useNavigate();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Premium Unified Header for all roles (Admin, Dentist, Staff) */}
          <header className="sticky top-0 z-40 h-14 flex items-center justify-between border-b bg-card/80 backdrop-blur-md px-4 shrink-0 shadow-sm">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="capitalize text-xs font-sans tracking-wide">
                {user?.role}
              </Badge>

              {/* Real-Time Notification Center Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-xl hover:bg-muted/50 transition-colors">
                    <Bell className="h-4.5 w-4.5 text-foreground/80" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 p-0 px-1 flex items-center justify-center text-[9px] font-sans font-bold bg-amber-500 hover:bg-amber-600 text-white border-none animate-pulse rounded-full">
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 p-2 bg-card/95 backdrop-blur-md border border-muted/50 shadow-2xl rounded-xl z-50">
                  <div className="flex items-center justify-between pb-2 border-b border-muted/30 mb-2 px-1">
                    <span className="font-serif font-semibold text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs px-2 text-primary hover:text-white transition-colors" onClick={clearNotifications}>
                        Clear All
                      </Button>
                    )}
                  </div>
                  <ScrollArea className="h-64">
                    <div className="space-y-1.5 pr-2">
                      {notifications.length === 0 ? (
                        <div className="h-48 flex flex-col items-center justify-center text-muted-foreground text-xs py-8">
                          <Bell className="h-8 w-8 mb-2 opacity-20" />
                          <span>No new notifications</span>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <DropdownMenuItem
                            key={n.id}
                            className={`flex flex-col items-start gap-1 p-2.5 rounded-lg cursor-pointer transition-colors focus:bg-primary/5 focus:text-card-foreground ${
                              !n.isRead ? "bg-primary/5 border-l-2 border-primary" : ""
                            }`}
                            onClick={() => {
                              markNotificationAsRead(n.id);
                              if (user) {
                                const roleLower = user.role.toLowerCase();
                                const prefix = roleLower === "receptionist" ? "/reception" : `/${roleLower}`;
                                if (n.type === "message") {
                                  navigate(`${prefix}/messages`, { state: { selectUserId: n.targetId } });
                                } else if (n.type === "leave") {
                                  navigate(`${prefix}/leave-requests`);
                                } else if (n.type === "attendance") {
                                  navigate(`${prefix}/attendance`);
                                } else if (n.type === "task") {
                                  navigate(`${prefix}/tasks`, { state: { selectTaskId: n.targetId } });
                                }
                              }
                            }}
                          >
                            <div className="flex w-full items-start justify-between gap-2">
                              <span className="font-semibold text-xs leading-none truncate">{n.title}</span>
                              <span className="text-[9px] text-muted-foreground font-mono whitespace-nowrap">
                                {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-normal line-clamp-2">{n.description}</p>
                          </DropdownMenuItem>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                  {notifications.length > 0 && (
                    <div className="pt-2 mt-1 border-t border-muted/30 flex justify-center">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 text-xs w-full text-primary hover:bg-primary/10 hover:text-primary transition-all font-semibold rounded-lg"
                        onClick={markAllNotificationsAsRead}
                      >
                        Mark All as Read
                      </Button>
                    </div>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="ghost" size="icon" onClick={logout} title="Logout" className="h-9 w-9 rounded-xl hover:bg-muted/50 transition-colors">
                <LogOut className="h-4.5 w-4.5 text-foreground/80" />
              </Button>
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
