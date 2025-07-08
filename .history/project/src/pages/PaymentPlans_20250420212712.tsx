import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getPaymentPlans } from '../lib/api';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const paymentPlanStatusMap = {
  pending: { label: 'Pendente', bg: '#FBE6F2', color: '#E71A4B' },
  active: { label: 'Ativo', bg: '#DCFCE7', color: '#15803D' },
  completed: { label: 'Concluído', bg: '#E0F2FE', color: '#0369A1' },
  cancelled: { label: 'Cancelado', bg: '#FEE2E2', color: '#B91C1C' }
};

export default function PaymentPlans() {
  const navigate = useNavigate();
  
  const { data: paymentPlans, isLoading } = useQuery({
    queryKey: ['paymentPlans'],
    queryFn: getPaymentPlans
  });

  if (isLoading) {
    return <div className="animate-pulse">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/orders')}
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar para Pedidos
        </button>
        <h1 className="text-2xl font-semibold text-primary">Planos de Pagamento</h1>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Valor Total</TableHead>
              <TableHead>Parcelas</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data de Criação</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paymentPlans?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-4 text-gray-500">
                  Nenhum plano de pagamento encontrado
                </TableCell>
              </TableRow>
            ) : (
              paymentPlans?.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>
                    #{plan.order.order_year}/{plan.order.order_number.toString().padStart(4, '0')}
                  </TableCell>
                  <TableCell>{plan.order.customer.razao_social}</TableCell>
                  <TableCell>{formatCurrency(plan.total_amount)}</TableCell>
                  <TableCell>{plan.installments_count}x</TableCell>
                  <TableCell>
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: paymentPlanStatusMap[plan.status]?.bg || '#FBE6F2',
                        color: paymentPlanStatusMap[plan.status]?.color || '#E71A4B',
                      }}
                    >
                      {paymentPlanStatusMap[plan.status]?.label || plan.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {new Date(plan.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => navigate(`/payment-plans/${plan.id}`)}
                      className="inline-flex items-center text-sm text-primary hover:text-primary-hover"
                    >
                      <CreditCard className="h-4 w-4 mr-1" />
                      Ver Detalhes
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}