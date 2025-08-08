import React from 'react';
import { formatCurrency } from '@/lib/utils';
import { OrderItem } from '@/types';
import { shouldIncludeItem, calculateFilteredTotal, extractInclusionFlags } from '@/lib/totalCalculations';

interface SectionInclusionFlags {
  include_pendencias_debito?: boolean;
  include_debitos_exig_suspensa?: boolean;
  include_parcelamentos_siefpar?: boolean;
  include_pendencias_inscricao?: boolean;
  include_pendencias_parcelamento?: boolean;
  include_simples_nacional?: boolean;
  include_darf?: boolean;
}

interface TaxSummaryProps {
  itens_pedido: OrderItem[];
  inclusionFlags?: SectionInclusionFlags;
  showInclusionStatus?: boolean;
}

export function TaxSummary({ itens_pedido, inclusionFlags, showInclusionStatus = false }: TaxSummaryProps) {
  // Se não tiver flags, usa padrões (todos incluídos)
  const flags = inclusionFlags || extractInclusionFlags();
  
  const summary = itens_pedido.reduce((acc, item) => {
    const key = item.tax_type;
    const isIncluded = shouldIncludeItem(item, flags);
    
    if (!acc[key]) {
      acc[key] = {
        originalTotal: 0,
        currentTotal: 0,
        count: 0,
        included: isIncluded,
      };
    }
    
    acc[key].originalTotal += item.original_value || 0;
    acc[key].currentTotal += item.saldo_devedor_consolidado || item.current_balance || 0;
    acc[key].count += 1;
    
    // Se pelo menos um item do tipo está incluído, marca o tipo como incluído
    if (isIncluded) {
      acc[key].included = true;
    }
    
    return acc;
  }, {} as Record<string, { originalTotal: number; currentTotal: number; count: number; included: boolean }>);

  // Calcula totais filtrados
  const filteredOriginalTotal = calculateFilteredTotal(
    itens_pedido, 
    flags, 
    item => item.original_value || 0
  );
  const filteredCurrentTotal = calculateFilteredTotal(
    itens_pedido, 
    flags, 
    item => item.saldo_devedor_consolidado || item.current_balance || 0
  );

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
                Sdo. Dev. Cons
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
                  itens_pedido.reduce((sum, item) => sum + (item.original_value || 0), 0)
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                {formatCurrency(
                  itens_pedido.reduce((sum, item) => sum + (item.saldo_devedor_consolidado || item.current_balance || 0), 0)
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
