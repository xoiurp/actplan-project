import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '../lib/api';
import { DollarSign, Package, Users, Clock, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

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
      color: 'bg-green-500',
      trend: '+12.5%',
      trendUp: true,
      footer: 'Crescimento mensal positivo'
    },
    {
      title: 'Total de Pedidos',
      description: 'Número total de pedidos',
      value: stats ? stats.totalOrders.toLocaleString('pt-BR') : '-',
      icon: Package,
      color: 'bg-blue-500',
      trend: '+8.2%',
      trendUp: true,
      footer: 'Aumento nas vendas'
    },
    {
      title: 'Novos Clientes',
      description: 'Clientes cadastrados',
      value: stats ? stats.newCustomers.toLocaleString('pt-BR') : '-',
      icon: Users,
      color: 'bg-purple-500',
      trend: '+15.3%',
      trendUp: true,
      footer: 'Base crescente de clientes'
    },
    {
      title: 'Pagamentos Pendentes',
      description: 'Valor total pendente',
      value: stats ? `R$ ${stats.pendingPayments.toLocaleString('pt-BR')}` : '-',
      icon: Clock,
      color: 'bg-yellow-500',
      trend: '-5.4%',
      trendUp: false,
      footer: 'Redução em atrasos'
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.title} className="@container/card">
            <CardHeader className="relative">
              <CardDescription>{card.description}</CardDescription>
              <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
                {card.value}
              </CardTitle>
              <div className="absolute right-4 top-4">
                <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
                  <TrendingUp className={`h-3 w-3 ${card.trendUp ? 'text-green-500' : 'text-red-500'}`} />
                  {card.trend}
                </Badge>
              </div>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                {card.footer}
                <card.icon className={`h-4 w-4 ${card.color} text-white p-0.5 rounded-full`} />
              </div>
              <div className="text-muted-foreground text-xs">
                Atualizado há 5 minutos
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}