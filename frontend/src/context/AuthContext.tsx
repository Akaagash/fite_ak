import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface User {
    user_id?: string;
    email: string;
    role: string;
    full_name?: string;
    resume_url?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    skills?: string[] | null;
    experience?: string | null;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (userData: User) => void;
    logout: () => void;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    /**
     * Check authentication status by verifying the cookie-based session with backend
     */
    const checkAuth = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8000/api/auth/me', {
                method: 'GET',
                credentials: 'include', // Send cookies with request
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data.user ?? null);
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Set user data after successful login
     */
    const login = (userData: User) => {
        setUser(userData);
    };

    /**
     * Logout user and clear session
     */
    const logout = async () => {
        try {
            await fetch('http://localhost:8000/api/auth/logout', {
                method: 'POST',
                credentials: 'include',
            });
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            localStorage.removeItem('token');
            setUser(null);
        }
    };

    useEffect(() => {
        checkAuth();
    }, []);

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                isLoading,
                login,
                logout,
                checkAuth,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
