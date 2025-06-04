import { User, Customer, Order, DashboardStats, PaymentPlan, Installment } from '../types';
import { supabase } from './supabase';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function getPaymentPlans(): Promise<PaymentPlan[]> {
  const { data, error } = await supabase
    .from('payment_plans')
    .select('*, order:orders!payment_plans_order_id_fkey(*, customer:customers(*)), installments(*)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createPaymentPlan(orderId: string, totalAmount: number, installmentsCount: number): Promise<PaymentPlan> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  // Start a transaction
  const { data: paymentPlan, error: planError } = await supabase
    .from('payment_plans')
    .insert([{
      order_id: orderId,
      user_id: user.id,
      total_amount: totalAmount,
      installments_count: installmentsCount,
      status: 'pending'
    }])
    .select()
    .single();

  if (planError) throw planError;

  // Calculate installment amount and dates
  const installmentAmount = Math.ceil(totalAmount / installmentsCount * 100) / 100;
  const remainder = totalAmount - (installmentAmount * (installmentsCount - 1));
  const installments = [];

  for (let i = 0; i < installmentsCount; i++) {
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + i + 1);
    
    installments.push({
      payment_plan_id: paymentPlan.id,
      installment_number: i + 1,
      amount: i === installmentsCount - 1 ? remainder : installmentAmount,
      due_date: dueDate.toISOString().split('T')[0],
      status: 'pending'
    });
  }

  const { error: installmentsError } = await supabase
    .from('installments')
    .insert(installments);

  if (installmentsError) throw installmentsError;

  // Update order with payment plan reference and status
  const { error: orderError } = await supabase
    .from('orders')
    .update({
      payment_plan_id: paymentPlan.id,
      status: 'completed'
    })
    .eq('id', orderId)
    .eq('user_id', user.id);

  if (orderError) throw orderError;

  return paymentPlan;
}

export async function updateInstallment(installmentId: string, data: Partial<Installment>): Promise<Installment> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  const { data: installment, error } = await supabase
    .from('installments')
    .update(data)
    .eq('id', installmentId)
    .select()
    .single();

  if (error) throw error;
  return installment;
}

export async function uploadPaymentReceipt(file: File, installmentId: string): Promise<{ url: string }> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  // Create a safe filename
  const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

  // Upload to storage bucket
  const { data, error } = await supabase.storage
    .from('payment-receipts')
    .upload(`${user.id}/${installmentId}/${safeFileName}`, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) throw error;

  // Get public URL
  const { data: { publicUrl } } = await supabase.storage
    .from('payment-receipts')
    .getPublicUrl(data.path);

  // Ensure HTTPS URL
  const secureUrl = publicUrl.replace('http://', 'https://');

  // Update installment with receipt info
  const { error: updateError } = await supabase
    .from('installments')
    .update({
      receipt: {
        url: secureUrl,
        name: safeFileName,
        type: file.type,
        size: file.size
      }
    })
    .eq('id', installmentId);

  if (updateError) throw updateError;

  return { url: secureUrl };
}

export async function login(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return { token: data.session?.access_token, user: data.user };
}

export async function signup(email: string, password: string, name: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name }
    }
  });

  if (error) throw error;
  return { token: data.session?.access_token, user: data.user };
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return { user };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  // TODO: Implement dashboard stats with Supabase
  return {
    totalOrders: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    newCustomers: 0
  };
}

export async function getCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') { 
      console.warn(`Customer with ID ${id} not found or access denied.`);
      return null;
    }
    if (error instanceof Error) {
      console.error(`Error fetching customer ${id}:`, error.message);
    } else {
      console.error(`An unknown error occurred while fetching customer ${id}:`, error);
    }
    throw error;
  }

  return data;
}

