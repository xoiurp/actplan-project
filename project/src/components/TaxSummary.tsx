import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { OrderItem } from '@/types';

interface TaxSummaryProps {
  itens_pedido: OrderItem[];
}

export function TaxSummary({ itens_pedido }: TaxSummaryProps) {
  const summary = itens_pedido.reduce((acc, item) => {
    const key = item.tax_type;
    if (!acc[key]) {
      acc[key] = {
        originalTotal: 0,
        currentTotal: 0,
        count: 0,
      };
    }
    acc[key].originalTotal += item.original_value;
    acc[key].currentTotal += item.current_balance;
    acc[key].count += 1;
    return acc;
  }, {} as Record<string, { originalTotal: number; currentTotal: number; count: number }>);

  return (
    <div className="bg-white rounded-lg border border-shadow-dark p-4 mt-4 overflow-x-auto">
      <h3 className="text-sm font-medium mb-3">Resumo por Tipo de Imposto</h3>
      <div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Tipo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Quantidade
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Vl. Original
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                Sdo. Devedor
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {Object.entries(summary).map(([taxType, data]) => (
              <tr key={taxType}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {taxType}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {data.count}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(data.originalTotal)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatCurrency(data.currentTotal)}
                </td>
              </tr>
            ))}
            <tr className="bg-gray-50 font-medium">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                Total
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {itens_pedido.length}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatCurrency(
                  itens_pedido
                    .filter(item => item.tax_type === 'DARF')
                    .reduce((sum, item) => sum + item.original_value, 0)
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatCurrency(
                  itens_pedido
                    .filter(item => item.tax_type === 'DARF')
                    .reduce((sum, item) => sum + item.current_balance, 0)
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}