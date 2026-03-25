import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';

const StudentLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!user) return;
        const fetchNotifications = async () => {
            try {
                const { count, error } = await supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('receiver_id', user.id)
                    .eq('is_read', false);
                
                if (!error) {
                    setUnreadCount(count || 0);
                }
            } catch (error) {
                // Ignore silent errors
            }
        };
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [user]);

    const handleLogout = async (e) => {
        e.preventDefault();
        await logout();
        navigate('/login');
    };

    if (!user) return null; // Or a loading spinner

    const userInitials = user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';

    return (
        <>
            <header className="navbar">
                <div className="brand">
                    <div className="logo"></div> FunaGig
                </div>
                <div className="navbar-actions">
                    <div className="notification-badge-container" style={{ display: unreadCount > 0 ? 'block' : 'none' }}>
                        <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                    </div>
                </div>
            </header>
            <div className="app-layout">
                <aside className="sidebar">
                    <div className="title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div className="cover-img" style={{ width: '36px', height: '36px' }}>{userInitials}</div> {user.name}
                    </div>
                    <nav className="navlist">
                        <NavLink className={({isActive}) => `navitem ${isActive ? 'active' : ''}`} to="/student/dashboard" end>Dashboard</NavLink>
                        <NavLink className={({isActive}) => `navitem ${isActive ? 'active' : ''}`} to="/student/gigs">Gigs</NavLink>
                        <NavLink className={({isActive}) => `navitem ${isActive ? 'active' : ''}`} to="/student/messages">Messages</NavLink>
                        <NavLink className={({isActive}) => `navitem ${isActive ? 'active' : ''}`} to="/student/profile">Profile</NavLink>
                        <a className="navitem" href="#" onClick={handleLogout}>Log out</a>
                    </nav>
                </aside>
                <main className="content">
                    <Outlet />
                </main>
            </div>
        </>
    );
};

export default StudentLayout;
