import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getOrders, deleteOrder, deleteMultipleOrders } from '../lib/api';
import { Plus, FileText, MessageSquare, CreditCard, Trash2, Check } from 'lucide-react';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import toast from 'react-hot-toast';
import { formatCurrency } from '../lib/utils';
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
import { extractInclusionFlags, calculateFilteredTotal } from '../lib/totalCalculations';

type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

const orderStatusMap: Record<OrderStatus, { label: string; bg: string; color: string }> = {
  pending: { label: 'Pendente', bg: '#FBE6F2', color: '#E71A4B' },
  processing: { label: 'Processando', bg: '#DCFCE7', color: '#15803D' },
  completed: { label: 'Concluído', bg: '#E0F2FE', color: '#0369A1' },
  cancelled: { label: 'Cancelado', bg: '#FEE2E2', color: '#B91C1C' }
};

export default function Orders() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    type: 'single' | 'multiple';
    orderId?: string;
  }>({ isOpen: false, type: 'single' });
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: getOrders,
  });

  // Mutations for delete operations
  const deleteSingleMutation = useMutation({
    mutationFn: deleteOrder,
    onSuccess: () => {
      toast.success('Pedido excluído com sucesso');
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setDeleteModal({ isOpen: false, type: 'single' });
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir pedido: ' + error.message);
    }
  });

  const deleteMultipleMutation = useMutation({
    mutationFn: deleteMultipleOrders,
    onSuccess: () => {
      toast.success(`${selectedOrders.length} pedidos excluídos com sucesso`);
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setSelectedOrders([]);
      setDeleteModal({ isOpen: false, type: 'multiple' });
    },
    onError: (error: Error) => {
      toast.error('Erro ao excluir pedidos: ' + error.message);
    }
  });

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleDateString('pt-BR');
  };

  const handleOrderClick = (orderId: string) => {
    navigate(`/orders/${orderId}`);
  };

  const handleCreateOrder = () => {
    navigate('/orders/new');
  };

  // Selection handlers
  const handleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    );
  };

  const handleSelectAll = () => {
    if (selectedOrders.length === orders.length) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(order => order.id));
    }
  };

  // Delete handlers
  const handleDeleteSingle = (orderId: string) => {
    setDeleteModal({ isOpen: true, type: 'single', orderId });
  };

  const handleDeleteMultiple = () => {
    setDeleteModal({ isOpen: true, type: 'multiple' });
  };

  const confirmDelete = () => {
    if (deleteModal.type === 'single' && deleteModal.orderId) {
      deleteSingleMutation.mutate(deleteModal.orderId);
    } else if (deleteModal.type === 'multiple') {
      deleteMultipleMutation.mutate(selectedOrders);
    }
  };

  const isDeleting = deleteSingleMutation.isPending || deleteMultipleMutation.isPending;

  if (isLoading) {
    return <div className="animate-pulse">Carregando...</div>;
  }

  const orderActions = (
    <div className="flex items-center gap-2">
      {selectedOrders.length > 0 && (
        <Button
          size="sm"
          variant="destructive"
          onClick={handleDeleteMultiple}
          disabled={isDeleting}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Excluir {selectedOrders.length} {selectedOrders.length === 1 ? 'Pedido' : 'Pedidos'}
        </Button>
      )}
      <Button
        size="sm" 
        variant="outline"
        onClick={() => navigate('/payment-plans/bulk')}
      >
        <CreditCard className="mr-2 h-5 w-5" />
        Criar Cobrança em Lote
      </Button> 
      <Button 
        size="sm"
        onClick={handleCreateOrder}
      >
        <Plus className="-ml-1 mr-2 h-5 w-5" />
        Novo Pedido
      </Button>
    </div>
  );

  return (
    <>
      <Header title="Pedidos" actions={orderActions} />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6 bg-white rounded-lg overflow-hidden mt-6">
        {/* Buttons moved to Header actions */}
        {/* <div className="flex justify-end items-center gap-2"> ... </div> */}

        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    checked={selectedOrders.length === orders.length && orders.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </TableHead>
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
                  className={`hover:bg-shadow cursor-pointer ${selectedOrders.includes(order.id) ? 'bg-blue-50' : ''}`}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedOrders.includes(order.id)}
                      onChange={() => handleSelectOrder(order.id)}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </TableCell>
                  <TableCell 
                    className="whitespace-nowrap"
                    onClick={() => handleOrderClick(order.id)}
                  >
                    {order.order_number ? (
                      `#${order.order_year || new Date().getFullYear()}/${order.order_number.toString().padStart(4, '0')}`
                    ) : '-'}
                  </TableCell>
                  <TableCell onClick={() => handleOrderClick(order.id)}>
                    {order.data_pedido || formatDate(order.created_at)}
                  </TableCell>
                  <TableCell onClick={() => handleOrderClick(order.id)}>
                    {order.customer?.razao_social || '-'}
                  </TableCell>
                  <TableCell onClick={() => handleOrderClick(order.id)}>
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
                  <TableCell onClick={() => handleOrderClick(order.id)}>
                    {(() => {
                      // Usa a mesma lógica das outras páginas: respeita flags de inclusão
                      const inclusionFlags = extractInclusionFlags(order);
                      const total = calculateFilteredTotal(
                        order.itens_pedido, 
                        inclusionFlags, 
                        item => item.saldo_devedor_consolidado || item.current_balance || 0
                      );
                      return total > 0 ? formatCurrency(total) : '-';
                    })()}
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
                      <button
                        className="p-1 hover:bg-red-50 rounded-full text-red-600 hover:text-red-800"
                        title="Excluir Pedido"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSingle(order.id);
                        }}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4 text-gray-500">
                    Nenhum pedido encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, type: 'single' })}
        onConfirm={confirmDelete}
        title={deleteModal.type === 'single' ? 'Excluir Pedido' : 'Excluir Pedidos'}
        message={
          deleteModal.type === 'single'
            ? 'Tem certeza que deseja excluir este pedido? Esta ação não pode ser desfeita.'
            : `Tem certeza que deseja excluir ${selectedOrders.length} pedidos? Esta ação não pode ser desfeita.`
        }
        isLoading={isDeleting}
      />
    </>
  );
}
