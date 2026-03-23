import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from '../../utils/toast';

const Login = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.email || !formData.password) {
            toast.error('Please enter both email and password');
            return;
        }

        try {
            setIsSubmitting(true);
            const user = await login(formData.email, formData.password);
            
            toast.success('Login successful!');
            
            if (user.role === 'business') {
                navigate('/business/dashboard');
            } else {
                navigate('/student/dashboard');
            }
        } catch (error) {
            toast.error(error.message || 'Login failed. Please check your credentials.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="auth-wrap">
            <form className="card card-lg" onSubmit={handleSubmit}>
                <h1 className="h1" style={{ fontSize: '32px', textAlign: 'center' }}>Welcome back</h1>
                <p className="subtle mb-10" style={{ textAlign: 'center' }}>Sign in to access your dashboard</p>
                
                <div className="field">
                    <label className="label">Email *</label>
                    <input 
                        className="input" 
                        type="email"
                        placeholder="Enter your email" 
                        required 
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                </div>
                
                <div className="field">
                    <label className="label">Password *</label>
                    <input 
                        type="password" 
                        className="input" 
                        placeholder="Enter your password" 
                        required 
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                    />
                </div>
                
                <div className="flex items-center justify-between mb-10">
                    <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input 
                            type="checkbox" 
                            checked={formData.rememberMe}
                            onChange={(e) => setFormData({...formData, rememberMe: e.target.checked})}
                        />
                        Remember me
                    </label>
                    <Link to="/forgot-password" style={{ color: 'var(--primary)' }}>Forgot password?</Link>
                </div>
                
                <button type="submit" className="btn" style={{ width: '100%' }} disabled={isSubmitting}>
                    {isSubmitting ? 'Logging in...' : 'Log in'}
                </button>
                
                <div className="section mt-20" style={{ textAlign: 'center' }}>
                    <p className="subtle">Don't have an account? <Link to="/signup" style={{ color: 'var(--primary)' }}>Create one now</Link></p>
                </div>
                
                <div className="section mt-20" style={{ textAlign: 'center' }}>
                    <p className="subtle">Or continue with:</p>
                    <div className="row" style={{ marginTop: '10px' }}>
                        <button type="button" className="btn secondary" style={{ flex: 1 }}>Google</button>
                        <button type="button" className="btn secondary" style={{ flex: 1 }}>Facebook</button>
                    </div>
                </div>
            </form>
        </main>
    );
};

export default Login;
