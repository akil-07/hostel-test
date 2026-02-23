import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun } from 'lucide-react';

// onDark=true  → white icons (for use on dark green header bar)
// onDark=false → uses theme-aware color (for use on light/card backgrounds)
const ThemeToggle = ({ onDark = false }) => {
    const { theme, toggleTheme } = useTheme();

    const iconColor = onDark
        ? 'rgba(255,255,255,0.85)'
        : 'var(--text-main)';

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
                <Moon size={20} color={iconColor} />
            ) : (
                <Sun size={20} color={iconColor} />
            )}
        </button>
    );
};

export default ThemeToggle;
