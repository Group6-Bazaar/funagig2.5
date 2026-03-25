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
                // Initialize form from context
                setProfileForm({
                    name: user.name || '', email: user.email || '', phone: user.phone || '',
                    university: user.university || '', major: user.major || '',
                    year: user.year || 'Year 2', availability: user.availability || 'Part-Time',
                    payment: user.payment || '', skills: user.skills || ''
                });

                // Fetch real profile from DB in case it diverged
                const { data: dbUser } = await supabase.from('users').select('*').eq('id', user.id).single();
                if (dbUser) {
                    setProfileForm(prev => ({ ...prev, ...dbUser }));
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
    }, [user]);

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
                toast.error('Failed to update profile');
            }
        } catch (error) {
            toast.error('An error occurred while updating profile.');
        } finally {
            setIsSaving(false);
        }
    };

    const handlePhotoUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('File size must be less than 5MB');
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
            toast.error('Failed to upload photo. Please ensure avatars bucket exists.');
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

    return (
        <>
            <h1 className="h1">Profile</h1>
            <form onSubmit={handleProfileUpdate}>
                <div className="section">
                    <h2>Personal Info</h2>
                    <div className="flex items-center gap-10">
                        <div className="cover-img" style={{ position: 'relative', overflow: 'hidden', width: '64px', height: '64px', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {user?.profile_image ? (
                                <img src={user.profile_image.startsWith('http') ? user.profile_image : `http://localhost/funagig/${user.profile_image}`} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : initials}
                        </div>
                        <div>
                            <label className="btn secondary" style={{ cursor: 'pointer' }}>
                                {isUploadingPhoto ? 'Uploading...' : 'Change Photo'}
                                <input type="file" accept="image/*" style={{ display: 'none' }} disabled={isUploadingPhoto} onChange={handlePhotoUpload} />
                            </label>
                        </div>
                    </div>
                    <input className="input mt-10" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} placeholder="Full Name" />
                    <input className="input mt-10" type="email" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} placeholder="Email" />
                    <input className="input mt-10" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} placeholder="Phone" />
                </div>
                
                <div className="section mt-20">
                    <h2>Academic Info</h2>
                    <input className="input" value={profileForm.university} onChange={e => setProfileForm({...profileForm, university: e.target.value})} placeholder="University" />
                    <input className="input mt-10" value={profileForm.major} onChange={e => setProfileForm({...profileForm, major: e.target.value})} placeholder="Major" />
                    <select className="select mt-10" value={profileForm.year} onChange={e => setProfileForm({...profileForm, year: e.target.value})}>
                        <option>Year 1</option>
                        <option>Year 2</option>
                        <option>Year 3</option>
                        <option>Year 4</option>
                        <option>Graduate</option>
                    </select>
                </div>

                <div className="section mt-20">
                    <h2>Skills</h2>
                    <input className="input" value={profileForm.skills} onChange={e => setProfileForm({...profileForm, skills: e.target.value})} placeholder="Comma separated skills (e.g. Web Dev, React)" />
                </div>

                <div className="section mt-20">
                    <h2>Availability & Payment</h2>
                    <select className="select" value={profileForm.availability} onChange={e => setProfileForm({...profileForm, availability: e.target.value})}>
                        <option>Part-Time</option>
                        <option>Full-Time</option>
                        <option>Weekends Only</option>
                    </select>
                    <input className="input mt-10" value={profileForm.payment} onChange={e => setProfileForm({...profileForm, payment: e.target.value})} placeholder="Payment Info" />
                </div>

                <button type="submit" className="btn mt-20" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</button>
            </form>

            <div className="section mt-40">
                <h2>Applications History</h2>
                <table className="table mt-10">
                    <thead><tr><th>Gig</th><th>Status</th><th>Date</th></tr></thead>
                    <tbody>
                        {applications.length === 0 ? (
                            <tr><td colSpan="3" className="text-center subtle">No applications found.</td></tr>
                        ) : (
                            applications.map(app => (
                                <tr key={app.id}>
                                    <td>{app.gig_title}</td>
                                    <td><span className={`pill ${app.status === 'accepted' ? 'green' : app.status === 'rejected' ? 'red' : 'yellow'}`}>{app.status}</span></td>
                                    <td>{new Date(app.created_at || app.applied_at).toLocaleDateString()}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="section mt-20">
                <h2>Completed Gigs</h2>
                <table className="table">
                    <thead><tr><th>Gig</th><th>Client</th><th>Earnings</th><th>Date</th></tr></thead>
                    <tbody>
                        {completedGigs.length === 0 ? (
                            <tr><td colSpan="4" className="text-center subtle">No completed gigs found.</td></tr>
                        ) : (
                            completedGigs.map(gig => (
                                <tr key={gig.id}>
                                    <td>{gig.gig_title}</td>
                                    <td>{gig.business_name || 'N/A'}</td>
                                    <td>sh.{parseInt(gig.budget || 0).toLocaleString()}</td>
                                    <td>{gig.completed_at ? new Date(gig.completed_at).toLocaleDateString() : 'N/A'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="section mt-40">
                <div className="flex items-center justify-between mb-20">
                    <h2>Reviews & Ratings</h2>
                    {ratingStats && ratingStats.total_reviews > 0 ? (
                        <div className="text-right">
                            <div style={{ fontSize: '24px', fontWeight: '600' }}>{ratingStats.average_rating.toFixed(1)}/5</div>
                            <div className="subtle">{ratingStats.total_reviews} reviews</div>
                        </div>
                    ) : (
                        <div className="text-right subtle">0 reviews</div>
                    )}
                </div>
                
                {reviews.length === 0 ? (
                    <div className="empty-state"><p>No reviews yet.</p></div>
                ) : (
                    reviews.map(review => (
                        <div key={review.id} className="card mb-10" style={{ padding: '16px' }}>
                            <div className="flex items-center justify-between mb-8">
                                <div style={{ fontWeight: '600' }}>{review.reviewer_name}</div>
                                <div style={{ color: '#ffc107', fontSize: '20px' }}>{'★'.repeat(review.rating) + '☆'.repeat(5 - review.rating)}</div>
                            </div>
                            <p className="subtle m-0">{review.comment || 'No comment provided.'}</p>
                        </div>
                    ))
                )}
            </div>

            <div className="section mt-40">
                <div className="flex items-center justify-between mb-20">
                    <h2>Portfolio</h2>
                    <button type="button" className="btn secondary" onClick={() => setShowPortfolioModal(true)}>+ Add Item</button>
                </div>
                
                <div className="portfolio-gallery">
                    {portfolio.length === 0 ? (
                        <div className="empty-state"><p>No portfolio items yet. Add your projects and work samples.</p></div>
                    ) : (
                        portfolio.map(item => (
                            <div key={item.id} className="card p-10 mt-10">
                                <h4>{item.name}</h4>
                                <p className="subtle">{item.category} - {item.date}</p>
                                <p>{item.description}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Portfolio Upload Modal */}
            {showPortfolioModal && (
                <div className="modal" style={{ display: 'flex' }}>
                    <div className="modal-content" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                            <h3>Add Portfolio Item</h3>
                            <button type="button" className="modal-close" onClick={() => setShowPortfolioModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handlePortfolioAdd}>
                                <div className="field">
                                    <label className="label">File</label>
                                    <input type="file" onChange={e => setPortfolioForm({...portfolioForm, file: e.target.files[0]})} className="input" required />
                                </div>
                                <div className="field">
                                    <label className="label">Category</label>
                                    <select value={portfolioForm.category} onChange={e => setPortfolioForm({...portfolioForm, category: e.target.value})} className="select">
                                        <option value="portfolio">Portfolio</option>
                                        <option value="certificate">Certificate</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="field">
                                    <label className="label">Description</label>
                                    <textarea value={portfolioForm.description} onChange={e => setPortfolioForm({...portfolioForm, description: e.target.value})} className="textarea" rows="3" placeholder="Describe this project or file..."></textarea>
                                </div>
                                <div className="modal-actions mt-20">
                                    <button type="button" className="btn secondary mr-10" onClick={() => setShowPortfolioModal(false)}>Cancel</button>
                                    <button type="submit" className="btn">Upload</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Profile;
