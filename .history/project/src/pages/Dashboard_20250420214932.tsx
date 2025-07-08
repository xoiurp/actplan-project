import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '../lib/api';
import { DollarSign, Package, Users, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { cn } from '../lib/utils';

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
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {card.trend}
                </Badge>
              </div>
              <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
                {card.value}
              </CardTitle>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                {card.footer}
                <card.icon className="h-4 w-4 text-muted-foreground" />
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