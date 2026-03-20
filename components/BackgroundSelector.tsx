'use client';

import { BackgroundColor, BACKGROUND_COLORS } from '@/lib/config';

interface BackgroundSelectorProps {
  selectedId: string;
  onSelect: (bg: BackgroundColor) => void;
  disabled?: boolean;
}

export default function BackgroundSelector({ selectedId, onSelect, disabled }: BackgroundSelectorProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-gray-700">背景颜色</h3>
      <div className="flex gap-3">
        {BACKGROUND_COLORS.map((bg) => (
          <button
            key={bg.id}
            onClick={() => !disabled && onSelect(bg)}
            disabled={disabled}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
              disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400'
            } ${
              selectedId === bg.id
                ? 'border-primary bg-blue-50 ring-1 ring-primary'
                : 'border-gray-200'
            }`}
          >
            <span className={`w-6 h-6 rounded-full border border-gray-200 ${bg.color}`} />
            <span className={`text-sm ${selectedId === bg.id ? 'text-primary font-medium' : 'text-gray-700'}`}>
              {bg.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}