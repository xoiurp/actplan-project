import React, { useState } from 'react';
import { Modal } from './ui/modal';
import toast from 'react-hot-toast';

interface AddOrderItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (item: OrderItem) => void;
}

interface OrderItem {
  id: string;
  code: string;
  taxType: string;
  startPeriod: string;
  endPeriod: string;
  dueDate: string;
  originalValue: number;
  currentBalance: number;
  status: string;
}

const taxTypes = [
  { id: 'DARF', label: 'DARF' },
  { id: 'GPS', label: 'GPS' },
  { id: 'FGTS', label: 'FGTS' },
];

export function AddOrderItemModal({ isOpen, onClose, onAdd }: AddOrderItemModalProps) {
  const [formData, setFormData] = useState({
    code: '',
    taxType: '',
    startPeriod: '',
    endPeriod: '',
    dueDate: '',
    originalValue: '',
    currentBalance: '',
    status: 'pending'
  });

  const validateForm = (): boolean => {
    // Required fields
    if (!formData.code || !formData.taxType || !formData.startPeriod || 
        !formData.endPeriod || !formData.dueDate || !formData.originalValue) {
      toast.error('Todos os campos são obrigatórios');
      return false;
    }

    // Date validations
    const start = new Date(formData.startPeriod);
    const end = new Date(formData.endPeriod);
    const due = new Date(formData.dueDate);

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
      code: formData.code,
      taxType: formData.taxType,
      startPeriod: formatDate(formData.startPeriod),
      endPeriod: formatDate(formData.endPeriod),
      dueDate: formatDate(formData.dueDate),
      originalValue: parseFloat(formData.originalValue),
      currentBalance: formData.currentBalance 
        ? parseFloat(formData.currentBalance)
        : parseFloat(formData.originalValue),
      status: formData.status
    };

    onAdd(newItem);
    onClose();
    setFormData({
      code: '',
      taxType: '',
      startPeriod: '',
      endPeriod: '',
      dueDate: '',
      originalValue: '',
      currentBalance: '',
      status: 'pending'
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
          <label htmlFor="taxType" className="block text-sm font-medium text-gray-700">
            Tipo de Tributo
          </label>
          <select
            id="taxType"
            name="taxType"
            value={formData.taxType}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
          >
            <option value="">Selecione o tipo...</option>
            {taxTypes.map(type => (
              <option key={type.id} value={type.id}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startPeriod" className="block text-sm font-medium text-gray-700">
              Período Inicial
            </label>
            <input
              type="date"
              id="startPeriod"
              name="startPeriod"
              value={formData.startPeriod}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="endPeriod" className="block text-sm font-medium text-gray-700">
              Período Final
            </label>
            <input
              type="date"
              id="endPeriod"
              name="endPeriod"
              value={formData.endPeriod}
              onChange={handleInputChange}
              className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            />
          </div>
        </div>

        <div>
          <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
            Vencimento
          </label>
          <input
            type="date"
            id="dueDate"
            name="dueDate"
            value={formData.dueDate}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="originalValue" className="block text-sm font-medium text-gray-700">
              Valor Original
            </label>
            <input
              type="number"
              id="originalValue"
              name="originalValue"
              value={formData.originalValue}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="currentBalance" className="block text-sm font-medium text-gray-700">
              Saldo Atual
            </label>
            <input
              type="number"
              id="currentBalance"
              name="currentBalance"
              value={formData.currentBalance}
              onChange={handleInputChange}
              step="0.01"
              min="0"
              placeholder="Igual ao valor original se vazio"
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