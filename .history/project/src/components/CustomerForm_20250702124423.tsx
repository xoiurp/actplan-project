import React, { useRef, useCallback, useState, useEffect } from 'react'; // Import useState and useEffect
import { Upload, Eye, EyeOff, FileText, XCircle, CheckCircle2 } from 'lucide-react'; // Import Eye, EyeOff, FileText, XCircle, CheckCircle2
import { uploadCertificate, validateCertificateApi } from '../lib/api';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';

import { Customer } from '@/types';

interface CustomerFormProps {
  onSubmit: (e: React.FormEvent) => void;
  formData: Partial<Customer>;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  isEdit?: boolean;
  customerId?: string; // Needed for upload on edit
  onCertificateUpload?: () => void; // Callback after successful upload (mainly for edit)
  onFileChange?: (file: File | null) => void; // Callback for file selection/drop
  isSubmitting?: boolean; // Add isSubmitting prop
  existingCertificateUrl?: string | null; // Add prop for existing certificate URL
  existingCertificateName?: string | null; // Add prop for existing certificate name
  certificateExpiryDate?: string | null; // Add prop for certificate expiry date
  onRemoveCertificate?: () => void; // Optional: Handler to remove/clear certificate selection
  onCertificateValidated?: (info: any) => void; // Nova prop para callback de validação
  setFormData: React.Dispatch<React.SetStateAction<Partial<Customer>>>;
}

