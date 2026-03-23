import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import toast from '../utils/toast';

const Home = () => {
    const [contactForm, setContactForm] = useState({ name: '', email: '', subject: 'General', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleContactSubmit = async (e) => {
        e.preventDefault();
        
        const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
        if (!emailRegex.test(contactForm.email)) {
            toast.error('Please enter a valid email address.');
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await api.post('/contact', contactForm);
            if (response.success) {
                toast.success("Message sent successfully! We'll get back to you soon.");
                setContactForm({ name: '', email: '', subject: 'General', message: '' });
            } else {
                toast.error(response.error || 'Failed to send message.');
            }
        } catch (error) {
            toast.error('Failed to send message. Please check your connection.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <div className="hero">
                <div className="overlay"></div>
                <div className="content">
                    <h1>Connect with Talent,<br /> Grow Your Business</h1>
                    <p>FunaGig connects students and SMEs for short-term work opportunities.</p>
                    <div className="cta" id="get-started">
                        <Link className="btn" to="/signup">Sign Up</Link>
                        <p className="subtle mt-10">Already have an account? <Link to="/login">Log In</Link></p>
                    </div>
                </div>
            </div>

            <section id="why-choose" style={{ margin: '40px 0' }}>
                <h2 className="h2" style={{ textAlign: 'center' }}>Why Choose FunaGig?</h2>
                <p className="subtle" style={{ textAlign: 'center', maxWidth: '760px', margin: '0 auto 20px' }}>A simple way for students and businesses to connect for short-term work.</p>
                <div className="grid-3">
                    <div className="section">
                        <h3>Access Top Talent</h3>
                        <p className="subtle">Reach skilled students and graduates.</p>
                    </div>
                    <div className="section">
                        <h3>Streamlined Process</h3>
                        <p className="subtle">Post gigs, manage applications, hire fast.</p>
                    </div>
                    <div className="section">
                        <h3>Flexible Solutions</h3>
                        <p className="subtle">For any project size, from tasks to contracts.</p>
                    </div>
                </div>
            </section>

            <section id="about" style={{ margin: '40px 0' }}>
                <h2 className="h2" style={{ textAlign: 'center' }}>About FunaGig</h2>
                <p className="subtle" style={{ textAlign: 'center', maxWidth: '760px', margin: '0 auto 20px' }}>Bridging students and businesses.</p>
                <div className="grid-2">
                    <div className="section">
                        <h3>Our Mission</h3>
                        <p className="subtle">Empower students with opportunities while helping SMEs access talent.</p>
                    </div>
                    <div className="section">
                        <h3>Our Vision</h3>
                        <p className="subtle">Leading platform for student-business connections in East Africa.</p>
                    </div>
                </div>
                
                <h3 style={{ textAlign: 'center', margin: '20px 0' }}>The Problem We Solve</h3>
                <div className="grid-3">
                    <div className="section">
                        <h4>For Students</h4>
                        <ul className="subtle"><li>Limited work access</li><li>Flexible opportunities</li><li>Local connections</li></ul>
                    </div>
                    <div className="section">
                        <h4>For Businesses</h4>
                        <ul className="subtle"><li>Skilled short-term talent</li><li>Low-cost hiring</li><li>Innovative perspectives</li></ul>
                    </div>
                    <div className="section">
                        <h4>Our Solution</h4>
                        <ul className="subtle"><li>Streamlined matching</li><li>Flexible arrangements</li><li>Quality support</li></ul>
                    </div>
                </div>

                <h3 style={{ textAlign: 'center', margin: '20px 0' }}>Our Core Values</h3>
                <div className="grid-4">
                    <div className="section"><h4>Trust</h4><p className="subtle">Building reliable connections.</p></div>
                    <div className="section"><h4>Innovation</h4><p className="subtle">Fresh ideas for growth.</p></div>
                    <div className="section"><h4>Inclusivity</h4><p className="subtle">Opportunities for all.</p></div>
                    <div className="section"><h4>Excellence</h4><p className="subtle">Quality in every match.</p></div>
                </div>

                <h3 style={{ textAlign: 'center', margin: '20px 0' }}>Our Impact</h3>
                <div className="grid-4">
                    <div className="section"><div style={{ fontSize: '48px', color: 'var(--primary)' }}>500+</div><p>Students Connected</p></div>
                    <div className="section"><div style={{ fontSize: '48px', color: 'var(--success)' }}>150+</div><p>Businesses Served</p></div>
                    <div className="section"><div style={{ fontSize: '48px', color: 'var(--warning)' }}>1,200+</div><p>Gigs Completed</p></div>
                    <div className="section"><div style={{ fontSize: '48px', color: 'var(--danger)' }}>95%</div><p>Satisfaction Rate</p></div>
                </div>

                <h3 style={{ textAlign: 'center', margin: '20px 0' }}>Meet Our Team</h3>
                <div className="grid-3">
                    <div className="section"><div style={{ width: '120px', height: '120px', background: 'var(--primary)', borderRadius: '50%', margin: '0 auto 16px' }}></div><h4>Amanya Peter</h4><p>Founder & CEO</p></div>
                    <div className="section"><div style={{ width: '120px', height: '120px', background: 'var(--success)', borderRadius: '50%', margin: '0 auto 16px' }}></div><h4>Sarah Mwangi</h4><p>CTO</p></div>
                    <div className="section"><div style={{ width: '120px', height: '120px', background: 'var(--warning)', borderRadius: '50%', margin: '0 auto 16px' }}></div><h4>Alex Kiprotich</h4><p>Head of Operations</p></div>
                </div>
            </section>

            <section id="how-it-works" style={{ margin: '40px 0' }}>
                <h2 className="h2" style={{ textAlign: 'center' }}>How It Works</h2>
                <p className="subtle" style={{ textAlign: 'center', maxWidth: '760px', margin: '0 auto 20px' }}>Simple steps to connect.</p>
                <div className="grid-3">
                    <div className="section"><h3>1. Sign Up</h3><p className="subtle">Create account in 2 minutes.</p><Link className="btn" to="/signup">Sign Up</Link></div>
                    <div className="section"><h3>2. Complete Profile</h3><p className="subtle">Add skills and preferences.</p><Link className="btn secondary" to="/login">Get Started</Link></div>
                    <div className="section"><h3>3. Connect</h3><p className="subtle">Browse or post gigs.</p><Link className="btn" to="/gigs">Find Gigs</Link></div>
                </div>
                <div className="grid-2" style={{ marginTop: '40px' }}>
                    <div className="section"><h3>For Students</h3><p>Browse & Apply</p><Link className="btn secondary" to="/gigs">Browse Gigs</Link><p>Track Applications</p><Link className="btn" to="/login">Dashboard</Link></div>
                    <div className="section"><h3>For Businesses</h3><p>Post Gigs</p><Link className="btn secondary" to="/login">Post Gig</Link><p>Manage Applications</p><Link className="btn" to="/login">Manage</Link></div>
                </div>
            </section>

            <section id="contact" style={{ margin: '40px 0' }}>
                <h2 className="h2" style={{ textAlign: 'center' }}>Contact Us</h2>
                <p className="subtle" style={{ textAlign: 'center', maxWidth: '760px', margin: '0 auto 20px' }}>We're here to help!</p>
                <div className="grid-3">
                    <div className="section"><h3>Email</h3><p>support@funagig.com</p></div>
                    <div className="section"><h3>Phone</h3><p>+256 700 123 456</p></div>
                    <div className="section"><h3>Chat</h3><button className="btn secondary">Start Chat</button></div>
                </div>
                
                <form id="contact-form" style={{ marginTop: '20px' }} onSubmit={handleContactSubmit}>
                    <h3>Send Message</h3>
                    <div className="field"><label>Name *</label><input required value={contactForm.name} onChange={e => setContactForm({...contactForm, name: e.target.value})} /></div>
                    <div className="field"><label>Email *</label><input type="email" required value={contactForm.email} onChange={e => setContactForm({...contactForm, email: e.target.value})} /></div>
                    <div className="field">
                        <label>Subject *</label>
                        <select required value={contactForm.subject} onChange={e => setContactForm({...contactForm, subject: e.target.value})}>
                            <option>General</option>
                            <option>Support</option>
                        </select>
                    </div>
                    <div className="field"><label>Message *</label><textarea required value={contactForm.message} onChange={e => setContactForm({...contactForm, message: e.target.value})}></textarea></div>
                    <button type="submit" className="btn" disabled={isSubmitting}>{isSubmitting ? 'Sending...' : 'Send'}</button>
                </form>

                <h3 style={{ textAlign: 'center', margin: '20px 0' }}>FAQ</h3>
                <div className="accordion">
                    <details><summary>What types of gigs?</summary><p>Web dev, design, writing, etc.</p></details>
                    <details><summary>How does payment work?</summary><p>Secure upon completion.</p></details>
                    <details><summary>Fees?</summary><p>Free for students, commission for businesses.</p></details>
                    <details><summary>Report issue?</summary><p>Use form, email, or chat.</p></details>
                </div>
                
                <div className="section" style={{ background: '#fef3c7', marginTop: '20px' }}>
                    <h3>Emergency Support</h3>
                    <p>Call: +256 700 123 456 | Email: emergency@funagig.com</p>
                </div>
            </section>
        </>
    );
};

export default Home;
