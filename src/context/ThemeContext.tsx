'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type ThemeContextType = {
    isDarkMode: boolean;
    toggleTheme: () => void;
    setTheme: (dark: boolean) => void;
};

const ThemeContext = createContext<ThemeContextType>({
    isDarkMode: false,
    toggleTheme: () => {},
    setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
    const [mounted, setMounted] = useState<boolean>(false);

    useEffect(() => {
        try {
            const savedTheme = localStorage.getItem('app-theme');
            if (savedTheme !== null) {
                const isDark = savedTheme === 'dark';
                setIsDarkMode(isDark);
                if (isDark) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            } else {
                // Default: sand light theme
                setIsDarkMode(false);
                document.documentElement.classList.remove('dark');
            }
        } catch (e) {
            console.error('Error accessing localStorage:', e);
        }
        setMounted(true);
    }, []);

    const setTheme = (dark: boolean) => {
        setIsDarkMode(dark);
        try {
            localStorage.setItem('app-theme', dark ? 'dark' : 'light');
            if (dark) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const toggleTheme = () => {
        setTheme(!isDarkMode);
    };

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}

