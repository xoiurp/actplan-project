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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'; // Mover import para cá

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

  // Agrupa os itens por tax_type
  const groupedItems = itens_pedido.reduce((acc, item) => {
    const type = item.tax_type || 'OUTROS'; // Agrupa itens sem tipo em 'OUTROS'
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(item);
    return acc;
  }, {} as Record<string, OrderItem[]>);

  // Mapeia os tipos para títulos mais legíveis
  const typeTitles: Record<string, string> = {
    DEBITO: 'Pendências - Débito (SIEF)',
    DEBITO_EXIG_SUSPENSA_SIEF: 'Débitos com Exigibilidade Suspensa (SIEF)',
    PARCELAMENTO_SIEFPAR: 'Parcelamentos com Exigibilidade Suspensa (SIEFPAR)',
    PENDENCIA_INSCRICAO_SIDA: 'Pendências - Inscrição em Dívida Ativa (SIDA)',
    PENDENCIA_PARCELAMENTO_SISPAR: 'Pendências - Parcelamento (SISPAR)',
    // Adicione outros tipos conforme necessário
    DARF: 'DARF',
    GPS: 'GPS',
    FGTS: 'FGTS',
    OUTROS: 'Outros Itens'
  };

  return (
    <div className="space-y-6"> {/* Aumenta o espaço entre as seções */}
      {Object.entries(groupedItems).map(([type, items]) => (
        <Card key={type}>
          <CardHeader>
            <CardTitle>{typeTitles[type] || type}</CardTitle>
            {/* Pode adicionar uma descrição se quiser */}
            {/* <CardDescription>Lista de pendências do tipo {type}.</CardDescription> */}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto"> {/* Garante scroll horizontal se necessário */}
              <Table>
                <TableHeader>
                  {/* Renderiza cabeçalhos dinâmicos baseados no tipo */}
                  {type === 'PENDENCIA_INSCRICAO_SIDA' ? (
                    <TableRow>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Inscrição</TableHead>
                      <TableHead>Receita</TableHead>
                      <TableHead>Inscrito em</TableHead>
                      <TableHead>Ajuizado em</TableHead>
                      <TableHead>Processo</TableHead>
                      <TableHead>Tipo Devedor</TableHead>
                      <TableHead>Devedor Principal</TableHead>
                      <TableHead>Situação</TableHead>
                      {isEditing && <TableHead className="w-16">Ações</TableHead>}
                    </TableRow>
                  ) : type === 'PENDENCIA_PARCELAMENTO_SISPAR' ? (
                    <TableRow>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Conta</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Modalidade</TableHead>
                      {isEditing && <TableHead className="w-16">Ações</TableHead>}
                    </TableRow>
                  ) : type === 'PARCELAMENTO_SIEFPAR' ? (
                     <TableRow>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Parcelamento</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Valor Suspenso</TableHead>
                      <TableHead>Modalidade</TableHead>
                      {isEditing && <TableHead className="w-16">Ações</TableHead>}
                    </TableRow>
                  ) : (
                    // Cabeçalho padrão para débitos (SIEF e Exig. Suspensa) e outros
                    <TableRow>
                      <TableHead>Código/Receita</TableHead>
                      <TableHead>Período Apuração</TableHead>
                      {/* <TableHead>Período Final</TableHead> // Removido pois parece igual ao inicial */}
                      <TableHead>Vencimento</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Vl. Original</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Multa</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Juros</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Sdo. Devedor</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Sdo. Dev. Cons</TableHead>
                      <TableHead>Situação</TableHead>
                      {isEditing && <TableHead className="w-16">Ações</TableHead>}
                    </TableRow>
                  )}
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      {/* Ajustar colSpan dinamicamente com base no tipo */}
                      <TableCell 
                        colSpan={
                          type === 'PENDENCIA_INSCRICAO_SIDA' ? (isEditing ? 10 : 9) :
                          type === 'PENDENCIA_PARCELAMENTO_SISPAR' ? (isEditing ? 5 : 4) :
                          type === 'PARCELAMENTO_SIEFPAR' ? (isEditing ? 5 : 4) :
                          (isEditing ? 10 : 9) // Padrão para débitos
                        } 
                        className="text-center py-4 text-gray-500"
                      >
                        Nenhum item deste tipo.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        {/* Renderiza células dinâmicas baseadas no tipo */}
                        {type === 'PENDENCIA_INSCRICAO_SIDA' ? (
                          <>
                            <TableCell>{item.cnpj}</TableCell>
                            <TableCell>{item.inscricao}</TableCell>
                            <TableCell>{item.receita}</TableCell>
                            <TableCell>{item.inscrito_em}</TableCell>
                            <TableCell>{item.ajuizado_em || '-'}</TableCell>
                            <TableCell>{item.processo}</TableCell>
                            <TableCell>{item.tipo_devedor}</TableCell>
                            <TableCell>{item.devedor_principal || '-'}</TableCell>
                            <TableCell>{item.status}</TableCell>
                          </>
                        ) : type === 'PENDENCIA_PARCELAMENTO_SISPAR' ? (
                          <>
                            <TableCell>{item.cnpj}</TableCell>
                            <TableCell>{item.sispar_conta}</TableCell>
                            <TableCell>{item.sispar_descricao}</TableCell>
                            <TableCell>{item.sispar_modalidade}</TableCell>
                          </>
                        ) : type === 'PARCELAMENTO_SIEFPAR' ? (
                           <>
                            <TableCell>{item.cnpj}</TableCell>
                            <TableCell>{item.code}</TableCell> {/* code é o número do parcelamento */}
                            <TableCell className="text-right whitespace-nowrap">{formatCurrency(item.original_value || 0)}</TableCell> {/* original_value é o valor suspenso */}
                            <TableCell>{item.status}</TableCell> {/* status é a modalidade */}
                          </>
                        ) : (
                          // Células padrão para débitos e outros
                          <>
                            <TableCell>{item.code}</TableCell> {/* code é a receita */}
                            <TableCell>{item.start_period}</TableCell>
                            {/* <TableCell>{item.end_period}</TableCell> */}
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
          </CardContent>
        </Card>
      ))}

      {/* Renderiza o resumo geral se houver itens */}
      {itens_pedido.length > 0 && <TaxSummary itens_pedido={itens_pedido} />}
    </div>
  );
}
