import React, { useState } from 'react';
import { FileText } from 'lucide-react'; // Remove CalendarIcon
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { OrderItemsTable } from '../components/OrderItemsTable';
import { AddOrderItemModal } from '../components/AddOrderItemModal';
import { ImportSituacaoFiscalModal } from '../components/ImportSituacaoFiscalModal';
import { getCustomers, createOrder } from '../lib/api';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { BillingCalculationsTable } from '../components/BillingCalculationsTable';
import { ImportDarfModal } from '../components/ImportDarfModal';
import { Header } from '@/components/Header';
import { Order, OrderItem } from '@/types';
import toast from 'react-hot-toast';
import { processDarfPDF } from '../lib/darfProcessor';
import { DatePicker } from '@/components/ui/date-picker';
import { format as formatDateFn } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '../components/ui/textarea'; // Corrigido o caminho do import
import { Dropzone } from '../components/ui/dropzone';
import { Trash2 } from 'lucide-react';

interface FormData {
  customer: string;
  orderDate: Date | undefined; // Changed type
  status: string;
  commission: string;
  reduction: string;
  supplier: string;
  dueDate: Date | undefined; // Changed type
  notes: string;
  documentos: Order['documentos'];
}

export default function CreateOrder() {
  const navigate = useNavigate();
  const [itens_pedido, setItensPedido] = useState<OrderItem[]>([]);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [calculations, setCalculations] = useState<any[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSituacaoFiscalModalOpen, setIsSituacaoFiscalModalOpen] = useState(false);
  // Update initial state for dates
  const [formData, setFormData] = useState<FormData>({
    customer: '',
    orderDate: undefined, // Changed initial value
    status: '',
    commission: '',
    reduction: '',
    supplier: '',
    dueDate: undefined, // Changed initial value
    notes: '',
    documentos: {
      vendas: [],
      juridico: []
    }
  });

  const handleFileUpload = (acceptedFiles: File[], type: 'vendas' | 'juridico') => {
    const newDocuments = acceptedFiles.map(file => ({
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      url: URL.createObjectURL(file)
    }));

    setFormData(prev => ({
      ...prev,
      documentos: {
        ...prev.documentos,
        [type]: [...(prev.documentos?.[type] || []), ...newDocuments]
      }
    }));
  };

  const handleFileRemove = (index: number, type: 'vendas' | 'juridico') => {
    setFormData(prev => {
      const updatedDocs = [...(prev.documentos?.[type] || [])];
      updatedDocs.splice(index, 1);
      return {
        ...prev,
        documentos: {
          ...prev.documentos,
          [type]: updatedDocs
        }
      };
    });
  };

  const createOrderMutation = useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      toast.success('Pedido criado com sucesso');
      navigate('/orders');
    },
    onError: (error) => {
      toast.error('Erro ao criar pedido: ' + error.message);
    }
  });

  // Corrected handler type to include Select elements until replaced
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Helper for Shadcn Select components
  const handleSelectChange = (name: keyof FormData) => (value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
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

    // Format dates before submitting
    const formattedOrderDate = formData.orderDate ? formatDateFn(formData.orderDate, 'yyyy-MM-dd') : '';
    const formattedDueDate = formData.dueDate ? formatDateFn(formData.dueDate, 'yyyy-MM-dd') : '';

    if (!formattedOrderDate) {
      toast.error('Selecione a data do pedido');
      return;
    }
    // Optional: Add validation for dueDate if needed

    const orderData = {
      customer_id: formData.customer,
      data_pedido: formattedOrderDate, // Use formatted date
      status: formData.status,
      comissaoPercentage: formData.commission || '0',
      reducaoPercentage: formData.reduction || '0',
      fornecedor: formData.supplier,
      vencimento: formattedDueDate, // Use formatted date
      notas: formData.notes,
      itens_pedido: itens_pedido, // Ensure OrderItem type matches expected structure
      documentos: formData.documentos
    };

    createOrderMutation.mutate(orderData);
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

  // Construct a more complete OrderItem, handle potential missing fields from modal
  const handleItemAdd = (newItemData: Partial<OrderItem>) => { 
    // Create a more complete item, providing defaults for required fields
    // Merge defaults with newItemData, ensuring newItemData overrides defaults
    
    // Melhora o tratamento de código para itens sem código
    let code = newItemData.code || '';
    if (!code || code.trim() === '') {
      if (newItemData.start_period) {
        // Gera código baseado no período se não houver código
        const periodo = newItemData.start_period.replace(/[\/\s]/g, "-");
        code = `ITEM-MANUAL-${periodo}`;
      } else {
        code = `ITEM-MANUAL-${Date.now()}`;
      }
    }
    
    const completeNewItem: OrderItem = {
      id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Unique client-side ID
      order_id: '', // Will be set after order creation
      code: code,
      tax_type: newItemData.tax_type || 'MANUAL',
      start_period: newItemData.start_period || '2024-01-01', // Garantir data válida
      end_period: newItemData.end_period || '2024-01-01',     // Garantir data válida
      due_date: newItemData.due_date || '2024-01-01',         // Garantir data válida
      original_value: newItemData.original_value || 0,
      current_balance: newItemData.current_balance || 0,
      fine: newItemData.fine || 0,
      interest: newItemData.interest || 0,
      status: newItemData.status || 'pending', // Default status
      created_at: new Date().toISOString(), // Set creation time
      updated_at: new Date().toISOString(), // Set update time
      ...newItemData, // Spread newItemData to override defaults and add optional fields like cno
    };
    
    // Ensure current_balance defaults to original_value if not provided or nullish in newItemData
    if (completeNewItem.current_balance == null) {
       completeNewItem.current_balance = completeNewItem.original_value ?? 0;
    }

    console.log('🔍 Item manual criado:', {
      code: completeNewItem.code,
      start_period: completeNewItem.start_period,
      end_period: completeNewItem.end_period,
      due_date: completeNewItem.due_date
    });
    
    setItensPedido(prev => [...prev, completeNewItem]);
  };

  const handleImportDarf = () => {
    setIsImportModalOpen(true);
  };

  const handleImportSituacaoFiscal = () => {
    setIsSituacaoFiscalModalOpen(true);
  };

  const handleDarfImport = (items: OrderItem[], file: File) => {
    console.log('🎯 DARF Import iniciado!', { 
      itemsRecebidos: items.length, 
      itensExistentes: itens_pedido.length 
    });
    console.log('📋 Itens DARF recebidos:', items);
    console.log('📋 Itens existentes na tabela:', itens_pedido);

    // Store file info in form state
    setFormData(prev => ({
      ...prev,
      documentos: {
        ...prev.documentos,
        darf: {
          name: file.name,
          type: file.type,
          size: file.size,
          url: URL.createObjectURL(file),
          file: file // Armazena o arquivo real para upload
        }
      }
    }));

    // Se não há itens existentes, adiciona os itens do DARF diretamente
    if (itens_pedido.length === 0) {
      console.log('🆕 Nenhum item existente, adicionando itens DARF diretamente');
      console.log('🔍 Verificando IDs dos itens DARF:', items.map(item => ({ id: item.id, code: item.code })));
      setItensPedido(items);
      toast.success(`${items.length} itens DARF adicionados com sucesso`);
      setIsImportModalOpen(false);
      return;
    }

    // Atualiza os itens existentes com os dados do DARF
    const updatedItems = itens_pedido.map(item => {
      console.log(`🔍 Procurando match para item existente: ${item.code}`);
      
      const matchingDarfItem = items.find(darfItem => {
        const codeMatch = darfItem.code === item.code;
        const cnoMatch = darfItem.cno ? darfItem.cno === item.cno : true;
        console.log(`   - DARF ${darfItem.code}: codeMatch=${codeMatch}, cnoMatch=${cnoMatch}`);
        return codeMatch && cnoMatch;
      });

      if (matchingDarfItem) {
        console.log(`✅ Match encontrado para ${item.code}:`, matchingDarfItem);
        return {
          ...item,
          fine: matchingDarfItem.fine,
          interest: matchingDarfItem.interest,
          current_balance: matchingDarfItem.current_balance,
          ...(matchingDarfItem.cno && { original_value: matchingDarfItem.original_value }) // Atualiza valor original apenas para itens com CNO
        };
      } else {
        console.log(`❌ Nenhum match encontrado para ${item.code}`);
      }

      return item;
    });

    // Adiciona itens DARF que não tiveram match (novos itens)
    const unmatchedDarfItems = items.filter(darfItem => {
      return !itens_pedido.some(existingItem => 
        darfItem.code === existingItem.code && 
        (darfItem.cno ? darfItem.cno === existingItem.cno : true)
      );
    });

    if (unmatchedDarfItems.length > 0) {
      console.log(`🆕 Adicionando ${unmatchedDarfItems.length} novos itens DARF:`, unmatchedDarfItems);
      updatedItems.push(...unmatchedDarfItems);
    }

    console.log('📋 Itens finais após correlação:', updatedItems);
    setItensPedido(updatedItems);
    toast.success(`Dados do DARF importados: ${unmatchedDarfItems.length} novos, ${updatedItems.length - unmatchedDarfItems.length} atualizados`);
    setIsImportModalOpen(false);
  };

  // Novo: handler recebe também o JSON completo da situação fiscal
  const handleSituacaoFiscalImport = (importedItems: OrderItem[], file: File, rawSituacaoFiscalData?: any) => {
    console.log('🎯 Situação Fiscal Import iniciado!', { 
      itemsRecebidos: importedItems.length,
      itensExistentes: itens_pedido.length 
    });
    console.log('📋 Itens Situação Fiscal recebidos:', importedItems);

    // Salva o arquivo e o JSON completo da situação fiscal no estado
    setFormData(prev => ({
      ...prev,
      documentos: {
        ...prev.documentos,
        situacaoFiscal: {
          name: file.name,
          type: file.type,
          size: file.size,
          url: URL.createObjectURL(file),
          file: file, // Armazena o arquivo real para upload
          ...(rawSituacaoFiscalData ? rawSituacaoFiscalData : {})
        }
      }
    }));

    // Gera IDs únicos para evitar chaves duplicadas
    const newItems = importedItems.map((item, index) => ({
      ...item,
      id: `situacao-fiscal-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`
    }));

    console.log('📋 Itens com IDs únicos:', newItems);
    setItensPedido(prevItems => [...prevItems, ...newItems]);
    toast.success(`${importedItems.length} itens importados com sucesso`);
  };

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
        title="Cadastrar Pedido"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/orders')}
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
              disabled={createOrderMutation.isPending}
              className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md shadow-sm hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              {createOrderMutation.isPending ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Informações do Cliente</h2>
          <div className="space-y-4">
            <div className="space-y-1"> {/* Added wrapper for Label + Select */}
              <Label htmlFor="customer">Cliente</Label>
              <Select
                value={formData.customer}
                onValueChange={handleSelectChange('customer')}
              >
                <SelectTrigger id="customer" className="w-full">
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

            <div className="space-y-1"> {/* Added wrapper for Label + DatePicker */}
              <Label htmlFor="orderDate">Data do Pedido</Label> {/* Ensured closing tag */}
              {/* Use DatePicker for orderDate */}
              <DatePicker
                date={formData.orderDate}
                setDate={(date) => setFormData(prev => ({ ...prev, orderDate: date }))}
                placeholder="Selecione a data do pedido"
                className="mt-1"
              />
            </div>

            <div className="space-y-1"> {/* Added wrapper for Label + Select */}
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={handleSelectChange('status')}
              >
                <SelectTrigger id="status" className="w-full">
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
                <div className="space-y-1"> {/* Added wrapper */}
                  <Label htmlFor="commission">Comissão (%)</Label>
                  <Input
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
                <div className="space-y-1"> {/* Added wrapper */}
                  <Label htmlFor="reduction">Redução (%)</Label>
                  <Input
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
                <div className="space-y-1"> {/* Added wrapper */}
                  <Label htmlFor="supplier">Fornecedor</Label> 
                  <Select
                    value={formData.supplier}
                    onValueChange={handleSelectChange('supplier')}
                  >
                    <SelectTrigger id="supplier" className="w-full">
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
                <div className="space-y-1"> {/* Added wrapper */}
                  <Label htmlFor="dueDate">Vencimento</Label> {/* Corrected closing tag */}
                   {/* Use DatePicker for dueDate */}
                  <DatePicker
                    date={formData.dueDate}
                    setDate={(date) => setFormData(prev => ({ ...prev, dueDate: date }))}
                    placeholder="Selecione a data de vencimento"
                    className="mt-1"
                  />
                </div>
              </div>
              
              <BillingCalculationsTable calculations={calculations} />
            </TabsContent>
            
            <TabsContent value="attachments" className="space-y-6">
              {/* Situação Fiscal e DARF */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Situação Fiscal */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-900">Situação Fiscal</h3>
                    <button type="button" onClick={() => setIsSituacaoFiscalModalOpen(true)} className="text-sm text-primary hover:text-primary-hover">Importar</button>
                  </div>
                  {formData.documentos?.situacaoFiscal ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{formData.documentos.situacaoFiscal.name}</span>
                      </div>
                      <a href={formData.documentos.situacaoFiscal.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:text-primary-hover">Download</a>
                    </div>
                  ) : <p className="text-sm text-gray-500">Nenhum arquivo importado</p>}
                </div>
                {/* DARF */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-900">DARF</h3>
                    <button type="button" onClick={() => setIsImportModalOpen(true)} className="text-sm text-primary hover:text-primary-hover">Importar</button>
                  </div>
                  {formData.documentos?.darf ? (
                     <div className="flex items-center justify-between">
                       <div className="flex items-center space-x-2">
                         <FileText className="h-4 w-4 text-gray-400" />
                         <span className="text-sm text-gray-600">{formData.documentos.darf.name}</span>
                       </div>
                       <a href={formData.documentos.darf.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:text-primary-hover">Download</a>
                     </div>
                  ) : <p className="text-sm text-gray-500">Nenhum arquivo importado</p>}
                </div>
              </div>

              {/* Vendas e Jurídico */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Vendas */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Documentos de Vendas</h3>
                  <Dropzone
                    onDrop={(acceptedFiles: File[]) => handleFileUpload(acceptedFiles, 'vendas')}
                    accept="application/pdf"
                    multiple
                  />
                  <div className="mt-4 space-y-2">
                    {formData.documentos?.vendas?.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{doc.name}</span>
                        </div>
                        <button type="button" onClick={() => handleFileRemove(index, 'vendas')} className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Jurídico */}
                <div className="p-4 border border-gray-200 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">Documentos Jurídicos</h3>
                  <Dropzone
                    onDrop={(acceptedFiles: File[]) => handleFileUpload(acceptedFiles, 'juridico')}
                    accept="application/pdf"
                    multiple
                  />
                  <div className="mt-4 space-y-2">
                    {formData.documentos?.juridico?.map((doc, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{doc.name}</span>
                        </div>
                        <button type="button" onClick={() => handleFileRemove(index, 'juridico')} className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="financial" className="space-y-4">
              <div className="space-y-1"> {/* Added wrapper */}
                <Label htmlFor="principal">Valor Principal</Label>
                <Input
                  type="number"
                  id="principal"
                  name="principal"
                  step="0.01"
                  className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1"> {/* Added wrapper */}
                <Label htmlFor="fine">Multa</Label>
                <Input
                  type="number"
                  id="fine"
                  name="fine"
                  step="0.01"
                  className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1"> {/* Added wrapper */}
                <Label htmlFor="interest">Juros</Label>
                <Input
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
              <div className="space-y-1"> {/* Added wrapper */}
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="mt-1" // Use default Shadcn styling, remove specific classes if needed
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
          <button
            type="button"
            onClick={handleImportSituacaoFiscal}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Importar Situação Fiscal
          </button>
          <button
            type="button"
            onClick={handleImportDarf}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Importar DARF
          </button>
          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Adicionar Item
          </button>
        </div>
        {/* Agrupamento por tax_type */}
        {(() => {
          const grouped = itens_pedido.reduce((acc, item) => {
            const key = item.tax_type || 'OUTROS';
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
          }, {} as Record<string, typeof itens_pedido>);
          const friendlyTitles: Record<string, string> = {
            'DEBITO': 'Débitos SIEF',
            'DEBITO_EXIG_SUSPENSA_SIEF': 'Débitos Exig. Suspensa',
            // Adicione outros tipos conforme necessário
            'OUTROS': 'Outros'
          };
          const hasItens = Object.entries(grouped).length > 0;
          return (
            <>
              {!hasItens && (
                <p className="text-center text-gray-500 py-4">Nenhum item adicionado ainda.</p>
              )}
              {Object.entries(grouped).map(([taxType, items]) => (
                <React.Fragment key={taxType}>
                  <div
                    className="border border-gray-400 rounded-lg p-4 mb-6 bg-white"
                  >
                    <h4 className="text-md font-semibold mb-2">{friendlyTitles[taxType] || taxType}</h4>
                    <OrderItemsTable
                      itens_pedido={items}
                      onAddItem={() => {}}
                      onImportDarf={() => {}}
                      onImportSituacaoFiscal={() => {}}
                      isEditing={false}
                    />
                  </div>
                </React.Fragment>
              ))}

              {/* Seção Parcelamentos Siefpar */}
              {formData.documentos?.situacaoFiscal?.parcelamentosSiefpar && formData.documentos.situacaoFiscal.parcelamentosSiefpar.length > 0 && (
                <div className="border border-gray-200 rounded-lg p-4 mb-6 bg-white">
                  <h4 className="text-md font-semibold mb-2">Parcelamentos SIEFPar</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr>
                          <th className="px-2 py-1 text-left">CNPJ</th>
                          <th className="px-2 py-1 text-left">Parcelamento</th>
                          <th className="px-2 py-1 text-right">Valor Suspenso</th>
                          <th className="px-2 py-1 text-left">Tipo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.documentos.situacaoFiscal.parcelamentosSiefpar.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-2 py-1">{item.cnpj}</td>
                            <td className="px-2 py-1">{item.parcelamento}</td>
                            <td className="px-2 py-1 text-right">{item.valor_suspenso?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                            <td className="px-2 py-1">{item.tipo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Seção Pendências de Inscrição */}
              {formData.documentos?.situacaoFiscal?.pendenciasInscricao && formData.documentos.situacaoFiscal.pendenciasInscricao.length > 0 && (
                <div className="border border-gray-400 rounded-lg p-4 mb-6 bg-white">
                  <h4 className="text-md font-semibold mb-2">Pendências de Inscrição</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr>
                          <th className="px-2 py-1 text-left">CNPJ</th>
                          <th className="px-2 py-1 text-left">Inscrição</th>
                          <th className="px-2 py-1 text-left">Receita</th>
                          <th className="px-2 py-1 text-left">Data Inscrição</th>
                          <th className="px-2 py-1 text-left">Processo</th>
                          <th className="px-2 py-1 text-left">Tipo Devedor</th>
                          <th className="px-2 py-1 text-left">Situação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {formData.documentos.situacaoFiscal.pendenciasInscricao.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-2 py-1">{item.cnpj}</td>
                            <td className="px-2 py-1">{item.inscricao}</td>
                            <td className="px-2 py-1">{item.receita}</td>
                            <td className="px-2 py-1">{item.inscrito_em}</td>
                            <td className="px-2 py-1">{item.processo}</td>
                            <td className="px-2 py-1">{item.tipo_devedor}</td>
                            <td className="px-2 py-1">{item.situacao}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          );
        })()}
      </div>

    </div>
  );
}
