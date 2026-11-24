'use client';

import { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, X, Loader2, Link as LinkIcon, Check } from 'lucide-react';
import { uploadImageFile } from '@/lib/upload-helper';

interface ImageUploadInputProps {
  value: string;
  onChange: (url: string) => void;
  label: string;
  sublabel?: string;
  placeholder?: string;
  optional?: boolean;
}

export function ImageUploadInput({
  value,
  onChange,
  label,
  sublabel,
  placeholder = 'https://drive.google.com/file/d/... ou link direto',
  optional = false,
}: ImageUploadInputProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione um arquivo de imagem (JPG, PNG, WebP).');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const uploadedUrl = await uploadImageFile(file);
      onChange(uploadedUrl);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao fazer upload da imagem.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Apenas imagens são permitidas.');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const uploadedUrl = await uploadImageFile(file);
      onChange(uploadedUrl);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao fazer upload.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-black uppercase tracking-wider text-[#111111]">
          {label} {!optional && '*'}
        </label>
        {sublabel && (
          <span className="text-[10px] text-[#66635D] font-normal normal-case">
            {sublabel}
          </span>
        )}
      </div>

      {error && (
        <p className="text-[11px] font-bold text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
          {error}
        </p>
      )}

      {/* Se já tiver uma imagem selecionada */}
      {value ? (
        <div className="flex items-center gap-3 p-3 bg-white border-2 border-[#DCD6CC] rounded-2xl">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#FAF9F7] border border-[#DCD6CC] shrink-0 relative flex items-center justify-center">
            {/* Imagem de preview */}
            <img
              src={value}
              alt="Prévia"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback se for link de drive que não renderiza direto
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center text-[#FD3100] -z-10">
              <ImageIcon className="w-6 h-6 opacity-40" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-[#111111] truncate">
              {value.startsWith('data:') ? 'Imagem enviada do computador' : value}
            </p>
            <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-0.5">
              <Check className="w-3 h-3 stroke-[3]" />
              Imagem anexada com sucesso
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-2.5 py-1.5 text-[11px] font-bold text-[#111111] hover:text-[#FD3100] bg-[#FAF9F7] hover:bg-[#EEEDEA] border border-[#DCD6CC] rounded-xl transition-all"
            >
              Trocar
            </button>
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-1.5 text-[#66635D] hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
              title="Remover imagem"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Se não tiver imagem ainda: área de upload ou colar link */
        <div className="space-y-2">
          {/* Caixa de Upload do Computador */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
              uploading
                ? 'border-[#FD3100] bg-[#FFF0EC]/40'
                : 'border-[#DCD6CC] hover:border-[#FD3100] bg-[#FAF9F7] hover:bg-[#FFF0EC]/20'
            }`}
          >
            {uploading ? (
              <div className="flex items-center gap-2 py-1">
                <Loader2 className="w-5 h-5 text-[#FD3100] animate-spin" />
                <span className="text-xs font-bold text-[#FD3100]">
                  Otimizando e enviando imagem...
                </span>
              </div>
            ) : (
              <>
                <div className="w-9 h-9 rounded-xl bg-white border border-[#DCD6CC] flex items-center justify-center text-[#FD3100] shadow-sm">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black text-[#111111]">
                    Clique para selecionar do computador
                  </p>
                  <p className="text-[10px] text-[#66635D] font-medium">
                    Ou arraste a imagem aqui (JPG, PNG ou WebP)
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Opção alternativa: Colar link do Drive */}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setShowUrlInput(!showUrlInput)}
              className="text-[11px] font-bold text-[#FD3100] hover:underline flex items-center gap-1"
            >
              <LinkIcon className="w-3 h-3" />
              <span>{showUrlInput ? 'Ocultar campo de link' : 'Ou colar link do Google Drive'}</span>
            </button>
          </div>

          {showUrlInput && (
            <input
              type="url"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="w-full px-3 py-2 bg-white border border-[#DCD6CC] focus:border-[#FD3100] rounded-xl text-xs font-mono font-medium text-[#111111] focus:outline-none"
            />
          )}
        </div>
      )}

      {/* Input de arquivo invisível */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
