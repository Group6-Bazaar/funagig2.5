import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import toast from '../../utils/toast';

const Applicants = () => {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const [allApplicants, setAllApplicants] = useState([]);
    const [filteredApplicants, setFilteredApplicants] = useState([]);
    const [gigs, setGigs] = useState([]);
    const [loading, setLoading] = useState(true);

    const [filters, setFilters] = useState({
        search: searchParams.get('search') || '',
        gig: searchParams.get('gig') || '',
        status: searchParams.get('status') || '',
        sort: searchParams.get('sort') || 'newest'
    });

    const [selectedApplicant, setSelectedApplicant] = useState(null);
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [studentProfile, setStudentProfile] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, [user]);

    const loadData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data: gigsData, error: gigsError } = await supabase
                .from('gigs')
                .select('*')
                .eq('user_id', user.id)
                .neq('status', 'draft');

            if (gigsError) throw gigsError;
            
            let gigIds = [];
            if (gigsData) {
                setGigs(gigsData);
                gigIds = gigsData.map(g => g.id);
            }

            if (gigIds.length > 0) {
                const { data: appsData, error: appsError } = await supabase
                    .from('application_details')
                    .select('*')
                    .in('gig_id', gigIds)
                    .order('applied_at', { ascending: false });

                if (appsError) throw appsError;
                if (appsData) setAllApplicants(appsData);
            } else {
                setAllApplicants([]);
            }
        } catch (error) {
            toast.error('Error loading data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let result = [...allApplicants];

        if (filters.gig) result = result.filter(a => String(a.gig_id) === String(filters.gig));
        if (filters.status) result = result.filter(a => a.status === filters.status);
        if (filters.search) {
            const q = filters.search.toLowerCase();
            result = result.filter(a => 
                (a.student_name || '').toLowerCase().includes(q) ||
                (a.university || '').toLowerCase().includes(q) ||
                (a.major || '').toLowerCase().includes(q) ||
                (a.skills || '').toLowerCase().includes(q) ||
                (a.message || '').toLowerCase().includes(q) ||
                (a.gig_title || '').toLowerCase().includes(q)
            );
        }

        switch (filters.sort) {
            case 'newest': result.sort((a, b) => new Date(b.applied_at || b.created_at) - new Date(a.applied_at || a.created_at)); break;
            case 'oldest': result.sort((a, b) => new Date(a.applied_at || a.created_at) - new Date(b.applied_at || b.created_at)); break;
            case 'name_asc': result.sort((a, b) => (a.student_name || '').localeCompare(b.student_name || '')); break;
            case 'name_desc': result.sort((a, b) => (b.student_name || '').localeCompare(a.student_name || '')); break;
            default: break;
        }

        setFilteredApplicants(result);

        const params = new URLSearchParams();
        if (filters.search) params.set('search', filters.search);
        if (filters.gig) params.set('gig', filters.gig);
        if (filters.status) params.set('status', filters.status);
        if (filters.sort !== 'newest') params.set('sort', filters.sort);
        setSearchParams(params);

    }, [filters, allApplicants, setSearchParams]);

    const handleFilterChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

    const handleAction = async (action, applicantId, studentName, studentId) => {
        if (!window.confirm(`Are you sure you want to ${action} ${studentName}'s application?`)) return;

        try {
            const newStatus = action === 'accept' ? 'accepted' : 'rejected';
            const { error } = await supabase
                .from('applications')
                .update({ status: newStatus })
                .eq('id', applicantId);
                
            if (error) throw error;
            
            toast.success(`Application ${newStatus} successfully.`);
            
            setAllApplicants(prev => prev.map(a => a.id === applicantId ? { ...a, status: newStatus } : a));
            
            if (action === 'accept' && studentId) {
                // Check if conversation exists, if not, create one
                const { data: convData } = await supabase
                    .from('conversations')
                    .select('*')
                    .or(`user1_id.eq.${user.id},user1_id.eq.${studentId}`)
                    .or(`user2_id.eq.${user.id},user2_id.eq.${studentId}`);
                    
                if (!convData || convData.length === 0) {
                    await supabase.from('conversations').insert([{
                        user1_id: user.id,
                        user2_id: studentId
                    }]);
                }
            }
        } catch (error) {
            toast.error(`Error processing action.`);
        }
    };

    const openDetails = async (applicant) => {
        setSelectedApplicant(applicant);
        setShowStudentModal(true);
        setModalLoading(true);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', applicant.user_id)
                .single();
                
            if (error) throw error;
            if (data) setStudentProfile(data);
        } catch {
            toast.error('Failed to load profile details.');
        } finally {
            setModalLoading(false);
        }
    };

    const handleMessage = async (studentId) => {
        try {
            const { data: convData } = await supabase
                .from('conversations')
                .select('*')
                .or(`and(user1_id.eq.${user.id},user2_id.eq.${studentId}),and(user1_id.eq.${studentId},user2_id.eq.${user.id})`);
                
            if (!convData || convData.length === 0) {
                await supabase.from('conversations').insert([{
                    user1_id: user.id,
                    user2_id: studentId
                }]);
            }
            navigate('/business/messages');
        } catch (error) {
            toast.error('Failed to create conversation');
        }
    };

    const getInitials = (name) => {
        if (!name) return 'S';
        const parts = name.split(' ');
        if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length-1][0]}`.toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <React.Fragment>
            <div className="flex items-center justify-between mb-20">
                <div>
                    <h1 className="h1" style={{ fontSize: '28px', margin: 0 }}>Applicants</h1>
                    <p className="subtle">Review and manage applications for your gigs</p>
                </div>
                <div className="flex gap-10">
                    <Link to="/business/gigs" className="btn secondary">View My Gigs</Link>
                    <Link to="/business/dashboard" className="btn ghost">Back to Dashboard</Link>
                </div>
            </div>

            <div className="section mb-20">
                <div className="flex items-center gap-10" style={{ flexWrap: 'wrap' }}>
                    <div className="field" style={{ flex: 1, minWidth: '200px' }}>
                        <input type="text" className="input" placeholder="Search applicants..." name="search" value={filters.search} onChange={handleFilterChange} />
                    </div>
                    <div className="field">
                        <select className="select" name="gig" value={filters.gig} onChange={handleFilterChange}>
                            <option value="">All Gigs</option>
                            {gigs.map(g => <option key={g.id} value={g.id}>{g.title}</option>)}
                        </select>
                    </div>
                    <div className="field">
                        <select className="select" name="status" value={filters.status} onChange={handleFilterChange}>
                            <option value="">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="accepted">Accepted</option>
                            <option value="rejected">Rejected</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>
                    <div className="field">
                        <select className="select" name="sort" value={filters.sort} onChange={handleFilterChange}>
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="name_asc">Name: A to Z</option>
                            <option value="name_desc">Name: Z to A</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="section">
                <h2 className="h2 mb-20">All Applicants</h2>
                {loading ? (
                    <div className="text-center subtle p-40">Loading applicants...</div>
                ) : filteredApplicants.length === 0 ? (
                    <div className="text-center p-40" style={{ border: '1px dashed var(--border)', borderRadius: '8px' }}>
                        <p className="subtle" style={{ fontSize: '18px' }}>No applicants found</p>
                        <Link to="/business/gigs" className="btn mt-10">View My Gigs</Link>
                    </div>
                ) : (
                    <div>
                        {filteredApplicants.map(applicant => {
                            const statusColors = { pending: 'yellow', accepted: 'green', rejected: 'red', completed: 'blue' };
                            const color = statusColors[applicant.status] || 'yellow';

                            return (
                                <div key={applicant.id} className="card-compact mb-20">
                                    <div className="flex items-center justify-between" style={{ flexWrap: 'wrap', gap: '20px' }}>
                                        <div style={{ flex: 1, minWidth: '300px' }}>
                                            <div className="flex items-center gap-10 mb-10">
                                                <div className="cover-img" style={{ width: '50px', height: '50px', fontSize: '20px', borderRadius: '50%', backgroundColor: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {getInitials(applicant.student_name)}
                                                </div>
                                                <div>
                                                    <h3 style={{ margin: 0, fontSize: '18px' }}>{applicant.student_name || 'Student'}</h3>
                                                    <p className="subtle" style={{ margin: '4px 0' }}>{applicant.university || ''} {applicant.major ? `• ${applicant.major}` : ''}</p>
                                                    <p className="subtle" style={{ fontSize: '12px' }}>Applied for: <strong>{applicant.gig_title}</strong></p>
                                                </div>
                                            </div>
                                            {applicant.message && (
                                                <div className="mb-10">
                                                    <p className="subtle" style={{ marginBottom: '8px' }}><strong>Application Message:</strong></p>
                                                    <p className="subtle" style={{ whiteSpace: 'pre-wrap' }}>{applicant.message}</p>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-10" style={{ flexWrap: 'wrap' }}>
                                                <div className="flex items-center gap-5">
                                                    <span className="subtle">Skills:</span>
                                                    <span>{applicant.skills || 'Not specified'}</span>
                                                </div>
                                                <div className="flex items-center gap-5">
                                                    <span className="subtle">Applied:</span>
                                                    <span>{new Date(applicant.applied_at || applicant.created_at).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-10" style={{ flexDirection: 'column' }}>
                                            <span className={`pill ${color}`}>{applicant.status}</span>
                                            {applicant.status === 'pending' ? (
                                                <>
                                                    <div className="flex gap-10">
                                                        <button className="btn" onClick={() => handleAction('accept', applicant.id, applicant.student_name, applicant.user_id)}>Accept</button>
                                                        <button className="btn ghost" style={{ color: 'var(--danger)' }} onClick={() => handleAction('reject', applicant.id, applicant.student_name, null)}>Reject</button>
                                                    </div>
                                                    <button className="btn secondary" onClick={() => openDetails(applicant)}>View Details</button>
                                                </>
                                            ) : (
                                                <button className="btn secondary" onClick={() => openDetails(applicant)}>View Profile</button>
                                            )}
                                            <button className="btn ghost" onClick={() => handleMessage(applicant.user_id)}>Message</button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Application details modal */}
            {showStudentModal && selectedApplicant && (
                <div className="modal" style={{ display: 'flex' }} onClick={(e) => { if (e.target.className === 'modal') setShowStudentModal(false); }}>
                    <div className="modal-content" style={{ maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <h2 style={{ margin: 0 }}>Application Details - {selectedApplicant.student_name}</h2>
                            <span className="close" onClick={() => setShowStudentModal(false)}>&times;</span>
                        </div>
                        <div className="modal-body">
                            {modalLoading ? (
                                <div className="text-center py-40">Loading details...</div>
                            ) : studentProfile ? (
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                                        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
                                            {studentProfile.profile_image ? (
                                                <img src={studentProfile.profile_image} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%'}} />
                                            ) : getInitials(studentProfile.name)}
                                        </div>
                                        <div>
                                            <h3 style={{ margin: 0, fontSize: '24px' }}>{studentProfile.name}</h3>
                                            <p className="subtle">{studentProfile.university} • {studentProfile.major}</p>
                                        </div>
                                    </div>
                                    <div style={{ marginBottom: '24px' }}>
                                        <h3 style={{ borderBottom: '2px solid var(--border)', paddingBottom: '8px' }}>About</h3>
                                        <p>{studentProfile.bio || 'No bio provided.'}</p>
                                    </div>
                                    {selectedApplicant.message && (
                                        <div style={{ marginBottom: '24px' }}>
                                            <h3 style={{ borderBottom: '2px solid var(--border)', paddingBottom: '8px' }}>Application Message</h3>
                                            <p style={{ whiteSpace: 'pre-wrap' }}>{selectedApplicant.message}</p>
                                        </div>
                                    )}
                                    {selectedApplicant.resume_url ? (
                                        <div style={{ marginBottom: '24px' }}>
                                            <h3 style={{ borderBottom: '2px solid var(--border)', paddingBottom: '8px' }}>Resume / CV</h3>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                <div>
                                                    <p style={{ margin: 0, fontWeight: 500 }}>Resume Document</p>
                                                </div>
                                                <a href={selectedApplicant.resume_url} target="_blank" rel="noopener noreferrer" className="btn">View / Download CV</a>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="subtle text-center">No resume attached.</p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-center subtle py-40">Failed to load profile.</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </React.Fragment>
    );
};

export default Applicants;
