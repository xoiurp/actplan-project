import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getCustomer } from '../lib/api'; // Import the actual API function
import { Loader2, ArrowLeft, Building2, User, Phone, MapPin, FileText } from 'lucide-react'; // Add icons
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Customer } from '@/types';

// Helper function to format date YYYY-MM-DD to DD/MM/YYYY
const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return '-';
  try {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  } catch (e) {
    console.error("Error formatting date:", e);
    return dateString; // Return original string if formatting fails
  }
};

// Remove placeholder function
// const getCustomerById = async (id: string): Promise<Customer | null> => { ... };

export default function CustomerDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: customer, isLoading, error } = useQuery<Customer | null, Error>({
    // Add id to the queryKey to ensure uniqueness
    queryKey: ['customer', id], 
    queryFn: () => {
      if (!id) {
        // Handle the case where id is undefined, perhaps throw an error or return null
        console.error("Customer ID is undefined.");
        return Promise.resolve(null); 
      }
      return getCustomer(id);
    },
    enabled: !!id, // Only run the query if the id exists
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-shadow">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-shadow gap-4">
        <h2 className="text-xl font-semibold text-red-600">Erro ao carregar cliente</h2>
        <p className="text-gray-600">{error.message}</p>
        <button
          onClick={() => navigate('/customers')}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Clientes
        </button>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-shadow gap-4">
        <h2 className="text-xl font-semibold text-gray-900">Cliente não encontrado</h2>
        <button
          onClick={() => navigate('/customers')}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Clientes
        </button>
      </div>
    );
  }

  const headerActions = (
    <Button variant="outline" size="sm" onClick={() => navigate('/customers')}>
      <ArrowLeft className="h-4 w-4 mr-2" />
      Voltar
    </Button>
  );

  return (
    <>
      {/* Pass the back button as an action to the Header */}
      <Header 
        title={`Cliente: ${customer.razao_social}`} 
        actions={headerActions}
      />
      {/* Add bg-white and rounded-lg for consistency */}
      {/* Add bg-white and rounded-lg for consistency */}
      <div className="flex flex-1 flex-col gap-6 p-4 md:gap-8 md:p-6 bg-white rounded-lg">
        {/* Customer Info Card */}
        {/* Re-add shadow and rounding to inner cards */}
        <div className="p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-6 border-b pb-3">Informações Gerais</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
            {/* Column 1 */}
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-gray-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-500">Razão Social</p>
                  <p className="font-medium">{customer.razao_social}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-gray-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-500">Responsável</p>
                  <p className="font-medium">{customer.nome_responsavel} {customer.sobrenome_responsavel}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-gray-400 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-sm text-gray-500">Certificado Digital</p>
                  {customer.certificado?.url ? (
                    <a
                      href={customer.certificado.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm text-primary hover:text-primary-hover font-medium"
                    >
                      {customer.certificado.name} (Ver/Download)
                    </a>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Não cadastrado</p>
                  )}
                  {/* Display certificate validity */}
                  {customer.certificado_validade && (
                    <p className="text-xs text-gray-500 mt-1">
                      Validade: {formatDate(customer.certificado_validade)}
                    </p>
                  )}
                </div>
              </div>
            </div>
            {/* Column 2 */}
            <div className="space-y-5">
               <div className="flex items-start gap-3">
                 <span className="font-mono text-sm text-gray-400 mt-1 w-5 text-center flex-shrink-0">#</span>
                 <div>
                   <p className="text-sm text-gray-500">CNPJ</p>
                   <p className="font-medium">{customer.cnpj}</p>
                 </div>
               </div>
               <div className="flex items-start gap-3">
                 <Phone className="h-5 w-5 text-gray-400 mt-1 flex-shrink-0" />
                 <div>
                   <p className="text-sm text-gray-500">WhatsApp</p>
                   <p className="font-medium">{customer.whatsapp_responsavel || '-'}</p>
                 </div>
               </div>
            </div>
          </div>
        </div>

        {/* Address Card */}
        {/* Re-add shadow and rounding to inner cards */}
        <div className="p-6 rounded-lg shadow-md">
           <h2 className="text-xl font-semibold mb-6 border-b pb-3">Endereço</h2>
           <div className="flex items-start gap-3">
             <MapPin className="h-5 w-5 text-gray-400 mt-1 flex-shrink-0" />
             <div>
               <p className="font-medium">
                 {customer.endereco}, {customer.numero}
                 {customer.complemento && ` - ${customer.complemento}`}
               </p>
               <p className="text-sm text-gray-600">
                 {customer.cidade} - {customer.estado}
               </p>
               <p className="text-sm text-gray-500">CEP: {customer.cep}</p>
             </div>
           </div>
        </div>

        {/* TODO: Add sections for related Orders and Payment Plans if needed */}
      </div>
    </>
  );
}
