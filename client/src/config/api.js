// src/config/api.js

// Base URL for API calls
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.yourscheduler.com';

// API endpoints
export const API_ENDPOINTS = {
  SCHEDULE: '/schedule',
  TASKS: '/tasks',
  PREFERENCES: '/preferences'
};

// API configuration
export const API_CONFIG = {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
  }
};

// Default scheduler preferences
export const DEFAULT_PREFERENCES = {
  workingHours: {
    start: '09:00',
    end: '17:00'
  },
  breakDuration: 30, // in minutes
  maxTasksPerDay: 5,
  prioritizeByDeadline: true,
  allowWeekends: false
};

// If using a scheduling API, you'll need to add these variables to your .env file:
/*
REACT_APP_API_BASE_URL=https://api.yourscheduler.com
REACT_APP_API_KEY=your_api_key_here
*/