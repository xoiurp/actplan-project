import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getPaymentPlans } from '../lib/api';
import { CreditCard } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Header } from '@/components/Header';

type PaymentPlanStatus = 'pending' | 'active' | 'completed' | 'cancelled';

const paymentPlanStatusMap: Record<PaymentPlanStatus, { label: string; bg: string; color: string }> = {
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
    <>
      <Header title="Planos de Pagamento" />
      <div className="flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6 bg-white rounded-lg overflow-hidden">
        <div className="flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6 bg-white rounded-lg overflow-hidden">
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
                          backgroundColor: paymentPlanStatusMap[plan.status as PaymentPlanStatus]?.bg || '#FBE6F2',
                          color: paymentPlanStatusMap[plan.status as PaymentPlanStatus]?.color || '#E71A4B',
                        }}
                      >
                        {paymentPlanStatusMap[plan.status as PaymentPlanStatus]?.label || plan.status}
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
    </>
  );
}