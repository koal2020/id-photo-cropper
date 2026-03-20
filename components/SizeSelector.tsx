'use client';

import { useState } from 'react';
import { SizePreset, SIZE_PRESETS } from '@/lib/config';

interface SizeSelectorProps {
  selectedId: string;
  onSelect: (preset: SizePreset) => void;
}

export default function SizeSelector({ selectedId, onSelect }: SizeSelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700">选择尺寸</h3>
      <div className="grid grid-cols-2 gap-3">
        {SIZE_PRESETS.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelect(preset)}
            className={`p-3 rounded-lg border text-left transition-all ${
              selectedId === preset.id
                ? 'border-primary bg-blue-50 ring-1 ring-primary'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`font-medium ${
                selectedId === preset.id ? 'text-primary' : 'text-gray-900'
              }`}>
                {preset.name}
              </span>
              {selectedId === preset.id && (
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {preset.width}×{preset.height}px {preset.description && `· ${preset.description}`}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}