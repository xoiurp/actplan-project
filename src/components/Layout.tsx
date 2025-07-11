import React, { Suspense, useEffect } from 'react';
import { useLocation, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingCart, LogOut, Loader2, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';

import { NavMain } from './nav-main';
import { NavDocuments } from './nav-documents';
import { NavSecondary } from './nav-secondary';
import { NavUser } from './nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarProvider, SidebarInset, useSidebar } from './ui/sidebar';
import { cn } from '../lib/utils';

function LoadingSpinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function SidebarLogo() {
  const { state } = useSidebar();
  const isExpanded = state === "expanded";
  
  return (
    <a href="/" className="flex items-center justify-center flex-shrink-0 w-full">
      <img 
        src={isExpanded ? "/actplan-logo.png" : "/actplan-icon.svg"} 
        alt="Actplan" 
        className={cn(
          "transition-all duration-200 ease-in-out",
          isExpanded ? "h-6 w-auto px-6" : "h-5 w-5 px-0"
        )}
      />
    </a>
  );
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error('Error getting session:', error);
        setIsAuthenticated(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, !!session);
      setIsAuthenticated(!!session);
      
      if (event === 'SIGNED_OUT') {
        navigate('/login', { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (isAuthenticated === null) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const mainNavItems = [
    { title: 'Painel', url: '/', icon: LayoutDashboard },
    { title: 'Clientes', url: '/customers', icon: Users },
    { title: 'Pedidos', url: '/orders', icon: ShoppingCart },
    { title: 'Cobranças', url: '/payment-plans', icon: CreditCard },
  ];

  const documentItems = [
    { name: 'Pedidos', url: '/orders', icon: ShoppingCart },
    { name: 'Cobranças', url: '/payment-plans', icon: CreditCard },
  ];

  const secondaryItems = [
    { title: 'Configurações', url: '/settings', icon: LayoutDashboard },
    { title: 'Ajuda', url: '/help', icon: Users },
  ];

  // Removed userData constant

  return (
    <div className="relative flex min-h-screen">
      <SidebarProvider 
        defaultOpen
        style={{
          "--sidebar-width": "16rem",
          "--sidebar-width-icon": "3rem",
        } as React.CSSProperties}
      >
        <Sidebar variant="inset" side="left" collapsible="icon">
          <SidebarHeader className="flex flex-col gap-2 p-2">
            <div className="flex h-[60px] items-center justify-center">
              <SidebarLogo />
            </div>
          </SidebarHeader>
          <SidebarContent className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto p-2">
            <NavMain items={mainNavItems} />
            <NavDocuments items={documentItems} />
            <NavSecondary items={secondaryItems} className="mt-auto" />
          </SidebarContent>
          <SidebarFooter className="p-2">
            <NavUser /> {/* Removed user prop */}
          </SidebarFooter>
        </Sidebar>
        {/* SidebarInset uses bg-content-background internally now */}
        <SidebarInset className="bg-[#F8F8FC] min-h-screen px-0 md:px-6"> 
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
