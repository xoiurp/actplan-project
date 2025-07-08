import React, { useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPaymentPlans, updateInstallment, uploadPaymentReceipt } from '../lib/api';
import { Building2, CreditCard, Calendar, Loader2, Check, FileText, Edit, X, Upload } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Header } from '@/components/Header';
import { Installment } from '@/types';

type PaymentPlanStatus = 'pending' | 'active' | 'completed' | 'cancelled';
type InstallmentStatus = 'pending' | 'paid' | 'partial' | 'late';

const paymentPlanStatusMap: Record<PaymentPlanStatus, { label: string; bg: string; color: string }> = {
  pending: { label: 'Pendente', bg: '#FBE6F2', color: '#E71A4B' },
  active: { label: 'Ativo', bg: '#DCFCE7', color: '#15803D' },
  completed: { label: 'Concluído', bg: '#E0F2FE', color: '#0369A1' },
  cancelled: { label: 'Cancelado', bg: '#FEE2E2', color: '#B91C1C' }
};

const installmentStatusMap: Record<InstallmentStatus, { label: string; bg: string; color: string }> = {
  pending: { label: 'Pendente', bg: '#FBE6F2', color: '#E71A4B' },
  paid: { label: 'Pago', bg: '#DCFCE7', color: '#15803D' },
  partial: { label: 'Parcial', bg: '#FFF3C4', color: '#854D0E' },
  late: { label: 'Atrasado', bg: '#FEE2E2', color: '#B91C1C' }
};

