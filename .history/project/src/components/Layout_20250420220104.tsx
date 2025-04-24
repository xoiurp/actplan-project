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
        <Sidebar variant="inset" side="left">
          <SidebarHeader className="p-2">
            <div className="flex h-[60px] items-center px-6">
              <a href="/" className="flex items-center flex-shrink-0">
                <img src="/actplan-logo.png" alt="Actplan" className="h-6" />
              </a>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-2">
            <NavMain items={mainNavItems} />
            <NavDocuments items={documentItems} />
            <NavSecondary items={secondaryItems} className="mt-auto" />
          </SidebarContent>
          <SidebarFooter className="p-2">
            <NavUser user={userData} />
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <div className="flex-1 overflow-auto">
            <Suspense fallback={<LoadingSpinner />}>
              <Outlet />
            </Suspense>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}