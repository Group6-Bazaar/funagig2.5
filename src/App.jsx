import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import StudentLayout from './layouts/StudentLayout';
import BusinessLayout from './layouts/BusinessLayout';

import Home from './pages/Home';
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import StudentDashboard from './pages/student/Dashboard';
import StudentGigs from './pages/student/Gigs';
import StudentMessaging from './pages/student/Messaging';
import StudentProfile from './pages/student/Profile';

import BusinessDashboard from './pages/business/Dashboard';
import BusinessPostGig from './pages/business/PostGig';
import BusinessManageGigs from './pages/business/ManageGigs';
import BusinessApplicants from './pages/business/Applicants';
import BusinessProfile from './pages/business/Profile';
import BusinessMessaging from './pages/business/Messaging';

import { useAuth } from './context/AuthContext';

// Stub components for auth/routing before implementation
const PublicGigs = () => <div>Public Gigs Page Coming Soon</div>;

const ProtectedRoute = ({ children, role }) => {
    const { user, loading } = useAuth();
    if (loading) return <div>Loading...</div>;
    if (!user) return <Navigate to="/login" replace />;
    if (role && user.role !== role) {
        return <Navigate to={user.role === 'student' ? '/student/dashboard' : '/business/dashboard'} replace />;
    }
    return children;
};

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route element={<PublicLayout />}>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/gigs" element={<PublicGigs />} />
                </Route>

                <Route path="/student" element={
                    <ProtectedRoute role="student">
                        <StudentLayout />
                    </ProtectedRoute>
                }>
                    <Route path="dashboard" element={<StudentDashboard />} />
                    <Route path="gigs" element={<StudentGigs />} />
                    <Route path="messages" element={<StudentMessaging />} />
                    <Route path="profile" element={<StudentProfile />} />
                </Route>

                <Route path="/business" element={
                    <ProtectedRoute role="business">
                        <BusinessLayout />
                    </ProtectedRoute>
                }>
                    <Route path="dashboard" element={<BusinessDashboard />} />
                    <Route path="post-gig" element={<BusinessPostGig />} />
                    <Route path="gigs" element={<BusinessManageGigs />} />
                    <Route path="applicants" element={<BusinessApplicants />} />
                    <Route path="messages" element={<BusinessMessaging />} />
                    <Route path="profile" element={<BusinessProfile />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
};

export default App;
