import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
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
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            
            if (!error) {
                toast.success('Password reset link sent to your email!');
                setEmail('');
            } else {
                toast.error(error.message || 'Failed to send reset link');
            }
        } catch (error) {
            toast.error(error.message || 'Error occurred while sending request');
        } finally {
            setIsSubmitting(false);
        }
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

            </form>
        </main>
    );
};

export default ForgotPassword;
