import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';

function Dashboard() {
  return <div style={{ padding: '2rem' }}>Dashboard — coming soon</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/applications" element={<div style={{ padding: '2rem' }}>Applications — coming soon</div>} />
              <Route path="/resumes" element={<div style={{ padding: '2rem' }}>Resumes — coming soon</div>} />
              <Route path="/interviews" element={<div style={{ padding: '2rem' }}>Interviews — coming soon</div>} />
              <Route path="/analysis" element={<div style={{ padding: '2rem' }}>Analysis — coming soon</div>} />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
