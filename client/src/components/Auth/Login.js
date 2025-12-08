import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

function Login({ loginUser }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();
  
  // Load saved users from local storage
  useEffect(() => {
    const savedUsers = localStorage.getItem('users');
    if (savedUsers) {
      setUsers(JSON.parse(savedUsers));
    } else {
      // If no users exist yet, create a sample user
      const sampleUsers = [
        {
          firstName: 'Test',
          lastName: 'User',
          username: 'test',
          password: 'password',
          createdAt: new Date().toISOString()
        }
      ];
      localStorage.setItem('users', JSON.stringify(sampleUsers));
      setUsers(sampleUsers);
    }
  }, []);
  
  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent default form submission
    
    // Basic validation
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }
    
    // Check if user exists
    const user = users.find(user => user.username === username && user.password === password);
    
    if (user) {
      // Login successful
      loginUser(user);
      
      // Check if there's a redirect path stored
      const redirectPath = localStorage.getItem('redirectAfterLogin') || '/smart-event-entry';
      localStorage.removeItem('redirectAfterLogin'); // Clear it after use
      
      navigate(redirectPath);
    } else {
      setError('Invalid username or password');
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-extrabold text-gray-900">
            Plan<span className="text-primary">Wise</span>
          </h1>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Login
          </h2>
        </div>
        
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
              </div>
            </div>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Sign in
            </button>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link 
                to="/create-account" 
                className="font-medium text-primary hover:text-primary-dark"
              >
                Create one now
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Login;