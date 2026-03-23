import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import toast from '../../utils/toast';

const Dashboard = () => {
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
        setLoading(true);
        try {
            const [statsRes, appsRes, gigsRes, notifRes] = await Promise.all([
                api.get('/business/stats').catch(() => ({ success: false })),
                api.get('/applications?limit=5').catch(() => ({ success: false })),
                api.get('/gigs/active?limit=5').catch(() => ({ success: false })),
                api.get('/notifications?limit=3').catch(() => ({ success: false }))
            ]);

            if (statsRes.success) {
                // Backend might send it in different formats, mapping accordingly
                setStats({
                    activeGigs: statsRes.stats?.active_gigs || 0,
                    totalApplicants: statsRes.stats?.total_applicants || 0,
                    hiredStudents: statsRes.stats?.hired_students || 0,
                    averageRating: statsRes.stats?.average_rating || 0
                });
                if (statsRes.recent_activity) setRecentActivity(statsRes.recent_activity.slice(0, 5));
            }
            if (appsRes.success) {
                setApplications((appsRes.applications || []).slice(0, 5));
            }
            if (gigsRes.success) {
                setTopGigs((gigsRes.gigs || []).slice(0, 5));
                // Calculate quick stats manually if not provided by backend
                if (!statsRes.success || !statsRes.stats) {
                    const activeCount = (gigsRes.gigs || []).filter(g => g.status === 'active').length;
                    setStats(prev => ({ ...prev, activeGigs: activeCount }));
                }
            }
            if (notifRes.success) {
                setNotifications((notifRes.notifications || []).slice(0, 3));
            }
        } catch (error) {
            toast.error('Failed to load dashboard data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardData();
    }, []);

    const handleMarkAllRead = async () => {
        try {
            const res = await api.put('/notifications/mark-read');
            if (res.success) {
                setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
                toast.success('All notifications marked as read');
            }
        } catch (error) {
            toast.error('Failed to mark notifications as read');
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
                                </tr>
                            </thead>
                            <tbody>
                                {applications.map(app => (
                                    <tr key={app.id}>
                                        <td>{app.student_name || 'N/A'}</td>
                                        <td>{app.gig_title}</td>
                                        <td>{new Date(app.created_at || app.applied_at).toLocaleDateString()}</td>
                                        <td><span className={`pill ${app.status === 'accepted' ? 'green' : app.status === 'rejected' ? 'red' : 'yellow'}`}>{app.status}</span></td>
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
