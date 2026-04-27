import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../utils/apiClient';
import toast from '../../utils/toast';

const Dashboard = () => {
    const { user } = useAuth();
    
    const [stats, setStats] = useState({
        activeTasks: 0, pendingTasks: 0, completedTasks: 0, averageRating: user?.rating || 0,
        totalEarned: 0, totalTasks: 0, daysActive: '-'
    });
    const [applications, setApplications] = useState([]);
    const [activities, setActivities] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loadingStats, setLoadingStats] = useState(true);
    const [loadingApps, setLoadingApps] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) return;
            try {
                // Fetch applications details using the view
                const { data: apps } = await apiClient
                    .from('application_details')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('applied_at', { ascending: false })
                    .limit(5);

                if (apps) setApplications(apps);

                // Fetch notifications
                const { data: notifs } = await apiClient
                    .from('notifications')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(5);

                if (notifs) setNotifications(notifs);

                // Fetch stats from applications
                const { data: allApps } = await apiClient
                    .from('application_details')
                    .select('status, budget');

                if (allApps) {
                    let active = 0, pending = 0, completed = 0, earned = 0;
                    allApps.forEach(app => {
                        if (app.status === 'accepted') active++;
                        if (app.status === 'pending') pending++;
                        if (app.status === 'completed') {
                            completed++;
                            earned += parseFloat(app.budget || 0);
                        }
                    });
                    setStats(prev => ({
                        ...prev,
                        activeTasks: active,
                        pendingTasks: pending,
                        completedTasks: completed,
                        totalTasks: allApps.length,
                        totalEarned: `sh.${earned.toLocaleString()}`,
                        averageRating: user?.rating || 0
                    }));
                }

                // Compute days active
                const createdDate = new Date(user?.created_at || Date.now());
                const days = Math.max(1, Math.floor((new Date() - createdDate) / (1000 * 60 * 60 * 24)));
                setStats(prev => ({ ...prev, daysActive: days }));

                // Mock recent activity based on apps
                if (apps) {
                    setActivities(apps.map(app => ({
                        description: `Applied to ${app.gig_title}`,
                        created_at: app.applied_at
                    })));
                }

            } catch (error) {
                console.error('Failed to load dashboard data:', error);
            } finally {
                setLoadingStats(false);
                setLoadingApps(false);
            }
        };

        fetchDashboardData();
    }, [user]);

    const markAllRead = async () => {
        try {
            await apiClient
                .from('notifications')
                .update({ is_read: true })
                .eq('user_id', user.id)
                .eq('is_read', false);
            
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
