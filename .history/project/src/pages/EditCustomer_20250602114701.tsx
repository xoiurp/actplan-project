import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCustomer, updateCustomer, uploadCertificate, validateCertificateApi } from '../lib/api';
import { CustomerForm } from '@/components/CustomerForm';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Customer } from '@/types';

export default function EditCustomer() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [certificateExpiryDate, setCertificateExpiryDate] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Customer>>({
    razao_social: '',
    cnpj: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    numero: '',
    complemento: '',
    nome_responsavel: '',
    sobrenome_responsavel: '',
    whatsapp_responsavel: '',
    senha_certificado: '',
  });

  const isUploadingCertificate = useRef(false);

  const { data: customer, isLoading: isLoadingCustomer, isError } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomer(id!),
    enabled: !!id,
    onSuccess: (data) => {
      if (data) {
        setFormData({
          ...data,
          senha_certificado: '', // Clear password on load
        });
        if (data.certificado_validade) {
          setCertificateExpiryDate(new Date(data.certificado_validade).toISOString().split('T')[0]);
        }
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Omit<Customer, 'id' | 'created_at' | 'certificado' | 'user_id'>) => updateCustomer(id!, data),
    onSuccess: async (updatedCustomer) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      toast.success('Cliente atualizado com sucesso');

      if (certificateFile && updatedCustomer?.id) {
        isUploadingCertificate.current = true;
        try {
          await uploadCertificate(certificateFile, updatedCustomer.id);
          toast.success('Certificado enviado com sucesso');
        } catch (uploadError) {
          toast.error(`Erro ao enviar certificado: ${uploadError instanceof Error ? uploadError.message : String(uploadError)}`);
        } finally {
          isUploadingCertificate.current = false;
        }
      }
      navigate('/customers');
    },
    onError: (error) => {
      toast.error(`Erro ao atualizar cliente: ${error.message}`);
    },
  });

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }, []);

  const handleFileChange = useCallback((file: File | null) => {
    setCertificateFile(file);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    let formattedExpiryDate: string | null = certificateExpiryDate; 

    if (certificateFile && formData.senha_certificado) {
      isUploadingCertificate.current = true;
      try {
        const validationResult = await validateCertificateApi(certificateFile, formData.senha_certificado);
        if (!validationResult.isValid) {
          toast.error(validationResult.error || 'Certificado inválido ou expirado.');
          isUploadingCertificate.current = false;
          return;
        }
        if (validationResult.expirationDate) {
          const expiry = new Date(validationResult.expirationDate);
          formattedExpiryDate = expiry.toISOString().split('T')[0];
          setCertificateExpiryDate(formattedExpiryDate);
        } else {
          setCertificateExpiryDate(null);
          formattedExpiryDate = null; 
        }
      } catch (validationError) {
        toast.error(`Erro ao validar certificado: ${validationError instanceof Error ? validationError.message : String(validationError)}`);
        isUploadingCertificate.current = false;
        return;
      }
    } else if (certificateFile && !formData.senha_certificado) {
      toast.error('Por favor, insira a senha do certificado para validação.');
      return;
    }
    
    isUploadingCertificate.current = false;
    const submissionData = { ...formData };
    // Remove fields that should not be sent on update API
    delete submissionData.id;
    delete submissionData.created_at;
    delete submissionData.certificado;
    delete submissionData.user_id;


    updateMutation.mutate({
      ...submissionData,
      // Ensure all required fields for Omit<Customer, 'id' | 'created_at' | 'certificado' | 'user_id'> are present
      razao_social: formData.razao_social || '',
      cnpj: formData.cnpj || '',
      endereco: formData.endereco || '',
      cidade: formData.cidade || '',
      estado: formData.estado || '',
      cep: formData.cep || '',
      numero: formData.numero || '',
      complemento: formData.complemento || '',
      nome_responsavel: formData.nome_responsavel || '',
      sobrenome_responsavel: formData.sobrenome_responsavel || '',
      whatsapp_responsavel: formData.whatsapp_responsavel || '',
      senha_certificado: formData.senha_certificado || '',
      certificado_url: customer?.certificado?.url, // Keep existing URL if no new file
      certificado_nome: customer?.certificado?.nome, // Keep existing name if no new file
      certificado_validade: formattedExpiryDate, // Use the validated or existing expiry date
      updated_at: new Date().toISOString(), // Set current timestamp for updated_at
    });
  }, [id, formData, certificateFile, updateMutation, navigate, queryClient, customer, certificateExpiryDate]);

  const headerActions = (
    <Button variant="outline" size="sm" onClick={() => navigate('/customers')}>
      <ArrowLeft className="h-4 w-4 mr-2" />
      Cancelar
    </Button>
  );

  if (isLoadingCustomer) {
    return <div className="animate-pulse">Carregando cliente...</div>;
  }

  if (isError || !customer) {
    return <div className="text-red-500">Erro ao carregar dados do cliente.</div>;
  }

  return (
    <>
      <Header title={`Editar Cliente: ${customer.razao_social}`} actions={headerActions} />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6 bg-white rounded-lg">
        <CustomerForm
          onSubmit={handleSubmit}
          formData={formData}
          onInputChange={handleInputChange}
          onFileChange={handleFileChange}
          isSubmitting={updateMutation.isPending || isUploadingCertificate.current}
          existingCertificateUrl={customer.certificado?.url}
          existingCertificateName={customer.certificado?.nome}
          certificateExpiryDate={certificateExpiryDate}
        />
      </div>
    </>
  );
} 