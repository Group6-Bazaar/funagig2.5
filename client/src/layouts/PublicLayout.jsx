import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

const PublicLayout = () => {
    const location = useLocation();
    const isAuthPage = ['/login', '/signup', '/forgot-password', '/reset-password'].includes(location.pathname);

    return (
        <>
            <header className="navbar">
                <div className="brand">
                    <div className="logo"></div> FunaGig
                </div>
                <nav className="nav-actions">
                    <ThemeToggle />
                    {isAuthPage ? (
                        <Link className="btn ghost" to="/">Back to Home</Link>
                    ) : (
                        <Link className="btn" to="/login">Get Started</Link>
                    )}
                </nav>
            </header>

            <main className="container">
                <Outlet />
                <div className="footer">© 2025 FunaGig. All rights reserved.</div>
            </main>
        </>
    );
};

export default PublicLayout;
