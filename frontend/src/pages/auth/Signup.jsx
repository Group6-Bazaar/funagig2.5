import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from '../../utils/toast';

const Signup = () => {
    const { signup } = useAuth();
    const navigate = useNavigate();
    
    const [formData, setFormData] = useState({
        role: '',
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        university: '',
        major: '',
        industry: '',
        terms: false,
        privacy: false
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (!formData.terms || !formData.privacy) {
            toast.error('You must accept the terms and privacy policy.');
            return;
        }

        try {
            setIsSubmitting(true);
            await signup(formData);
            toast.success('Account created successfully! Please log in.');
            navigate('/login');
        } catch (error) {
            toast.error(error.message || 'Error occurred during signup.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="container" style={{ maxWidth: '1100px' }}>
            <div className="grid-2" style={{ alignItems: 'center' }}>
                <form className="card" onSubmit={handleSubmit}>
                    <h1 className="h1" style={{ fontSize: '32px', textAlign: 'center' }}>Create Your Account</h1>
                    <p className="subtle mb-10" style={{ textAlign: 'center' }}>Join FunaGig as a Student or Business</p>
                    
                    <div className="field">
                        <label className="label">I am a *</label>
                        <select className="select" name="role" required value={formData.role} onChange={handleChange}>
                            <option value="">Select your role</option>
                            <option value="student">Student</option>
                            <option value="business">Business</option>
                        </select>
                    </div>
                    
                    <div className="field">
                        <label className="label">Full Name (or Company Name) *</label>
                        <input className="input" name="name" placeholder="e.g. Amanya Peter or Your Company Inc." required value={formData.name} onChange={handleChange} />
                    </div>
                    
                    <div className="field">
                        <label className="label">Email Address *</label>
                        <input type="email" className="input" name="email" placeholder="you@example.com" required value={formData.email} onChange={handleChange} />
                    </div>
                    
                    <div className="field">
                        <label className="label">Password *</label>
                        <input type="password" className="input" name="password" placeholder="••••••••" required minLength="6" value={formData.password} onChange={handleChange} />
                    </div>
                    
                    <div className="field">
                        <label className="label">Confirm Password *</label>
                        <input type="password" className="input" name="confirmPassword" placeholder="••••••••" required minLength="6" value={formData.confirmPassword} onChange={handleChange} />
                    </div>
                    
                    {formData.role === 'student' && (
                        <div className="row">
                            <div className="field">
                                <label className="label">University *</label>
                                <input className="input" name="university" placeholder="e.g. Makerere University" required value={formData.university} onChange={handleChange} />
                            </div>
                            <div className="field">
                                <label className="label">Major/Field of Study *</label>
                                <input className="input" name="major" placeholder="e.g. Computer Science" required value={formData.major} onChange={handleChange} />
                            </div>
                        </div>
                    )}
                    
                    {formData.role === 'business' && (
                        <div className="field">
                            <label className="label">Industry *</label>
                            <select className="select" name="industry" required value={formData.industry} onChange={handleChange}>
                                <option value="">Select your industry</option>
                                <option value="technology">Technology</option>
                                <option value="retail">Retail</option>
                                <option value="finance">Finance</option>
                                <option value="healthcare">Healthcare</option>
                                <option value="education">Education</option>
                                <option value="manufacturing">Manufacturing</option>
                                <option value="consulting">Consulting</option>
                                <option value="marketing">Marketing</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    )}
                    
                    <div className="field">
                        <label className="label">
                            <input type="checkbox" name="terms" required checked={formData.terms} onChange={handleChange} /> 
                            I agree to the <a href="#" style={{ color: 'var(--primary)' }}>Terms of Service</a> *
                        </label>
                    </div>
                    
                    <div className="field">
                        <label className="label">
                            <input type="checkbox" name="privacy" required checked={formData.privacy} onChange={handleChange} /> 
                            I accept the <a href="#" style={{ color: 'var(--primary)' }}>Privacy Policy</a> *
                        </label>
                    </div>
                    
                    <button type="submit" className="btn" style={{ width: '100%' }} disabled={isSubmitting}>
                        {isSubmitting ? 'Creating Account...' : 'Create Account'}
                    </button>
                    
                    <div className="section mt-20" style={{ textAlign: 'center' }}>
                        <p className="subtle">Already have an account? <Link to="/login" style={{ color: 'var(--primary)' }}>Sign in here</Link></p>
                    </div>
                </form>
                
                <div className="section" style={{ minHeight: '520px', display: 'grid', placeContent: 'center', textAlign: 'center', background: '#e6f2ff' }}>
                    <h3>Join in Seconds</h3>
                    <p className="subtle">One simple form to connect students and businesses.</p>
                    <div style={{ marginTop: '20px' }}>
                        <div className="section" style={{ background: 'white', margin: '10px 0' }}>
                            <h4>✓ Students</h4>
                            <p className="subtle">Find gigs that match your skills</p>
                        </div>
                        <div className="section" style={{ background: 'white', margin: '10px 0' }}>
                            <h4>✓ Businesses</h4>
                            <p className="subtle">Post jobs and hire talent fast</p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
};

export default Signup;
