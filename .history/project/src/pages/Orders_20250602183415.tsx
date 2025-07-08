import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getOrders } from '../lib/api';
import { Plus, FileText, MessageSquare, CreditCard } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Order } from '@/types';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button'; // Added Button import

type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

const orderStatusMap: Record<OrderStatus, { label: string; bg: string; color: string }> = {
  pending: { label: 'Pendente', bg: '#FBE6F2', color: '#E71A4B' },
  processing: { label: 'Processando', bg: '#DCFCE7', color: '#15803D' },
  completed: { label: 'Concluído', bg: '#E0F2FE', color: '#0369A1' },
  cancelled: { label: 'Cancelado', bg: '#FEE2E2', color: '#B91C1C' }
};

export default function Orders() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: getOrders,
  });

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleDateString('pt-BR');
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (!value) return '-';
    return `R$ ${value.toFixed(2)}`;
  };

  const handleOrderClick = (orderId: string) => {
    navigate(`/orders/${orderId}`);
  };

  const handleCreateOrder = () => {
    navigate('/orders/new');
  };

  if (isLoading) {
    return <div className="animate-pulse">Carregando...</div>;
  }

  const orderActions = (
    <div className="flex items-center gap-2">
      {/* Using Button component with size="sm" and variant="outline" */}
      <Button
        size="sm" 
        variant="outline"
        onClick={() => navigate('/payment-plans/bulk')}
        // className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
      >
        <CreditCard className="mr-2 h-5 w-5" />
        Criar Cobrança em Lote
      </Button> 
      {/* Using Button component with size="sm" */}
      <Button 
        size="sm"
        onClick={handleCreateOrder}
        // className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
      >
        <Plus className="-ml-1 mr-2 h-5 w-5" />
        Novo Pedido
      </Button> {/* Ensured closing tag */}
    </div>
  );

  return (
    <>
      <Header title="Pedidos" actions={orderActions} />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6 bg-white rounded-lg overflow-hidden">
        {/* Buttons moved to Header actions */}
        {/* <div className="flex justify-end items-center gap-2"> ... </div> */}

        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order: Order) => (
                <TableRow 
                  key={order.id} 
                  className="hover:bg-shadow cursor-pointer"
                  onClick={() => handleOrderClick(order.id)}
                >
                  <TableCell className="whitespace-nowrap">
                    {order.order_number ? (
                      `#${order.order_year || new Date().getFullYear()}/${order.order_number.toString().padStart(4, '0')}`
                    ) : '-'}
                  </TableCell>
                  <TableCell>{order.data_pedido || formatDate(order.created_at)}</TableCell>
                  <TableCell>{order.customer?.razao_social || '-'}</TableCell>
                  <TableCell>
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: orderStatusMap[order.status as OrderStatus]?.bg || '#FBE6F2',
                        color: orderStatusMap[order.status as OrderStatus]?.color || '#E71A4B',
                      }}
                    >
                      {orderStatusMap[order.status as OrderStatus]?.label || order.status || 'Pendente'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {formatCurrency(
                      order.itens_pedido
                        .filter(item => item.tax_type === 'DARF')
                        .reduce((sum, item) => sum + (item.current_balance || 0), 0)
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <button
                        className="p-1 hover:bg-shadow rounded-full"
                        title="Ver Detalhes"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOrderClick(order.id);
                        }}
                      >
                        <FileText className="h-4 w-4 text-gray-500" />
                      </button>
                      <button
                        className="p-1 hover:bg-shadow rounded-full"
                        title="Observações"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageSquare className="h-4 w-4 text-gray-500" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                    Nenhum pedido encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
