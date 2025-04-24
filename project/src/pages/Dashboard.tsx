import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '../lib/api';
import { DollarSign, Package, Users, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';
import { Header } from '../components/Header';
import { ChartAreaInteractive } from '../components/ChartAreaInteractive'; // Import the new chart component

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: getDashboardStats
  });

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
      <div className="flex items-center justify-center min-h-[400px] bg-white">
        <div className="animate-pulse text-lg bg-white">Carregando...</div>
      </div>
    );
  }

  return (
    <>
      <Header title="Dashboard" bg-white/>
      <div className="flex flex-1 flex-col bg-white rounded-lg">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            {/* Changed grid-cols-1 to grid-cols-2 for default side-by-side layout */}
            <div className="*:data-[slot=card]:shadow-xs @xl/main:grid-cols-1 @5xl/main:grid-cols-2 grid grid-cols-2 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-prim2ry/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card lg:px-6">
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
            {/* Add the interactive chart below the cards */}
            <div className="px-4 lg:px-6">
              <ChartAreaInteractive />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
