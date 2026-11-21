//src/components/ThemeToggle.tsx
'use client';

import { useTheme } from '@/context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
    className?: string;
}

export default function ThemeToggle({ className = '' }: ThemeToggleProps) {
    const { isDarkMode, toggleTheme } = useTheme();

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDarkMode ? 'Beralih ke Tema Sand Light' : 'Beralih ke Tema Gelap'}
            title={isDarkMode ? 'Mode Terang (Sand)' : 'Mode Gelap'}
            className={`group relative p-2.5 rounded-xl border backdrop-blur-md transition-all duration-300 shadow-sm hover:scale-105 active:scale-95 flex items-center justify-center ${isDarkMode
                    ? 'bg-gray-800/80 border-gray-700/80 text-amber-400 hover:bg-gray-700 hover:border-gray-600 shadow-black/20'
                    : 'bg-white/60 border-[#d6c5b3] text-[#6b4226] hover:bg-white/90 hover:border-[#b85c38]/50 shadow-[#b48c6c]/15'
                } ${className}`}
        >
            {isDarkMode ? (
                <Sun className="w-4 h-4 transition-transform group-hover:rotate-45" />
            ) : (
                <Moon className="w-4 h-4 transition-transform group-hover:-rotate-12" />
            )}
        </button>
    );
}

