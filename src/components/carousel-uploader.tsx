'use client';

import { useState, useRef } from 'react';
import {
  UploadCloud,
  X,
  Plus,
  ArrowLeft,
  ArrowRight,
  Loader2,
  GripHorizontal,
  Link as LinkIcon,
  Image as ImageIcon,
} from 'lucide-react';
import { uploadImageFile } from '@/lib/upload-helper';
import { parseMediaUrl } from '@/lib/utils';

export interface CarouselSlide {
  id: string;
  url: string;
  order: number;
}

interface CarouselUploaderProps {
  slides: CarouselSlide[];
  onChange: (slides: CarouselSlide[]) => void;
}

export function CarouselUploader({ slides, onChange }: CarouselUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [error, setError] = useState('');
  const [draggedSlideIdx, setDraggedSlideIdx] = useState<number | null>(null);
  const [dragOverSlideIdx, setDragOverSlideIdx] = useState<number | null>(null);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkInputUrl, setLinkInputUrl] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload múltiplo de arquivos do computador
  const handleFilesSelect = async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (validFiles.length === 0) {
      setError('Por favor, selecione arquivos de imagem válidos (JPG, PNG, WebP).');
      return;
    }

    setUploading(true);
    setError('');
    const newSlides: CarouselSlide[] = [...slides];

    try {
      for (let i = 0; i < validFiles.length; i++) {
        setUploadProgress(`Enviando foto ${i + 1} de ${validFiles.length}...`);
        const url = await uploadImageFile(validFiles[i]);
        newSlides.push({
          id: `slide-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          url,
          order: newSlides.length,
        });
      }

      // Reindexar ordens 0, 1, 2...
      const indexed = newSlides.map((s, idx) => ({ ...s, order: idx }));
      onChange(indexed);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Erro ao fazer upload das imagens do carrossel.');
    } finally {
      setUploading(false);
      setUploadProgress('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Adicionar imagem via link do Drive ou direto
  const handleAddLinkSlide = () => {
    if (!linkInputUrl.trim()) return;
    const directUrl = parseMediaUrl(linkInputUrl.trim());
    const newSlides = [
      ...slides,
      {
        id: `slide-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        url: directUrl,
        order: slides.length,
      },
    ];
    onChange(newSlides.map((s, idx) => ({ ...s, order: idx })));
    setLinkInputUrl('');
    setShowLinkInput(false);
  };

  // Mover lâmina para a esquerda (ArrowLeft)
  const handleMoveLeft = (index: number) => {
    if (index <= 0) return;
    const newSlides = [...slides];
    const temp = newSlides[index];
    newSlides[index] = newSlides[index - 1];
    newSlides[index - 1] = temp;
    onChange(newSlides.map((s, idx) => ({ ...s, order: idx })));
  };

  // Mover lâmina para a direita (ArrowRight)
  const handleMoveRight = (index: number) => {
    if (index >= slides.length - 1) return;
    const newSlides = [...slides];
    const temp = newSlides[index];
    newSlides[index] = newSlides[index + 1];
    newSlides[index + 1] = temp;
    onChange(newSlides.map((s, idx) => ({ ...s, order: idx })));
  };

  // Remover lâmina
  const handleRemoveSlide = (index: number) => {
    const newSlides = slides.filter((_, idx) => idx !== index);
    onChange(newSlides.map((s, idx) => ({ ...s, order: idx })));
  };

  // Drag and Drop (estilo Meta Business Suite)
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedSlideIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverSlideIdx !== index) {
      setDragOverSlideIdx(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedSlideIdx === null || draggedSlideIdx === targetIndex) {
      setDraggedSlideIdx(null);
      setDragOverSlideIdx(null);
      return;
    }

    const newSlides = [...slides];
    const [movedSlide] = newSlides.splice(draggedSlideIdx, 1);
    newSlides.splice(targetIndex, 0, movedSlide);

    onChange(newSlides.map((s, idx) => ({ ...s, order: idx })));
    setDraggedSlideIdx(null);
    setDragOverSlideIdx(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-[#111111]">
            Lâminas do Carrossel ({slides.length}) *
          </label>
          <p className="text-[11px] text-[#66635D] font-medium">
            Arraste para reordenar a sequência das fotos (estilo Meta Business)
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowLinkInput(!showLinkInput)}
          className="text-[11px] font-bold text-[#FD3100] hover:underline flex items-center gap-1"
        >
          <LinkIcon className="w-3 h-3" />
          <span>{showLinkInput ? 'Ocultar link' : '+ Adicionar via link'}</span>
        </button>
      </div>

      {error && (
        <p className="text-xs font-bold text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
          {error}
        </p>
      )}

      {/* Formulário opcional para colar link */}
      {showLinkInput && (
        <div className="flex items-center gap-2 p-2 bg-[#FAF9F7] rounded-xl border border-[#DCD6CC]">
          <input
            type="url"
            value={linkInputUrl}
            onChange={(e) => setLinkInputUrl(e.target.value)}
            placeholder="Cole o link do Google Drive ou da imagem..."
            className="flex-1 px-3 py-1.5 bg-white border border-[#DCD6CC] rounded-lg text-xs font-mono font-medium focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddLinkSlide}
            style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
            className="btn-vb-primary px-3 py-1.5 rounded-lg text-xs font-black uppercase"
          >
            Adicionar
          </button>
        </div>
      )}

      {/* Grid de Lâminas com Reordenação Visual (Meta Business Suite) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {slides.map((slide, index) => {
          const isDraggingThis = draggedSlideIdx === index;
          const isDragOverThis = dragOverSlideIdx === index;

          return (
            <div
              key={slide.id || index}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={() => {
                setDraggedSlideIdx(null);
                setDragOverSlideIdx(null);
              }}
              className={`relative aspect-square rounded-2xl overflow-hidden border-2 bg-white shadow-xs group cursor-grab active:cursor-grabbing transition-all ${
                isDraggingThis
                  ? 'opacity-40 scale-95 border-dashed border-[#FD3100]'
                  : isDragOverThis
                  ? 'border-[#FD3100] scale-105 shadow-md ring-2 ring-[#FD3100]/30'
                  : 'border-[#DCD6CC] hover:border-[#FD3100]'
              }`}
            >
              {/* Imagem */}
              <img
                src={slide.url}
                alt={`Lâmina ${index + 1}`}
                className="w-full h-full object-cover select-none pointer-events-none"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-[#FD3100] -z-10">
                <ImageIcon className="w-8 h-8 opacity-40" />
              </div>

              {/* Badge de Ordem (Meta Business style: 1, 2, 3...) */}
              <div
                style={{ backgroundColor: '#FD3100', color: '#FFFFFF' }}
                className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] shadow-md border border-white"
              >
                {index + 1}
              </div>

              {/* Botão de Excluir */}
              <button
                type="button"
                onClick={() => handleRemoveSlide(index)}
                className="absolute top-2 right-2 w-6 h-6 bg-black/70 hover:bg-rose-600 text-white rounded-full flex items-center justify-center transition-colors shadow-md"
                title="Remover foto do carrossel"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Controles de Reordenação no Hover (Setas e Grip) */}
              <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between opacity-90 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={() => handleMoveLeft(index)}
                  disabled={index === 0}
                  className="p-1 bg-white/90 hover:bg-white text-[#111111] disabled:opacity-30 rounded-lg shadow-sm transition-all"
                  title="Mover para a esquerda"
                >
                  <ArrowLeft className="w-3 h-3" />
                </button>

                <div className="flex items-center gap-0.5 text-white text-[10px] font-bold">
                  <GripHorizontal className="w-3 h-3 text-white/80" />
                  <span>Arrastar</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleMoveRight(index)}
                  disabled={index === slides.length - 1}
                  className="p-1 bg-white/90 hover:bg-white text-[#111111] disabled:opacity-30 rounded-lg shadow-sm transition-all"
                  title="Mover para a direita"
                >
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}

        {/* Card para Adicionar Mais Lâminas */}
        <div
          onClick={() => !uploading && fileInputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files) {
              handleFilesSelect(e.dataTransfer.files);
            }
          }}
          className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all ${
            uploading
              ? 'border-[#FD3100] bg-[#FFF0EC]/40'
              : 'border-[#DCD6CC] hover:border-[#FD3100] bg-[#FAF9F7] hover:bg-[#FFF0EC]/20'
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-1.5 p-2">
              <Loader2 className="w-6 h-6 text-[#FD3100] animate-spin" />
              <span className="text-[11px] font-bold text-[#FD3100] leading-tight">
                {uploadProgress || 'Enviando...'}
              </span>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-2xl bg-white border border-[#DCD6CC] flex items-center justify-center text-[#FD3100] shadow-xs mb-1.5">
                {slides.length === 0 ? <UploadCloud className="w-5 h-5" /> : <Plus className="w-5 h-5 stroke-[2.5]" />}
              </div>
              <p className="text-xs font-black text-[#111111] leading-tight">
                {slides.length === 0 ? 'Selecionar fotos do PC' : '+ Adicionar foto'}
              </p>
              <p className="text-[10px] text-[#66635D] font-medium mt-0.5">
                Selecione várias de uma vez
              </p>
            </>
          )}
        </div>
      </div>

      {/* Input invisível para seleção múltipla */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => e.target.files && handleFilesSelect(e.target.files)}
        className="hidden"
      />
    </div>
  );
}
