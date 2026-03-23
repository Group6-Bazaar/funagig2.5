import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import toast from '../../utils/toast';

const Dashboard = () => {
    const { user } = useAuth();
    
    const [stats, setStats] = useState({
        activeTasks: '-', pendingTasks: '-', completedTasks: '-', averageRating: '-',
        totalEarned: '-', totalTasks: '-', daysActive: '-'
    });
    const [applications, setApplications] = useState([]);
    const [activities, setActivities] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loadingStats, setLoadingStats] = useState(true);
    const [loadingApps, setLoadingApps] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // We mock the concurrent fetch structure as it existed in vanilla JS
                const [dashRes, notifRes] = await Promise.all([
                    api.get('/dashboard').catch(() => ({ success: false })),
                    api.get('/notifications').catch(() => ({ success: false }))
                ]);

                if (dashRes.success && dashRes.stats) {
                    setStats(dashRes.stats);
                    setApplications(dashRes.applications || []);
                    setActivities(dashRes.activities || []);
                }

                if (notifRes.success && notifRes.notifications) {
                    setNotifications(notifRes.notifications);
                }
            } catch (error) {
                console.error('Failed to load dashboard data:', error);
            } finally {
                setLoadingStats(false);
                setLoadingApps(false);
            }
        };

        fetchDashboardData();
    }, []);

    const markAllRead = async () => {
        try {
            await api.post('/notifications/mark-read');
            setNotifications(notifications.map(n => ({ ...n, is_read: true })));
            toast.success('All notifications marked as read');
        } catch (error) {
            toast.error('Failed to mark notifications as read');
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <>
            <h1 className="h1">Welcome, {user?.name}</h1>

            {/* Quick Stats */}
            <div className="grid-4">
                <div className="section">
                    <div style={{ fontSize: '32px', color: 'var(--primary)' }}>{stats.activeTasks}</div>
                    <p>Active Tasks</p>
                </div>
                <div className="section">
                    <div style={{ fontSize: '32px', color: 'var(--warning)' }}>{stats.pendingTasks}</div>
                    <p>Pending Tasks</p>
                </div>
                <div className="section">
                    <div style={{ fontSize: '32px', color: 'var(--success)' }}>{stats.completedTasks}</div>
                    <p>Completed Tasks</p>
                </div>
                <div className="section">
                    <div style={{ fontSize: '32px', color: 'var(--info)' }}>{stats.averageRating}</div>
                    <p>Average Rating</p>
                </div>
            </div>
            
            <div className="grid-4 mt-20">
                <div className="section">
                    <div style={{ fontSize: '24px', color: 'var(--success)' }}>{stats.totalEarned}</div>
                    <p>Total Earned</p>
                </div>
                <div className="section">
                    <div style={{ fontSize: '24px', color: 'var(--primary)' }}>{stats.totalTasks}</div>
                    <p>Total Tasks</p>
                </div>
                <div className="section">
                    <div style={{ fontSize: '24px', color: 'var(--warning)' }}>{stats.daysActive}</div>
                    <p>Days Active</p>
                </div>
                <div className="section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Link className="btn" to="/student/gigs">Browse Gigs</Link>
                </div>
            </div>

            {/* Recent Applications Summary */}
            <div className="section mt-20">
                <h2 className="h2">Recent Applications</h2>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Gig</th>
                            <th>Status</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loadingApps ? (
                            <tr><td colSpan="3" className="text-center subtle">Loading applications...</td></tr>
                        ) : applications.length === 0 ? (
                            <tr><td colSpan="3" className="text-center subtle">No recent applications found.</td></tr>
                        ) : (
                            applications.map((app, idx) => (
                                <tr key={idx}>
                                    <td>{app.gig_title}</td>
                                    <td>
                                        <span className={`badge ${app.status === 'accepted' ? 'success' : app.status === 'rejected' ? 'danger' : 'warning'}`}>
                                            {app.status}
                                        </span>
                                    </td>
                                    <td>{new Date(app.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                <Link to="/student/gigs#applications" className="btn secondary mt-10">View All Applications</Link>
            </div>

            {/* Recent Activity & Notifications */}
            <div className="grid-2 mt-20">
                <div className="section">
                    <h2 className="h2">Recent Activity</h2>
                    <ul>
                        {loadingStats ? (
                            <li className="subtle" style={{ padding: '10px' }}>Loading recent activity...</li>
                        ) : activities.length === 0 ? (
                            <li className="subtle" style={{ padding: '10px' }}>No recent activity</li>
                        ) : (
                            activities.map((act, idx) => (
                                <li key={idx} style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                                    {act.description} <span className="subtle" style={{ fontSize: '12px' }}>{new Date(act.created_at).toLocaleDateString()}</span>
                                </li>
                            ))
                        )}
                    </ul>
                </div>
                <div className="section">
                    <div className="flex items-center justify-between mb-10">
                        <h2 className="h2">Notifications</h2>
                        {unreadCount > 0 && (
                            <button className="btn secondary" onClick={markAllRead} style={{ fontSize: '12px', padding: '6px 12px' }}>
                                Mark All Read
                            </button>
                        )}
                    </div>
                    <ul>
                        {notifications.length === 0 ? (
                            <li className="subtle" style={{ padding: '10px' }}>No notifications</li>
                        ) : (
                            notifications.slice(0, 5).map((notif, idx) => (
                                <li key={idx} style={{ padding: '10px', borderBottom: '1px solid #eee', fontWeight: notif.is_read ? 'normal' : 'bold' }}>
                                    {notif.message}
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="section mt-20">
                <h2 className="h2">Quick Actions</h2>
                <div className="grid-4">
                    <Link className="btn" to="/student/gigs">Apply to Gigs</Link>
                    <Link className="btn secondary" to="/student/gigs#saved">View Saved</Link>
                    <Link className="btn" to="/student/messages">Check Messages</Link>
                    <Link className="btn secondary" to="/student/profile">Edit Profile</Link>
                </div>
            </div>
        </>
    );
};

export default Dashboard;
