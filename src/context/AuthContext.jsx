import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import toast from '../utils/toast';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const enrichUserWithProfile = async (authUser) => {
        if (!authUser) return null;
        try {
            const { data: profile, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', authUser.id)
                .single();
            
            if (error) {
                console.error("Profile fetch error:", error);
                return { ...authUser, role: authUser.user_metadata?.role };
            }
            return { ...authUser, ...profile, role: profile.type };
        } catch (err) {
            return authUser;
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
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
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

        // Insert into public.users table mapping to the auth.users id
        if (data.user) {
            const { error: dbError } = await supabase.from('users').insert([{
                id: data.user.id,
                name: userData.name,
                email: userData.email,
                type: userData.role,
                university: userData.university || null,
                major: userData.major || null,
                industry: userData.industry || null
            }]);

            if (dbError) {
                console.error('DB Insert Error:', dbError);
                throw new Error('Account created, but failed to save profile details. ' + dbError.message);
            }
            
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