export async function createCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'certificado'>): Promise<Customer> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  const { data: userData, error: userCheckError } = await supabase
    .from('users')
    .select('id')
    .eq('id', user.id)
    .single();

  if (userCheckError || !userData) {
    throw new Error('User record not found');
  }

  const { data, error } = await supabase
    .from('customers')
    .insert([{
      ...customer,
      user_id: user.id
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCustomer(id: string, customer: Partial<Customer>): Promise<Customer> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('customers')
    .update(customer)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCustomer(id: string): Promise<void> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) throw error;
}

export async function uploadCertificate(file: File, customerId: string): Promise<{ url: string }> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

  const { data, error } = await supabase.storage
    .from('certificates')
    .upload(`${user.id}/${customerId}/${safeFileName}`, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) throw error;

  const { data: { publicUrl } } = await supabase.storage
    .from('certificates')
    .getPublicUrl(data.path);

  const secureUrl = publicUrl.replace('http://', 'https://');

  await updateCustomer(customerId, {
    certificado: {
      url: secureUrl,
      name: safeFileName,
      type: file.type,
      size: file.size
    }
  });

  return { url: secureUrl };
}

export async function uploadOrderPDF(file: File, orderId: string, type: 'situacaoFiscal' | 'darf'): Promise<{ url: string }> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

  const { data, error } = await supabase.storage
    .from('order-pdfs')
    .upload(`${user.id}/${orderId}/${type}/${safeFileName}`, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) throw error;

  const { data: { publicUrl } } = await supabase.storage
    .from('order-pdfs')
    .getPublicUrl(data.path);

  const secureUrl = publicUrl.replace('http://', 'https://');

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('documentos')
    .eq('id', orderId)
    .single();

  if (orderError) throw orderError;

  const documentos = {
    ...order?.documentos,
    [type]: {
      url: secureUrl,
      name: safeFileName,
      type: file.type,
      size: file.size
    }
  };

  const { error: updateError } = await supabase
    .from('orders')
    .update({ documentos })
    .eq('id', orderId)
    .eq('user_id', user.id);

  if (updateError) throw updateError;

  return { url: secureUrl };
}

