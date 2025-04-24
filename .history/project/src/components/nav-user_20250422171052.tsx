"use client"

import { useState, useEffect } from "react" // Import useState and useEffect
import { Bell, CreditCard, LogOut, MoreVertical, UserCircle } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase" // Import supabase client
import type { User } from "@supabase/supabase-js" // Import User type

import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from "./ui/sidebar"

// Define a type for the user state, allowing null
type CurrentUser = Pick<User, 'email'> & { name: string; avatar: string } | null;

export function NavUser() { // Remove user prop
  const { isMobile } = useSidebar()
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState<CurrentUser>(null); // State for user data

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error fetching user:", error);
        // Optionally redirect to login if no user session
        // navigate('/login');
      } else if (user) {
        // Assuming name and avatar might be in user_metadata
        // Provide defaults if not available
        setCurrentUser({
          email: user.email ?? 'No Email',
          name: user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User', // Example: get name from metadata or derive from email
          avatar: user.user_metadata?.avatar_url ?? '', // Example: get avatar from metadata
        });
      }
    };

    fetchUser();
  }, []); // Empty dependency array ensures this runs once on mount

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error("Error logging out:", error)
      // Handle error appropriately, maybe show a notification
    } else {
      navigate('/login') // Redirect to login page on successful logout
    }
  }

  // Render nothing or a loading indicator while fetching user
  if (!currentUser) {
    return null; // Or return a loading spinner/placeholder
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {/* Button content using currentUser state */}
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-8 w-8 rounded-lg grayscale">
                <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                <AvatarFallback className="rounded-lg">
                  {currentUser.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{currentUser.name}</span>
                <span className="truncate text-xs text-muted-foreground">{currentUser.email}</span>
              </div>
              <MoreVertical className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              {/* Dropdown label content using currentUser state */}
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                  <AvatarFallback className="rounded-lg">
                    {currentUser.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{currentUser.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{currentUser.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem>
                <UserCircle />
                Minha Conta
              </DropdownMenuItem>
              <DropdownMenuItem>
                <CreditCard />
                Faturamento
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Bell />
                Notificações
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}> {/* Add onClick handler */}
              <LogOut />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
