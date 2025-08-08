import React, { useCallback, useRef } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DropzoneProps {
  onDrop: (acceptedFiles: File[]) => void;
  accept?: string;
  maxSize?: number;
  className?: string;
  multiple?: boolean;
}

export function Dropzone({ 
  onDrop, 
  accept = 'application/pdf', 
  maxSize = 5 * 1024 * 1024,
  className,
  multiple = false
}: DropzoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files).filter(validateFile);
    if (files.length) {
      onDrop(files);
    }
  }, [onDrop]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const validateFile = (file: File): boolean => {
    const acceptArray = accept.split(',').map(s => s.trim());
    if (!acceptArray.includes(file.type)) {
      console.warn(`File type not accepted: ${file.type}`);
      return false;
    }
    if (file.size > maxSize) {
      console.warn(`File size too large: ${file.size}`);
      return false;
    }
    return true;
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(validateFile);
    if (files.length) {
      onDrop(files);
    }
  };

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={cn(
        "mt-2 flex justify-center rounded-lg border border-dashed border-shadow-dark px-6 py-10 cursor-pointer hover:border-primary transition-colors",
        className
      )}
    >
      <div className="text-center">
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <div className="mt-4 flex text-sm leading-6 text-gray-600">
          <label className="relative cursor-pointer rounded-md font-semibold text-primary hover:text-primary-hover focus-within:outline-none focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
            <span>Upload a file</span>
            <input
              ref={fileInputRef}
              type="file"
              className="sr-only"
              accept={accept}
              onChange={handleFileInput}
              multiple={multiple}
            />
          </label>
          <p className="pl-1">or drag and drop</p>
        </div>
        <p className="text-xs leading-5 text-gray-600">PDF up to {maxSize / 1024 / 1024}MB</p>
      </div>
    </div>
  );
}
