import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import toast from '../../utils/toast';

const Profile = () => {
    const { user, setUser } = useAuth();
    
    // Form State
    const [profileForm, setProfileForm] = useState({
        name: '', email: '', phone: '', university: '', major: '', year: 'Year 2',
        availability: 'Part-Time', payment: '', skills: ''
    });

    const [applications, setApplications] = useState([]);
    const [completedGigs, setCompletedGigs] = useState([]);
    const [reviews, setReviews] = useState([]);
    const [ratingStats, setRatingStats] = useState(null);
    const [portfolio, setPortfolio] = useState([]);
    const [loading, setLoading] = useState(true);

    const [isSaving, setIsSaving] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

    // Modal State
    const [showPortfolioModal, setShowPortfolioModal] = useState(false);
    const [portfolioForm, setPortfolioForm] = useState({ file: null, category: 'portfolio', description: '' });

    useEffect(() => {
        const fetchProfileData = async () => {
            if (!user) return;
            setLoading(true);
            try {
            // Initialize form from context - prefer DB profile, fall back to auth metadata
                const meta = user.user_metadata || {};
                setProfileForm({
                    name: user.name || meta.name || '',
                    email: user.email || '',
                    phone: user.phone || '',
                    university: user.university || '',
                    major: user.major || '',
                    year: user.year || 'Year 2',
                    availability: user.availability || 'Part-Time',
                    payment: user.payment || '',
                    skills: user.skills || ''
                });

                // Fetch real profile from DB in case it diverged
                const { data: dbUser, error: dbErr } = await supabase.from('users').select('*').eq('id', user.id).single();
                if (dbErr) {
                    console.warn('Profile DB fetch failed (check RLS policies):', dbErr.message);
                }
                if (dbUser) {
                    setProfileForm(prev => ({ ...prev, ...dbUser }));
                    // DON'T call setUser here — it causes an infinite re-render loop
                }

                // Fetch applications
                const { data: appsData } = await supabase
                    .from('application_details')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('applied_at', { ascending: false });

                if (appsData) {
                    setApplications(appsData);
                    setCompletedGigs(appsData.filter(a => a.status === 'completed'));
                }

                // Fetch reviews
                const { data: reviewsData } = await supabase
                    .from('reviews')
                    .select('*')
                    .eq('reviewee_id', user.id);

                if (reviewsData) {
                    setReviews(reviewsData);
                    if (reviewsData.length > 0) {
                        const total = reviewsData.reduce((acc, r) => acc + r.rating, 0);
                        setRatingStats({
                            total_reviews: reviewsData.length,
                            average_rating: total / reviewsData.length
                        });
                    }
                }
            } catch (error) {
                console.error("Failed to load profile details", error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, [user?.id]); // Only re-run when the user's ID changes, not every user state update

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('users')
                .update(profileForm)
                .eq('id', user.id);

            if (!error) {
                toast.success('Profile updated successfully!');
                setUser({ ...user, ...profileForm });
            } else {
                console.error('Profile update error:', error);
                if (error.code === '42501' || error.message?.includes('policy')) {
                    toast.error('Update blocked by database policy. Please add an UPDATE policy on the users table in your Supabase dashboard.');
                } else {
                    toast.error('Failed to update: ' + error.message);
                }
            }
        } catch (error) {
            console.error('Profile update exception:', error);
            toast.error('An error occurred while updating profile.');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 15 * 1024 * 1024) {
            toast.error('File size must be less than 15MB');
            e.target.value = '';
            return;
        }

        setIsUploadingPhoto(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `profile-pictures/${fileName}`;

            // Upload the file to Supabase storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // Update user profile with new URL
            const { error: updateError } = await supabase
                .from('users')
                .update({ profile_image: publicUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;

            setUser({ ...user, profile_image: publicUrl });
            toast.success('Photo updated successfully!');
        } catch (error) {
            console.error('Upload Error:', error);
            toast.error('Failed to upload photo. Please ensure avatars bucket exists and allows uploads.');
        } finally {
            setIsUploadingPhoto(false);
            if (e.target) e.target.value = '';
        }
    };

    const handleRemovePhoto = async () => {
        setIsUploadingPhoto(true);
        try {
            const { error: updateError } = await supabase
                .from('users')
                .update({ profile_image: null })
                .eq('id', user.id);

            if (updateError) throw updateError;

            setUser({ ...user, profile_image: null });
            toast.success('Photo removed successfully!');
        } catch (error) {
            console.error('Remove Error:', error);
            toast.error('Failed to remove photo.');
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    const handlePortfolioAdd = (e) => {
        e.preventDefault();
        if (!portfolioForm.file) return;
        
        // Mocking portfolio add for now
        const newItem = {
            id: Date.now(),
            category: portfolioForm.category,
            description: portfolioForm.description,
            name: portfolioForm.file.name,
            date: new Date().toLocaleDateString()
        };
        
        setPortfolio([newItem, ...portfolio]);
        setShowPortfolioModal(false);
        setPortfolioForm({ file: null, category: 'portfolio', description: '' });
        toast.success("Portfolio item added.");
    };

    if (loading || !user) return <div className="text-center mt-40 subtle">Loading profile data...</div>;

    const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
    const skillsList = profileForm.skills ? profileForm.skills.split(',').map(s => s.trim()).filter(Boolean) : [];

    return (
        <>
            <div style={{ maxWidth: '860px', margin: '0 auto', paddingBottom: '40px' }}>

                {/* Cover + Avatar Hero Card */}
                <div className="card" style={{ overflow: 'hidden', marginBottom: '16px', padding: 0 }}>
                    {/* Cover Photo */}
                    <div style={{ height: '180px', background: 'linear-gradient(135deg, var(--primary) 0%, #818cf8 100%)', position: 'relative' }} />

                    {/* Avatar + Action Row */}
                    <div style={{ padding: '0 24px 20px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '16px' }}>
                            {/* Avatar overlapping cover */}
                            <div style={{
                                width: '120px', height: '120px', borderRadius: '50%',
                                border: '4px solid var(--panel-solid)', background: 'var(--primary-light)',
                                marginTop: '-60px', flexShrink: 0, overflow: 'hidden',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '42px', fontWeight: '700', color: 'var(--primary)',
                                fontFamily: 'var(--font-heading)', position: 'relative',
                                boxShadow: 'var(--shadow-md)'
                            }}>
                                {user?.profile_image ? (
                                    <img src={user.profile_image} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : initials}
                                {/* Photo upload hover overlay */}
                                <label style={{
                                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: 'pointer', opacity: isUploadingPhoto ? 1 : 0,
                                    transition: 'opacity 0.2s ease', borderRadius: '50%', color: '#fff',
                                    fontSize: '13px', fontWeight: '600', textAlign: 'center'
                                }} className="avatar-upload-overlay">
                                    {isUploadingPhoto ? '...' : '📷'}
                                    <input type="file" accept="image/*" style={{ display: 'none' }} disabled={isUploadingPhoto} onChange={handlePhotoUpload} />
                                </label>
                            </div>
                            {/* Name + Headline */}
                            <div style={{ paddingBottom: '6px' }}>
                                <h2 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: '700' }}>{user?.name || 'Your Name'}</h2>
                                <p style={{ margin: '0 0 4px', color: 'var(--muted)', fontSize: '15px' }}>{profileForm.major}{profileForm.major && profileForm.university ? ' · ' : ''}{profileForm.university}</p>
                                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '14px' }}>{profileForm.availability} availability</p>
                            </div>
                        </div>
                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: '8px', paddingBottom: '6px', flexShrink: 0 }}>
                            {user?.profile_image && (
                                <button type="button" className="btn ghost" disabled={isUploadingPhoto} onClick={handleRemovePhoto} style={{ fontSize: '13px', padding: '8px 16px' }}>
                                    Remove Photo
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Stats ribbon */}
                    {(ratingStats || applications.length > 0 || completedGigs.length > 0) && (
                        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 24px', display: 'flex', gap: '32px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary)' }}>{applications.length}</div>
                                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Applications</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary)' }}>{completedGigs.length}</div>
                                <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Completed Gigs</div>
                            </div>
                            {ratingStats && (
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--primary)' }}>{ratingStats.average_rating.toFixed(1)}⭐</div>
                                    <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Avg Rating</div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Edit Profile Form Card */}
                <form onSubmit={handleProfileUpdate}>
                    {/* Personal Info Card */}
                    <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
                        <h3 style={{ margin: '0 0 20px', fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: '700' }}>Personal Info</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Full Name</label>
                                <input className="input" style={{ width: '100%', marginTop: '6px' }} value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} placeholder="Full Name" />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</label>
                                <input className="input" style={{ width: '100%', marginTop: '6px' }} type="email" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} placeholder="Email" />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone</label>
                                <input className="input" style={{ width: '100%', marginTop: '6px' }} value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} placeholder="Phone" />
                            </div>
                        </div>
                    </div>

                    {/* Education Card */}
                    <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
                        <h3 style={{ margin: '0 0 20px', fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: '700' }}>🎓 Education</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>University</label>
                                <input className="input" style={{ width: '100%', marginTop: '6px' }} value={profileForm.university} onChange={e => setProfileForm({...profileForm, university: e.target.value})} placeholder="University / College" />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Major / Course</label>
                                <input className="input" style={{ width: '100%', marginTop: '6px' }} value={profileForm.major} onChange={e => setProfileForm({...profileForm, major: e.target.value})} placeholder="e.g. Computer Science" />
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Year of Study</label>
                                <select className="select" style={{ width: '100%', marginTop: '6px' }} value={profileForm.year} onChange={e => setProfileForm({...profileForm, year: e.target.value})}>
                                    <option>Year 1</option>
                                    <option>Year 2</option>
                                    <option>Year 3</option>
                                    <option>Year 4</option>
                                    <option>Graduate</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Skills Card */}
                    <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
                        <h3 style={{ margin: '0 0 16px', fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: '700' }}>🛠 Skills</h3>
                        <input className="input" style={{ width: '100%' }} value={profileForm.skills} onChange={e => setProfileForm({...profileForm, skills: e.target.value})} placeholder="e.g. React, Graphic Design, Web Dev (comma separated)" />
                        {skillsList.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '14px' }}>
                                {skillsList.map((skill, i) => (
                                    <span key={i} className="pill gray" style={{ background: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid #c7d2fe', fontWeight: '600' }}>{skill}</span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Availability Card */}
                    <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
                        <h3 style={{ margin: '0 0 20px', fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: '700' }}>⚙️ Availability & Payment</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Availability</label>
                                <select className="select" style={{ width: '100%', marginTop: '6px' }} value={profileForm.availability} onChange={e => setProfileForm({...profileForm, availability: e.target.value})}>
                                    <option>Part-Time</option>
                                    <option>Full-Time</option>
                                    <option>Weekends Only</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Payment Info</label>
                                <input className="input" style={{ width: '100%', marginTop: '6px' }} value={profileForm.payment} onChange={e => setProfileForm({...profileForm, payment: e.target.value})} placeholder="Mobile Money, Bank, etc." />
                            </div>
                        </div>
                    </div>

                    <button type="submit" className="btn" style={{ width: '100%' }} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Profile'}</button>
                </form>

                {/* Application History Card */}
                <div className="card" style={{ padding: '24px', marginBottom: '16px', marginTop: '16px' }}>
                    <h3 style={{ margin: '0 0 20px', fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: '700' }}>📋 Application History</h3>
                    {applications.length === 0 ? (
                        <p style={{ color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>No applications yet. Start browsing gigs!</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {applications.map(app => (
                                <div key={app.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                                    <div>
                                        <div style={{ fontWeight: '600', marginBottom: '2px' }}>{app.gig_title}</div>
                                        <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{new Date(app.created_at || app.applied_at).toLocaleDateString()}</div>
                                    </div>
                                    <span className={`pill ${app.status === 'accepted' ? 'green' : app.status === 'rejected' ? 'red' : 'yellow'}`}>{app.status}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Reviews Card */}
                {reviews.length > 0 && (
                    <div className="card" style={{ padding: '24px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontSize: '18px', fontWeight: '700' }}>⭐ Reviews</h3>
                            {ratingStats && <span style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '18px' }}>{ratingStats.average_rating.toFixed(1)} / 5</span>}
                        </div>
                        {reviews.map(review => (
                            <div key={review.id} style={{ padding: '14px', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <span style={{ fontWeight: '600' }}>{review.reviewer_name}</span>
                                    <span style={{ color: '#f59e0b' }}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                                </div>
                                <p style={{ margin: 0, color: 'var(--muted)', fontSize: '14px' }}>{review.comment || 'No comment provided.'}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Portfolio Modal */}
                {showPortfolioModal && (
                    <div className="modal" style={{ display: 'flex' }}>
                        <div className="modal-content" style={{ maxWidth: '500px' }}>
                            <div className="modal-header">
                                <h3>Add Portfolio Item</h3>
                                <button type="button" className="modal-close" onClick={() => setShowPortfolioModal(false)}>×</button>
                            </div>
                            <div className="modal-body">
                                <form onSubmit={handlePortfolioAdd}>
                                    <div className="field"><label className="label">File</label><input type="file" onChange={e => setPortfolioForm({...portfolioForm, file: e.target.files[0]})} className="input" required /></div>
                                    <div className="field"><label className="label">Category</label>
                                        <select value={portfolioForm.category} onChange={e => setPortfolioForm({...portfolioForm, category: e.target.value})} className="select">
                                            <option value="portfolio">Portfolio</option>
                                            <option value="certificate">Certificate</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div className="field"><label className="label">Description</label><textarea value={portfolioForm.description} onChange={e => setPortfolioForm({...portfolioForm, description: e.target.value})} className="textarea" rows="3" placeholder="Describe this project..."></textarea></div>
                                    <div className="modal-actions mt-20">
                                        <button type="button" className="btn secondary mr-10" onClick={() => setShowPortfolioModal(false)}>Cancel</button>
                                        <button type="submit" className="btn">Upload</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Avatar hover effect CSS */}
            <style>{`
                .avatar-upload-overlay { opacity: 0 !important; }
                div:hover > .avatar-upload-overlay { opacity: 1 !important; }
            `}</style>
        </>
    );
};

export default Profile;