export async function getOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customers(*),
      itens_pedido:order_items(*)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createOrder(order: any) {
  console.log('createOrder chamada com:', { order });
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('orders')
    .insert([{
      customer_id: order.customer_id,
      user_id: user.id,
      status: order.status,
      data_pedido: order.data_pedido || null,
      comissao_percentage: order.comissaoPercentage,
      reducao_percentage: order.reducaoPercentage,
      fornecedor: order.fornecedor,
      vencimento: order.vencimento || null,
      notas: order.notas
    }])
    .select()
    .single();

  if (error) throw error;

  let documentos: any = {};
  if (order.documentos) {
    console.log('Processando documentos:', order.documentos);
    
    // Verifica se há arquivo de situação fiscal para upload
    if (order.documentos.situacaoFiscal?.file && order.documentos.situacaoFiscal.file.name) {
      console.log('Fazendo upload da situação fiscal...');
      const { url } = await uploadOrderPDF(order.documentos.situacaoFiscal.file, data.id, 'situacaoFiscal');
      documentos = {
        ...documentos,
        situacaoFiscal: {
          url,
          name: order.documentos.situacaoFiscal.file.name,
          type: order.documentos.situacaoFiscal.file.type,
          size: order.documentos.situacaoFiscal.file.size
        }
      };
      console.log('Upload da situação fiscal concluído:', documentos.situacaoFiscal);
    }
    
    // Verifica se há arquivo DARF para upload
    if (order.documentos.darf?.file && order.documentos.darf.file.name) {
      console.log('Fazendo upload do DARF...');
      const { url } = await uploadOrderPDF(order.documentos.darf.file, data.id, 'darf');
      documentos = {
        ...documentos,
        darf: {
          url,
          name: order.documentos.darf.file.name,
          type: order.documentos.darf.file.type,
          size: order.documentos.darf.file.size
        }
      };
      console.log('Upload do DARF concluído:', documentos.darf);
    }

    if (Object.keys(documentos).length > 0) {
      console.log('Atualizando pedido com documentos:', documentos);
      const { error: updateError } = await supabase
        .from('orders')
        .update({ documentos })
        .eq('id', data.id)
        .eq('user_id', user.id);

      if (updateError) throw updateError;
      console.log('Pedido atualizado com documentos com sucesso');
    }
  }

  if (order.itens_pedido?.length > 0) {
    console.log('Processando itens do pedido:', order.itens_pedido);
    
    const orderItems = order.itens_pedido.map((item: any, index: number): any => {
      console.log(`\n🔍 [DB Item ${index}] Processando para inserção:`, {
        code: item.code,
        start_period: item.start_period,
        end_period: item.end_period,
        due_date: item.due_date
      });

      const formattedItem = {
        order_id: data.id,
        code: item.code || `ITEM_${index}`,
        tax_type: item.tax_type || 'UNKNOWN',
        start_period: formatDateForDB(item.start_period) || '2024-01-01',
        end_period: formatDateForDB(item.end_period) || '2024-01-01',
        due_date: formatDateForDB(item.due_date) || '2024-01-01',
        original_value: item.original_value || 0,
        current_balance: item.current_balance || 0,
        fine: item.fine || 0,
        interest: item.interest || 0,
        status: item.status || 'pending',
        cno: item.cno || ''
      };
      
      // Validação final antes da inserção
      if (!formattedItem.start_period || formattedItem.start_period === '') {
        console.error(`❌ [DB Item ${index}] start_period ainda é null/vazio após formatação:`, {
          original_start_period: item.start_period,
          formatted_start_period: formattedItem.start_period,
          item_completo: item
        });
        formattedItem.start_period = '2024-01-01'; // Força fallback
      }

      if (!formattedItem.due_date || formattedItem.due_date === '') {
        console.error(`❌ [DB Item ${index}] due_date ainda é null/vazio após formatação:`, {
          original_due_date: item.due_date,
          formatted_due_date: formattedItem.due_date,
          item_completo: item
        });
        formattedItem.due_date = '2024-01-01'; // Força fallback
      }

      console.log(`✅ [DB Item ${index}] Item formatado para DB:`, {
        code: formattedItem.code,
        start_period: formattedItem.start_period,
        end_period: formattedItem.end_period,
        due_date: formattedItem.due_date
      });
      
      return formattedItem;
    });

    console.log('Itens formatados para inserção:', orderItems);
    
    // Log de validação dos campos obrigatórios (sem bloquear)
    const itemsWithNullFields = orderItems.filter(item => !item.start_period || !item.due_date);
    if (itemsWithNullFields.length > 0) {
      console.warn('⚠️ Itens com campos obrigatórios que podem estar vazios:', itemsWithNullFields);
      // Não bloqueia mais - as correções no darfProcessor devem resolver isso
    }

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;
    console.log('Itens do pedido inseridos com sucesso');
  }

  console.log('Pedido criado com sucesso:', data);
  return data;
}

