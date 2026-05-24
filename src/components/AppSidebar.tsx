import {
  LayoutDashboard,
  UserCog,
  Settings,
  LogOut,
  Clock,
  CheckSquare,
  CalendarOff,
  Mic,
  MessageSquare,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useChat } from "@/contexts/ChatContext";

function getNavItems(rolePrefix: string) {
  const isEmployee = rolePrefix === "dentist" || rolePrefix === "staff";
  const isAdmin = rolePrefix === "admin" || rolePrefix === "superadmin";

  if (isAdmin) {
    // Admin strictly sees ONLY the 5 requested modules
    return {
      mainItems: [
        { title: "Dashboard", url: `/${rolePrefix}/dashboard`, icon: LayoutDashboard },
        { title: "Messages", url: `/${rolePrefix}/messages`, icon: MessageSquare },
      ],
      hrItems: [
        { title: "Employee", url: `/${rolePrefix}/staff`, icon: UserCog },
        { title: "Attendance", url: `/${rolePrefix}/attendance`, icon: Clock },
        { title: "Leave", url: `/${rolePrefix}/leave-requests`, icon: CalendarOff },
        { title: "Tasks", url: `/${rolePrefix}/tasks`, icon: CheckSquare },
      ],
      businessItems: [],
      analyticsItems: [
        { title: "Clinic Settings", url: `/${rolePrefix}/settings`, icon: Settings },
      ],
    };
  }

  // Dentist and Staff see only their active work modules
  return {
    mainItems: [
      { title: "Dashboard", url: `/${rolePrefix}/dashboard`, icon: LayoutDashboard },
      { title: "Messages", url: `/${rolePrefix}/messages`, icon: MessageSquare },
    ],
    hrItems: [
      { title: "Attendance", url: `/${rolePrefix}/attendance`, icon: Clock },
      { title: "Tasks", url: `/${rolePrefix}/tasks`, icon: CheckSquare },
      { title: "Leave Requests", url: `/${rolePrefix}/leave-requests`, icon: CalendarOff },
    ],
    businessItems: [],
    analyticsItems: [
      { title: "Settings", url: `/${rolePrefix}/settings`, icon: Settings },
    ],
  };
}

interface NavSectionProps {
  label: string;
  items: { title: string; url: string; icon: any }[];
  collapsed: boolean;
}

function NavSection({ label, items, collapsed }: NavSectionProps) {
  const location = useLocation();
  const { unreadCountContext } = useChat();

  if (items.length === 0) return null;

  return (
    <SidebarGroup>
      {!collapsed && <SidebarGroupLabel>{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={location.pathname === item.url || (item.url !== "/" && location.pathname.startsWith(item.url))}
              >
                <NavLink
                  to={item.url}
                  end={item.url.endsWith("/dashboard")}
                  className="hover:bg-sidebar-accent/60 flex items-center w-full"
                  activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                >
                  <div className="relative flex items-center justify-center shrink-0">
                    <item.icon className="h-4 w-4" />
                    {collapsed && item.title === "Messages" && unreadCountContext > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-2 h-2 bg-destructive rounded-full animate-pulse" />
                    )}
                  </div>
                  {!collapsed && (
                    <span className="flex-1 flex items-center justify-between w-full ml-3 min-w-0">
                      <span className="truncate">{item.title}</span>
                      {item.title === "Messages" && unreadCountContext > 0 && (
                        <span className="bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full select-none shrink-0 animate-pulse">
                          {unreadCountContext}
                        </span>
                      )}
                    </span>
                  )}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}


export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, logout } = useAuth();

  const userRoleLower = (user?.role || "Admin").toLowerCase();
  const rolePrefix = userRoleLower === "receptionist" ? "reception" : userRoleLower;
  const { mainItems, hrItems, businessItems, analyticsItems } = getNavItems(rolePrefix);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  return (
    <Sidebar collapsible="icon">
      <div className={`flex items-center gap-2 py-4 transition-all duration-200 ${collapsed ? "px-2 justify-center" : "px-4"}`}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
          <span className="text-sm font-bold text-primary-foreground">N</span>
        </div>
        {!collapsed && (
          <span className="text-lg font-serif font-bold text-foreground">
            Navadia
          </span>
        )}
      </div>

      <SidebarContent>
        <NavSection label="Main" items={mainItems} collapsed={collapsed} />
        <NavSection label="HR & Tasks" items={hrItems} collapsed={collapsed} />
        <NavSection label="System" items={analyticsItems} collapsed={collapsed} />
      </SidebarContent>

      <SidebarFooter>
        <div className={`flex items-center gap-3 py-3 transition-all duration-200 ${collapsed ? "px-2 justify-center" : "px-3"}`}>
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium text-foreground truncate">{user?.name}</span>
              <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
            </div>
          )}
          {!collapsed && (
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={logout} title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
