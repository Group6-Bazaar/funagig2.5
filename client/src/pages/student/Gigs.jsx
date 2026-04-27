import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import toast from '../../utils/toast';

const Gigs = () => {
    const { user } = useAuth();
    const location = useLocation();
    
    const [allGigs, setAllGigs] = useState([]);
    const [savedGigs, setSavedGigs] = useState([]);
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // UI States
    const [searchTerm, setSearchTerm] = useState('');
    const [currentSort, setCurrentSort] = useState('newest');
    const [activeTab, setActiveTab] = useState('browse');

    useEffect(() => {
        const hash = location.hash.replace('#', '');
        if (hash && ['browse', 'saved', 'interested', 'applications'].includes(hash)) {
            setActiveTab(hash);
        }
    }, [location.hash]);

    const fetchGigsData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Fetch active gigs
            const { data: gigsData } = await supabase
                .from('active_gigs')
                .select('*')
                .order('created_at', { ascending: false });

            if (gigsData) setAllGigs(gigsData);

            // Fetch saved gigs
            const { data: savedData } = await supabase
                .from('saved_gigs')
                .select('gig_id')
                .eq('user_id', user.id);

            if (savedData) setSavedGigs(savedData.map(s => s.gig_id));

            // Fetch applications
            const { data: appsData } = await supabase
                .from('application_details')
                .select('*')
                .eq('user_id', user.id);

            if (appsData) setApplications(appsData);
        } catch (error) {
            toast.error('Failed to load gigs data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGigsData();
    }, [user]);

    const toggleSaveGig = async (gigId, e) => {
        if (e) e.stopPropagation();
        
        const isSaved = savedGigs.includes(gigId);
        
        try {
            if (isSaved) {
                const { error } = await supabase
                    .from('saved_gigs')
                    .delete()
                    .eq('user_id', user.id)
                    .eq('gig_id', gigId);
                if (error) throw error;
                setSavedGigs(savedGigs.filter(id => id !== gigId));
                toast.success('Gig removed from saved');
            } else {
                const { error } = await supabase
                    .from('saved_gigs')
                    .insert([{ user_id: user.id, gig_id: gigId }]);
                if (error) throw error;
                setSavedGigs([...savedGigs, gigId]);
                toast.success('Gig saved successfully');
            }
        } catch (error) {
            toast.error('Failed to update saved gig');
        }
    };

    const applyToGig = async (gigId, title) => {
        const alreadyApplied = applications.find(app => String(app.gig_id) === String(gigId));
        if (alreadyApplied) {
            toast.error('You have already applied to this gig');
            return;
        }

        const message = window.prompt(`Apply for "${title}": Enter your application message`);
        if (!message) return;

        try {
            const { error } = await supabase
                .from('applications')
                .insert([{
                    user_id: user.id,
                    gig_id: gigId,
                    message: message,
                    status: 'pending'
                }]);

            if (error) {
                if (error.code === '23505') {
                    toast.error('You have already applied to this gig');
                } else {
                    throw error;
                }
            } else {
                toast.success('Application submitted successfully!');
                fetchGigsData();
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

    const isGigSaved = (gigId) => savedGigs.includes(gigId);

    const renderGigCard = (gig, context = 'browse') => {
        const deadline = gig.deadline ? new Date(gig.deadline).toLocaleDateString() : 'N/A';
        const isSaved = isGigSaved(gig.id);

        return (
            <article key={gig.id} className="gig-card section">
                <div className="gig-card__thumb" />
                <div className="gig-card__body">
                    <h3 style={{ margin: '0 0 8px 0' }}>{gig.title || 'Untitled Gig'}</h3>
                    <p className="subtle" style={{ marginBottom: '8px', fontSize: '14px' }}>{(gig.description || '').substring(0, 120)}...</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                        {gig.skills && <span className="pill gray">{gig.skills.split(',')[0].trim()}</span>}
                        <span className="subtle" style={{ fontSize: '12px' }}>💰 sh.{parseInt(gig.budget || 0).toLocaleString()}</span>
                        <span className="subtle" style={{ fontSize: '12px' }}>📅 {deadline}</span>
                    </div>
                </div>
                <div className="gig-card__actions">
                    {context === 'browse' && (
                        <>
                            <button className={`btn ${isSaved ? 'secondary' : ''}`} style={{ fontSize: '13px', padding: '8px 14px' }} onClick={(e) => toggleSaveGig(gig.id, e)}>
                                {isSaved ? '✓ Saved' : 'Save'}
                            </button>
                            <button className="btn" style={{ fontSize: '13px', padding: '8px 14px' }} onClick={() => applyToGig(gig.id, gig.title)}>Apply</button>
                        </>
                    )}
                    {context === 'saved' && (
                        <>
                            <button className="btn secondary" style={{ fontSize: '13px', padding: '8px 14px' }} onClick={(e) => toggleSaveGig(gig.id, e)}>Remove</button>
                            <button className="btn" style={{ fontSize: '13px', padding: '8px 14px' }} onClick={() => applyToGig(gig.id, gig.title)}>Apply</button>
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
                                    allGigs.filter(g => isGigSaved(g.id)).map(gig => renderGigCard(gig, 'saved'))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Interested Tab — saved gigs not yet applied to */}
                    {activeTab === 'interested' && (() => {
                        const appliedGigIds = new Set(applications.map(a => String(a.gig_id)));
                        const interestedGigs = allGigs.filter(g =>
                            isGigSaved(g.id) && !appliedGigIds.has(String(g.id))
                        );
                        return (
                            <div className="tab-content mt-20" style={{ display: 'block' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <h2 style={{ margin: 0 }}>Interested Gigs</h2>
                                    <span className="pill gray">{interestedGigs.length} gig{interestedGigs.length !== 1 ? 's' : ''}</span>
                                </div>
                                <p className="subtle" style={{ marginBottom: '16px', fontSize: '14px' }}>
                                    Gigs you've saved but haven't applied to yet.
                                </p>
                                {interestedGigs.length === 0 ? (
                                    <div className="section" style={{ textAlign: 'center', padding: '40px' }}>
                                        <div style={{ fontSize: '40px', marginBottom: '12px' }}>🔖</div>
                                        <p style={{ fontWeight: '600', marginBottom: '8px' }}>Nothing here yet</p>
                                        <p className="subtle" style={{ fontSize: '14px' }}>
                                            Save gigs from the Browse tab to track ones you're interested in. They'll appear here until you apply.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="card-grid">
                                        {interestedGigs.map(gig => renderGigCard(gig, 'saved'))}
                                    </div>
                                )}
                            </div>
                        );
                    })()}

                    {/* Applications Tab */}
                    {activeTab === 'applications' && (
                        <div className="tab-content mt-20" style={{ display: 'block' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                                <h2 style={{ margin: 0 }}>My Applications</h2>
                                <span className="pill gray">{applications.length} total</span>
                            </div>
                            {applications.length === 0 ? (
                                <div className="section" style={{ textAlign: 'center', padding: '40px' }}>
                                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
                                    <p style={{ fontWeight: '600', marginBottom: '8px' }}>No applications yet</p>
                                    <p className="subtle" style={{ fontSize: '14px' }}>Browse available gigs and hit Apply to get started.</p>
                                </div>
                            ) : (
                                applications.map(app => (
                                    <div key={app.id} className="app-card">
                                        <div className="app-card__info">
                                            <div className="app-card__title">{app.gig_title || 'Unknown Gig'}</div>
                                            <div className="subtle" style={{ fontSize: '12px' }}>
                                                Applied {new Date(app.created_at || app.applied_at).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <span className={`pill ${app.status === 'accepted' ? 'green' : app.status === 'rejected' ? 'red' : 'yellow'}`}>
                                            {app.status}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                </>
            )}
        </>
    );
};

export default Gigs;
