import React from 'react';
import { useMode } from '../../context/ModeContext';
import { motion } from 'framer-motion';

const GlobalToggle: React.FC = () => {
    const { mode, setMode } = useMode();

    const isDaily = mode === 'daily';

    return (
        <div className="flex justify-center items-center">
            <div className="relative inline-flex w-[300px] items-center rounded-2xl border-2 border-neutral-200 bg-white p-1 shadow-sm">
                {/* Sliding selection */}
                <motion.div
                    layoutId="modeToggle"
                    className="absolute inset-y-1 left-1 w-1/2 rounded-xl border border-neutral-200 bg-neutral-900 shadow-sm"
                    initial={false}
                    animate={{ x: isDaily ? '0%' : '100%' }}
                    transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                />

                <button
                    type="button"
                    aria-pressed={isDaily}
                    onClick={() => setMode('daily')}
                    className={`relative z-10 flex h-10 w-1/2 items-center justify-center rounded-xl text-sm font-semibold transition-colors ${isDaily
                        ? 'text-white'
                        : 'text-neutral-700 hover:text-neutral-900'
                        }`}
                >
                    Daily Wages
                </button>

                <button
                    type="button"
                    aria-pressed={!isDaily}
                    onClick={() => setMode('longterm')}
                    className={`relative z-10 flex h-10 w-1/2 items-center justify-center rounded-xl text-sm font-semibold transition-colors ${!isDaily
                        ? 'text-white'
                        : 'text-neutral-700 hover:text-neutral-900'
                        }`}
                >
                    Long Term
                </button>
            </div>
        </div>
    );
};

export default GlobalToggle;
