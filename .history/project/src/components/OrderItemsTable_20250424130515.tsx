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

      <div className="bg-white rounded-lg border border-shadow-dark overflow-x-auto">
        <Table>
          <TableHeader>
            {/* Renderiza cabeçalhos diferentes com base no tipo do primeiro item */}
            {itens_pedido.length > 0 && itens_pedido[0].tax_type === 'PENDENCIA_INSCRICAO_SIDA' ? (
              <TableRow>
                <TableHead>Inscrição</TableHead>
                <TableHead>Receita</TableHead>
                <TableHead>Inscrito em</TableHead>
                <TableHead>Ajuizado em</TableHead>
                <TableHead>Processo</TableHead>
                <TableHead>Tipo Devedor</TableHead>
                <TableHead>Situação</TableHead>
                {isEditing && <TableHead className="w-16">Ações</TableHead>}
              </TableRow>
            ) : (
              // Cabeçalho padrão para débitos e outros tipos
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
            )}
          </TableHeader>
          <TableBody>
            {itens_pedido.length === 0 ? (
              <TableRow>
                {/* Ajustar colSpan para o máximo possível (11 ou 8) */}
                <TableCell colSpan={isEditing ? 11 : 10} className="text-center py-4 text-gray-500">
                  Nenhum item adicionado ainda
                </TableCell>
              </TableRow>
            ) : (
              itens_pedido.map((item) => (
                <TableRow key={item.id}>
                  {item.tax_type === 'PENDENCIA_INSCRICAO_SIDA' ? (
                    <>
                      <TableCell>{item.inscricao}</TableCell>
                      <TableCell>{item.receita}</TableCell>
                      <TableCell>{item.inscrito_em}</TableCell>
                      <TableCell>{item.ajuizado_em || '-'}</TableCell> 
                      <TableCell>{item.processo}</TableCell>
                      <TableCell>{item.tipo_devedor}</TableCell>
                      <TableCell>{item.status}</TableCell>
                    </>
                  ) : (
                    // Células padrão para débitos e outros tipos
                    <>
                      <TableCell>{item.code}</TableCell>
                      <TableCell>{item.start_period}</TableCell>
                      <TableCell>{item.end_period}</TableCell>
                      <TableCell>{item.due_date}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{formatCurrency(item.original_value || 0)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{formatCurrency(item.fine || 0)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{formatCurrency(item.interest || 0)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{formatCurrency(item.current_balance || 0)}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">{formatCurrency(item.saldo_devedor_consolidado || 0)}</TableCell>
                      <TableCell>{item.status}</TableCell>
                    </>
                  )}
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
