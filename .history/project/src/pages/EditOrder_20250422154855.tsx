import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft, CalendarIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { OrderItemsTable } from '../components/OrderItemsTable';
import { AddOrderItemModal } from '../components/AddOrderItemModal';
import { ImportSituacaoFiscalModal } from '../components/ImportSituacaoFiscalModal';
import { getCustomers, getOrders, updateOrder } from '../lib/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { BillingCalculationsTable } from '../components/BillingCalculationsTable';
import { ImportDarfModal } from '../components/ImportDarfModal';
import { Header } from '@/components/Header';
import { Order, OrderItem } from '@/types';
import toast from 'react-hot-toast';
import { processDarfPDF } from '../lib/darfProcessor';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { formatCurrency } from '../lib/utils';

interface FormData {
  customer: string;
  orderDate: string;
  status: string;
  commission: string;
  reduction: string;
  supplier: string;
  dueDate: string;
  notes: string;
  documentos: Order['documentos'];
}

export default function EditOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [itens_pedido, setItensPedido] = useState<OrderItem[]>([]);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [calculations, setCalculations] = useState<any[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSituacaoFiscalModalOpen, setIsSituacaoFiscalModalOpen] = useState(false);
  const [isCustomerExpanded, setIsCustomerExpanded] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    customer: '',
    orderDate: '',
    status: '',
    commission: '',
    reduction: '',
    supplier: '',
    dueDate: '',
    notes: '',
    documentos: undefined
  });

  const { data: orders } = useQuery({
    queryKey: ['orders'],
    queryFn: getOrders,
  });

  const order = orders?.find(o => o.id === id);

  useEffect(() => {
    if (order) {
      setFormData({
    customer: order.customer_id || '',
    orderDate: order.data_pedido ? formatDateString(order.data_pedido) : '',
    status: order.status || '',
    commission: order.comissao_percentage?.toString() || '',
    reduction: order.reducao_percentage?.toString() || '',
    supplier: order.fornecedor || '',
    dueDate: order.vencimento ? formatDateString(order.vencimento) : '',
    notes: order.notas || '',
    documentos: order.documentos
      });

      // Transform order items to match the expected format
      const transformedItems = order.itens_pedido.map((item: OrderItem) => ({
        id: item.id,
        code: item.code,
        tax_type: item.tax_type,
        start_period: item.start_period,
        end_period: item.end_period,
        due_date: item.due_date,
        original_value: item.original_value,
        current_balance: item.current_balance,
        status: item.status,
        fine: item.fine,
        interest: item.interest,
        cno: item.cno
      }));
      setItensPedido(transformedItems);
    }
  }, [order]);

  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateOrder(id, data),
    onSuccess: () => {
      toast.success('Pedido atualizado com sucesso');
      navigate(`/orders/${id}`);
    },
    onError: (error) => {
      toast.error('Erro ao atualizar pedido: ' + error.message);
    }
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Helper function to format dates from YYYY-MM-DD to DD/MM/YYYY
  const formatDateString = (dateStr: string): string => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${year}-${month}-${day}`;
  };

  const handleSubmit = () => {
    if (!formData.customer) {
      toast.error('Selecione um cliente');
      return;
    }

    if (!formData.orderDate) {
      toast.error('Selecione a data do pedido');
      return;
    }

    if (!formData.status) {
      toast.error('Selecione o status');
      return;
    }

    if (itens_pedido.length === 0) {
      toast.error('Adicione pelo menos um item ao pedido');
      return;
    }

    const orderData = {
      customer_id: formData.customer,
      data_pedido: formData.orderDate,
      status: formData.status,
      comissaoPercentage: formData.commission || '0',
      reducaoPercentage: formData.reduction || '0',
      fornecedor: formData.supplier,
      vencimento: formData.dueDate,
      notas: formData.notes,
      itens_pedido: itens_pedido
    };

    updateOrderMutation.mutate({ id: id!, data: orderData });
  };

  const suppliers = [
    { id: 'supplier1', name: 'Supplier 1' },
    { id: 'supplier2', name: 'Supplier 2' },
    { id: 'supplier3', name: 'Supplier 3' },
  ];

  const { data: customers } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers
  });

  const orderStatuses = [
    { id: 'pending', label: 'Pendente' },
    { id: 'processing', label: 'Processando' },
    { id: 'completed', label: 'Concluído' },
    { id: 'cancelled', label: 'Cancelado' },
  ];

  const handleAddItem = () => {
    setIsAddItemModalOpen(true);
  };

  const handleItemAdd = (newItem: Partial<OrderItem>) => {
    const taxTypeIds: Record<string, string> = {
      'PIS': '9',
      'PASEP': '9',
      'COFINS': '10',
      'IRPJ': '11',
      'CSLL': '12',
      'CP-TERCEIROS': '13',
      'CP-PATRONAL': '14',
      'IRRF': '15'
    };

    const itemWithId: OrderItem = {
      id: taxTypeIds[newItem.tax_type || ''] || newItem.tax_type || '',
      order_id: '',
      code: newItem.code || '',
      tax_type: newItem.tax_type || '',
      start_period: newItem.start_period || '',
      end_period: newItem.end_period || '',
      due_date: newItem.due_date || '',
      original_value: newItem.original_value || 0,
      current_balance: newItem.current_balance || 0,
      fine: newItem.fine || 0,
      interest: newItem.interest || 0,
      status: newItem.status || 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      cno: newItem.cno
    };
    setItensPedido(prev => [...prev, itemWithId]);
  };

  const handleImportDarf = () => {
    setIsImportModalOpen(true);
  };

  const handleImportSituacaoFiscal = () => {
    setIsSituacaoFiscalModalOpen(true);
  };

  const handleDarfImport = async (file: File) => {
    try {
      const darfItems = await processDarfPDF(file);
      
      if (!darfItems || darfItems.length === 0) {
        toast.error('Falha ao extrair dados do DARF');
        return;
      }

      let updatedCount = 0;
      const updatedItems = [...itens_pedido];

      for (const darfData of darfItems) {
        const matchingCodeItems = itens_pedido.filter((item: OrderItem) => {
          const itemBaseCode = item.code.split('-')[0];
          const darfBaseCode = darfData.code.split('-')[0];
          return itemBaseCode === darfBaseCode;
        });

        if (matchingCodeItems.length === 0) {
          console.log(`Nenhum item encontrado para código ${darfData.code}`);
          continue;
        }

        let matchingItem: OrderItem | undefined;
        if (darfData.code === '1646' && darfData.cno) {
          matchingItem = matchingCodeItems.find((item: OrderItem) => 
            item.cno === darfData.cno && 
            item.start_period.includes(darfData.period)
          );
          
          if (!matchingItem) {
            console.log(`Nenhum item CP-PATRONAL encontrado com CNO ${darfData.cno} e período ${darfData.period}`);
            continue;
          }

          const itemIndex = updatedItems.findIndex((item: OrderItem) => item.id === matchingItem!.id);
          if (itemIndex !== -1) {
            updatedItems[itemIndex] = {
              ...matchingItem,
              original_value: darfData.principal,
              fine: darfData.fine,
              interest: darfData.interest,
              current_balance: darfData.totalValue
            };
            updatedCount++;
          }
        } else {
          matchingItem = matchingCodeItems.find((item: OrderItem) => 
            Math.abs(item.current_balance - darfData.principal) < 0.01
          );

          if (!matchingItem) {
            console.log(`Nenhum item encontrado com valor ${darfData.principal} para código ${darfData.code}`);
            continue;
          }

          const itemIndex = updatedItems.findIndex((item: OrderItem) => item.id === matchingItem!.id);
          if (itemIndex !== -1) {
            updatedItems[itemIndex] = {
              ...matchingItem,
              fine: darfData.fine,
              interest: darfData.interest,
              current_balance: darfData.totalValue
            };
            updatedCount++;
          }
        }
      }

      if (updatedCount === 0) {
        toast.error('Nenhum débito correspondente encontrado para os itens do DARF');
        return;
      }

      setItensPedido(updatedItems);
      toast.success(`${updatedCount} item(s) atualizado(s) com sucesso`);
      setIsImportModalOpen(false);
    } catch (error) {
      console.error('Erro ao processar DARF:', error);
      toast.error('Falha ao importar DARF');
    }
  };

  const handleSituacaoFiscalImport = (importedItems: OrderItem[]) => {
    const taxTypeIds: Record<string, string> = {
      'PIS': '9',
      'PASEP': '9',
      'COFINS': '10',
      'IRPJ': '11',
      'CSLL': '12',
      'CP-TERCEIROS': '13',
      'CP-PATRONAL': '14',
      'IRRF': '15'
    };

    const newItems = importedItems.map(item => ({
      ...item,
      id: taxTypeIds[item.tax_type] || item.tax_type
    }));
    
    setItensPedido(prevItems => [...prevItems, ...newItems]);
    toast.success(`${importedItems.length} itens importados com sucesso`);
  };

  const handleDeleteItem = (itemId: string) => {
    setItensPedido(prevItems => prevItems.filter(item => item.id !== itemId));
    toast.success('Item removido com sucesso');
  };

  const calculateTotal = (items: OrderItem[], selector: (item: OrderItem) => number): number => {
    return items.reduce((sum, item) => sum + selector(item), 0);
  };

  const originalTotal = calculateTotal(itens_pedido, item => item.original_value);
  const currentTotal = calculateTotal(itens_pedido, item => item.current_balance);

  const taxSummary = itens_pedido.reduce((acc: Record<string, { count: number; originalTotal: number; currentTotal: number }>, item) => {
    const key = item.tax_type;
    if (!acc[key]) {
      acc[key] = { count: 0, originalTotal: 0, currentTotal: 0 };
    }
    acc[key].count += 1;
    acc[key].originalTotal += item.original_value;
    acc[key].currentTotal += item.current_balance;
    return acc;
  }, {});

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-shadow gap-4">
        <h2 className="text-xl font-semibold text-gray-900">Pedido não encontrado</h2>
        <button
          onClick={() => navigate('/orders')}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar para Pedidos
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AddOrderItemModal
        isOpen={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
        onAdd={handleItemAdd}
      />
      <ImportDarfModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleDarfImport}
      />
      <ImportSituacaoFiscalModal
        isOpen={isSituacaoFiscalModalOpen}
        onClose={() => setIsSituacaoFiscalModalOpen(false)}
        onImport={handleSituacaoFiscalImport}
      />

      <Header
        title={`Editar Pedido #${order.order_year}/${order.order_number.toString().padStart(4, '0')}`}
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(`/orders/${id}`)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Cancelar
            </button>
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Criar Cobranças
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={updateOrderMutation.isPending}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              {updateOrderMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
              <div className="space-y-4">
                <div>
                  <label htmlFor="customer" className="block text-sm font-medium text-gray-700">
                    Cliente
                  </label>
                  <select
                    id="customer"
                    name="customer"
                    value={formData.customer}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                  >
                    <option value="">Selecione um cliente...</option>
                    {customers?.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.razao_social}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="orderDate" className="block text-sm font-medium text-gray-700">
                    Data do Pedido
                  </label>
                  <DatePicker
                    date={formData.orderDate ? new Date(formData.orderDate) : undefined}
                    setDate={(date: Date | undefined) => {
                      setFormData(prev => ({
                        ...prev,
                        orderDate: date ? date.toISOString().split('T')[0] : ''
                      }));
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                  >
                    <option value="">Selecione o status...</option>
                    {orderStatuses.map((status) => (
                      <option key={status.id} value={status.id}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Detalhes de Cobrança</h2>
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="summary">Resumo do Pedido</TabsTrigger>
              <TabsTrigger value="financial">Financeiro</TabsTrigger>
              <TabsTrigger value="attachments">Anexos</TabsTrigger>
              <TabsTrigger value="notes">Observações</TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="commission" className="block text-sm font-medium text-gray-700">
                    Comissão (%)
                  </label>
                  <input
                    type="number"
                    id="commission"
                    name="commission"
                    value={formData.commission}
                    onChange={handleInputChange}
                    step="0.01"
                    className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label htmlFor="reduction" className="block text-sm font-medium text-gray-700">
                    Redução (%)
                  </label>
                  <input
                    type="number"
                    id="reduction"
                    name="reduction"
                    value={formData.reduction}
                    onChange={handleInputChange}
                    step="0.01"
                    className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="supplier" className="block text-sm font-medium text-gray-700">
                    Fornecedor
                  </label>
                  <select
                    id="supplier"
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                  >
                    <option value="">Selecione o fornecedor...</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
                    Vencimento
                  </label>
                  <DatePicker
                    date={formData.dueDate ? new Date(formData.dueDate) : undefined}
                    setDate={(date: Date | undefined) => {
                      setFormData(prev => ({
                        ...prev,
                        dueDate: date ? date.toISOString().split('T')[0] : ''
                      }));
                    }}
                  />
                </div>
              </div>
              
              <BillingCalculationsTable calculations={calculations} />
            </TabsContent>
            
            <TabsContent value="attachments" className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-shadow-dark rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-900">Situação Fiscal</h3>
                      <button
                        type="button"
                        onClick={() => setIsSituacaoFiscalModalOpen(true)}
                        className="text-sm text-primary hover:text-primary-hover"
                      >
                        Importar
                      </button>
                    </div>
                    {formData.documentos?.situacaoFiscal ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {formData.documentos.situacaoFiscal.name}
                          </span>
                        </div>
                        <a
                          href={formData.documentos.situacaoFiscal.url}
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
                      <h3 className="text-sm font-medium text-gray-900">DARF</h3>
                      <button
                        type="button"
                        onClick={() => setIsImportModalOpen(true)}
                        className="text-sm text-primary hover:text-primary-hover"
                      >
                        Importar
                      </button>
                    </div>
                    {formData.documentos?.darf ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {formData.documentos.darf.name}
                          </span>
                        </div>
                        <a
                          href={formData.documentos.darf.url}
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
            </TabsContent>
            
            <TabsContent value="financial" className="space-y-4">
              <div>
                <label htmlFor="principal" className="block text-sm font-medium text-gray-700">
                  Valor Principal
                </label>
                <input
                  type="number"
                  id="principal"
                  name="principal"
                  step="0.01"
                  className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label htmlFor="fine" className="block text-sm font-medium text-gray-700">
                  Multa
                </label>
                <input
                  type="number"
                  id="fine"
                  name="fine"
                  step="0.01"
                  className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label htmlFor="interest" className="block text-sm font-medium text-gray-700">
                  Juros
                </label>
                <input
                  type="number"
                  id="interest"
                  name="interest"
                  step="0.01"
                  className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                  placeholder="0.00"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="notes" className="space-y-4">
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Observações
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={6}
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                  placeholder="Adicione observações sobre o pedido..."
                />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Itens do Pedido</h2>
          <div className="flex space-x-2">
            <button
              onClick={handleImportSituacaoFiscal}
              className="px-4 py-2 text-sm font-medium text-primary bg-white border border-primary rounded-md shadow-sm hover:bg-primary hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Importar Situação Fiscal
            </button>
            <button
              onClick={handleImportDarf}
              className="px-4 py-2 text-sm font-medium text-primary bg-white border border-primary rounded-md shadow-sm hover:bg-primary hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Importar DARF
            </button>
            <button
              onClick={handleAddItem}
              className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Adicionar Item
            </button>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-shadow-dark overflow-hidden">
          <OrderItemsTable
            itens_pedido={itens_pedido}
            onDeleteItem={handleDeleteItem}
            isEditing={true}
          />
        </div>

        {/* Tax Summary */}
        {itens_pedido.length > 0 && (
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
                  {Object.entries(taxSummary).map(([taxType, data]) => (
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
                      {formatCurrency(originalTotal)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(currentTotal)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
