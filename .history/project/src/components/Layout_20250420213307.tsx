import React, { Suspense, useEffect } from 'react';
import { Link, useLocation, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingCart, LogOut, Loader2, CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 text-primary animate-spin" />
    </div>
  );
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);

  // Initialize authentication state
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

  const navigation = [
    { name: 'Painel', href: '/', icon: LayoutDashboard },
    { name: 'Clientes', href: '/customers', icon: Users },
    {
      name: 'Pedidos',
      href: '/orders',
      icon: ShoppingCart,
      children: [
        { name: 'Listar Pedidos', href: '/orders' },
        { name: 'Cadastrar Pedido', href: '/orders/new' }
      ]
    },
    {
      name: 'Cobranças',
      href: '/payment-plans',
      icon: CreditCard,
      children: [
        { name: 'Listar Cobranças', href: '/payment-plans' },
        { name: 'Cadastrar Cobrança', href: '/payment-plans/bulk' }
      ]
    },
  ];

  const handleLogout = () => {
    supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="hidden md:flex md:w-64 md:flex-col">
          <div className="flex flex-col flex-grow pt-5 overflow-y-auto border-r bg-card">
            <div className="flex items-center flex-shrink-0 px-4">
              <img src="/actplan-logo.png" alt="Actplan" className="h-8" />
            </div>
            <div className="mt-5 flex-grow flex flex-col">
              <nav className="flex-1 px-2 pb-4 space-y-1">
                {navigation.map((item) => {
                  const isActive = item.children 
                    ? item.children.some(child => location.pathname === child.href)
                    : location.pathname === item.href;

                  return (
                    <div key={item.name}>
                      {item.children ? (
                        <>
                          <div
                            className={cn(
                              "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-muted hover:text-primary"
                            )}
                          >
                            <item.icon
                              className={cn(
                                "mr-3 flex-shrink-0 h-5 w-5",
                                isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                              )}
                            />
                            {item.name}
                          </div>
                          <div className="ml-8 space-y-1">
                            {item.children.map(child => (
                              <Link
                                key={child.href}
                                to={child.href}
                                className={cn(
                                  "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                                  location.pathname === child.href
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-muted hover:text-primary"
                                )}
                              >
                                {child.name}
                              </Link>
                            ))}
                          </div>
                        </>
                      ) : (
                        <Link
                          to={item.href}
                          className={cn(
                            "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-primary"
                          )}
                        >
                          <item.icon
                            className={cn(
                              "mr-3 flex-shrink-0 h-5 w-5",
                              isActive ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                            )}
                          />
                          {item.name}
                        </Link>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
            <div className="flex-shrink-0 flex border-t p-4">
              <button
                onClick={handleLogout}
                className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary cursor-pointer"
              >
                <LogOut className="mr-3 h-5 w-5" />
                Sair
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-col flex-1 overflow-hidden bg-background">
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            <Suspense fallback={<LoadingSpinner />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
