import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '../lib/api';
import { DollarSign, Package, Users, Clock, TrendingUp, TrendingDown, PanelLeft } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { cn } from '../lib/utils';
import { useSidebar } from '../components/ui/sidebar';

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: getDashboardStats
  });

  const { toggleSidebar } = useSidebar();

  const cards = [
    {
      title: 'Receita Total',
      description: 'Total de receita acumulada',
      value: stats ? `R$ ${stats.totalRevenue.toLocaleString('pt-BR')}` : '-',
      icon: DollarSign,
      trend: '+12.5%',
      trendUp: true,
      footer: 'Crescimento mensal positivo'
    },
    {
      title: 'Total de Pedidos',
      description: 'Número total de pedidos',
      value: stats ? stats.totalOrders.toLocaleString('pt-BR') : '-',
      icon: Package,
      trend: '+8.2%',
      trendUp: true,
      footer: 'Aumento nas vendas'
    },
    {
      title: 'Novos Clientes',
      description: 'Clientes cadastrados',
      value: stats ? stats.newCustomers.toLocaleString('pt-BR') : '-',
      icon: Users,
      trend: '+15.3%',
      trendUp: true,
      footer: 'Base crescente de clientes'
    },
    {
      title: 'Pagamentos Pendentes',
      description: 'Valor total pendente',
      value: stats ? `R$ ${stats.pendingPayments.toLocaleString('pt-BR')}` : '-',
      icon: Clock,
      trend: '-5.4%',
      trendUp: false,
      footer: 'Redução em atrasos'
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <div className="flex-1 space-y-4 p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
            <button
              onClick={toggleSidebar}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:bg-accent hover:text-accent-foreground h-7 w-7 -ml-1"
              data-sidebar="trigger"
            >
              <PanelLeft className="h-4 w-4" />
              <span className="sr-only">Toggle Sidebar</span>
            </button>
            <Separator orientation="vertical" className="h-4 mx-2" />
            <h1 className="text-base font-medium">Dashboard</h1>
          </div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "flex items-center gap-1 rounded-lg text-xs",
                    card.trendUp ? "text-green-600" : "text-red-600"
                  )}
                >
                  {card.trendUp ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {card.trend}
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}