export function CustomerForm({ 
  onSubmit, 
  formData, 
  onInputChange, 
  isEdit = false,
  customerId, // Needed for upload on edit
  onCertificateUpload, // Callback after successful upload (mainly for edit)
  onFileChange, // Callback for file selection/drop
  isSubmitting = false, // Destructure with default value
  existingCertificateUrl = null, // Destructure with default
  existingCertificateName = null, // Destructure with default
  certificateExpiryDate = null, // Destructure with default
  onRemoveCertificate, // Destructure
  onCertificateValidated,
  setFormData
}: CustomerFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [showPassword, setShowPassword] = useState(false); // State for password visibility
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isCertificateValid, setIsCertificateValid] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null); // Novo estado para armazenar o arquivo
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      senha_certificado: e.target.value
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    // Aplicar máscaras específicas para cada campo
    switch (name) {
      case 'cnpj':
        // Remover caracteres não numéricos
        const numbers = value.replace(/\D/g, '');
        // Aplicar máscara de CNPJ
        formattedValue = numbers.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
        break;
      case 'whatsapp_responsavel':
        // Remover caracteres não numéricos
        const whatsappNumbers = value.replace(/\D/g, '');
        // Aplicar máscara de telefone
        formattedValue = whatsappNumbers.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
        break;
      case 'cep':
        // Remover caracteres não numéricos
        const cepNumbers = value.replace(/\D/g, '');
        // Aplicar máscara de CEP
        formattedValue = cepNumbers.replace(/^(\d{5})(\d{3})$/, '$1-$2');
        break;
      default:
        formattedValue = value;
    }

    setFormData(prev => ({
      ...prev,
      [name]: formattedValue
    }));
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileUpload = async (file: File) => {
    if (!customerId && !isEdit) {
      if (onFileChange) onFileChange(file);
      setSelectedFileName(file.name);
      setSelectedFile(file); // Armazenar o arquivo
      return;
    }
    if (!customerId && isEdit) {
      toast.error('ID do cliente não encontrado para upload.');
      return;
    }

    if (customerId) {
      try {
        await uploadCertificate(file, customerId);
        toast.success('Certificado enviado com sucesso');
        setSelectedFileName(file.name);
        setSelectedFile(file); // Armazenar o arquivo
        onCertificateUpload?.();
      } catch (error) {
        toast.error('Erro ao enviar certificado');
        setSelectedFileName(null);
        setSelectedFile(null); // Limpar o arquivo em caso de erro
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const validateFile = (file: File): boolean => {
    if (!file.name.toLowerCase().endsWith('.pfx')) {
      toast.error('Apenas arquivos .pfx são permitidos');
      return false;
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB
      toast.error('O arquivo deve ter menos de 10MB');
      return false;
    }
    return true;
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file && !validateFile(file)) {
      onFileChange?.(null);
      setSelectedFileName(null);
      setSelectedFile(null); // Limpar o arquivo
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    onFileChange?.(file);
    setSelectedFileName(file ? file.name : null);
    setSelectedFile(file); // Armazenar o arquivo
  };

  const handleRemoveFile = () => {
    setSelectedFileName(null);
    setSelectedFile(null); // Limpar o arquivo
    if (fileInputRef.current) fileInputRef.current.value = '';
    onFileChange?.(null);
    if (isEdit && onRemoveCertificate) {
      onRemoveCertificate();
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0] ?? null;
    if (file && !validateFile(file)) {
      onFileChange?.(null);
      setSelectedFileName(null);
      setSelectedFile(null); // Limpar o arquivo
      return;
    }
    onFileChange?.(file);
    setSelectedFileName(file ? file.name : null);
    setSelectedFile(file); // Armazenar o arquivo
  }, [onFileChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleValidateCertificate = async () => {
    if (!selectedFile) {
      toast.error('Por favor, selecione um certificado primeiro.');
      return;
    }

    if (!formData.senha_certificado) {
      toast.error('Por favor, insira a senha do certificado.');
      return;
    }

    setIsValidating(true);
    try {
      const validationResult = await validateCertificateApi(selectedFile, formData.senha_certificado);
      
      if (validationResult.isValid) {
        setIsCertificateValid(true);
        toast.success('Certificado válido!');
        
        // Log para debug
        console.log('Certificate validation result:', validationResult);
        
        if (validationResult.certificateInfo) {
          console.log('Calling onCertificateValidated with:', validationResult.certificateInfo);
          onCertificateValidated?.(validationResult.certificateInfo);
        } else {
          console.log('No certificate info available in validation result');
        }
      } else {
        setIsCertificateValid(false);
        toast.error(validationResult.error || 'Certificado inválido ou expirado.');
      }
    } catch (error) {
      setIsCertificateValid(false);
      toast.error(`Erro ao validar certificado: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsValidating(false);
    }
  };

  // Função para buscar dados do ViaCEP
  const fetchViaCep = async (cep: string) => {
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!response.ok) return;
      const data = await response.json();
      if (data.erro) return;
      setFormData(prev => ({
        ...prev,
        endereco: data.logradouro || prev.endereco,
        complemento: data.complemento || prev.complemento,
        cidade: data.localidade || prev.cidade,
        estado: data.uf || prev.estado,
        cep: data.cep || prev.cep,
      }));
    } catch (err) {
      // Silencioso, não faz nada se erro
    }
  };

  // Efeito para monitorar mudanças no campo CEP
  useEffect(() => {
    const onlyNumbers = (formData.cep || '').replace(/\D/g, '');
    if (onlyNumbers.length === 8) {
      fetchViaCep(onlyNumbers);
    }
  }, [formData.cep]);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="razao_social" className="block text-sm font-medium text-gray-700">
          Razão Social
        </label>
        <input
          type="text"
          id="razao_social"
          name="razao_social"
          required
          className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
          value={formData.razao_social || ''}
          onChange={onInputChange}
        />
      </div>

      <div>
        <label htmlFor="cnpj" className="block text-sm font-medium text-gray-700">
          CNPJ
        </label>
        <input
          type="text"
          id="cnpj"
          name="cnpj"
          required
          className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
          value={formData.cnpj || ''}
          onChange={onInputChange}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="nome_responsavel" className="block text-sm font-medium text-gray-700">
            Nome
          </label>
          <input
            type="text"
            id="nome_responsavel"
            name="nome_responsavel"
            required
            className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            value={formData.nome_responsavel || ''}
            onChange={handleInputChange}
          />
        </div>

        <div>
          <label htmlFor="sobrenome_responsavel" className="block text-sm font-medium text-gray-700">
            Sobrenome
          </label>
          <input
            type="text"
            id="sobrenome_responsavel"
            name="sobrenome_responsavel"
            className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            value={formData.sobrenome_responsavel || ''}
            onChange={handleInputChange}
          />
        </div>
      </div>

      <div>
        <label htmlFor="whatsapp_responsavel" className="block text-sm font-medium text-gray-700">
          WhatsApp
        </label>
        <input
          type="tel"
          id="whatsapp_responsavel"
          name="whatsapp_responsavel"
          className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
          value={formData.whatsapp_responsavel || ''}
          onChange={onInputChange}
        />
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-gray-700">
          Status do Cliente
        </label>
        <select
          id="status"
          name="status"
          className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
          value={formData.status || 'Prospect'}
          onChange={onInputChange}
        >
          <option value="Prospect">Prospect</option>
          <option value="Proposta Enviada">Proposta Enviada</option>
          <option value="Aguardando Assinatura">Aguardando Assinatura</option>
          <option value="Ativo">Ativo</option>
          <option value="Inativo/Pausado">Inativo/Pausado</option>
        </select>
      </div>

      <div>
        <label htmlFor="endereco" className="block text-sm font-medium text-gray-700">
          Endereço
        </label>
        <input
          type="text"
          id="endereco"
          name="endereco"
          required
          className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
          value={formData.endereco || ''}
          onChange={onInputChange}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="numero" className="block text-sm font-medium text-gray-700">
            Número
          </label>
          <input
            type="text"
            id="numero"
            name="numero"
            required
            className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            value={formData.numero || ''}
            onChange={handleInputChange}
          />
        </div>

        <div>
          <label htmlFor="complemento" className="block text-sm font-medium text-gray-700">
            Complemento
          </label>
          <input
            type="text"
            id="complemento"
            name="complemento"
            className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            value={formData.complemento || ''}
            onChange={handleInputChange}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="cidade" className="block text-sm font-medium text-gray-700">
            Cidade
          </label>
          <input
            type="text"
            id="cidade"
            name="cidade"
            required
            className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            value={formData.cidade || ''}
            onChange={handleInputChange}
          />
        </div>

        <div>
          <label htmlFor="estado" className="block text-sm font-medium text-gray-700">
            Estado
          </label>
          <input
            type="text"
            id="estado"
            name="estado"
            required
            className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            value={formData.estado || ''}
            onChange={handleInputChange}
          />
        </div>

        <div>
          <label htmlFor="cep" className="block text-sm font-medium text-gray-700">
            CEP
          </label>
          <input
            type="text"
            id="cep"
            name="cep"
            required
            className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            value={formData.cep || ''}
            onChange={handleInputChange}
          />
        </div>
      </div>

      {/* Add Senha do Certificado field */}
      <div>
        <label htmlFor="senha_certificado" className="block text-sm font-medium text-gray-700">
          Senha do Certificado
        </label>
        <div className="relative mt-1">
          <input
            type={showPassword ? "text" : "password"}
            id="senha_certificado"
            name="senha_certificado"
            required
            className="block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm pr-10"
            value={formData.senha_certificado || ''}
            onChange={handlePasswordChange}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3"
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5 text-gray-400" />
            ) : (
              <Eye className="h-5 w-5 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Certificate Upload Section - Always visible now */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Certificado Digital (.pfx)
          </label>
          <div
            ref={dropZoneRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-shadow-dark border-dashed rounded-md hover:border-primary transition-colors duration-200 relative"
          >
            {selectedFileName || existingCertificateName ? (
              <div className="text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <p className="text-sm text-gray-700 mt-2 truncate max-w-xs">
                  {selectedFileName || existingCertificateName}
                </p>
                {certificateExpiryDate && (
                  <p className="text-xs text-gray-500 mt-1">
                    Validade: {new Date(certificateExpiryDate).toLocaleDateString('pt-BR')}
                  </p>
                )}
                {isCertificateValid && (
                  <div className="flex items-center justify-center mt-2 text-green-600">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    <span className="text-sm">Certificado Válido</span>
                  </div>
                )}
                <div className="mt-2 space-x-2">
                  <button 
                    type="button"
                    onClick={handleRemoveFile}
                    className="text-sm text-red-600 hover:text-red-800 inline-flex items-center"
                    aria-label="Remover arquivo"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Remover
                  </button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleValidateCertificate}
                    disabled={isValidating || !selectedFileName || !formData.senha_certificado}
                  >
                    {isValidating ? (
                      <>
                        <span className="animate-spin mr-2">⟳</span>
                        Validando...
                      </>
                    ) : (
                      'Validar Certificado'
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex text-sm text-gray-600">
                  <label
                    htmlFor="certificate"
                    className="relative cursor-pointer rounded-md font-medium text-primary hover:text-primary-hover focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary"
                  >
                    <span>Enviar arquivo</span>
                    <input
                      id="certificate"
                      name="certificate"
                      type="file"
                      className="sr-only"
                      accept=".pfx"
                      ref={fileInputRef}
                      onChange={handleFileInputChange}
                    />
                  </label>
                  <p className="pl-1">ou arraste e solte</p>
                </div>
                <p className="text-xs text-gray-500">Arquivos PFX até 10MB</p>
              </div>
            )}
          </div>
        </div>
      {/* Removed isEdit condition */}

      {/* Add a hidden submit button if needed for form association, or ensure the button in CreateCustomer has type="submit" and form="customer-form-id" */}
      {/* The actual submit button might be rendered in the parent page (CreateCustomer.tsx) */}
      {/* If the button IS part of this form component, disable it based on isSubmitting */}
       <div className="mt-6 flex justify-end space-x-3">
         <button
           type="submit"
           disabled={isSubmitting} // Disable button when submitting
           className="inline-flex justify-center items-center rounded-md border border-transparent bg-primary px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
         >
           {isSubmitting ? (
             <>
               <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
               {isEdit ? 'Atualizando...' : 'Criando...'}
             </>
           ) : (
             isEdit ? 'Atualizar Cliente' : 'Criar Cliente'
           )}
         </button>
      </div>
    </form>
  );
}
