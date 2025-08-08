import React, { useState } from 'react';
import { Modal } from './ui/modal';
import toast from 'react-hot-toast';
import { CurrencyInput } from './ui/CurrencyInput';
import { OrderItem } from '@/types';
interface AddOrderItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: OrderItem) => void;
}

const taxTypes = [
  { id: 'DEBITO', label: 'Débito SIEF' },
  { id: 'DEBITO_EXIG_SUSPENSA_SIEF', label: 'Débito Exig. Suspensa' },
  { id: 'SIMPLES_NACIONAL', label: 'Simples Nacional' },
  { id: 'PARCELAMENTO_SIEFPAR', label: 'Parcelamento SIEFPAR' },
  { id: 'PENDENCIA_INSCRICAO_SIDA', label: 'Pendência Inscrição SIDA' },
  { id: 'PENDENCIA_PARCELAMENTO_SISPAR', label: 'Pendência Parcelamento SISPAR' },
  { id: 'OUTROS', label: 'Outros' }
];

export function AddOrderItemModal({ isOpen, onClose, onAdd }: AddOrderItemModalProps) {
  const [formData, setFormData] = useState({
    code: '',
    tax_type: '',
    start_period: '',
    end_period: '',
    due_date: '',
    originalValue: '',
    currentBalance: '',
    fine: '',
    interest: '',
    status: 'DEVEDOR'
  });

  const validateForm = (): boolean => {
    // Required fields
    if (!formData.code || !formData.tax_type || !formData.start_period || 
        !formData.end_period || !formData.due_date || !formData.originalValue) {
      toast.error('Todos os campos são obrigatórios, incluindo o tipo de tributo.');
      return false;
    }

    // Date validations
    const start = new Date(formData.start_period);
    const end = new Date(formData.end_period);
    const due = new Date(formData.due_date);

    if (end < start) {
      toast.error('A data final não pode ser anterior à data inicial');
      return false;
    }

    // Numeric validations
    const originalValue = parseFloat(formData.originalValue);
    const currentBalance = formData.currentBalance 
      ? parseFloat(formData.currentBalance)
      : originalValue;

    if (originalValue <= 0) {
      toast.error('O valor original deve ser maior que zero');
      return false;
    }

    if (currentBalance < 0) {
      toast.error('O saldo atual não pode ser negativo');
      return false;
    }

    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    // Format dates to DD/MM/YYYY
    const formatDate = (date: string) => {
      const [year, month, day] = date.split('-');
      return `${day}/${month}/${year}`;
    };

    const newItem: OrderItem = {
      id: crypto.randomUUID(),
      order_id: '', // Será definido quando o pedido for salvo
      code: formData.code,
      tax_type: formData.tax_type,
      start_period: formData.start_period,
      end_period: formData.end_period,
      due_date: formData.due_date,
      original_value: parseFloat(formData.originalValue),
      current_balance: formData.currentBalance 
        ? parseFloat(formData.currentBalance)
        : parseFloat(formData.originalValue),
      status: formData.status,
      fine: formData.fine ? parseFloat(formData.fine) : 0,
      interest: formData.interest ? parseFloat(formData.interest) : 0,
      saldo_devedor_consolidado: (formData.currentBalance ? parseFloat(formData.currentBalance) : parseFloat(formData.originalValue)) + (formData.fine ? parseFloat(formData.fine) : 0) + (formData.interest ? parseFloat(formData.interest) : 0),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    onAdd(newItem);
    onClose();
    setFormData({
      code: '',
      tax_type: '',
      start_period: '',
      end_period: '',
      due_date: '',
      originalValue: '',
      currentBalance: '',
      fine: '',
      interest: '',
      status: 'DEVEDOR'
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Função para calcular o saldo devedor consolidado em tempo real
  const calculateConsolidatedBalance = () => {
    const currentBalance = formData.currentBalance 
      ? parseFloat(formData.currentBalance) 
      : parseFloat(formData.originalValue || '0');
    const fine = parseFloat(formData.fine || '0');
    const interest = parseFloat(formData.interest || '0');
    
    return currentBalance + fine + interest;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adicionar Item"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="code" className="block text-sm font-medium text-gray-700">
            Código
          </label>
          <input
            type="text"
            id="code"
            name="code"
            value={formData.code}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="tax_type" className="block text-sm font-medium text-gray-700">
            Tipo de Tributo
          </label>
          <select
            id="tax_type"
            name="tax_type"
            value={formData.tax_type}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
          >
            <option value="">Selecione a categoria...</option>
            {taxTypes.map(type => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="start_period" className="block text-sm font-medium text-gray-700">
              Período Inicial
            </label>
            <input
              type="date"
              id="start_period"
              name="start_period"
              value={formData.start_period}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="end_period" className="block text-sm font-medium text-gray-700">
              Período Final
            </label>
            <input
              type="date"
              id="end_period"
              name="end_period"
              value={formData.end_period}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="due_date" className="block text-sm font-medium text-gray-700">
            Vencimento
          </label>
          <input
            type="date"
            id="due_date"
            name="due_date"
            value={formData.due_date}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="originalValue" className="block text-sm font-medium text-gray-700">
              Valor Original
            </label>
            <CurrencyInput
              id="originalValue"
              name="originalValue"
              value={formData.originalValue}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="currentBalance" className="block text-sm font-medium text-gray-700">
              Saldo Atual
            </label>
            <CurrencyInput
              id="currentBalance"
              name="currentBalance"
              value={formData.currentBalance}
              onChange={handleInputChange}
              placeholder="Igual ao valor original se vazio"
              className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="fine" className="block text-sm font-medium text-gray-700">
              Multa
            </label>
            <CurrencyInput
              id="fine"
              name="fine"
              value={formData.fine}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="interest" className="block text-sm font-medium text-gray-700">
              Juros
            </label>
            <CurrencyInput
              id="interest"
              name="interest"
              value={formData.interest}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Adicionar
          </button>
        </div>
      </form>
    </Modal>
  );
}
