import './index.css';
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth.jsx';
import { I18n } from './lib/i18n.jsx';
import { Toaster } from './components/ui.jsx';
import Shell from './components/Shell.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Onboarding from './pages/Onboarding.jsx';
import PublicVerify from './pages/PublicVerify.jsx';
import Overview from './pages/admin/Overview.jsx';
import Institutions from './pages/admin/Institutions.jsx';
import InstitutionDetail from './pages/admin/InstitutionDetail.jsx';
import Flags from './pages/admin/Flags.jsx';
import Reports from './pages/admin/Reports.jsx';
import Audit from './pages/admin/Audit.jsx';
import Dashboard from './pages/institution/Dashboard.jsx';
import UploadPage from './pages/institution/Upload.jsx';
import Students from './pages/institution/Students.jsx';
import InboxPage from './pages/institution/Inbox.jsx';
import Developers from './pages/institution/Developers.jsx';
import Verify from './pages/Verify.jsx';
import MyRecord from './pages/student/MyRecord.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <I18n>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/v/:token" element={<PublicVerify />} />
            <Route element={<Shell />}>
              <Route path="/admin" element={<Overview />} />
              <Route path="/admin/institutions" element={<Institutions />} />
              <Route path="/admin/institutions/:id" element={<InstitutionDetail />} />
              <Route path="/admin/flags" element={<Flags />} />
              <Route path="/admin/reports" element={<Reports />} />
              <Route path="/admin/audit" element={<Audit />} />
              <Route path="/institution" element={<Dashboard />} />
              <Route path="/institution/upload" element={<UploadPage />} />
              <Route path="/institution/students" element={<Students />} />
              <Route path="/institution/inbox" element={<InboxPage />} />
              <Route path="/institution/developers" element={<Developers />} />
              <Route path="/verify" element={<Verify />} />
              <Route path="/me" element={<MyRecord />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster />
        </AuthProvider>
      </I18n>
    </BrowserRouter>
  );
}
