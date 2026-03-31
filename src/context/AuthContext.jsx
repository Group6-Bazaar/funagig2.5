import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import toast from '../utils/toast';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Wraps a promise with a timeout to prevent infinite hangs
const withTimeout = (promise, ms = 8000) => {
    const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timed out. Please check your connection.')), ms)
    );
    return Promise.race([promise, timeout]);
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const enrichUserWithProfile = async (authUser) => {
        if (!authUser) return null;
        try {
            const profileFetch = supabase
                .from('users')
                .select('*')
                .eq('id', authUser.id)
                .single();

            const { data: profile, error } = await withTimeout(profileFetch, 5000);
            
            if (error) {
                console.error('Profile fetch error:', error);
                // Fallback to auth metadata
                const role = authUser.user_metadata?.role;
                return { ...authUser, role, type: role };
            }
            return { ...authUser, ...profile, role: profile.type };
        } catch (err) {
            console.error('Profile fetch failed (timeout or error):', err);
            const role = authUser.user_metadata?.role;
            return { ...authUser, role, type: role };
        }
    };

    const checkSession = async () => {
        setLoading(true);
        try {
            const { data: { session }, error } = await supabase.auth.getSession();
            if (error) throw error;
            
            if (session?.user) {
                const fullUser = await enrichUserWithProfile(session.user);
                setUser(fullUser);
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error('Session check failed:', error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkSession();

        // Safety timeout: if loading is still true after 5s, force it false to avoid blank page
        const safetyTimer = setTimeout(() => {
            setLoading(prev => {
                if (prev) {
                    console.warn('Auth session check timed out – forcing render.');
                    return false;
                }
                return prev;
            });
        }, 5000);

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN') {
                const fullUser = await enrichUserWithProfile(session?.user);
                setUser(fullUser);
            } else if (event === 'SIGNED_OUT') {
                setUser(null);
            }
        });

        return () => {
            clearTimeout(safetyTimer);
            subscription.unsubscribe();
        };
    }, []);

    const login = async (email, password) => {
        const { data, error } = await withTimeout(
            supabase.auth.signInWithPassword({ email, password })
        );
        
        if (error) throw new Error(error.message);
        
        const fullUser = await enrichUserWithProfile(data.user);
        setUser(fullUser);
        return fullUser;
    };

    const signup = async (userData) => {
        const { data, error } = await supabase.auth.signUp({
            email: userData.email,
            password: userData.password,
            options: {
                data: {
                    name: userData.name,
                    role: userData.role
                }
            }
        });

        if (error) throw new Error(error.message);

        // The DB trigger (handle_new_user) automatically inserts into public.users.
        // We just wait a moment for it to fire, then enrich the session.
        if (data.user) {
            await new Promise(r => setTimeout(r, 800)); // brief wait for trigger
            const fullUser = await enrichUserWithProfile(data.user);
            setUser(fullUser);
            return fullUser;
        }
        
        return null;
    };

    const logout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Logout error UI side only:', error);
        } finally {
            setUser(null);
        }
    };

    const value = {
        user,
        setUser, // added this so profile updates can refresh the context user state directly
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
