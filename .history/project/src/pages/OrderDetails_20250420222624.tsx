import React from 'react';
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

type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

const orderStatusMap: Record<OrderStatus, { label: string; bg: string; color: string }> = {
  pending: { label: 'Pendente', bg: '#FBE6F2', color: '#E71A4B' },
  processing: { label: 'Processando', bg: '#DCFCE7', color: '#15803D' },
  completed: { label: 'Concluído', bg: '#E0F2FE', color: '#0369A1' },
  cancelled: { label: 'Cancelado', bg: '#FEE2E2', color: '#B91C1C' }
};

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isPaymentPlanModalOpen, setIsPaymentPlanModalOpen] = React.useState(false);
  const [isCustomerExpanded, setIsCustomerExpanded] = React.useState(false);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: getOrders,
  });

  const order = orders?.find(o => o.id === id);

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

  return (
    <>
      <Header 
        title={`Pedido #${order.order_year}/${order.order_number.toString().padStart(4, '0')}`}
        actions={headerActions}
      />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div className="space-y-6">
          {/* Customer Details Card */}
          <div className="bg-white rounded-lg shadow-md">
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
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Status</p>
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
                <div>
                  <p className="text-sm text-gray-500">Data do Pedido</p>
                  <p className="font-medium">{order.data_pedido}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Detalhes Financeiros</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Total Original</span>
                    <span className="font-medium">
                      {formatCurrency(order.itens_pedido.reduce((sum, item) => sum + item.original_value, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Total Multas</span>
                    <span className="font-medium">
                      {formatCurrency(order.itens_pedido.reduce((sum, item) => sum + (item.fine || 0), 0))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Total Juros</span>
                    <span className="font-medium">
                      {formatCurrency(order.itens_pedido.reduce((sum, item) => sum + (item.interest || 0), 0))}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-sm font-medium">Total</span>
                    <span className="font-bold">
                      {formatCurrency(order.itens_pedido.reduce((sum, item) => sum + item.current_balance, 0))}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Detalhes da Comissão</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Taxa de Comissão</span>
                    <span className="font-medium">{order.comissao_percentage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Valor da Comissão</span>
                    <span className="font-medium">
                      {formatCurrency(order.itens_pedido.reduce((sum, item) => sum + item.current_balance, 0) * (order.comissao_percentage / 100))}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Taxa de Redução</span>
                    <span className="font-medium">{order.reducao_percentage}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Valor da Redução</span>
                    <span className="font-medium">
                      {formatCurrency(order.itens_pedido.reduce((sum, item) => sum + item.current_balance, 0) * (order.reducao_percentage / 100))}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Anexos</h3>
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
              </div>

              {order.notas && (
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Observações</h3>
                  <p className="text-sm text-gray-600">{order.notas}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Itens do Pedido</h2>
          <div className="bg-white rounded-lg border border-shadow-dark overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo de Tributo</TableHead>
                  <TableHead>Período Inicial</TableHead>
                  <TableHead>Período Final</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead className="text-right">Vl. Original</TableHead>
                  <TableHead className="text-right">Multa</TableHead>
                  <TableHead className="text-right">Juros</TableHead>
                  <TableHead className="text-right">Sdo. Devedor</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.itens_pedido.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-4 text-gray-500">
                      Nenhum item encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  order.itens_pedido.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.code}</TableCell>
                      <TableCell>{item.tax_type}</TableCell>
                      <TableCell>{item.start_period}</TableCell>
                      <TableCell>{item.end_period}</TableCell>
                      <TableCell>{item.due_date}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.original_value)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.fine || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.interest || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.current_balance)}</TableCell>
                      <TableCell>{item.status}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Tax Summary */}
          {order.itens_pedido.length > 0 && (
            <div className="mt-6 bg-white rounded-lg border border-shadow-dark p-4">
              <h3 className="text-sm font-medium mb-3">Resumo por Tipo de Imposto</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quantidade
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vl. Original
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Sdo. Devedor
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Object.entries(
                      order.itens_pedido.reduce((acc, item) => {
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
                      }, {} as Record<string, { originalTotal: number; currentTotal: number; count: number }>)
                    ).map(([taxType, data]) => (
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
                        {order.itens_pedido.length}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(order.itens_pedido.reduce((sum, item) => sum + item.original_value, 0))}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(order.itens_pedido.reduce((sum, item) => sum + item.current_balance, 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
      <CreatePaymentPlanModal
        isOpen={isPaymentPlanModalOpen}
        onClose={() => setIsPaymentPlanModalOpen(false)}
        orderId={id!}
        orderTotal={order.itens_pedido.reduce((sum, item) => sum + item.current_balance, 0)}
        reductionAmount={order.itens_pedido.reduce((sum, item) => sum + item.current_balance, 0) * (order.reducao_percentage / 100)}
      />
    </>
  );
}