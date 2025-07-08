import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getOrders } from '../lib/api';
import { CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { Order } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Header } from '@/components/Header';

type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

const orderStatusMap: Record<OrderStatus, { label: string; bg: string; color: string }> = {
  pending: { label: 'Pendente', bg: '#FBE6F2', color: '#E71A4B' },
  processing: { label: 'Processando', bg: '#DCFCE7', color: '#15803D' },
  completed: { label: 'Concluído', bg: '#E0F2FE', color: '#0369A1' },
  cancelled: { label: 'Cancelado', bg: '#FEE2E2', color: '#B91C1C' }
};

export default function CreateBulkPaymentPlan() {
  const navigate = useNavigate();
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: getOrders
  });

  // Filter only pending orders
  const pendingOrders = orders?.filter(order => order.status === 'pending') || [];

  const handleOrderSelect = (orderId: string) => {
    setSelectedOrders(prev => {
      if (prev.includes(orderId)) {
        return prev.filter(id => id !== orderId);
      }
      return [...prev, orderId];
    });
  };

  // Calculate total amount for selected orders
  const totalAmount = selectedOrders.reduce((sum, orderId) => {
    const order = pendingOrders.find(o => o.id === orderId);
    if (!order) return sum;
    return sum + order.itens_pedido.reduce((orderSum, item) => orderSum + item.current_balance, 0);
  }, 0);

  if (isLoading) {
    return <div className="animate-pulse">Carregando...</div>;
  }

  return (
    <>
      <Header title="Criar Cobrança em Lote" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Pedidos Disponíveis</h2>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                {selectedOrders.length} pedidos selecionados
              </div>
              <button
                disabled={selectedOrders.length === 0}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Criar Cobrança ({formatCurrency(totalAmount)})
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-shadow-dark overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input
                      type="checkbox"
                      checked={selectedOrders.length === pendingOrders.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedOrders(pendingOrders.map(o => o.id));
                        } else {
                          setSelectedOrders([]);
                        }
                      }}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </TableHead>
                  <TableHead>Pedido</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                      Nenhum pedido pendente encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingOrders.map((order: Order) => (
                    <TableRow 
                      key={order.id}
                      className="hover:bg-shadow cursor-pointer"
                      onClick={() => handleOrderSelect(order.id)}
                    >
                      <TableCell>
                        <input
                          type="checkbox"
                          checked={selectedOrders.includes(order.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleOrderSelect(order.id);
                          }}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        #{order.order_year}/{order.order_number.toString().padStart(4, '0')}
                      </TableCell>
                      <TableCell>
                        {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>{order.customer?.razao_social}</TableCell>
                      <TableCell>
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: orderStatusMap[order.status as OrderStatus]?.bg || '#FBE6F2',
                            color: orderStatusMap[order.status as OrderStatus]?.color || '#E71A4B',
                          }}
                        >
                          {orderStatusMap[order.status as OrderStatus]?.label || order.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(
                          order.itens_pedido.reduce((sum, item) => sum + item.current_balance, 0)
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </>
  );
}