import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../utils/api';
import toast from '../../utils/toast';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const urlToken = searchParams.get('token');
    
    const [token, setToken] = useState(urlToken || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (urlToken) {
            setToken(urlToken);
        }
    }, [urlToken]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!token) {
            toast.error('Reset token is required');
            return;
        }
        if (password.length < 6) {
            toast.error('Password must be at least 6 characters');
            return;
        }
        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await api.post('/auth/reset-password', {
                token,
                password,
                confirmPassword
            });
            
            if (response.success) {
                toast.success(response.message || 'Password reset successfully!');
                setTimeout(() => navigate('/login'), 2000);
            } else {
                toast.error(response.error || 'Failed to reset password');
            }
        } catch (error) {
            toast.error(error.message || 'Error communicating with server');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="auth-wrap">
            <form className="card card-lg" onSubmit={handleSubmit}>
                <h1 className="h1" style={{ fontSize: '32px', textAlign: 'center' }}>Reset Password</h1>
                <p className="subtle mb-10" style={{ textAlign: 'center' }}>Enter your new password below</p>
                
                {!urlToken && (
                    <div className="field">
                        <label className="label">Reset Token *</label>
                        <input 
                            type="text" 
                            className="input" 
                            placeholder="Enter reset token" 
                            required 
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                        />
                    </div>
                )}
                
                <div className="field">
                    <label className="label">New Password *</label>
                    <input 
                        type="password" 
                        className="input" 
                        placeholder="Enter new password" 
                        required minLength="6" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <div className="subtle" style={{ fontSize: '12px', marginTop: '4px' }}>Password must be at least 6 characters</div>
                </div>
                
                <div className="field">
                    <label className="label">Confirm Password *</label>
                    <input 
                        type="password" 
                        className="input" 
                        placeholder="Confirm new password" 
                        required minLength="6" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                </div>
                
                <button type="submit" className="btn" style={{ width: '100%' }} disabled={isSubmitting}>
                    {isSubmitting ? 'Resetting...' : 'Reset Password'}
                </button>
                
                <div className="section mt-20" style={{ textAlign: 'center' }}>
                    <p className="subtle">Remember your password? <Link to="/login" style={{ color: 'var(--primary)' }}>Log in</Link></p>
                </div>
            </form>
        </main>
    );
};

export default ResetPassword;
