import React, { useRef, useCallback, useState } from 'react'; // Import useState
import { Upload, Eye, EyeOff, FileText, XCircle } from 'lucide-react'; // Import Eye, EyeOff, FileText, XCircle
import { uploadCertificate } from '../lib/api';
import toast from 'react-hot-toast';

interface CustomerFormProps {
  onSubmit: (e: React.FormEvent) => void;
  formData: {
    razao_social: string;
    cnpj: string;
    endereco: string;
    cidade: string;
    estado: string;
    cep: string;
    numero: string;
    complemento: string;
    nome_responsavel: string;
    sobrenome_responsavel: string;
    whatsapp_responsavel: string;
    senha_certificado: string; // Add certificate password field
  };
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isEdit?: boolean;
  customerId?: string; // Needed for upload on edit
  onCertificateUpload?: () => void; // Callback after successful upload (mainly for edit)
  onFileChange?: (file: File | null) => void; // Callback for file selection/drop
  isSubmitting?: boolean; // Add isSubmitting prop
  existingCertificateUrl?: string | null; // Add prop for existing certificate URL
  existingCertificateName?: string | null; // Add prop for existing certificate name
  certificateExpiryDate?: string | null; // Add prop for certificate expiry date
  onRemoveCertificate?: () => void; // Optional: Handler to remove/clear certificate selection
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
  isSubmitting = false // Destructure with default value
}: CustomerFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [showPassword, setShowPassword] = useState(false); // State for password visibility

  const handleFileUpload = async (file: File) => {
    if (!customerId) return;

    try {
      await uploadCertificate(file, customerId);
      toast.success('Certificado enviado com sucesso');
      onCertificateUpload?.();
    } catch (error) {
      toast.error('Erro ao enviar certificado');
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

  // Renamed internal handler to avoid conflict with prop
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file && !validateFile(file)) {
      onFileChange?.(null); // Clear selection if invalid
      if (fileInputRef.current) fileInputRef.current.value = ''; // Reset input
      return;
    }
    onFileChange?.(file); // Pass valid file (or null) to parent
    // Upload only happens on edit form via handleFileUpload or on create form after customer creation
    if (isEdit && file) {
       handleFileUpload(file);
    } else if (!file) {
       // Clear potential previous selection if user cancels
       onFileChange?.(null);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0] ?? null;
     if (file && !validateFile(file)) {
       onFileChange?.(null); // Clear selection if invalid
       return;
     }
    onFileChange?.(file); // Pass valid file (or null) to parent
    // Upload only happens on edit form via handleFileUpload or on create form after customer creation
    if (isEdit && file) {
       handleFileUpload(file);
    } else if (!file) {
       // Clear potential previous selection if user cancels
       onFileChange?.(null);
    }
  }, [isEdit, onFileChange]); // Add dependencies

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

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
          value={formData.razao_social}
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
          value={formData.cnpj}
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
            value={formData.nome_responsavel}
            onChange={onInputChange}
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
            required
            className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
            value={formData.sobrenome_responsavel}
            onChange={onInputChange}
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
          required
          className="mt-1 block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm"
          value={formData.whatsapp_responsavel}
          onChange={onInputChange}
        />
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
          value={formData.endereco}
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
            value={formData.numero}
            onChange={onInputChange}
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
            value={formData.complemento}
            onChange={onInputChange}
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
            value={formData.cidade}
            onChange={onInputChange}
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
            value={formData.estado}
            onChange={onInputChange}
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
            value={formData.cep}
            onChange={onInputChange}
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
            type={showPassword ? 'text' : 'password'} // Toggle input type
            id="senha_certificado"
            name="senha_certificado"
            className="block w-full rounded-md border border-shadow-dark px-3 py-2 shadow-sm focus:border-primary focus:outline-none focus:ring-primary sm:text-sm pr-10" // Add padding for icon
            value={formData.senha_certificado}
            onChange={onInputChange}
          />
          <button
            type="button" // Prevent form submission
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" />
            ) : (
              <Eye className="h-5 w-5" />
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
            className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-shadow-dark border-dashed rounded-md hover:border-primary transition-colors duration-200"
          >
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
                    onChange={handleFileInputChange} // Use updated handler
                  />
                </label>
                <p className="pl-1">ou arraste e solte</p>
              </div>
              <p className="text-xs text-gray-500">Arquivos PFX até 10MB</p>
            </div>
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
