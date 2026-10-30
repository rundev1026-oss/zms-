'use client';

import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, X, Trash2 } from 'lucide-react';

interface FileUploadProps {
  label?: string;
  accept?: string;
  maxSizeBytes?: number;
  onFileSelect?: (file: File) => void;
  helperText?: string;
  error?: string;
  required?: boolean;
  className?: string;
}

export function FileUpload({
  label,
  accept = 'image/*,application/pdf',
  maxSizeBytes = 10 * 1024 * 1024, // 10MB
  onFileSelect,
  helperText = 'รองรับไฟล์ PDF, JPG, PNG ขนาดไม่เกิน 10MB',
  error,
  required,
  className = '',
}: FileUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (file.size > maxSizeBytes) {
      setLocalError(`ขนาดไฟล์เกินกำหนด (${Math.round(maxSizeBytes / (1024 * 1024))}MB)`);
      return;
    }
    setLocalError(null);
    setSelectedFile(file);
    if (onFileSelect) {
      onFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setLocalError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displayError = error || localError;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-medium text-slate-700 font-prompt">
          {label}
          {required && <span className="text-rose-500 ml-1">*</span>}
        </label>
      )}

      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors
          ${
            isDragOver
              ? 'border-teal-500 bg-teal-50/50'
              : selectedFile
              ? 'border-emerald-300 bg-emerald-50/20'
              : displayError
              ? 'border-rose-300 bg-rose-50/20'
              : 'border-slate-300 hover:border-teal-500 hover:bg-slate-50/50 bg-white'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
          className="hidden"
        />

        {selectedFile ? (
          <div className="flex items-center justify-between text-left">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-slate-800 truncate font-prompt">
                  {selectedFile.name}
                </p>
                <p className="text-[11px] text-slate-500 font-sarabun">
                  {(selectedFile.size / 1024).toFixed(1)} KB • พร้อมอัปโหลด
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="ลบไฟล์"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-700 font-prompt">
                <span className="text-teal-700 font-semibold underline underline-offset-2">
                  คลิกเพื่อเลือกไฟล์
                </span>{' '}
                หรือลากไฟล์มาวางที่นี่
              </p>
              <p className="text-[11px] text-slate-500 font-sarabun mt-0.5">{helperText}</p>
            </div>
          </div>
        )}
      </div>

      {displayError && (
        <p className="flex items-center gap-1 text-[11px] text-rose-600 font-sarabun mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{displayError}</span>
        </p>
      )}
    </div>
  );
}

