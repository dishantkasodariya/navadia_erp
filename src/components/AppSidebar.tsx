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
import { useLocation, Link } from "react-router-dom";
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
        { title: "Employees", url: `/${rolePrefix}/staff`, icon: UserCog },
        { title: "Attendance", url: `/${rolePrefix}/attendance`, icon: Clock },
        { title: "Leave", url: `/${rolePrefix}/leave-requests`, icon: CalendarOff },
        { title: "Tasks", url: `/${rolePrefix}/tasks`, icon: CheckSquare },
      ],
      businessItems: [],
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
      { title: "Leave", url: `/${rolePrefix}/leave-requests`, icon: CalendarOff },
    ],
    businessItems: [],
  };
}

export function AppSidebar() {
  const location = useLocation();
  const { unreadCountContext } = useChat();
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, logout } = useAuth();
  const handleMobileNavigate = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const userRoleLower = (user?.role || "Admin").toLowerCase();
  const rolePrefix = userRoleLower === "receptionist" ? "reception" : userRoleLower;
  const { mainItems, hrItems } = getNavItems(rolePrefix);
  const allSidebarItems = [...mainItems, ...hrItems];

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "??";

  return (
    <Sidebar collapsible="icon">
      <Link
        to={`/${rolePrefix}/dashboard`}
        onClick={handleMobileNavigate}
        className={`flex items-center gap-3 py-4 transition-all duration-200 hover:opacity-80 focus:outline-none ${collapsed ? "px-2 justify-center" : "px-4"}`}
      >
        <div className="flex h-8 w-8 items-center justify-center">
          <img src="/logo.png" alt="Navadia logo" className="h-12 w-12 object-contain" />
        </div>
        {!collapsed && (
          <span className="text-2xl font-bold text-foreground">
            Navadia
          </span>
        )}
      </Link>

      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="px-3">Main</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {allSidebarItems.map((item) => (
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
                      onMobileNavigate={handleMobileNavigate}
                    >
                      <div className="relative flex items-center justify-center shrink-0">
                        <item.icon className="h-4 w-4" />
                        {collapsed && item.title === "Messages" && unreadCountContext > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 w-2 h-2 bg-destructive rounded-full animate-pulse" />
                        )}
                      </div>
                      {!collapsed && (
                        <span className="flex-1 flex items-center justify-between w-full ml-3 min-w-0 gap-2">
                          <span className="truncate text-base font-medium leading-6">{item.title}</span>
                          {item.title === "Messages" && unreadCountContext > 0 && (
                            <span className="bg-primary text-primary-foreground text-xs font-semibold px-2 py-0.5 rounded-full select-none shrink-0 animate-pulse">
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
      </SidebarContent>

      <SidebarFooter>
        <div className={`flex items-center gap-3 py-3 transition-all duration-200 ${collapsed ? "px-0 justify-center" : "px-3"}`}>
          <Link
            to={`/${rolePrefix}/settings`}
            onClick={handleMobileNavigate}
            className={`flex items-center transition-all duration-150 ${
              collapsed
                ? "w-10 h-10 justify-center rounded-md hover:bg-sidebar-accent/60"
                : "gap-3 flex-1 min-w-0 rounded-lg hover:bg-sidebar-accent/60 p-1"
            }`}
          >
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
          </Link>
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