export default function PaymentPlanDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: paymentPlans, isLoading } = useQuery({
    queryKey: ['paymentPlans'],
    queryFn: getPaymentPlans
  });

  const updateInstallmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Installment> }) =>
      updateInstallment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentPlans'] });
      toast.success('Parcela atualizada com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar parcela: ' + error.message);
    }
  });

  const uploadReceiptMutation = useMutation({
    mutationFn: ({ file, installmentId }: { file: File; installmentId: string }) =>
      uploadPaymentReceipt(file, installmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paymentPlans'] });
      toast.success('Comprovante enviado com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao enviar comprovante: ' + error.message);
    }
  });

  const handleMarkAsPaid = (installment: Installment) => {
    updateInstallmentMutation.mutate({
      id: installment.id,
      data: {
        status: 'paid',
        paid_amount: installment.amount,
        paid_at: new Date().toISOString()
      }
    });
  };

  const handleUploadReceipt = (installmentId: string) => {
    if (!fileInputRef.current) return;
    fileInputRef.current.click();
    fileInputRef.current.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        uploadReceiptMutation.mutate({ file, installmentId });
      }
    };
  };

  const handleEditInstallment = (installment: Installment) => {
    updateInstallmentMutation.mutate({
      id: installment.id,
      data: {
        edit_mode: true
      }
    });
  };

  const handleCancelEdit = (installment: Installment) => {
    updateInstallmentMutation.mutate({
      id: installment.id,
      data: {
        edit_mode: false
      }
    });
  };

  const handleSaveEdit = (installment: Installment, formData: FormData) => {
    updateInstallmentMutation.mutate({
      id: installment.id,
      data: {
        due_date: formData.get('due_date') as string,
        paid_amount: parseFloat(formData.get('paid_amount') as string) || 0,
        paid_at: formData.get('paid_at') as string,
        status: formData.get('status') as InstallmentStatus,
        edit_mode: false
      }
    });
  };

  const plan = paymentPlans?.find(p => p.id === id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-shadow">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-shadow gap-4">
        <h2 className="text-xl font-semibold text-gray-900">Plano de pagamento não encontrado</h2>
        <button
          onClick={() => navigate('/payment-plans')}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover"
        >
          Voltar para Planos
        </button>
      </div>
    );
  }

  // Calculate payment progress
  const totalPaid = plan.installments.reduce((sum, inst) => sum + (inst.paid_amount || 0), 0);
  const progressPercentage = (totalPaid / plan.total_amount) * 100;

  return (
    <>
      <Header title="Plano de Pagamento" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Payment Plan Details */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Detalhes do Plano</h2>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium">
                    {formatCurrency(plan.total_amount)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {plan.installments_count}x de {formatCurrency(plan.total_amount / plan.installments_count)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium">
                    {new Date(plan.created_at).toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-sm text-gray-500">Data de Criação</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                    style={{
                      backgroundColor: paymentPlanStatusMap[plan.status as PaymentPlanStatus]?.bg || '#FBE6F2',
                      color: paymentPlanStatusMap[plan.status as PaymentPlanStatus]?.color || '#E71A4B',
                    }}
                  >
                    {paymentPlanStatusMap[plan.status as PaymentPlanStatus]?.label || plan.status}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="bg-gray-200 rounded-full h-2.5">
                    <div
                      className="bg-primary h-2.5 rounded-full"
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-500 mt-1.5">
                    {formatCurrency(totalPaid)} de {formatCurrency(plan.total_amount)} pago
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Detalhes do Pedido</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Número do Pedido</p>
                <p className="font-medium">
                  #{plan.order.order_year}/{plan.order.order_number.toString().padStart(4, '0')}
                </p>
              </div>

              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium">{plan.order.customer.razao_social}</p>
                  <p className="text-sm text-gray-500">CNPJ: {plan.order.customer.cnpj}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Installments */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Parcelas</h2>
          <div className="bg-white rounded-lg border border-shadow-dark overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parcela</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="text-right">Valor Pago</TableHead>
                  <TableHead>Comprovante</TableHead>
                  <TableHead>Data Pagamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan.installments.map((installment) => (
                  <TableRow key={installment.id}>
                    <TableCell>{installment.installment_number}</TableCell>
                    <TableCell>
                      {installment.edit_mode ? (
                        <input
                          type="date"
                          name="due_date"
                          defaultValue={installment.due_date}
                          className="w-full rounded-md border border-shadow-dark px-3 py-1 text-sm"
                        />
                      ) : (
                        new Date(installment.due_date).toLocaleDateString('pt-BR')
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(installment.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {installment.edit_mode ? (
                        <input
                          type="number"
                          name="paid_amount"
                          defaultValue={installment.paid_amount || 0}
                          step="0.01"
                          min="0"
                          max={installment.amount}
                          className="w-full rounded-md border border-shadow-dark px-3 py-1 text-sm text-right"
                        />
                      ) : (
                        formatCurrency(installment.paid_amount || 0)
                      )}
                    </TableCell>
                    <TableCell>
                      {installment.receipt ? (
                        <a
                          href={installment.receipt.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-primary hover:text-primary-hover"
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Ver
                        </a>
                      ) : (
                        <button
                          onClick={() => handleUploadReceipt(installment.id)}
                          className="inline-flex items-center text-sm text-gray-500 hover:text-primary"
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Enviar
                        </button>
                      )}
                    </TableCell>
                    <TableCell>
                      {installment.edit_mode ? (
                        <input
                          type="date"
                          name="paid_at"
                          defaultValue={installment.paid_at?.split('T')[0]}
                          className="w-full rounded-md border border-shadow-dark px-3 py-1 text-sm"
                        />
                      ) : (
                        installment.paid_at
                          ? new Date(installment.paid_at).toLocaleDateString('pt-BR')
                          : '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {installment.edit_mode ? (
                        <select
                          name="status"
                          defaultValue={installment.status}
                          className="w-full rounded-md border border-shadow-dark px-3 py-1 text-sm"
                        >
                          <option value="pending">Pendente</option>
                          <option value="paid">Pago</option>
                          <option value="partial">Parcial</option>
                          <option value="late">Atrasado</option>
                        </select>
                      ) : (
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
                          style={{
                            backgroundColor: installmentStatusMap[installment.status as InstallmentStatus]?.bg || '#FBE6F2',
                            color: installmentStatusMap[installment.status as InstallmentStatus]?.color || '#E71A4B',
                          }}
                        >
                          {installmentStatusMap[installment.status as InstallmentStatus]?.label || installment.status}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {installment.edit_mode ? (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              const form = (e.target as HTMLElement).closest('tr');
                              if (form) {
                                const formData = new FormData();
                                const inputs = form.querySelectorAll('input, select');
                                inputs.forEach(input => {
                                  formData.append(input.getAttribute('name')!, (input as HTMLInputElement).value);
                                });
                                handleSaveEdit(installment, formData);
                              }
                            }}
                            className="inline-flex items-center p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-full transition-colors"
                            title="Salvar"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleCancelEdit(installment)}
                            className="inline-flex items-center p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors"
                            title="Cancelar"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEditInstallment(installment)}
                            className="inline-flex items-center p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-full transition-colors"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {installment.status === 'pending' && (
                            <button
                              onClick={() => handleMarkAsPaid(installment)}
                              disabled={updateInstallmentMutation.isLoading}
                              className="inline-flex items-center p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-full transition-colors"
                              title="Marcar como Pago"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        
        {/* Hidden file input for receipt upload */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="application/pdf,image/*"
        />
      </div>
    </>
  );
}