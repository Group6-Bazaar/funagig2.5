import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from '../../utils/toast';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [devToken, setDevToken] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!email) {
            toast.error('Email is required');
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await api.post('/auth/forgot-password', { email });
            
            if (response.success) {
                toast.success(response.message || 'Password reset link sent!');
                if (response.dev_mode && response.token) {
                    setDevToken(response.token);
                } else {
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 2000);
                }
            } else {
                toast.error(response.error || 'Failed to send reset link');
            }
        } catch (error) {
            toast.error(error.message || 'Error occurred while sending request');
        } finally {
            setIsSubmitting(false);
        }
    };

    const copyToken = () => {
        navigator.clipboard.writeText(devToken);
        toast.success('Token copied to clipboard!');
    };

    return (
        <main className="auth-wrap">
            <form className="card card-lg" onSubmit={handleSubmit}>
                <h1 className="h1" style={{ fontSize: '32px', textAlign: 'center' }}>Forgot Password</h1>
                <p className="subtle mb-10" style={{ textAlign: 'center' }}>Enter your email address and we'll send you a password reset link</p>
                
                <div className="field">
                    <label className="label">Email *</label>
                    <input 
                        className="input" 
                        type="email" 
                        placeholder="Enter your email" 
                        required 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>
                
                <button type="submit" className="btn" style={{ width: '100%' }} disabled={isSubmitting}>
                    {isSubmitting ? 'Sending...' : 'Send Reset Link'}
                </button>
                
                <div className="section mt-20" style={{ textAlign: 'center' }}>
                    <p className="subtle">Remember your password? <Link to="/login" style={{ color: 'var(--primary)' }}>Log in</Link></p>
                </div>

                {devToken && (
                    <div style={{ marginTop: '20px', padding: '16px', background: '#f0f0f0', borderRadius: '8px', border: '1px solid #ddd' }}>
                        <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}><strong>Development Mode:</strong> Since email is not configured, here's your reset token:</p>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input type="text" readOnly style={{ flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px', fontFamily: 'monospace', fontSize: '12px' }} value={devToken} />
                            <button type="button" onClick={copyToken} className="btn secondary" style={{ padding: '8px 16px', fontSize: '12px' }}>Copy</button>
                        </div>
                        <p style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                            <Link to={`/reset-password?token=${devToken}`} style={{ color: 'var(--primary)' }}>Click here to reset your password</Link>
                        </p>
                    </div>
                )}
            </form>
        </main>
    );
};

export default ForgotPassword;
