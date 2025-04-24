import React from 'react';
import { Plus, Upload, FileText, Trash2 } from 'lucide-react';
import { TaxSummary } from './TaxSummary';
import { formatCurrency } from '../lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';

const taxTypes = [
  { id: 'DARF', label: 'DARF' },
  { id: 'GPS', label: 'GPS' },
  { id: 'FGTS', label: 'FGTS' },
];

import { OrderItem } from '@/types';

interface OrderItemsTableProps {
  itens_pedido: OrderItem[];
  onAddItem: () => void;
  onImportDarf: () => void;
  onImportSituacaoFiscal: () => void;
  onDeleteItem?: (itemId: string) => void;
  isEditing?: boolean;
}

export function OrderItemsTable({ 
  itens_pedido, 
  onAddItem, 
  onImportDarf,
  onImportSituacaoFiscal,
  onDeleteItem,
  isEditing = false
}: OrderItemsTableProps) {
  // console.log('--- OrderItemsTable: Dados RECEBIDOS (props) ---'); // Log removido
  // console.log(JSON.stringify(itens_pedido, null, 2)); // Log removido

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4 py-4 px-4"> {/* Added px-4 for horizontal padding */}
        <h3 className="text-lg font-medium">Itens do Pedido</h3>
        <div className="flex space-x-4"> {/* Kept horizontal space between buttons */}
          <button
            type="button"
            onClick={onImportSituacaoFiscal}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <FileText className="h-4 w-4 mr-2" />
            Importar Situação Fiscal
          </button>
          <button
            type="button"
            onClick={onImportDarf}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <Upload className="h-4 w-4 mr-2" />
            Importar DARF
          </button>
          <button
            type="button"
            onClick={onAddItem}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Item
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-shadow-dark overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Período Inicial</TableHead>
              <TableHead>Período Final</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead className="text-right whitespace-nowrap">Vl. Original</TableHead>
              <TableHead className="text-right whitespace-nowrap">Multa</TableHead>
              <TableHead className="text-right whitespace-nowrap">Juros</TableHead>
              <TableHead className="text-right whitespace-nowrap">Sdo. Devedor</TableHead>
              <TableHead className="text-right whitespace-nowrap">Sdo. Dev. Cons</TableHead>
              <TableHead>Status</TableHead>
              {isEditing && <TableHead className="w-16">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {itens_pedido.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isEditing ? 12 : 11} className="text-center py-4 text-gray-500">
                  Nenhum item adicionado ainda
                </TableCell>
              </TableRow>
            ) : (
              itens_pedido.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.code}</TableCell>
                  <TableCell>{item.start_period}</TableCell>
                  <TableCell>{item.end_period}</TableCell>
                  <TableCell>{item.due_date}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(item.original_value)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(item.fine || 0)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(item.interest || 0)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(item.current_balance)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{formatCurrency(item.saldo_devedor_consolidado || 0)}</TableCell>
                  <TableCell>{item.status}</TableCell>
                  {isEditing && (
                    <TableCell>
                      <button
                        onClick={() => onDeleteItem?.(item.id)}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-full transition-colors"
                        title="Excluir item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {itens_pedido.length > 0 && <TaxSummary itens_pedido={itens_pedido} />}
    </div>
  );
}
