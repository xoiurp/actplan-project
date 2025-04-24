import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
// We'll need a function to get a single customer by ID
// import { getCustomerById } from '../lib/api'; 
import { Loader2, ArrowLeft } from 'lucide-react';
import { Header } from '@/components/Header';
import { Customer } from '@/types'; // Assuming Customer type is defined here

// Placeholder function until we implement it in api.ts
const getCustomerById = async (id: string): Promise<Customer | null> => {
  console.log(`API call placeholder: Fetching customer with ID: ${id}`);
  // In a real scenario, this would fetch from Supabase
  // For now, return null or mock data if needed for layout
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
  return null; // Replace with actual fetch logic later
};


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
      return getCustomerById(id);
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

  return (
    <>
      <Header 
        title={`Cliente: ${customer.razao_social}`} 
        showBackButton={true} 
        backButtonTarget="/customers" 
      />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-4">Detalhes do Cliente</h2>
          {/* Display customer details here */}
          <pre>{JSON.stringify(customer, null, 2)}</pre> 
          {/* TODO: Replace pre with actual formatted details */}
        </div>
        {/* Add more sections as needed, e.g., related orders, payment plans */}
      </div>
    </>
  );
}
