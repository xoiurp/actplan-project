import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '../lib/api';
import { DollarSign, Package, Users, Clock } from 'lucide-react';

export default function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: getDashboardStats
  });

  const cards = [
    {
      title: 'Receita Total',
      value: stats ? `$${stats.totalRevenue.toLocaleString()}` : '-',
      icon: DollarSign,
      color: 'bg-green-500',
    },
    {
      title: 'Total de Pedidos',
      value: stats ? stats.totalOrders.toLocaleString() : '-',
      icon: Package,
      color: 'bg-blue-500',
    },
    {
      title: 'Novos Clientes',
      value: stats ? stats.newCustomers.toLocaleString() : '-',
      icon: Users,
      color: 'bg-purple-500',
    },
    {
      title: 'Pagamentos Pendentes',
      value: stats ? `$${stats.pendingPayments.toLocaleString()}` : '-',
      icon: Clock,
      color: 'bg-yellow-500',
    },
  ];

  if (isLoading) {
    return <div className="animate-pulse">Carregando...</div>;
  }

  return (
    <div>
      
      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.title}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <card.icon
                    className={`h-6 w-6 text-white p-1 rounded-full ${card.color}`}
                  />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {card.title}
                    </dt>
                    <dd className="text-lg font-semibold text-gray-900">
                      {card.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}