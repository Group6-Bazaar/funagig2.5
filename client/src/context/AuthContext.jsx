import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';
import toast from '../utils/toast';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkSession = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('jwt_token');
            if (!token) {
                setUser(null);
                return;
            }

            const currentUser = await authService.getMe();
            setUser({ ...currentUser, role: currentUser.type });
        } catch (error) {
            console.error('Session check failed:', error);
            localStorage.removeItem('jwt_token');
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkSession();
    }, []);

    const login = async (email, password) => {
        try {
            const { token, user } = await authService.login(email, password);
            localStorage.setItem('jwt_token', token);
            const fullUser = { ...user, role: user.type };
            setUser(fullUser);
            return fullUser;
        } catch (error) {
            throw new Error(error.message || 'Login failed');
        }
    };

    const signup = async (userData) => {
        try {
            const { token, user } = await authService.signup({
                name: userData.name,
                email: userData.email,
                password: userData.password,
                type: userData.role // Map frontend role to backend type
            });
            localStorage.setItem('jwt_token', token);
            const fullUser = { ...user, role: user.type };
            setUser(fullUser);
            return fullUser;
        } catch (error) {
            throw new Error(error.message || 'Signup failed');
        }
    };

    const logout = async () => {
        try {
            await authService.logout();
        } catch (error) {
            console.error('Logout error UI side only:', error);
        } finally {
            localStorage.removeItem('jwt_token');
            setUser(null);
        }
    };

    const value = {
        user,
        setUser,
        loading,
        hasRole: (role) => user?.role === role || user?.type === role,
        login,
        signup,
        logout,
        checkSession
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
                    <div style={{ width: '40px', height: '40px', border: '3px solid var(--primary-light)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
            ) : children}
        </AuthContext.Provider>
    );
};
