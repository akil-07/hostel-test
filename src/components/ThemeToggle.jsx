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
                <Moon size={20} color="var(--text-main)" />
            ) : (
                <Sun size={20} color="var(--text-main)" />
            )}
        </button>
    );
};

export default ThemeToggle;
