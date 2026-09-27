import React, { useCallback, useEffect, useState } from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import HomePage from './components/HomePage';
import Login from './components/Auth/Login';
import CreateAccount from './components/Auth/CreateAccount';
import SmartEventEntry from './components/Features/SmartEventEntry';
import MembershipSelection from './components/Auth/MembershipSelection';
import PaymentPage from './components/Payment/PaymentPage';
import PaymentSuccess from './components/Payment/PaymentSuccess';

function App() {
  const [user, setUser] = useState(null);
  const [membership, setMembership] = useState('basic');

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedMembership = localStorage.getItem('membership');

    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        localStorage.removeItem('user');
      }
    }

    if (savedMembership) setMembership(savedMembership);
  }, []);

  const loginUser = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  }, []);

  const logoutUser = useCallback(() => {
    setUser(null);
    localStorage.removeItem('user');
  }, []);

  const updateMembership = useCallback((newMembership) => {
    setMembership(newMembership);
    localStorage.setItem('membership', newMembership);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login loginUser={loginUser} />} />
        <Route path="/create-account" element={<CreateAccount loginUser={loginUser} />} />

        <Route
          path="/smart-event-entry"
          element={
            user
              ? <SmartEventEntry user={user} membership={membership} logoutUser={logoutUser} />
              : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/membership"
          element={
            user
              ? <MembershipSelection updateMembership={updateMembership} />
              : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/payment"
          element={
            user
              ? <PaymentPage membership={membership} />
              : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/payment/success"
          element={
            user
              ? <PaymentSuccess updateMembership={updateMembership} />
              : <Navigate to="/login" replace />
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
