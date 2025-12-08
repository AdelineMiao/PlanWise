import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './components/HomePage';
import Login from './components/Auth/Login';
import CreateAccount from './components/Auth/CreateAccount';
import SmartEventEntry from './components/Features/SmartEventEntry';
import MembershipSelection from './components/Auth/MembershipSelection';
import PaymentPage from './components/Payment/PaymentPage';

function App() {
  const [user, setUser] = useState(null);
  const [membership, setMembership] = useState('basic');
  
  // Load user data from localStorage on app start
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedMembership = localStorage.getItem('membership');
    
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    
    if (savedMembership) {
      setMembership(savedMembership);
    }
  }, []);
  
  // Function to handle user login
  const loginUser = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };
  
  // Function to handle user logout
  const logoutUser = () => {
    setUser(null);
    localStorage.removeItem('user');
  };
  
  // Function to update membership
  const updateMembership = (newMembership) => {
    setMembership(newMembership);
    localStorage.setItem('membership', newMembership);
  };
  
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<Login loginUser={loginUser} />} />
        <Route path="/create-account" element={<CreateAccount loginUser={loginUser} />} />
        <Route 
          path="/smart-event-entry" 
          element={
            user ? (
              <SmartEventEntry user={user} membership={membership} logoutUser={logoutUser} />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/membership" 
          element={
            user ? (
              <MembershipSelection updateMembership={updateMembership} />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
        <Route 
          path="/payment" 
          element={
            user ? (
              <PaymentPage membership={membership} updateMembership={updateMembership} />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;