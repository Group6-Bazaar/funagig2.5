import React from 'react';
import { useTheme } from '../hooks/useTheme';

const ThemeToggle = () => {
    const { isDark, toggleTheme } = useTheme();
    
    return (
        <button 
            onClick={toggleTheme} 
            className="btn ghost" 
            style={{ padding: '8px', fontSize: '18px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%' }} 
            title="Toggle Dark Mode"
        >
            {isDark ? '☀️' : '🌙'}
        </button>
    );
};

export default ThemeToggle;
