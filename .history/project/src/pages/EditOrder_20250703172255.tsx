import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft, CalendarIcon, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { OrderItemsTable } from '../components/OrderItemsTable';
import { AddOrderItemModal } from '../components/AddOrderItemModal';
import { ImportSituacaoFiscalModal } from '../components/ImportSituacaoFiscalModal';
import { getCustomers, getOrder, updateOrder, deleteOrderItem } from '../lib/api';
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
import { Button } from '@/components/ui/button'; // Import Button
import { formatCurrency } from '../lib/utils';
import SectionInclusionControl from '../components/SectionInclusionControl';
import { calculateFilteredTotal, calculateItemStatsByTaxType, extractInclusionFlags } from '../lib/totalCalculations';

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
  // Section inclusion flags
  include_pendencias_debito?: boolean;
  include_debitos_exig_suspensa?: boolean;
  include_parcelamentos_siefpar?: boolean;
  include_pendencias_inscricao?: boolean;
  include_pendencias_parcelamento?: boolean;
  include_simples_nacional?: boolean;
  include_darf?: boolean;
}

export default function EditOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [itens_pedido, setItensPedido] = useState<OrderItem[]>([]);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [calculations, setCalculations] = useState<any[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSituacaoFiscalModalOpen, setIsSituacaoFiscalModalOpen] = useState(false);
  const [isCustomerExpanded, setIsCustomerExpanded] = useState(true); // Set initial state to true
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

  const { data: order } = useQuery({
    queryKey: ['order', id],
    queryFn: () => getOrder(id!),
    enabled: !!id, // Só executa se tiver id
  });

  useEffect(() => {
    if (order) {
      console.log('🔍 [EditOrder] Order recebido:', order);
      console.log('🔍 [EditOrder] Itens do pedido:', order.itens_pedido);
      
      // Log específico para itens DARF
      const darfItems = order.itens_pedido.filter((item: OrderItem) => item.tax_type === 'DARF');
      if (darfItems.length > 0) {
        console.log('🔍 [EditOrder] Itens DARF encontrados:', darfItems);
        darfItems.forEach((item: OrderItem, index: number) => {
          console.log(`🔍 [EditOrder] DARF Item ${index}:`, {
            id: item.id,
            code: item.code,
            denominacao: item.denominacao,
            tax_type: item.tax_type,
            allKeys: Object.keys(item)
          });
        });
      }
      
      setFormData({
    customer: order.customer_id || '',
    orderDate: order.data_pedido ? formatDateString(order.data_pedido) : '',
    status: order.status || '',
    commission: order.comissao_percentage?.toString() || '',
    reduction: order.reducao_percentage?.toString() || '',
    supplier: order.fornecedor || '',
    dueDate: order.vencimento ? formatDateString(order.vencimento) : '',
    notes: order.notas || '',
    documentos: order.documentos,
    // Extract inclusion flags from order
    ...extractInclusionFlags(order)
      });

      // Transform order items to match the expected format - preservando TODOS os campos
      const transformedItems = order.itens_pedido.map((item: OrderItem) => ({
        id: item.id,
        order_id: item.order_id,
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
        cno: item.cno,
        created_at: item.created_at,
        updated_at: item.updated_at,
        // Campos importantes que estavam sendo perdidos
        denominacao: item.denominacao,
        cnpj: item.cnpj,
        inscricao: item.inscricao,
        receita: item.receita,
        inscrito_em: item.inscrito_em,
        ajuizado_em: item.ajuizado_em,
        processo: item.processo,
        tipo_devedor: item.tipo_devedor,
        devedor_principal: item.devedor_principal,
        parcelamento: item.parcelamento,
        valor_suspenso: item.valor_suspenso,
        modalidade: item.modalidade,
        sispar_conta: item.sispar_conta,
        sispar_descricao: item.sispar_descricao,
        sispar_modalidade: item.sispar_modalidade,
        saldo_devedor_consolidado: item.saldo_devedor_consolidado
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

    console.log('Dados do pedido para envio:', orderData);
    console.log('Itens do pedido:', itens_pedido);
    
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
      saldo_devedor_consolidado: newItem.saldo_devedor_consolidado || 0,
      status: newItem.status || 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      cno: newItem.cno
    };
    
    console.log('🔍 Item adicionado com saldo_devedor_consolidado:', {
      original: newItem.saldo_devedor_consolidado,
      final: itemWithId.saldo_devedor_consolidado
    });
    setItensPedido(prev => [...prev, itemWithId]);
  };

  const handleImportDarf = () => {
    setIsImportModalOpen(true);
  };

  const handleImportSituacaoFiscal = () => {
    setIsSituacaoFiscalModalOpen(true);
  };

  const handleDarfImport = (importedItems: OrderItem[], file: File) => {
    try {
      console.log(`Importando ${importedItems.length} itens DARF:`, importedItems);
      
      if (!importedItems || importedItems.length === 0) {
        toast.error('Nenhum item DARF para importar');
        return;
      }

      // Adiciona os novos itens DARF à lista existente
      setItensPedido(prevItems => [...prevItems, ...importedItems]);
      toast.success(`${importedItems.length} itens DARF importados com sucesso`);
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

  const handleDeleteItem = async (itemId: string) => {
    try {
      // Se o item tem um ID numérico ou UUID, é um item existente no banco
      const item = itens_pedido.find(item => item.id === itemId);
      const isExistingItem = item && item.order_id && !itemId.includes('situacao-fiscal-') && !itemId.includes('darf-');
      
      if (isExistingItem) {
        // Item existe no banco - chama a API para deletar
        await deleteOrderItem(itemId);
        toast.success('Item removido do banco de dados');
      } else {
        // Item temporário (ainda não salvo) - remove apenas do estado local
        toast.success('Item removido da lista');
      }
      
      // Remove do estado local em ambos os casos
      setItensPedido(prevItems => prevItems.filter(item => item.id !== itemId));
    } catch (error) {
      console.error('Erro ao deletar item:', error);
      toast.error('Erro ao remover item: ' + (error as Error).message);
    }
  };

  const calculateTotal = (items: OrderItem[], selector: (item: OrderItem) => number): number => {
    return items.reduce((sum, item) => sum + selector(item), 0);
  };

  // Extrai flags de inclusão do formData
  const inclusionFlags = {
    include_pendencias_debito: formData.include_pendencias_debito,
    include_debitos_exig_suspensa: formData.include_debitos_exig_suspensa,
    include_parcelamentos_siefpar: formData.include_parcelamentos_siefpar,
    include_pendencias_inscricao: formData.include_pendencias_inscricao,
    include_pendencias_parcelamento: formData.include_pendencias_parcelamento,
    include_simples_nacional: formData.include_simples_nacional,
    include_darf: formData.include_darf
  };

  // Calcula totais baseados nas flags de inclusão
  const originalTotal = calculateFilteredTotal(
    itens_pedido, 
    inclusionFlags, 
    item => item.original_value || 0
  );
  const currentTotal = calculateFilteredTotal(
    itens_pedido, 
    inclusionFlags, 
    item => item.saldo_devedor_consolidado || item.current_balance || 0
  );

  console.log('💰 Cálculo de totais:', {
    totalItens: itens_pedido.length,
    valorOriginalFiltrado: originalTotal,
    valorAtualFiltrado: currentTotal,
    flagsInclusao: inclusionFlags
  });

  const taxSummary = itens_pedido.reduce((acc: Record<string, { count: number; originalTotal: number; currentTotal: number }>, item) => {
    const key = item.tax_type;
    if (!acc[key]) {
      acc[key] = { count: 0, originalTotal: 0, currentTotal: 0 };
    }
    acc[key].count += 1;
    acc[key].originalTotal += item.original_value || 0;
    acc[key].currentTotal += item.saldo_devedor_consolidado || item.current_balance || 0;
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
            <Button
              type="button"
              variant="outline" // Use outline variant
              onClick={() => navigate(`/orders/${id}`)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              // Default variant
            >
              Criar Cobranças
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={updateOrderMutation.isPending}
              // Default variant
            >
              {updateOrderMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-lg shadow-md p-6">
          {/* Use Button for expand/collapse */}
          <Button
            variant="ghost"
            onClick={() => setIsCustomerExpanded(!isCustomerExpanded)}
            className="w-full flex items-center justify-between text-left px-6 py-4 hover:bg-transparent" // Adjusted styling
          >
            <h2 className="text-lg font-semibold">Informações do Cliente</h2>
            {isCustomerExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </Button>
          
          {isCustomerExpanded && (
            <div className="px-6 pb-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="customer">Cliente</Label> {/* Use Label */}
                  <Select
                    name="customer"
                    value={formData.customer}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, customer: value }))} // Use onValueChange
                  >
                    <SelectTrigger id="customer">
                      <SelectValue placeholder="Selecione um cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {customers?.map((customer) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.razao_social}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Label htmlFor="status">Status</Label> {/* Use Label */}
                   <Select
                    name="status"
                    value={formData.status}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))} // Use onValueChange
                  >
                    <SelectTrigger id="status">
                      <SelectValue placeholder="Selecione o status..." />
                    </SelectTrigger>
                    <SelectContent>
                      {orderStatuses.map((status) => (
                        <SelectItem key={status.id} value={status.id}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              <TabsTrigger value="config">Configurações</TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="commission">Comissão (%)</Label> {/* Use Label */}
                  <Input
                    type="number"
                    id="commission"
                    name="commission"
                    value={formData.commission}
                    onChange={handleInputChange}
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="reduction">Redução (%)</Label> {/* Use Label */}
                  <Input
                    type="number"
                    id="reduction"
                    name="reduction"
                    value={formData.reduction}
                    onChange={handleInputChange}
                    step="0.01"
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier">Fornecedor</Label> {/* Use Label */}
                  <Select
                    name="supplier"
                    value={formData.supplier}
                     onValueChange={(value) => setFormData(prev => ({ ...prev, supplier: value }))} // Use onValueChange
                  >
                     <SelectTrigger id="supplier">
                       <SelectValue placeholder="Selecione o fornecedor..." />
                     </SelectTrigger>
                     <SelectContent>
                       {suppliers.map((supplier) => (
                         <SelectItem key={supplier.id} value={supplier.id}>
                           {supplier.name}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                </div>
                <div>
                  <Label htmlFor="dueDate"> {/* Use Label */}
                    Vencimento
                  </Label> {/* Added missing closing tag */}
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
                      {/* Use Button for import */}
                      <Button
                        variant="link"
                        type="button"
                        onClick={() => setIsSituacaoFiscalModalOpen(true)}
                        className="text-sm h-auto p-0" // Adjust styling
                      >
                        Importar
                      </Button>
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
                       {/* Use Button for import */}
                      <Button
                        variant="link"
                        type="button"
                        onClick={() => setIsImportModalOpen(true)}
                        className="text-sm h-auto p-0" // Adjust styling
                      >
                        Importar
                      </Button>
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
                <Label htmlFor="principal">Valor Principal</Label> {/* Use Label */}
                <Input
                  type="number"
                  id="principal"
                  name="principal"
                  step="0.01"
                  placeholder="0.00"
                  // Assuming you might want to handle this value in state later
                  // value={formData.principal || ''} 
                  // onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="fine">Multa</Label> {/* Use Label */}
                <Input
                  type="number"
                  id="fine"
                  name="fine"
                  step="0.01"
                  placeholder="0.00"
                   // Assuming you might want to handle this value in state later
                  // value={formData.fine || ''}
                  // onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="interest">Juros</Label> {/* Use Label */}
                <Input
                  type="number"
                  id="interest"
                  name="interest"
                  step="0.01"
                  placeholder="0.00"
                   // Assuming you might want to handle this value in state later
                  // value={formData.interest || ''}
                  // onChange={handleInputChange}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="notes" className="space-y-4">
              <div>
                <Label htmlFor="notes">Observações</Label> {/* Use Label */}
                <Textarea
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
        <h3 className="text-lg font-medium mb-4">Itens do Pedido</h3>
        <div className="flex space-x-4 mb-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsSituacaoFiscalModalOpen(true)}
            className="inline-flex items-center px-3 py-2"
          >
            Importar Situação Fiscal
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center px-3 py-2"
          >
            Importar DARF
          </Button>
          <Button
            type="button"
            onClick={() => setIsAddItemModalOpen(true)}
            className="inline-flex items-center px-3 py-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Item
          </Button>
        </div>
        <div className="bg-white rounded-lg border border-shadow-dark overflow-hidden mb-6">
          <OrderItemsTable
            itens_pedido={itens_pedido}
            onDeleteItem={handleDeleteItem}
            onAddItem={handleAddItem}
            onImportDarf={handleImportDarf}
            onImportSituacaoFiscal={handleImportSituacaoFiscal}
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
                      Sdo. Dev. Cons
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
