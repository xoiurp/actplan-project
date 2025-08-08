import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getOrders, createPaymentPlan } from '../lib/api';
import { Building2, User, Phone, MapPin, Loader2, FileText, Edit, ChevronDown, ChevronUp, CreditCard } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { CreatePaymentPlanModal } from '@/components/CreatePaymentPlanModal';
import { Header } from '@/components/Header';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { OrderItem } from '@/types';
import { OrderItemsTable } from '../components/OrderItemsTable';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'; // Importar Card
import { ReopenOrderModal } from '@/components/ReopenOrderModal';
import { supabase } from '../lib/supabase';
import { Button } from '@/components/ui/button';

type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

const orderStatusMap: Record<OrderStatus, { label: string; bg: string; color: string }> = {
  pending: { label: 'Pendente', bg: '#FBE6F2', color: '#E71A4B' },
  processing: { label: 'Processando', bg: '#DCFCE7', color: '#15803D' },
  completed: { label: 'Concluído', bg: '#E0F2FE', color: '#0369A1' },
  cancelled: { label: 'Cancelado', bg: '#FEE2E2', color: '#B91C1C' }
};

interface TaxSummary {
  originalTotal: number;
  currentTotal: number;
  count: number;
}

type TaxSummaryMap = Record<string, TaxSummary>;

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isPaymentPlanModalOpen, setIsPaymentPlanModalOpen] = React.useState(false);
  const [isCustomerExpanded, setIsCustomerExpanded] = React.useState(false);
  const [isReopenModalOpen, setIsReopenModalOpen] = useState(false);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: getOrders,
  });

  const order = orders?.find(o => o.id === id);

  // Add query for reopen history
  const { data: reopenHistory } = useQuery({
    queryKey: ['order-reopen-history', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_reopen_history')
        .select(`
          *,
          reopened_by_user:reopened_by(email),
          closed_by_user:closed_by(email)
        `)
        .eq('order_id', id)
        .order('reopened_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  // Log para debug dos dados DARF
  React.useEffect(() => {
    if (order) {
      console.log('🔍 [OrderDetails] Order recebido:', order);
      console.log('🔍 [OrderDetails] Itens do pedido:', order.itens_pedido);
      
      // Log específico para itens DARF
      const darfItems = order.itens_pedido.filter((item: OrderItem) => item.tax_type === 'DARF');
      if (darfItems.length > 0) {
        console.log('🔍 [OrderDetails] Itens DARF encontrados:', darfItems);
        darfItems.forEach((item: OrderItem, index: number) => {
          console.log(`🔍 [OrderDetails] DARF Item ${index}:`, {
            id: item.id,
            code: item.code,
            denominacao: item.denominacao,
            tax_type: item.tax_type,
            allKeys: Object.keys(item)
          });
        });
      }
    }
  }, [order]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-shadow">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-shadow gap-4">
        <h2 className="text-xl font-semibold text-gray-900">Pedido não encontrado</h2>
        <button
          onClick={() => navigate('/orders')}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover"
        >
          Voltar para Pedidos
        </button>
      </div>
    );
  }

  const headerActions = (
    <div className="flex items-center gap-2">
      <button
        onClick={() => navigate(`/orders/${id}/edit`)}
        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
      >
        <Edit className="h-4 w-4 mr-2" />
        Editar Pedido
      </button>
      {order.status === 'processing' && (
        <button
          onClick={() => setIsPaymentPlanModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <CreditCard className="h-4 w-4 mr-2" />
          Criar Cobranças
        </button>
      )}
    </div>
  );

  // Helper para garantir que o valor seja um número ou 0
  const ensureNumber = (value: number | undefined | null): number => value || 0;

  const calculateTotal = (items: OrderItem[], selector: (item: OrderItem) => number | undefined | null): number => {
    // Usa ensureNumber dentro do reduce para tratar valores indefinidos
    return items.reduce((sum: number, item) => sum + ensureNumber(selector(item)), 0);
  };

  // Separa itens DARF dos demais para cálculo correto
  const darfItems = order.itens_pedido.filter(item => item.tax_type === 'DARF');
  const nonDarfItems = order.itens_pedido.filter(item => item.tax_type !== 'DARF');

  // O total do pedido deve ser APENAS o valor do DARF (documento realmente pagável)
  // Os outros itens são apenas informativos sobre a composição
  const originalTotal = calculateTotal(darfItems, item => item.original_value);
  const fineTotal = calculateTotal(darfItems, item => item.fine);
  const interestTotal = calculateTotal(darfItems, item => item.interest);
  const currentTotal = calculateTotal(darfItems, item => item.current_balance);

  console.log('💰 OrderDetails - Cálculo de totais:', {
    totalItens: order.itens_pedido.length,
    itensDarf: darfItems.length,
    itensNaoDarf: nonDarfItems.length,
    valorOriginalDarf: originalTotal,
    valorAtualDarf: currentTotal
  });


  const taxSummary = order.itens_pedido.reduce((acc: TaxSummaryMap, item: OrderItem) => {
    const key = item.tax_type;
    if (!acc[key]) {
      acc[key] = {
        originalTotal: 0,
        currentTotal: 0,
        count: 0,
      };
    }
    // Usa ensureNumber para somar valores potencialmente indefinidos
    acc[key].originalTotal += ensureNumber(item.original_value);
    acc[key].currentTotal += ensureNumber(item.current_balance);
    acc[key].count += 1;
    return acc;
  }, {});

  return (
    <>
      <ReopenOrderModal
        isOpen={isReopenModalOpen}
        onClose={() => setIsReopenModalOpen(false)}
        orderId={id!}
        currentStatus={order.status}
      />

      <Header
        title={`Pedido #${order.order_year}/${order.order_number.toString().padStart(4, '0')}`}
        actions={
          <div className="flex items-center gap-2">
            {order.status === 'completed' && (
              <Button
                variant="outline"
                onClick={() => setIsReopenModalOpen(true)}
              >
                Reabrir Pedido
              </Button>
            )}
            {headerActions}
          </div>
        }
      />
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Customer Details Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <button
              onClick={() => setIsCustomerExpanded(!isCustomerExpanded)}
              className="w-full px-6 py-4 flex items-center justify-between text-left"
            >
              <h2 className="text-lg font-semibold">Informações do Cliente</h2>
              {isCustomerExpanded ? (
                <ChevronUp className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              )}
            </button>
            
            {isCustomerExpanded && (
              <div className="px-6 pb-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Building2 className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium">{order.customer.razao_social}</p>
                        <p className="text-sm text-gray-500">CNPJ: {order.customer.cnpj || '-'}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium">
                          {order.customer.nome_responsavel} {order.customer.sobrenome_responsavel}
                        </p>
                        <p className="text-sm text-gray-500">Pessoa de Contato</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium">{order.customer.whatsapp_responsavel || '-'}</p>
                        <p className="text-sm text-gray-500">WhatsApp</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="font-medium">
                          {order.customer.endereco}, {order.customer.numero}
                          {order.customer.complemento && ` - ${order.customer.complemento}`}
                        </p>
                        <p className="text-sm text-gray-500">
                          {order.customer.cidade}, {order.customer.estado}
                        </p>
                        <p className="text-sm text-gray-500">{order.customer.cep}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Order Details Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-4">Detalhes do Pedido</h2>
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="summary">Resumo do Pedido</TabsTrigger>
                <TabsTrigger value="financial">Financeiro</TabsTrigger>
                <TabsTrigger value="attachments">Anexos</TabsTrigger>
                <TabsTrigger value="notes">Observações</TabsTrigger>
              </TabsList>
              
              <TabsContent value="summary" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Status</Label>
                    <span
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1"
                      style={{
                        backgroundColor: orderStatusMap[order.status as OrderStatus]?.bg || '#FBE6F2',
                        color: orderStatusMap[order.status as OrderStatus]?.color || '#E71A4B',
                      }}
                    >
                      {orderStatusMap[order.status as OrderStatus]?.label || order.status}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <Label>Data do Pedido</Label>
                    <p className="font-medium">{order.data_pedido}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Total Original</span>
                    <span className="font-medium">{formatCurrency(originalTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Total Multas</span>
                    <span className="font-medium">{formatCurrency(fineTotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Total Juros</span>
                    <span className="font-medium">{formatCurrency(interestTotal)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm font-medium">Total</span>
                    <span className="font-bold">{formatCurrency(currentTotal)}</span>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="financial" className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Taxa de Comissão</span>
                    <span className="font-medium">{order.comissao_percentage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Valor da Comissão</span>
                    <span className="font-medium">
                      {formatCurrency(currentTotal * (order.comissao_percentage / 100))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Taxa de Redução</span>
                    <span className="font-medium">{order.reducao_percentage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Valor da Redução</span>
                    <span className="font-medium">
                      {formatCurrency(currentTotal * (order.reducao_percentage / 100))}
                    </span>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="attachments" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-shadow-dark rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900">Situação Fiscal</h4>
                    </div>
                    {order.documentos?.situacaoFiscal ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {order.documentos.situacaoFiscal.name}
                          </span>
                        </div>
                        <a
                          href={order.documentos.situacaoFiscal.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:text-primary-hover"
                        >
                          Download
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Nenhum arquivo importado
                      </p>
                    )}
                  </div>

                  <div className="p-4 border border-shadow-dark rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-900">DARF</h4>
                    </div>
                    {order.documentos?.darf ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {order.documentos.darf.name}
                          </span>
                        </div>
                        <a
                          href={order.documentos.darf.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:text-primary-hover"
                        >
                          Download
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        Nenhum arquivo importado
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="notes" className="space-y-4">
                {order.notas ? (
                  <p className="text-sm text-gray-600">{order.notas}</p>
                ) : (
                  <p className="text-sm text-gray-500">Nenhuma observação disponível</p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Order Items - Usando componente com denominacao */}
        <div className="space-y-6">
          <h2 className="text-lg font-semibold">Itens do Pedido</h2>
          <OrderItemsTable
            itens_pedido={order.itens_pedido}
            onAddItem={() => {}} // No-op para detalhes
            onImportDarf={() => {}} // No-op para detalhes
            onImportSituacaoFiscal={() => {}} // No-op para detalhes
            isEditing={false} // Modo apenas visualização
          />


        </div>
      </div>
      <CreatePaymentPlanModal
        isOpen={isPaymentPlanModalOpen}
        onClose={() => setIsPaymentPlanModalOpen(false)}
        orderId={id!}
        orderTotal={currentTotal}
        reductionAmount={currentTotal * (order.reducao_percentage / 100)}
      />

      {/* Add Reopen History section */}
      {reopenHistory && reopenHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4">Histórico de Reaberturas</h2>
          <div className="space-y-4">
            {reopenHistory.map((record) => (
              <div key={record.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-medium">
                      {record.reopen_status === 'reopened' ? 'Reaberto' : 'Fechado'}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">
                      em {new Date(record.reopened_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    por {record.reopened_by_user?.email}
                  </span>
                </div>
                <div className="text-sm mb-2">
                  <span className="font-medium">Status anterior:</span>{' '}
                  {orderStatusMap[record.previous_status as OrderStatus]?.label || record.previous_status}
                </div>
                <div className="text-sm mb-2">
                  <span className="font-medium">Novo status:</span>{' '}
                  {orderStatusMap[record.new_status as OrderStatus]?.label || record.new_status}
                </div>
                <div className="text-sm mb-2">
                  <span className="font-medium">Motivo:</span>
                  <p className="mt-1 text-muted-foreground">{record.reason}</p>
                </div>
                {record.closing_notes && (
                  <div className="text-sm">
                    <span className="font-medium">Notas de fechamento:</span>
                    <p className="mt-1 text-muted-foreground">{record.closing_notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
