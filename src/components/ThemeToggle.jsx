import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun } from 'lucide-react'; // Assuming lucide-react is installed, as seen in package.json

const ThemeToggle = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="btn btn-ghost"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            style={{
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0
            }}
        >
            {theme === 'light' ? (
                <Moon size={20} color="rgba(255,255,255,0.85)" />
            ) : (
                <Sun size={20} color="rgba(255,255,255,0.85)" />
            )}
        </button>
    );
};

export default ThemeToggle;
