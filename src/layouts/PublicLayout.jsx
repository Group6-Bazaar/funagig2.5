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
