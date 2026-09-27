import React from 'react';
import { Link } from 'react-router-dom';

function Navbar({ user, logoutUser }) {
  return (
    <nav className="bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/smart-event-entry" className="text-2xl font-bold text-primary">
          Plan<span className="text-gray-900">Wise</span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            to="/smart-event-entry"
            className="text-sm font-medium text-gray-600 hover:text-primary"
          >
            Calendar
          </Link>
          <Link
            to="/membership"
            className="text-sm font-medium text-gray-600 hover:text-primary"
          >
            Membership
          </Link>
          <span className="hidden text-sm text-gray-500 sm:inline">
            {user?.firstName} {user?.lastName}
          </span>
          <button onClick={logoutUser} className="btn btn-secondary btn-sm">
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
