import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import UserMenu from './pages/UserMenu';
import UserOrders from './pages/UserOrders';
import CreateAccount from './pages/CreateAccount';
import PaymentSuccess from './pages/PaymentSuccess';
import { Toaster } from 'react-hot-toast';
import SnackBackground from './components/SnackBackground';
import { ThemeProvider } from './context/ThemeContext';
import './App.css';

const ProtectedRoute = ({ children, requiredRole }) => {
  const user = JSON.parse(localStorage.getItem('user'));

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />; // Or unauthorized page
  }

  return children;
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <SnackBackground />
        <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
        <Routes>
          <Route path="/" element={<Login />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/menu"
            element={
              <ProtectedRoute requiredRole="user">
                <UserMenu />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute requiredRole="user">
                <UserOrders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/create-account"
            element={
              <ProtectedRoute requiredRole="user">
                <CreateAccount />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment-success"
            element={
              <ProtectedRoute requiredRole="user">
                <PaymentSuccess />
              </ProtectedRoute>
            }
          />
          {/* Redirect unknown routes to login */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
