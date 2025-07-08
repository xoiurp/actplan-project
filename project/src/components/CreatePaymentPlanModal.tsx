import React, { useState, useEffect } from 'react';
import { Modal } from './ui/modal';
import { createPaymentPlan } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';

interface CreatePaymentPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderTotal: number;
  reductionAmount: number;
}

export function CreatePaymentPlanModal({
  isOpen,
  onClose,
  orderId,
  orderTotal,
  reductionAmount
}: CreatePaymentPlanModalProps) {
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [preview, setPreview] = useState<{ amount: number; installments: number[] }>({
    amount: 0,
    installments: []
  });

  // Calculate total amount after reduction
  const totalAmount = orderTotal - reductionAmount;

  useEffect(() => {
    // Calculate installment preview
    const installmentAmount = Math.ceil(totalAmount / installmentsCount * 100) / 100;
    const remainder = totalAmount - (installmentAmount * (installmentsCount - 1));
    
    const installments = Array(installmentsCount).fill(installmentAmount);
    installments[installmentsCount - 1] = remainder;

    setPreview({
      amount: totalAmount,
      installments
    });
  }, [totalAmount, installmentsCount]);

  const handleCreate = async () => {
    try {
      setIsCreating(true);
      await createPaymentPlan(orderId, totalAmount, installmentsCount);
      toast.success('Plano de pagamento criado com sucesso');
      onClose();
    } catch (error) {
      toast.error('Erro ao criar plano de pagamento: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Criar Plano de Pagamento"
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Valor Total
          </label>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(totalAmount)}
          </div>
          {reductionAmount > 0 && (
            <div className="text-sm text-gray-500">
              Valor original: {formatCurrency(orderTotal)}{' '}
              <span className="text-green-600">
                (-{formatCurrency(reductionAmount)} de redução)
              </span>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="installments" className="block text-sm font-medium text-gray-700">
            Número de Parcelas
          </label>
          <select
            id="installments"
            value={installmentsCount}
            onChange={(e) => setInstallmentsCount(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => (
              <option key={num} value={num}>
                {num}x de {formatCurrency(Math.ceil(totalAmount / num * 100) / 100)}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <h4 className="text-sm font-medium text-gray-900">
            Previsão das Parcelas
          </h4>
          <div className="space-y-2">
            {preview.installments.map((amount, index) => (
              <div
                key={index}
                className="flex justify-between text-sm"
              >
                <span className="text-gray-600">
                  Parcela {index + 1}
                </span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(amount)}
                </span>
              </div>
            ))}
            <div className="pt-2 border-t flex justify-between font-medium">
              <span>Total</span>
              <span>{formatCurrency(preview.amount)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isCreating}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Criando...
              </>
            ) : (
              'Criar Plano'
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}