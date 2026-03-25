import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from '../../utils/toast';
import { supabase } from '../../utils/supabase';

const PostGig = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    
    const [gigForm, setGigForm] = useState({
        title: '',
        description: '',
        type: '',
        skills: '',
        budget: '',
        deadline: '',
        location: ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e) => setGigForm({ ...gigForm, [e.target.id]: e.target.value });

    const validateForm = () => {
        const { title, description, type, skills, budget, deadline } = gigForm;
        if (!title || title.length < 5) return 'Title must be at least 5 characters.';
        if (!description || description.length < 20) return 'Description must be at least 20 characters.';
        if (!type) return 'Please select a gig type.';
        if (!skills) return 'Skills are required.';
        if (!budget || parseFloat(budget) < 10000) return 'Budget must be at least 10,000 UGX.';
        
        if (!deadline) return 'Deadline is required.';
        const deadlineDate = new Date(deadline);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (deadlineDate <= today) return 'Deadline must be in the future.';

        return null;
    };

    const submitGig = async (e) => {
        if (e) e.preventDefault();
        
        const error = validateForm();
        if (error) {
            toast.error(error);
            return;
        }

        setIsSubmitting(true);
        try {
            const { error: dbError } = await supabase
                .from('gigs')
                .insert([{
                    user_id: user.id,
                    ...gigForm,
                    status: 'active',
                    budget: parseFloat(gigForm.budget)
                }]);

            if (!dbError) {
                toast.success('Gig posted successfully!');
                setTimeout(() => navigate('/business/gigs'), 1500);
            } else {
                toast.error(dbError.message || 'Failed to post gig.');
            }
        } catch (error) {
            toast.error('An error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const saveDraft = async () => {
        setIsSaving(true);
        try {
            const draftData = {
                user_id: user.id,
                title: gigForm.title || 'Untitled Draft',
                description: gigForm.description || '',
                type: gigForm.type || 'one-time',
                skills: gigForm.skills || '',
                budget: gigForm.budget ? parseFloat(gigForm.budget) : 0,
                deadline: gigForm.deadline || new Date().toISOString().split('T')[0],
                location: gigForm.location || 'Remote',
                status: 'draft'
            };

            const { error: dbError } = await supabase
                .from('gigs')
                .insert([draftData]);

            if (!dbError) {
                toast.success('Draft saved successfully!');
                setTimeout(() => navigate('/business/gigs'), 1500);
            } else {
                toast.error(dbError.message || 'Failed to save draft.');
            }
        } catch (error) {
            toast.error('An error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    const todayDate = new Date().toISOString().split('T')[0];

    return (
        <div className="section">
            <div className="flex items-center justify-between mb-20">
                <div>
                    <h1 className="h1" style={{ fontSize: '28px', margin: 0 }}>Post a New Gig</h1>
                    <p className="subtle">Create an engaging gig post to attract the best student talent</p>
                </div>
                <div className="flex gap-10">
                    <Link to="/business/gigs" className="btn secondary">View My Gigs</Link>
                    <Link to="/business/dashboard" className="btn ghost">Back to Dashboard</Link>
                </div>
            </div>

            <form onSubmit={submitGig} className="card-lg">
                <div className="form-section">
                    <h2>Basic Information</h2>
                    <div className="form-grid">
                        <div className="field">
                            <label htmlFor="title" className="label">Gig Title *</label>
                            <input type="text" id="title" className="input" placeholder="e.g., Software Engineer Intern" value={gigForm.title} onChange={handleChange} required />
                        </div>
                        <div className="field">
                            <label htmlFor="description" className="label">Description *</label>
                            <textarea id="description" className="textarea" rows="4" placeholder="Describe the role..." value={gigForm.description} onChange={handleChange} required></textarea>
                        </div>
                        <div className="field">
                            <label htmlFor="type" className="label">Type *</label>
                            <select id="type" className="select" value={gigForm.type} onChange={handleChange} required>
                                <option value="">Select type</option>
                                <option value="one-time">One-time</option>
                                <option value="ongoing">Ongoing</option>
                                <option value="contract">Contract</option>
                            </select>
                        </div>
                        <div className="field">
                            <label htmlFor="skills" className="label">Required Skills *</label>
                            <textarea id="skills" className="textarea" rows="3" placeholder="e.g., JavaScript, React, Node.js" value={gigForm.skills} onChange={handleChange} required></textarea>
                        </div>
                    </div>
                </div>

                <div className="form-section">
                    <h2>Compensation & Timeline</h2>
                    <div className="form-grid">
                        <div className="field">
                            <label htmlFor="budget" className="label">Budget (UGX) *</label>
                            <input type="number" id="budget" className="input" placeholder="e.g., 500000" min="0" value={gigForm.budget} onChange={handleChange} required />
                        </div>
                        <div className="field">
                            <label htmlFor="deadline" className="label">Deadline *</label>
                            <input type="date" id="deadline" className="input" min={todayDate} value={gigForm.deadline} onChange={handleChange} required />
                        </div>
                        <div className="field">
                            <label htmlFor="location" className="label">Location</label>
                            <input type="text" id="location" className="input" placeholder="e.g., Remote, Kampala" value={gigForm.location} onChange={handleChange} />
                        </div>
                    </div>
                </div>

                <div className="form-navigation mt-20">
                    <div className="flex gap-10">
                        <button type="button" className="btn ghost" disabled={isSaving || isSubmitting} onClick={saveDraft}>
                            {isSaving ? 'Saving...' : 'Save as Draft'}
                        </button>
                        <button type="submit" className="btn" disabled={isSaving || isSubmitting}>
                            {isSubmitting ? 'Posting...' : 'Post Gig'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default PostGig;
