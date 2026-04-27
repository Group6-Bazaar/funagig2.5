import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import toast from '../../utils/toast';
import { apiClient } from '../../utils/apiClient';
import { useAuth } from '../../context/AuthContext';

const ManageGigs = () => {
    const [allGigs, setAllGigs] = useState([]);
    const [filteredGigs, setFilteredGigs] = useState([]);
    const [loading, setLoading] = useState(true);

    const [filters, setFilters] = useState({ search: '', status: '', sort: 'newest' });

    const [editingGig, setEditingGig] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editGigId, setEditGigId] = useState(null);
    const [editForm, setEditForm] = useState({ title: '', description: '', type: 'one-time', status: 'active', skills: '', budget: '', deadline: '', location: '' });
    const { user } = useAuth();
    
    const loadGigs = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data, error } = await apiClient
                .from('gigs')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setAllGigs(data);
        } catch (error) {
            toast.error('Failed to load gigs');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadGigs();
    }, []);

    useEffect(() => {
        let result = [...allGigs];

        if (filters.status) result = result.filter(g => g.status === filters.status);
        if (filters.search) {
            const q = filters.search.toLowerCase();
            result = result.filter(g => 
                (g.title || '').toLowerCase().includes(q) || 
                (g.description || '').toLowerCase().includes(q) || 
                (g.skills || '').toLowerCase().includes(q)
            );
        }

        switch (filters.sort) {
            case 'newest': result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)); break;
            case 'oldest': result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at)); break;
            case 'budget_high': result.sort((a, b) => (b.budget || 0) - (a.budget || 0)); break;
            case 'budget_low': result.sort((a, b) => (a.budget || 0) - (b.budget || 0)); break;
            case 'title_asc': result.sort((a, b) => (a.title || '').localeCompare(b.title || '')); break;
            case 'title_desc': result.sort((a, b) => (b.title || '').localeCompare(a.title || '')); break;
            case 'applicants_high': result.sort((a, b) => (b.applicant_count || 0) - (a.applicant_count || 0)); break;
            case 'applicants_low': result.sort((a, b) => (a.applicant_count || 0) - (b.applicant_count || 0)); break;
            default: break;
        }

        setFilteredGigs(result);
    }, [filters, allGigs]);

    const handleFilterChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

    const openEditModal = (gig) => {
        setEditGigId(gig.id);
        setEditForm({
            title: gig.title || '',
            description: gig.description || '',
            type: gig.type || 'one-time',
            status: gig.status || 'active',
            skills: gig.skills || '',
            budget: gig.budget || '',
            deadline: gig.deadline ? gig.deadline.split(' ')[0] : '',
            location: gig.location || ''
        });
        setShowEditModal(true);
    };

    const submitEdit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                ...editForm,
                budget: parseFloat(editForm.budget)
            };
            const { error } = await apiClient
                .from('gigs')
                .update(payload)
                .eq('id', editGigId);
                
            if (!error) {
                toast.success('Gig updated successfully!');
                setShowEditModal(false);
                loadGigs();
            } else {
                toast.error('Failed to update gig.');
            }
        } catch (error) {
            toast.error('Error updating gig');
        }
    };

    const deleteGig = async (id, title) => {
        if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
        try {
            const { error } = await apiClient
                .from('gigs')
                .delete()
                .eq('id', id);
                
            if (!error) {
                toast.success('Gig deleted.');
                loadGigs();
            } else {
                toast.error('Failed to delete gig.');
            }
        } catch (error) {
            toast.error('Error deleting gig');
        }
    };

    const publishDraft = async (id, title) => {
        if (!window.confirm(`Publish "${title}"?`)) return;
        const draft = allGigs.find(g => g.id === id);
        if (!draft) return;
        
        if (!draft.title || draft.title === 'Untitled Draft' || !draft.description || !draft.budget || !draft.deadline) {
            toast.error('Please complete all required fields through Edit before publishing.');
            return;
        }
        
        try {
            const payload = {
                title: draft.title,
                description: draft.description,
                type: draft.type,
                skills: draft.skills,
                budget: draft.budget,
                deadline: draft.deadline,
                location: draft.location,
                status: 'active'
            };
            const { error } = await apiClient
                .from('gigs')
                .update(payload)
                .eq('id', id);
                
            if (!error) {
                toast.success('Draft published!');
                loadGigs();
            } else {
                toast.error('Failed to publish draft.');
            }
        } catch (error) {
            toast.error('Error publishing');
        }
    };

    return (
        <div className="content">
            <div className="flex items-center justify-between mb-20">
                <div>
                    <h1 className="h1" style={{ fontSize: '28px', margin: 0 }}>My Gigs</h1>
                    <p className="subtle">Manage and track all your posted gigs</p>
                </div>
                <div className="flex gap-10">
                    <Link to="/business/post-gig" className="btn">Post New Gig</Link>
                    <Link to="/business/dashboard" className="btn secondary">Back to Dashboard</Link>
                </div>
            </div>

            <div className="section mb-20">
                <div className="flex items-center gap-10" style={{ flexWrap: 'wrap' }}>
                    <div className="field" style={{ flex: 1, minWidth: '200px' }}>
                        <input type="text" className="input" placeholder="Search gigs..." name="search" value={filters.search} onChange={handleFilterChange} />
                    </div>
                    <div className="field">
                        <select className="select" name="status" value={filters.status} onChange={handleFilterChange}>
                            <option value="">All Status</option>
                            <option value="draft">Drafts</option>
                            <option value="active">Active</option>
                            <option value="paused">Paused</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                    <div className="field">
                        <select className="select" name="sort" value={filters.sort} onChange={handleFilterChange}>
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="budget_high">Budget: High to Low</option>
                            <option value="budget_low">Budget: Low to High</option>
                            <option value="title_asc">Title: A to Z</option>
                            <option value="title_desc">Title: Z to A</option>
                            <option value="applicants_high">Most Applicants</option>
                            <option value="applicants_low">Least Applicants</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="section">
                <h2 className="h2 mb-20">All Gigs</h2>
                {loading ? (
                    <div className="text-center subtle p-40">Loading gigs...</div>
                ) : filteredGigs.length === 0 ? (
                    <div className="text-center p-40">
                        <p className="subtle" style={{ fontSize: '18px' }}>No gigs found</p>
                        <Link to="/business/post-gig" className="btn mt-10">Post Your First Gig</Link>
                    </div>
                ) : (
                    <div>
                        {filteredGigs.map(gig => (
                            <div key={gig.id} className="card-compact mb-20">
                                <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '16px' }}>
                                    <div style={{ flex: 1, minWidth: '300px' }}>
                                        <div className="flex items-center gap-10 mb-10" style={{ flexWrap: 'wrap' }}>
                                            <h3 style={{ margin: 0, fontSize: '18px' }}>{gig.title || 'Untitled Gig'}</h3>
                                            <span className={`pill ${gig.status === 'active' ? 'green' : gig.status === 'draft' ? 'gray' : 'yellow'}`}>{gig.status}</span>
                                        </div>
                                        <p className="subtle mb-10">{gig.description?.substring(0, 150)}{gig.description?.length > 150 ? '...' : ''}</p>
                                        <div className="flex items-center gap-20" style={{ flexWrap: 'wrap' }}>
                                            <div className="flex items-center gap-5">
                                                <span className="subtle">Budget:</span>
                                                <span style={{ fontWeight: 600 }}>sh.{parseInt(gig.budget || 0).toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center gap-5">
                                                <span className="subtle">Deadline:</span>
                                                <span>{gig.deadline ? new Date(gig.deadline).toLocaleDateString() : 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center gap-5">
                                                <span className="subtle">Applications:</span>
                                                <span style={{ fontWeight: 600 }}>{gig.applicant_count || 0}</span>
                                            </div>
                                            <div className="flex items-center gap-5">
                                                <span className="subtle">Type:</span>
                                                <span style={{ textTransform: 'capitalize' }}>{gig.type?.replace('-', ' ')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-10" style={{ flexDirection: 'column' }}>
                                        {gig.status === 'draft' ? (
                                            <>
                                                <button className="btn" onClick={() => publishDraft(gig.id, gig.title)}>Publish</button>
                                                <button className="btn ghost" onClick={() => openEditModal(gig)}>Edit</button>
                                                <button className="btn ghost" style={{ color: 'var(--danger)' }} onClick={() => deleteGig(gig.id, gig.title)}>Delete</button>
                                            </>
                                        ) : (
                                            <>
                                                <Link to={`/business/applicants?gig=${gig.id}`} className="btn secondary">View Applicants</Link>
                                                <button className="btn ghost" onClick={() => openEditModal(gig)}>Edit</button>
                                                <button className="btn ghost" style={{ color: 'var(--danger)' }} onClick={() => deleteGig(gig.id, gig.title)}>Delete</button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Edit Gig Modal */}
            {showEditModal && (
                <div className="modal" style={{ display: 'flex' }} onClick={(e) => { if (e.target.className === 'modal') setShowEditModal(false); }}>
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2 style={{ margin: 0 }}>Edit Gig</h2>
                            <span className="close" onClick={() => setShowEditModal(false)}>&times;</span>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={submitEdit}>
                                <div className="field">
                                    <label className="label">Gig Title *</label>
                                    <input type="text" className="input" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} required />
                                </div>
                                <div className="field">
                                    <label className="label">Description *</label>
                                    <textarea className="textarea" rows="4" value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} required></textarea>
                                </div>
                                <div className="form-grid">
                                    <div className="field">
                                        <label className="label">Type *</label>
                                        <select className="select" value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value})} required>
                                            <option value="one-time">One-time</option>
                                            <option value="ongoing">Ongoing</option>
                                            <option value="contract">Contract</option>
                                        </select>
                                    </div>
                                    <div className="field">
                                        <label className="label">Status *</label>
                                        <select className="select" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})} required>
                                            <option value="draft">Draft</option>
                                            <option value="active">Active</option>
                                            <option value="paused">Paused</option>
                                            <option value="completed">Completed</option>
                                            <option value="cancelled">Cancelled</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="field">
                                    <label className="label">Required Skills *</label>
                                    <textarea className="textarea" rows="3" value={editForm.skills} onChange={e => setEditForm({...editForm, skills: e.target.value})} required></textarea>
                                </div>
                                <div className="form-grid">
                                    <div className="field">
                                        <label className="label">Budget (UGX) *</label>
                                        <input type="number" className="input" min="0" value={editForm.budget} onChange={e => setEditForm({...editForm, budget: e.target.value})} required />
                                    </div>
                                    <div className="field">
                                        <label className="label">Deadline *</label>
                                        <input type="date" className="input" value={editForm.deadline} onChange={e => setEditForm({...editForm, deadline: e.target.value})} required />
                                    </div>
                                </div>
                                <div className="field">
                                    <label className="label">Location</label>
                                    <input type="text" className="input" value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} />
                                </div>
                                <div className="form-navigation mt-20">
                                    <button type="button" className="btn ghost" onClick={() => setShowEditModal(false)}>Cancel</button>
                                    <button type="submit" className="btn">Update Gig</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ManageGigs;
