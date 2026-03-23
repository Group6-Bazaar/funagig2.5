import React from 'react';
import { Outlet, Link } from 'react-router-dom';

const PublicLayout = () => {
    return (
        <>
            <header className="navbar">
                <div className="brand">
                    <div className="logo"></div> FunaGig
                </div>
                <nav className="nav-actions">
                    <Link className="btn ghost" to="/#about">About</Link>
                    <Link className="btn ghost" to="/#how-it-works">How It Works</Link>
                    <Link className="btn ghost" to="/#contact">Contact</Link>
                    <Link className="btn ghost" to="/gigs">Browse Gigs</Link>
                    <Link className="btn" to="/login">Get Started</Link>
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