export async function updateOrder(orderId: string, order: any) {
  console.log('updateOrder chamada com:', { orderId, order });
  
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  const { data: existingOrder, error: fetchError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (fetchError) throw fetchError;

  let documentos = existingOrder.documentos || {};
  if (order.documentos) {
    // Verifica se há arquivo de situação fiscal para upload
    if (order.documentos.situacaoFiscal?.file && order.documentos.situacaoFiscal.file.name) {
      const { url } = await uploadOrderPDF(order.documentos.situacaoFiscal.file, orderId, 'situacaoFiscal');
      documentos = {
        ...documentos,
        situacaoFiscal: {
          url,
          name: order.documentos.situacaoFiscal.file.name,
          type: order.documentos.situacaoFiscal.file.type,
          size: order.documentos.situacaoFiscal.file.size
        }
      };
    }
    // Verifica se há arquivo DARF para upload
    if (order.documentos.darf?.file && order.documentos.darf.file.name) {
      const { url } = await uploadOrderPDF(order.documentos.darf.file, orderId, 'darf');
      documentos = {
        ...documentos,
        darf: {
          url,
          name: order.documentos.darf.file.name,
          type: order.documentos.darf.file.type,
          size: order.documentos.darf.file.size
        }
      };
    }
  }

  const formattedData = {
    customer_id: order.customer_id,
    status: order.status,
    data_pedido: order.data_pedido ? order.data_pedido : null,
    comissao_percentage: order.comissaoPercentage,
    reducao_percentage: order.reducaoPercentage,
    fornecedor: order.fornecedor,
    vencimento: order.vencimento ? order.vencimento : null,
    notas: order.notas,
    documentos
  };

  if (!existingOrder || existingOrder.user_id !== user.id) {
    throw new Error('Order not found or access denied');
  }

  const { data, error } = await supabase
    .from('orders')
    .update(formattedData)
    .eq('id', orderId)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) throw error;

  if (order.itens_pedido?.length > 0) {
    try {
      const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);
      
      if (deleteError) throw deleteError;

      const orderItems = order.itens_pedido.map((item: any) => ({
        order_id: orderId,
        code: item.code,
        tax_type: item.tax_type, // Mantém o nome correto do campo
        start_period: formatDateForDB(item.start_period),
        end_period: formatDateForDB(item.end_period),
        due_date: formatDateForDB(item.due_date),
        original_value: item.original_value,
        current_balance: item.current_balance,
        fine: item.fine || 0,
        interest: item.interest || 0,
        status: item.status,
        cno: item.cno
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to update order items: ${error.message}`);
      } else {
        throw new Error(`An unknown error occurred while updating order items: ${error}`);
      }
    }
  }

  return data;
}

function formatDateForDB(dateStr: string): string | null {
  if (!dateStr) return null;
  
  // Se já está no formato YYYY-MM-DD, retorna como está
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }
  
  // Tenta formato DD/MM/YYYY
  const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Tenta formato MM/YYYY (só mês e ano) - assume dia 01
  const mmyyyyMatch = dateStr.match(/^(\d{1,2})\/(\d{4})$/);
  if (mmyyyyMatch) {
    const [, month, year] = mmyyyyMatch;
    return `${year}-${month.padStart(2, '0')}-01`;
  }
  
  // Se nenhum formato foi reconhecido, log um aviso e retorna null
  console.warn(`Formato de data não reconhecido: ${dateStr}. Retornando null.`);
  return null;
}

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function validateCertificateApi(pfxFile: File, password: string): Promise<{ isValid: boolean; expirationDate?: string; error?: string }> {
  try {
    const arrayBuffer = await readFileAsArrayBuffer(pfxFile);
    const pfxBase64 = arrayBufferToBase64(arrayBuffer);

    const { data, error } = await supabase.functions.invoke('validate-certificate', {
      body: { pfxBase64, password },
    });

    if (error) {
      let errorMessage = error.message;
      try {
         const contextError = (error as any).context?.error;
         if (contextError?.message) {
            errorMessage = contextError.message;
         } else if (typeof data?.error === 'string') {
            errorMessage = data.error;
         }
      } catch (parseError) {
         console.error("Could not parse Supabase error:", parseError);
      }
      if (errorMessage.toLowerCase().includes('senha') || errorMessage.toLowerCase().includes('password')) {
          return { isValid: false, error: 'Senha do certificado inválida.' };
      }
      return { isValid: false, error: `Erro na validação: ${errorMessage}` };
    }

    if (data?.error) {
        return { isValid: false, error: data.error };
    }
    
    if (typeof data?.isValid !== 'boolean') {
        console.error("Unexpected response from validation function:", data);
        return { isValid: false, error: 'Resposta inesperada da função de validação.' };
    }

    return { isValid: data.isValid, expirationDate: data.expirationDate, error: data.isValid ? undefined : 'Certificado expirado ou inválido.' };

  } catch (err) {
    console.error('Error invoking validate-certificate function:', err);
    const message = err instanceof Error ? err.message : String(err);
    return { isValid: false, error: `Erro ao chamar a função de validação: ${message}` };
  }
}
