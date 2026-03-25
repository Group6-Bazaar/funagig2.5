import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../utils/supabase';
import toast from '../../utils/toast';

const Profile = () => {
    const { user, setUser } = useAuth();
    const [stats, setStats] = useState({ active_gigs: 0, total_applicants: 0, hired_students: 0, avg_rating: 0 });
    const [reviews, setReviews] = useState([]);
    const [ratingStats, setRatingStats] = useState({ total_reviews: 0, average_rating: 0 });
    const [loading, setLoading] = useState(true);

    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '', industry: 'technology', company_size: '51-100', founded_year: '',
        location: '', website: '', phone: '', bio: '', skills: ''
    });

    useEffect(() => {
        if (user) {
            setEditForm({
                name: user.name || '',
                industry: user.industry || 'technology',
                company_size: user.company_size || '51-100',
                founded_year: user.founded_year || '',
                location: user.location || '',
                website: user.website || '',
                phone: user.phone || '',
                bio: user.bio || '',
                skills: user.skills || ''
            });
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Fetch stats from Supabase
            const { count: activeGigsCount } = await supabase
                .from('gigs')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .neq('status', 'draft');

            // Quick hack to get application counts
            // In a real app we'd do a join via `gigs`, but this is sufficient for now
            const { data: gigsData } = await supabase.from('gigs').select('id').eq('user_id', user.id);
            let totalApps = 0;
            let totalHired = 0;

            if (gigsData && gigsData.length > 0) {
                const gigIds = gigsData.map(g => g.id);
                const { count: appsCount } = await supabase
                    .from('applications')
                    .select('*', { count: 'exact', head: true })
                    .in('gig_id', gigIds);
                totalApps = appsCount || 0;

                const { count: hiredCount } = await supabase
                    .from('applications')
                    .select('*', { count: 'exact', head: true })
                    .in('gig_id', gigIds)
                    .eq('status', 'accepted');
                totalHired = hiredCount || 0;
            }

            setStats({
                active_gigs: activeGigsCount || 0,
                total_applicants: totalApps,
                hired_students: totalHired,
                avg_rating: 0
            });

            const { data: reviewsData } = await supabase
                .from('reviews')
                .select('*')
                .eq('reviewee_id', user.id);

            if (reviewsData) {
                setReviews(reviewsData);
                if (reviewsData.length > 0) {
                    const total = reviewsData.reduce((acc, r) => acc + r.rating, 0);
                    const avg = total / reviewsData.length;
                    
                    setRatingStats({ total_reviews: reviewsData.length, average_rating: avg });
                    setStats(prev => ({ ...prev, avg_rating: avg }));
                }
            }
        } catch (error) {
            toast.error('Failed to load profile data.');
        } finally {
            setLoading(false);
        }
    };

    const handleEditChange = (e) => setEditForm({ ...editForm, [e.target.name]: e.target.value });

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        try {
            const { error: updateError } = await supabase
                .from('users')
                .update(editForm)
                .eq('id', user.id);

            if (!updateError) {
                toast.success('Profile updated successfully');
                setUser({ ...user, ...editForm });
                setShowEditModal(false);
            } else {
                toast.error(updateError.message || 'Failed to update profile');
            }
        } catch {
            toast.error('Error updating profile');
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

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `profile-pictures/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const { error: updateError } = await supabase
                .from('users')
                .update({ profile_image: publicUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;

            setUser({ ...user, profile_image: publicUrl });
            toast.success('Profile photo updated.');
        } catch (error) {
            console.error('Upload Error:', error);
            toast.error('Error uploading photo. Ensure the avatars bucket exists and allows uploads.');
        }
    };

    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

    const handlePhotoUploadWrap = async (e) => {
        setIsUploadingPhoto(true);
        try {
            await handlePhotoUpload(e);
        } finally {
            setIsUploadingPhoto(false);
            e.target.value = '';
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

    if (loading && !user) return <div className="p-40 text-center subtle">Loading profile...</div>;

    const initials = (user?.name || 'B').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    const skillsList = user?.skills ? user.skills.split(',').map(s => s.trim()).filter(Boolean) : [];

    return (
        <React.Fragment>
            <div className="flex items-center justify-between mb-20">
                <div>
                    <h1 className="h1" style={{ fontSize: '28px', margin: 0 }}>Business Profile</h1>
                    <p className="subtle">Manage your business information and settings</p>
                </div>
                <div className="flex gap-10">
                    <button className="btn" onClick={() => setShowEditModal(true)}>Edit Profile</button>
                </div>
            </div>

            <div className="section mb-20">
                <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '20px' }}>
                    <div className="flex items-center gap-16">
                        <div className="cover-img" style={{ width: '80px', height: '80px', fontSize: '32px', position: 'relative', overflow: 'hidden', backgroundColor: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {user?.profile_image ? (
                                <img src={user.profile_image} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : initials}
                        </div>
                        <div>
                            <label className="btn secondary" style={{ cursor: 'pointer', display: 'inline-block' }}>
                                {isUploadingPhoto ? 'Uploading...' : 'Change Photo'}
                                <input type="file" accept="image/*" style={{ display: 'none' }} disabled={isUploadingPhoto} onChange={handlePhotoUploadWrap} />
                            </label>
                            {user?.profile_image && (
                                <button type="button" className="btn ghost" disabled={isUploadingPhoto} onClick={handleRemovePhoto} style={{ marginLeft: '10px' }}>
                                    Remove
                                </button>
                            )}
                        </div>
                        <div style={{ marginLeft: '16px' }}>
                            <h2 style={{ margin: 0, fontSize: '24px' }}>{user?.name || 'Business Name'}</h2>
                            <p className="subtle" style={{ margin: '4px 0' }}>{user?.industry || 'No industry specified'}</p>
                            <div className="flex items-center gap-10 mt-8">
                                {user?.is_verified ? <span className="pill green">Verified Business</span> : null}
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div style={{ fontSize: '18px', fontWeight: '600' }}>{ratingStats.average_rating > 0 ? ratingStats.average_rating.toFixed(1) + ' / 5' : '-'}</div>
                        <div className="subtle">Average Rating</div>
                        <div className="subtle" style={{ fontSize: '12px' }}>{ratingStats.total_reviews} reviews</div>
                    </div>
                </div>
            </div>

            <div className="grid-2 mb-20">
                <div className="section">
                    <h3 className="h3 mb-10">Company Information</h3>
                    <div className="info-item mb-10"><span className="subtle mr-10">Industry:</span> <strong>{user?.industry || '-'}</strong></div>
                    <div className="info-item mb-10"><span className="subtle mr-10">Location:</span> <strong>{user?.location || '-'}</strong></div>
                    <div className="info-item mb-10"><span className="subtle mr-10">Website:</span> <strong>{user?.website ? <a href={user.website} target="_blank" rel="noopener noreferrer">{user.website}</a> : '-'}</strong></div>
                </div>
                <div className="section">
                    <h3 className="h3 mb-10">Contact Information</h3>
                    <div className="info-item mb-10"><span className="subtle mr-10">Email:</span> <strong>{user?.email || '-'}</strong></div>
                    <div className="info-item mb-10"><span className="subtle mr-10">Phone:</span> <strong>{user?.phone || '-'}</strong></div>
                </div>
            </div>

            <div className="section mb-20">
                <h3 className="h3 mb-10">About Us</h3>
                <div style={{ lineHeight: 1.6, marginBottom: '16px', whiteSpace: 'pre-wrap' }}>
                    {user?.bio ? user.bio : <p className="subtle">No description provided.</p>}
                </div>
                {skillsList.length > 0 && (
                    <div className="flex gap-10" style={{ flexWrap: 'wrap' }}>
                        {skillsList.map((skill, idx) => (
                            <span key={idx} className="pill blue">{skill}</span>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid-4 mb-20">
                <div className="section text-center"><div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--primary)' }}>{stats.active_gigs}</div><div className="subtle">Active Gigs</div></div>
                <div className="section text-center"><div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--success)' }}>{stats.total_applicants}</div><div className="subtle">Total Applicants</div></div>
                <div className="section text-center"><div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--warning)' }}>{stats.hired_students}</div><div className="subtle">Hired Students</div></div>
                <div className="section text-center"><div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--info)' }}>{stats.avg_rating > 0 ? stats.avg_rating.toFixed(1) : '-'}</div><div className="subtle">Average Rating</div></div>
            </div>

            {/* Edit Profile Modal */}
            {showEditModal && (
                <div className="modal" style={{ display: 'flex' }} onClick={(e) => { if (e.target.className === 'modal') setShowEditModal(false); }}>
                    <div className="modal-content" style={{ maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <h2 style={{ margin: 0 }}>Edit Business Profile</h2>
                            <span className="close" onClick={() => setShowEditModal(false)}>&times;</span>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleSaveProfile}>
                                <div className="field">
                                    <label className="label">Company Name *</label>
                                    <input className="input" name="name" value={editForm.name} onChange={handleEditChange} required />
                                </div>
                                <div className="field">
                                    <label className="label">Industry</label>
                                    <select className="select" name="industry" value={editForm.industry} onChange={handleEditChange}>
                                        <option value="technology">Technology</option>
                                        <option value="finance">Finance</option>
                                        <option value="healthcare">Healthcare</option>
                                        <option value="education">Education</option>
                                        <option value="retail">Retail</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div className="field">
                                    <label className="label">Location</label>
                                    <input className="input" name="location" value={editForm.location} onChange={handleEditChange} />
                                </div>
                                <div className="field">
                                    <label className="label">Website</label>
                                    <input type="url" className="input" name="website" value={editForm.website} onChange={handleEditChange} placeholder="https://..." />
                                </div>
                                <div className="field">
                                    <label className="label">Phone</label>
                                    <input type="tel" className="input" name="phone" value={editForm.phone} onChange={handleEditChange} />
                                </div>
                                <div className="field">
                                    <label className="label">Description (Bio)</label>
                                    <textarea className="textarea" name="bio" rows="4" value={editForm.bio} onChange={handleEditChange}></textarea>
                                </div>
                                <div className="field">
                                    <label className="label">Skills/Keywords (comma-separated)</label>
                                    <input className="input" name="skills" value={editForm.skills} onChange={handleEditChange} placeholder="e.g. Web Development, React" />
                                </div>
                                <div className="flex gap-10 mt-20">
                                    <button type="button" className="btn secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                                    <button type="submit" className="btn">Save Changes</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </React.Fragment>
    );
};

export default Profile;
