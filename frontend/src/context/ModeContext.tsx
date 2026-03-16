import React, { createContext, useContext, useState, type ReactNode } from 'react';

type AppMode = 'daily' | 'longterm';

interface ModeContextType {
    mode: AppMode;
    toggleMode: () => void;
    setMode: (mode: AppMode) => void;
}

const ModeContext = createContext<ModeContextType | undefined>(undefined);

export const ModeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [mode, setMode] = useState<AppMode>('daily');

    const toggleMode = () => {
        setMode(prev => prev === 'daily' ? 'longterm' : 'daily');
    };

    return (
        <ModeContext.Provider value={{ mode, toggleMode, setMode }}>
            {children}
        </ModeContext.Provider>
    );
};

export const useMode = () => {
    const context = useContext(ModeContext);
    if (context === undefined) {
        throw new Error('useMode must be used within a ModeProvider');
    }
    return context;
};
