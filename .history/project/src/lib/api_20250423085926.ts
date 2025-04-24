import { User, Customer, Order, DashboardStats, PaymentPlan, Installment } from '../types'; // Consolidate imports
import { getSupabaseClient } from './supabase';
// Remove duplicate import: import { Customer, PaymentPlan, Installment } from '../types';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function getPaymentPlans(): Promise<PaymentPlan[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('payment_plans')
    .select('*, order:orders!payment_plans_order_id_fkey(*, customer:customers(*)), installments(*)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function createPaymentPlan(orderId: string, totalAmount: number, installmentsCount: number): Promise<PaymentPlan> {
  const supabase = getSupabaseClient();
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

  const supabase = getSupabaseClient();
  const { error: installmentsError } = await supabase
    .from('installments')
    .insert(installments);

  if (installmentsError) throw installmentsError;

  // Update order with payment plan reference and status
  const supabase = getSupabaseClient();
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
  const supabase = getSupabaseClient();
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
  const supabase = getSupabaseClient();
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
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return { token: data.session?.access_token, user: data.user };
}

export async function signup(email: string, password: string, name: string) {
  const supabase = getSupabaseClient();
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
  const supabase = getSupabaseClient();
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
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Function to get a single customer by ID
export async function getCustomerById(id: string): Promise<Customer | null> {
  const supabase = getSupabaseClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id) // Ensure user can only fetch their own customers
    .single(); // Fetch a single record

  if (error) {
    // Handle cases where the customer is not found gracefully
    if (error.code === 'PGRST116') { 
      console.warn(`Customer with ID ${id} not found or access denied.`);
      return null;
    }
    // Add type check for error before accessing properties
    if (error instanceof Error) {
      console.error(`Error fetching customer ${id}:`, error.message);
    } else {
      console.error(`An unknown error occurred while fetching customer ${id}:`, error);
    }
    throw error; // Re-throw other errors
  }

  return data;
}

// Update the type to include certificado_validade, but still omit id, created_at, certificado
export async function createCustomer(customer: Omit<Customer, 'id' | 'created_at' | 'certificado'>): Promise<Customer> {
  const supabase = getSupabaseClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  // First verify if the user exists in our users table
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
  const supabase = getSupabaseClient();
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
  const supabase = getSupabaseClient();
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
  const supabase = getSupabaseClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  // Create a safe filename by removing special characters
  const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

  // Upload to storage bucket
  const { data, error } = await supabase.storage
    .from('certificates')
    .upload(`${user.id}/${customerId}/${safeFileName}`, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) throw error;

  // Get public URL
  const { data: { publicUrl } } = await supabase.storage
    .from('certificates')
    .getPublicUrl(data.path);

  // Ensure the URL is using HTTPS
  const secureUrl = publicUrl.replace('http://', 'https://');

  // Update customer record with certificate info
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
  const supabase = getSupabaseClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  // Create a safe filename
  const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

  // Upload to storage bucket
  const { data, error } = await supabase.storage
    .from('order-pdfs')
    .upload(`${user.id}/${orderId}/${type}/${safeFileName}`, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) throw error;

  // Get public URL
  const { data: { publicUrl } } = await supabase.storage
    .from('order-pdfs')
    .getPublicUrl(data.path);

  // Ensure HTTPS URL
  const secureUrl = publicUrl.replace('http://', 'https://');

  // Update order record with PDF info
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

// TODO: Update these functions to use Supabase
export async function getOrders() {
  const supabase = getSupabaseClient();
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
  const supabase = getSupabaseClient();
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

  // Upload PDFs if they exist
  let documentos = {};
  if (order.documentos) {
    if (order.documentos.situacaoFiscal) {
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
    }
    if (order.documentos.darf) {
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
    }

    // Update order with document info
    const supabase = getSupabaseClient(); // Get client instance again if needed
    const { error: updateError } = await supabase
      .from('orders')
      .update({ documentos })
      .eq('id', data.id)
      .eq('user_id', user.id);

    if (updateError) throw updateError;
  }

  if (order.itens_pedido?.length > 0) {
    const orderItems = order.itens_pedido.map((item: any) => ({
      order_id: data.id,
      code: item.code,
      tax_type: item.taxType,
      start_period: formatDateForDB(item.startPeriod),
      end_period: formatDateForDB(item.endPeriod),
      due_date: formatDateForDB(item.dueDate),
      original_value: item.originalValue,
      current_balance: item.currentBalance,
      fine: item.fine || 0,
      interest: item.interest || 0,
      status: item.status,
      cno: item.cno
    }));

    const supabase = getSupabaseClient(); // Get client instance again if needed
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;
  }

  return data;
}

export async function updateOrder(orderId: string, order: any) {
  const supabase = getSupabaseClient();
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

  // Upload PDFs if they exist
  let documentos = existingOrder.documentos || {};
  if (order.documentos) {
    if (order.documentos.situacaoFiscal?.file) {
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
    if (order.documentos.darf?.file) {
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

  const supabase = getSupabaseClient(); // Get client instance again if needed
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
      const supabase = getSupabaseClient(); // Get client instance again if needed
      const { error: deleteError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);
      
      if (deleteError) throw deleteError;

      const orderItems = order.itens_pedido.map((item: any) => ({
        order_id: orderId,
        code: item.code,
        tax_type: item.taxType,
        start_period: formatDateForDB(item.startPeriod),
        end_period: formatDateForDB(item.endPeriod),
        due_date: formatDateForDB(item.dueDate),
        original_value: item.originalValue,
        current_balance: item.currentBalance,
        fine: item.fine || 0,
        interest: item.interest || 0,
        status: item.status,
        cno: item.cno
      }));

      const supabase = getSupabaseClient(); // Get client instance again if needed
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;
    } catch (error) {
      // Add type check for error
      if (error instanceof Error) {
        throw new Error(`Failed to update order items: ${error.message}`);
      } else {
        throw new Error(`An unknown error occurred while updating order items: ${error}`);
      }
    }
  }

  return data;
}

function formatDateForDB(dateStr: string): string | null { // Update return type
  if (!dateStr) return null;
  // Handle dates that are already in YYYY-MM-DD format
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr;
  }
  
  const [day, month, year] = dateStr.split('/');
  if (!day || !month || !year) {
    throw new Error(`Invalid date format: ${dateStr}. Expected DD/MM/YYYY`);
  }
  
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

// Helper function to read file as ArrayBuffer
async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Helper function to convert ArrayBuffer to Base64
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

    const supabase = getSupabaseClient();
    const { data, error } = await supabase.functions.invoke('validate-certificate', {
      body: { pfxBase64, password },
    });

    if (error) {
      // Try to parse Supabase Edge Function error response
      let errorMessage = error.message;
      try {
         // Supabase wraps errors, try to get the inner message
         const contextError = (error as any).context?.error;
         if (contextError?.message) {
            errorMessage = contextError.message;
         } else if (typeof data?.error === 'string') {
            // Sometimes the error is in the data payload
            errorMessage = data.error;
         }
      } catch (parseError) {
         console.error("Could not parse Supabase error:", parseError);
      }
      // Use specific message for password errors
      if (errorMessage.toLowerCase().includes('senha') || errorMessage.toLowerCase().includes('password')) {
          return { isValid: false, error: 'Senha do certificado inválida.' };
      }
      return { isValid: false, error: `Erro na validação: ${errorMessage}` };
    }

    // Check if the function returned a validation error in the body
    if (data?.error) {
        return { isValid: false, error: data.error };
    }
    
    // Check if the function returned the expected validation result
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
