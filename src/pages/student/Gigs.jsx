import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../utils/api';
import toast from '../../utils/toast';

const Gigs = () => {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState('browse');
    const [searchTerm, setSearchTerm] = useState('');
    const [currentSort, setCurrentSort] = useState('newest');

    const [allGigs, setAllGigs] = useState([]);
    const [savedGigs, setSavedGigs] = useState([]);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const hash = location.hash.replace('#', '');
        if (hash && ['browse', 'saved', 'interested', 'applications'].includes(hash)) {
            setActiveTab(hash);
        }
    }, [location.hash]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [gigsRes, savedRes, appsRes] = await Promise.all([
                    api.get('/gigs').catch(() => ({ success: false })),
                    api.get('/saved-gigs').catch(() => ({ success: false })),
                    api.get('/applications').catch(() => ({ success: false }))
                ]);

                if (gigsRes.success && gigsRes.gigs) setAllGigs(gigsRes.gigs);
                if (savedRes.success && savedRes.saved_gigs) setSavedGigs(savedRes.saved_gigs);
                if (appsRes.success && appsRes.applications) setApplications(appsRes.applications);
            } catch (error) {
                console.error('Failed to fetch gig data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const toggleSaveGig = async (gigId, isSaved) => {
        try {
            if (isSaved) {
                const res = await api.delete(`/saved-gigs?gig_id=${gigId}`);
                if (res.success) {
                    setSavedGigs(savedGigs.filter(g => g.id !== gigId));
                    toast.success('Gig removed from saved');
                }
            } else {
                const res = await api.post('/saved-gigs', { gig_id: gigId });
                if (res.success) {
                    const gig = allGigs.find(g => g.id === gigId);
                    if (gig) setSavedGigs([...savedGigs, gig]);
                    toast.success('Gig saved!');
                }
            }
        } catch (error) {
            toast.error('Failed to save/unsave gig');
        }
    };

    const applyToGig = async (gigId, title) => {
        // Quick mock application for now, a real modal could be added later
        const alreadyApplied = applications.find(app => String(app.gig_id) === String(gigId));
        if (alreadyApplied) {
            toast.error('You have already applied to this gig');
            return;
        }

        const message = window.prompt(`Apply for "${title}": Enter your application message`);
        if (!message) return;

        try {
            const res = await api.post('/applications', { gig_id: gigId, message });
            if (res.success) {
                toast.success('Application submitted successfully!');
                // refresh applications
                const newAppsRes = await api.get('/applications');
                if (newAppsRes.success) setApplications(newAppsRes.applications);
            } else {
                toast.error(res.error || 'Failed to submit application');
            }
        } catch (error) {
            toast.error('Application error occurred');
        }
    };

    const sortedAndFilteredGigs = [...allGigs]
        .filter(g => {
            const term = searchTerm.toLowerCase();
            return (g.title || '').toLowerCase().includes(term) || (g.description || '').toLowerCase().includes(term);
        })
        .sort((a, b) => {
            if (currentSort === 'newest') return new Date(b.created_at) - new Date(a.created_at);
            if (currentSort === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
            if (currentSort === 'budget_high') return (b.budget || 0) - (a.budget || 0);
            if (currentSort === 'budget_low') return (a.budget || 0) - (b.budget || 0);
            if (currentSort === 'title_asc') return (a.title || '').localeCompare(b.title || '');
            if (currentSort === 'title_desc') return (b.title || '').localeCompare(a.title || '');
            return 0;
        });

    const isGigSaved = (gigId) => savedGigs.some(g => g.id === gigId);

    const renderGigCard = (gig, context = 'browse') => {
        const deadline = gig.deadline ? new Date(gig.deadline).toLocaleDateString() : 'N/A';
        const isSaved = isGigSaved(gig.id);

        return (
            <article key={gig.id} className="section" style={{ display: 'grid', gridTemplateColumns: '160px 1fr auto', gap: '16px', marginBottom: '16px' }}>
                <div style={{ height: '120px', background: '#dbeafe', borderRadius: '12px' }}></div>
                <div>
                    <h3 style={{ margin: '0 0 8px 0' }}>{gig.title || 'Untitled Gig'}</h3>
                    <p className="subtle" style={{ marginBottom: '8px' }}>{(gig.description || '').substring(0, 100)}...</p>
                    <div className="flex items-center gap-10" style={{ flexWrap: 'wrap', marginTop: '8px' }}>
                        {gig.skills && <span className="pill blue">{gig.skills.split(',')[0].trim()}</span>}
                        <span className="subtle" style={{ fontSize: '12px' }}>Budget: sh.{parseInt(gig.budget || 0).toLocaleString()}</span>
                        <span className="subtle" style={{ fontSize: '12px' }}>Deadline: {deadline}</span>
                    </div>
                </div>
                <div style={{ display: 'grid', gap: '10px' }}>
                    {context === 'browse' && (
                        <>
                            <button className={`btn ${isSaved ? 'secondary' : ''}`} onClick={() => toggleSaveGig(gig.id, isSaved)}>
                                {isSaved ? '✓ Saved' : 'Save'}
                            </button>
                            <button className="btn" onClick={() => applyToGig(gig.id, gig.title)}>Apply</button>
                            <button className="btn secondary" onClick={() => toast.success('Interest logged!')}>Interest</button>
                        </>
                    )}
                    {context === 'saved' && (
                        <>
                            <button className="btn secondary" onClick={() => toggleSaveGig(gig.id, true)}>Remove</button>
                            <button className="btn" onClick={() => applyToGig(gig.id, gig.title)}>Apply</button>
                        </>
                    )}
                </div>
            </article>
        );
    };

    return (
        <>
            <h1 className="h1">Gigs</h1>
            <div className="tabs">
                <button className={`tab ${activeTab === 'browse' ? 'active' : ''}`} onClick={() => setActiveTab('browse')}>Browse</button>
                <button className={`tab ${activeTab === 'saved' ? 'active' : ''}`} onClick={() => setActiveTab('saved')}>Saved</button>
                <button className={`tab ${activeTab === 'interested' ? 'active' : ''}`} onClick={() => setActiveTab('interested')}>Interested</button>
                <button className={`tab ${activeTab === 'applications' ? 'active' : ''}`} onClick={() => setActiveTab('applications')}>Applications</button>
            </div>

            {loading ? (
                <div className="text-center mt-20 text-subtle">Loading...</div>
            ) : (
                <>
                    {/* Browse Tab */}
                    {activeTab === 'browse' && (
                        <div className="tab-content mt-20" style={{ display: 'block' }}>
                            <div className="flex items-center justify-between mb-20">
                                <h2>Find Gigs</h2>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <input 
                                        type="text" 
                                        className="input" 
                                        placeholder="Search gigs..." 
                                        style={{ width: '300px' }} 
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                    <select className="select" style={{ width: '180px' }} value={currentSort} onChange={e => setCurrentSort(e.target.value)}>
                                        <option value="newest">Newest First</option>
                                        <option value="oldest">Oldest First</option>
                                        <option value="budget_high">Budget: High to Low</option>
                                        <option value="budget_low">Budget: Low to High</option>
                                        <option value="title_asc">Title: A to Z</option>
                                        <option value="title_desc">Title: Z to A</option>
                                    </select>
                                </div>
                            </div>
                            <div className="card-grid">
                                {sortedAndFilteredGigs.length === 0 ? (
                                    <p className="subtle">No gigs found.</p>
                                ) : (
                                    sortedAndFilteredGigs.map(gig => renderGigCard(gig, 'browse'))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Saved Tab */}
                    {activeTab === 'saved' && (
                        <div className="tab-content mt-20" style={{ display: 'block' }}>
                            <h2>Saved Gigs</h2>
                            <div className="card-grid mt-20">
                                {savedGigs.length === 0 ? (
                                    <p className="subtle">No saved gigs.</p>
                                ) : (
                                    savedGigs.map(gig => renderGigCard(gig, 'saved'))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Interested Tab */}
                    {activeTab === 'interested' && (
                        <div className="tab-content mt-20" style={{ display: 'block' }}>
                            <h2>Interested Gigs</h2>
                            <p className="subtle">Future enhancement: Load interested gigs here.</p>
                        </div>
                    )}

                    {/* Applications Tab */}
                    {activeTab === 'applications' && (
                        <div className="tab-content mt-20" style={{ display: 'block' }}>
                            <h2>My Applications</h2>
                            <div className="mt-20">
                                {applications.length === 0 ? (
                                    <p className="subtle">You haven't applied to any gigs yet.</p>
                                ) : (
                                    applications.map(app => (
                                        <article key={app.id} className="section mb-10">
                                            <h3>{app.gig_title || 'Unknown Gig'}</h3>
                                            <p className="subtle">Status: <span className={`badge ${app.status === 'accepted' ? 'success' : app.status === 'rejected' ? 'danger' : 'warning'}`}>{app.status}</span></p>
                                            <p className="subtle mt-5" style={{ fontSize: '12px' }}>Applied on: {new Date(app.created_at).toLocaleDateString()}</p>
                                        </article>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </>
    );
};

export default Gigs;
