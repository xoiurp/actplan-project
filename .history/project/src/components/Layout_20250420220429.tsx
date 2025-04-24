import React, { Suspense, useEffect } from 'react';
import { useLocation, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingCart, LogOut, Loader2, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';

import { NavMain } from './nav-main';
import { NavDocuments } from './nav-documents';
import { NavSecondary } from './nav-secondary';
import { NavUser } from './nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarProvider, SidebarInset } from './ui/sidebar';

function LoadingSpinner() {
  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
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

  const userData = {
    name: 'Usuário',
    email: 'usuario@exemplo.com',
    avatar: '/placeholder-user.jpg'
  };

  return (
    <div className="relative flex min-h-screen">
      <SidebarProvider defaultOpen>
        <div className="group peer hidden text-sidebar-foreground md:block" data-state="expanded" data-collapsible="" data-variant="inset" data-side="left">
          <div className="relative w-[--sidebar-width] bg-transparent transition-[width] duration-200 ease-linear group-data-[collapsible=offcanvas]:w-0 group-data-[side=right]:rotate-180 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]"></div>
          <div className="fixed inset-y-0 z-10 hidden h-svh w-[--sidebar-width] transition-[left,right,width] duration-200 ease-linear md:flex left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)] p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)]">
            <div data-sidebar="sidebar" className="flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow">
              <SidebarHeader className="flex flex-col gap-2 p-2">
                <div className="flex h-[60px] items-center px-6">
                  <a href="/" className="flex items-center flex-shrink-0">
                    <img src="/actplan-logo.png" alt="Actplan" className="h-6" />
                  </a>
                </div>
              </SidebarHeader>
              <SidebarContent className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden p-2">
                <NavMain items={mainNavItems} />
                <NavDocuments items={documentItems} />
                <NavSecondary items={secondaryItems} className="mt-auto" />
              </SidebarContent>
              <SidebarFooter className="p-2">
                <NavUser user={userData} />
              </SidebarFooter>
            </div>
          </div>
        </div>
        <SidebarInset>
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}