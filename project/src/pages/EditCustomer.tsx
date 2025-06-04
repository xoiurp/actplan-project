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
  const [removeExistingCertificate, setRemoveExistingCertificate] = useState(false);
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

  const { data: customer, isLoading: isLoadingCustomer, isError, refetch: refetchCustomer } = useQuery<Customer | null, Error>({
    queryKey: ['customer', id],
    queryFn: () => getCustomer(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        ...customer,
        senha_certificado: '', // Clear password on load
      });
      if (customer.certificado_validade) {
        setCertificateExpiryDate(new Date(customer.certificado_validade).toISOString().split('T')[0]);
      } else {
        setCertificateExpiryDate(null);
      }
      setRemoveExistingCertificate(false); // Reset removal flag when customer data is loaded/reloaded
    }
  }, [customer]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Customer>) => updateCustomer(id!, data),
    onSuccess: async (updatedCustomer) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      toast.success('Cliente atualizado com sucesso');

      // Upload new certificate if one was selected AND there's no request to remove existing or there was no existing one
      if (certificateFile && updatedCustomer?.id && !removeExistingCertificate) {
        isUploadingCertificate.current = true;
        try {
          await uploadCertificate(certificateFile, updatedCustomer.id);
          toast.success('Certificado enviado com sucesso');
          refetchCustomer(); // Refetch after successful upload to update form state
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
    if (file) {
      setRemoveExistingCertificate(false); // If a new file is selected, don't remove the (soon to be old) existing one by API
    }
  }, []);

  const handleRemoveCertificate = useCallback(() => {
    setCertificateFile(null);
    setCertificateExpiryDate(null);
    setFormData(prev => ({ ...prev, senha_certificado: '' }));
    setRemoveExistingCertificate(true); // Flag that existing certificate in DB should be removed
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    let validatedExpiryDate: string | null | undefined = certificateExpiryDate;

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
          validatedExpiryDate = expiry.toISOString().split('T')[0];
          setCertificateExpiryDate(validatedExpiryDate);
        } else {
          setCertificateExpiryDate(null);
          validatedExpiryDate = null;
        }
      } catch (validationError) {
        toast.error(`Erro ao validar certificado: ${validationError instanceof Error ? validationError.message : String(validationError)}`);
        isUploadingCertificate.current = false;
        return;
      }
    } else if (certificateFile && !formData.senha_certificado) {
      toast.error('Por favor, insira a senha do certificado para validação.');
      return;
    } else if (!certificateFile && removeExistingCertificate) {
      validatedExpiryDate = undefined; // Explicitly undefined if removing and no new file
    }

    isUploadingCertificate.current = false;

    const customerDataToUpdate: Partial<Customer> = {
      ...formData,
      updated_at: new Date().toISOString(),
    };

    // Delete fields that should not be directly in the payload for updateCustomer if they are undefined in formData
    // (supabase might interpret undefined as "do not change" but explicit null as "set to null")
    // We let `uploadCertificate` handle the `certificado` object itself if a new file is provided.
    // If `removeExistingCertificate` is true, we explicitly set `certificado` to null.

    if (removeExistingCertificate) {
      customerDataToUpdate.certificado = undefined; // API should interpret undefined as remove or clear
      customerDataToUpdate.certificado_validade = undefined;
      customerDataToUpdate.senha_certificado = undefined;
    } else if (certificateFile) {
      customerDataToUpdate.certificado_validade = validatedExpiryDate === null ? undefined : validatedExpiryDate;
    } else if (customer?.certificado) {
      customerDataToUpdate.certificado = customer.certificado;
      customerDataToUpdate.certificado_validade = customer.certificado_validade;
    } else { // No existing certificate and no new file
      customerDataToUpdate.certificado = undefined;
      customerDataToUpdate.certificado_validade = undefined;
    }

    // Clean up formData fields not part of the main Customer type for the update payload
    delete customerDataToUpdate.id; // Should not be in payload
    delete customerDataToUpdate.created_at; // Should not be in payload
    delete customerDataToUpdate.user_id; // Should not be in payload

    updateMutation.mutate(customerDataToUpdate);
  }, [id, formData, certificateFile, updateMutation, navigate, queryClient, customer, certificateExpiryDate, removeExistingCertificate]);

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
    return <div className="text-red-500">Erro ao carregar dados do cliente. Tente recarregar a página.</div>;
  }

  return (
    <>
      <Header title={`Editar Cliente: ${customer.razao_social}`} actions={headerActions} />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-6 bg-white rounded-lg">
        <CustomerForm
          onSubmit={handleSubmit}
          formData={{
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
          }}
          onInputChange={handleInputChange}
          onFileChange={handleFileChange}
          isSubmitting={updateMutation.isPending || isUploadingCertificate.current}
          isEdit={true}
          customerId={id}
          existingCertificateUrl={removeExistingCertificate ? undefined : customer.certificado?.url}
          existingCertificateName={removeExistingCertificate ? undefined : customer.certificado?.name}
          certificateExpiryDate={removeExistingCertificate ? null : certificateExpiryDate}
          onRemoveCertificate={handleRemoveCertificate}
          onCertificateUpload={() => {
            refetchCustomer();
          }}
        />
      </div>
    </>
  );
} 