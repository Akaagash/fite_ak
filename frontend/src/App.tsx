import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './layouts/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Auth pages
import LoginSignup from './pages/auth/LoginSignup';

// Shared pages
import Home from './pages/Home';
import UserSettings from './pages/UserSettings';

// Posted Jobs pages
import PostedJobs from './pages/posted-jobs/PostedJobs';
import JobDetail from './pages/posted-jobs/JobDetail';
import Applicants from './pages/posted-jobs/Applicants';
import PostDailyJob from './pages/posted-jobs/PostDailyJob';
import PostLongTermJob from './pages/posted-jobs/PostLongTermJob';

// Applied Jobs pages
import AppliedJobs from './pages/applied-jobs/AppliedJobs';

// Explore Jobs pages
import ExploreJobs from './pages/explore-jobs/ExploreJobs';

// Job Responses pages
import JobResponses from './pages/job-responses/JobResponses';

import { ModeProvider } from './context/ModeContext';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ModeProvider>
        <AuthProvider>
          <Router>
            <Routes>
              {/* Public route - Login/Signup */}
              <Route path="/login" element={<LoginSignup />} />
              
              {/* Default route - Redirect to login */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              
              {/* Protected routes - Require authentication */}
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route path="home" element={<Home />} />
                <Route path="posted-jobs" element={<PostedJobs />} />
                <Route path="job-detail/:mode/:jobId" element={<JobDetail />} />
                <Route path="applicants/:mode/:jobId" element={<Applicants />} />
                <Route path="job-responses/:mode/:jobId" element={<JobResponses />} />
                <Route path="post-daily-job" element={<PostDailyJob />} />
                <Route path="post-long-term-job" element={<PostLongTermJob />} />
                <Route path="applied-jobs" element={<AppliedJobs />} />
                <Route path="explore-jobs" element={<ExploreJobs />} />
                <Route path="settings" element={<UserSettings />} />
              </Route>
            </Routes>
          </Router>
        </AuthProvider>
      </ModeProvider>
    </ThemeProvider>
  );
};

export default App;
