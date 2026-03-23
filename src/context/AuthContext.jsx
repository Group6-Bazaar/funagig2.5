import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkSession = async () => {
        try {
            const data = await api.get('/auth/session-status');
            if (data.success && data.user) {
                setUser(data.user);
            } else {
                setUser(null);
            }
        } catch (error) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkSession();

        const handleUnauthorized = () => {
            setUser(null);
            // Optionally redirect to login, but handling the state update might be enough
        };

        window.addEventListener('unauthorized', handleUnauthorized);
        return () => window.removeEventListener('unauthorized', handleUnauthorized);
    }, []);

    const login = async (email, password) => {
        const data = await api.post('/login', { email, password });
        if (data.success) {
            setUser(data.user);
            return data.user;
        }
        throw new Error(data.error || 'Login failed');
    };

    const signup = async (userData) => {
        const data = await api.post('/signup', userData);
        if (data.success) {
            setUser(data.user);
            return data.user;
        }
        throw new Error(data.error || 'Signup failed');
    };

    const logout = async () => {
        try {
            await api.post('/logout');
        } catch (error) {
            console.error('Logout error UI side only:', error);
        } finally {
            setUser(null);
        }
    };

    const value = {
        user,
        loading,
        hasRole: (role) => user?.role === role,
        login,
        signup,
        logout,
        checkSession
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
