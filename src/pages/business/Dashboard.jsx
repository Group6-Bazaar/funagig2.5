import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../utils/supabase';
import { useAuth } from '../../context/AuthContext';
import toast from '../../utils/toast';

const Dashboard = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState({
        activeGigs: 0,
        totalApplicants: 0,
        hiredStudents: 0,
        averageRating: 0
    });
    
    const [recentActivity, setRecentActivity] = useState([]);
    const [applications, setApplications] = useState([]);
    const [topGigs, setTopGigs] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadDashboardData = async () => {
        if (!user) return;
        setLoading(true);
        try {
            // Fetch applications to business's gigs
            const { data: appsRes } = await supabase
                .from('application_details')
                .select('*')
                .eq('business_id', user.id) // wait, the view has business_name. The view lacks business_id. Let's filter by gig's user_id in DB or rewrite.
                // Actually, let's fetch gigs first
                
            const { data: myGigs } = await supabase
                .from('gigs')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });
                
            let activeGigs = 0;
            let myGigIds = [];
            if (myGigs) {
                myGigIds = myGigs.map(g => g.id);
                setTopGigs(myGigs.slice(0, 5));
                activeGigs = myGigs.filter(g => g.status === 'active').length;
            }

            let totalApplicants = 0;
            let hiredStudents = 0;
            if (myGigIds.length > 0) {
                const { data: apps } = await supabase
                    .from('application_details')
                    .select('*')
                    .in('gig_id', myGigIds)
                    .order('applied_at', { ascending: false });
                    
                if (apps) {
                    setApplications(apps.slice(0, 5));
                    totalApplicants = apps.length;
                    hiredStudents = apps.filter(a => a.status === 'accepted' || a.status === 'completed').length;
                    
                    setRecentActivity(apps.slice(0, 5).map(app => ({
                        description: `${app.student_name} applied to ${app.gig_title}`,
                        created_at: app.applied_at
                    })));
                }
            }

            const { data: notifs } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(3);
                
            if (notifs) setNotifications(notifs);

            setStats({
                activeGigs,
                totalApplicants,
                hiredStudents,
                averageRating: user.rating || 0
            });

        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            toast.error('Failed to load dashboard data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, [user]);

    const handleMarkAllRead = async () => {
        try {
            const { error } = await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id)
                .eq('is_read', false);
            
            if (!error) {
                setNotifications(notifications.map(n => ({ ...n, is_read: true })));
                toast.success('All notifications marked as read');
            }
        } catch (error) {
            toast.error('Failed to mark notifications as read');
        }
    };

    const handleUpdateApplicationStatus = async (app, newStatus) => {
        try {
            // 1. Update the application status
            const { error } = await supabase
                .from('applications')
                .update({ status: newStatus })
                .eq('id', app.id);

            if (error) throw error;

            // 2. If accepted → auto-create a conversation between business and student
            if (newStatus === 'accepted') {
                // Check if a conversation already exists between these two users
                const { data: existing } = await supabase
                    .from('conversations')
                    .select('id')
                    .or(
                        `and(user1_id.eq.${user.id},user2_id.eq.${app.user_id}),and(user1_id.eq.${app.user_id},user2_id.eq.${user.id})`
                    )
                    .limit(1);

                let conversationId;
                if (!existing || existing.length === 0) {
                    // Create a new conversation
                    const { data: newConv, error: convErr } = await supabase
                        .from('conversations')
                        .insert([{ user1_id: user.id, user2_id: app.user_id }])
                        .select('id')
                        .single();

                    if (convErr) throw convErr;
                    conversationId = newConv.id;

                    // Send an automatic first message from the business
                    await supabase.from('messages').insert([{
                        conversation_id: conversationId,
                        sender_id: user.id,
                        content: `Hi ${app.student_name || 'there'}! 🎉 Congratulations — we've accepted your application for "${app.gig_title}". We'd love to discuss the next steps with you.`,
                    }]);
                } else {
                    conversationId = existing[0].id;
                }

                toast.success(`${app.student_name || 'Applicant'} accepted! Chat created in Messages.`);
            } else {
                toast.success(`Application ${newStatus}.`);
            }

            // 3. Refresh applications list
            setApplications(prev => prev.map(a => a.id === app.id ? { ...a, status: newStatus } : a));
        } catch (err) {
            console.error('Status update error:', err);
            toast.error('Failed to update application: ' + err.message);
        }
    };

    // Helper functions
    const formatTimeAgo = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const diffMs = new Date() - date;
        const diffMins = Math.round(diffMs / 60000);
        if (diffMins < 60) return `\$diffMins} mins ago`;
        const diffHours = Math.round(diffMins / 60);
        if (diffHours < 24) return `${diffHours} hours ago`;
        return `${Math.round(diffHours / 24)} days ago`;
    };

    if (loading) return <div className="text-center mt-40">Loading Dashboard...</div>;

    return (
        <React.Fragment>
            <div className="flex items-center justify-between mb-20">
                <div>
                    <h1 className="h1" style={{ fontSize: '32px', margin: 0 }}>Dashboard</h1>
                    <p className="subtle">Welcome back! Here's your business overview</p>
                </div>
                <Link to="/business/post-gig" className="btn">Post New Gig</Link>
            </div>

            {/* Quick Stats */}
            <div className="grid-4">
                <div className="section" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--primary)' }}>{stats.activeGigs}</div>
                    <div className="subtle">Active Gigs</div>
                </div>
                <div className="section" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--warning)' }}>{stats.totalApplicants}</div>
                    <div className="subtle">Total Applicants</div>
                </div>
                <div className="section" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--success)' }}>{stats.hiredStudents}</div>
                    <div className="subtle">Hired Students</div>
                </div>
                <div className="section" style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--info)' }}>
                        {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '-'}
                    </div>
                    <div className="subtle">Average Rating</div>
                </div>
            </div>

            {/* Recent Activity & Quick Actions */}
            <div className="grid-2 mt-20">
                <div className="section">
                    <h2 className="h2">Recent Activity</h2>
                    <div id="recentActivity">
                        {recentActivity.length === 0 ? (
                            <p className="subtle text-center p-20">No recent activity.</p>
                        ) : (
                            recentActivity.map((activity, i) => (
                                <div key={i} className="mb-10 pb-10" style={{ borderBottom: '1px solid var(--border)' }}>
                                    <div style={{ fontWeight: 600 }}>{activity.description || activity.action || 'Performed an action'}</div>
                                    <div className="subtle" style={{ fontSize: '12px' }}>{formatTimeAgo(activity.created_at)}</div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                <div className="section">
                    <h2 className="h2">Quick Actions</h2>
                    <div className="quick-actions flex flex-col gap-10">
                        <Link className="btn w-full" to="/business/post-gig">Post New Gig</Link>
                        <Link className="btn secondary w-full" to="/business/gigs">View All Gigs</Link>
                        <Link className="btn secondary w-full" to="/business/applicants">Review Applicants</Link>
                        <Link className="btn secondary w-full" to="/business/profile">Edit Profile</Link>
                    </div>
                </div>
            </div>

            {/* Recent Applications */}
            <div className="section mt-20">
                <div className="flex items-center justify-between mb-20">
                    <h2 className="h2" style={{ margin: 0 }}>Recent Applications</h2>
                    <Link to="/business/applicants" className="btn secondary">View All</Link>
                </div>
                <div>
                    {applications.length === 0 ? (
                        <p className="subtle">No recent applications.</p>
                    ) : (
                        <table className="table w-full">
                            <thead>
                                <tr>
                                    <th>Applicant</th>
                                    <th>Gig</th>
                                    <th>Date</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {applications.map(app => (
                                    <tr key={app.id}>
                                        <td>{app.student_name || 'N/A'}</td>
                                        <td>{app.gig_title}</td>
                                        <td>{new Date(app.created_at || app.applied_at).toLocaleDateString()}</td>
                                        <td><span className={`pill ${app.status === 'accepted' ? 'green' : app.status === 'rejected' ? 'red' : 'yellow'}`}>{app.status}</span></td>
                                        <td>
                                            {app.status === 'pending' && (
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <button
                                                        className="btn"
                                                        style={{ padding: '4px 12px', fontSize: '12px' }}
                                                        onClick={() => handleUpdateApplicationStatus(app, 'accepted')}
                                                    >
                                                        ✓ Accept
                                                    </button>
                                                    <button
                                                        className="btn secondary"
                                                        style={{ padding: '4px 12px', fontSize: '12px' }}
                                                        onClick={() => handleUpdateApplicationStatus(app, 'rejected')}
                                                    >
                                                        ✗ Reject
                                                    </button>
                                                </div>
                                            )}
                                            {app.status === 'accepted' && (
                                                <span className="subtle" style={{ fontSize: '12px' }}>💬 Chat created</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Top Performing Gigs */}
            <div className="section mt-20">
                <h2 className="h2">Top Performing Gigs</h2>
                {topGigs.length === 0 ? (
                    <p className="subtle text-center p-20">You haven't posted any active gigs yet.</p>
                ) : (
                    <table className="table w-full">
                        <thead>
                            <tr>
                                <th>Gig Title</th>
                                <th>Applications</th>
                                <th>Budget</th>
                                <th>Deadline</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topGigs.map(gig => (
                                <tr key={gig.id}>
                                    <td>{gig.title}</td>
                                    <td>{gig.applicant_count || 0}</td>
                                    <td>sh.{parseInt(gig.budget || 0).toLocaleString()}</td>
                                    <td>{new Date(gig.deadline).toLocaleDateString()}</td>
                                    <td><span className={`pill ${gig.status === 'active' ? 'green' : gig.status === 'paused' ? 'yellow' : gig.status === 'completed' ? 'blue' : 'gray'}`}>{gig.status}</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Notifications */}
            {notifications.length > 0 && (
                <div className="section mt-20 mb-40">
                    <div className="flex items-center justify-between mb-20">
                        <h2 className="h2" style={{ margin: 0 }}>Notifications</h2>
                        {notifications.some(n => !n.is_read) && (
                            <button className="btn secondary" onClick={handleMarkAllRead}>Mark All as Read</button>
                        )}
                    </div>
                    <div>
                        {notifications.map(n => (
                            <div key={n.id} className="notification-item mb-10 pb-10" style={{ borderBottom: '1px solid var(--border)', opacity: n.is_read ? 0.6 : 1 }}>
                                <div style={{ fontWeight: n.is_read ? 500 : 700 }}>{n.title || n.message}</div>
                                <p className="subtle mt-5 mb-5">{n.message}</p>
                                <div className="subtle" style={{ fontSize: '12px' }}>{formatTimeAgo(n.created_at)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </React.Fragment>
    );
};

export default Dashboard;
