import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import openAIService from '../../Services/openAIservice';

// Mood options
const MOOD_OPTIONS = [
  { id: 'great', label: 'Great', emoji: '😁', value: 5 },
  { id: 'good', label: 'Good', emoji: '🙂', value: 4 },
  { id: 'okay', label: 'Okay', emoji: '😐', value: 3 },
  { id: 'down', label: 'Down', emoji: '🙁', value: 2 },
  { id: 'bad', label: 'Bad', emoji: '😞', value: 1 },
];

// Activity categories
const ACTIVITY_CATEGORIES = [
  { id: 'work', label: 'Work', icon: '💼', color: '#4CAF50' },
  { id: 'study', label: 'Study', icon: '📚', color: '#2196F3' },
  { id: 'exercise', label: 'Exercise', icon: '🏃‍♂️', color: '#FF9800' },
  { id: 'leisure', label: 'Leisure', icon: '🎮', color: '#9C27B0' },
  { id: 'social', label: 'Social', icon: '👥', color: '#E91E63' },
  { id: 'selfCare', label: 'Self Care', icon: '🧘‍♀️', color: '#00BCD4' },
  { id: 'sleep', label: 'Sleep', icon: '😴', color: '#607D8B' },
];

// Time of day options for mood tracking
const TIME_PERIODS = [
  { id: 'morning', label: 'Morning', icon: '🌅' },
  { id: 'afternoon', label: 'Afternoon', icon: '☀️' },
  { id: 'evening', label: 'Evening', icon: '🌇' },
];

function HabitRecommendations() {
  const [moodEntries, setMoodEntries] = useState([]);
  const [habitEntries, setHabitEntries] = useState([]);
  const [currentMood, setCurrentMood] = useState(null);
  const [currentTimePeriod, setCurrentTimePeriod] = useState(null);
  const [currentActivity, setCurrentActivity] = useState('');
  const [currentCategory, setCurrentCategory] = useState(ACTIVITY_CATEGORIES[0]);
  const [activeTab, setActiveTab] = useState('journal'); // 'journal' or 'recommendations'
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [reflection, setReflection] = useState('');
  const [reflectionFeedback, setReflectionFeedback] = useState('');
  const [isProcessingReflection, setIsProcessingReflection] = useState(false);
  const [isEditingActivity, setIsEditingActivity] = useState(null);
  
  // Load data from local storage
  useEffect(() => {
    const savedMoodEntries = localStorage.getItem('moodEntries');
    const savedHabitEntries = localStorage.getItem('habitEntries');
    const savedReflections = localStorage.getItem('reflections');
    
    if (savedMoodEntries) {
      setMoodEntries(JSON.parse(savedMoodEntries));
    }
    
    if (savedHabitEntries) {
      setHabitEntries(JSON.parse(savedHabitEntries));
    }
    
    if (savedReflections) {
      const reflections = JSON.parse(savedReflections);
      // Get the most recent reflection
      if (reflections.length > 0) {
        setReflection(reflections[0].text);
      }
    }
  }, []);
  
  // Save data to local storage
  useEffect(() => {
    if (moodEntries.length > 0) {
      localStorage.setItem('moodEntries', JSON.stringify(moodEntries));
    }
    
    if (habitEntries.length > 0) {
      localStorage.setItem('habitEntries', JSON.stringify(habitEntries));
    }
  }, [moodEntries, habitEntries]);
  
  const handleLogMood = () => {
    if (!currentMood) return;
    
    const newEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      mood: currentMood,
      timePeriod: currentTimePeriod
    };
    
    // Add to the beginning of the array (most recent first)
    setMoodEntries([newEntry, ...moodEntries]);
    
    // Reset selection
    setCurrentMood(null);
    setCurrentTimePeriod(null);
  };
  
  const handleLogTimedMood = (timePeriod, mood) => {
    if (!mood) return;
    
    // Check if there's already a mood for this time period today
    const today = new Date().toISOString().split('T')[0];
    const alreadyLoggedToday = moodEntries.some(entry => {
      const entryDate = new Date(entry.date).toISOString().split('T')[0];
      return entryDate === today && entry.timePeriod?.id === timePeriod.id;
    });
    
    const newEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      mood: mood,
      timePeriod: timePeriod
    };
    
    if (alreadyLoggedToday) {
      // Update the existing entry
      setMoodEntries(moodEntries.map(entry => {
        const entryDate = new Date(entry.date).toISOString().split('T')[0];
        if (entryDate === today && entry.timePeriod?.id === timePeriod.id) {
          return newEntry;
        }
        return entry;
      }));
    } else {
      // Add a new entry
      setMoodEntries([newEntry, ...moodEntries]);
    }
  };
  
  const handleLogActivity = (e) => {
    e.preventDefault();
    
    if (!currentActivity.trim()) return;
    
    const newEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      activity: currentActivity,
      category: currentCategory,
    };
    
    // Add to the beginning of the array (most recent first)
    setHabitEntries([newEntry, ...habitEntries]);
    
    // Reset form
    setCurrentActivity('');
    setCurrentCategory(ACTIVITY_CATEGORIES[0]);
  };
  
  const handleSaveReflection = async () => {
    if (!reflection.trim()) return;
    
    const newReflection = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      text: reflection,
    };
    
    // Get existing reflections or initialize an empty array
    const existingReflections = JSON.parse(localStorage.getItem('reflections') || '[]');
    
    // Add new reflection to the beginning
    const updatedReflections = [newReflection, ...existingReflections];
    
    // Save to local storage
    localStorage.setItem('reflections', JSON.stringify(updatedReflections));
    
    // Process reflection with OpenAI
    setIsProcessingReflection(true);
    try {
      const feedback = await openAIService.analyzeReflection(
        reflection, 
        moodEntries.slice(0, 10), 
        habitEntries.slice(0, 10)
      );
      setReflectionFeedback(feedback);
    } catch (error) {
      console.error('Error analyzing reflection:', error);
      setReflectionFeedback('Thank you for your reflection! Reflecting on your day is a valuable habit for personal growth.');
    } finally {
      setIsProcessingReflection(false);
    }
    
    // Show a success message
    alert('Reflection saved successfully!');
  };
  
  const generateAIRecommendations = useCallback(async () => {
    if (moodEntries.length === 0 || habitEntries.length === 0) return;
    
    setIsLoading(true);
    
    try {
      // Call OpenAI service to generate personalized recommendations
      const recommendations = await openAIService.generateRecommendations(
        moodEntries,
        habitEntries
      );
      setRecommendations(recommendations);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      // Set some fallback recommendations if the API call fails
      setRecommendations([
        {
          id: 'morning',
          title: 'Morning Routine',
          activities: [
            { time: '07:00 AM', description: 'Wake up & hydrate', category: 'selfCare' },
            { time: '07:15 AM', description: 'Quick stretch or meditation', category: 'selfCare' },
            { time: '07:45 AM', description: 'Healthy breakfast', category: 'selfCare' },
            { time: '08:15 AM', description: 'Plan your day', category: 'work' },
          ]
        },
        {
          id: 'balance',
          title: 'Balance Your Day',
          activities: [
            { time: '11:30 AM', description: 'Take a short break', category: 'selfCare' },
            { time: '05:00 PM', description: 'Transition from work to personal time', category: 'selfCare' },
            { time: '07:00 PM', description: 'Dinner & relaxation', category: 'leisure' },
            { time: '10:00 PM', description: 'Wind down routine', category: 'sleep' },
          ]
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [moodEntries, habitEntries]);
  
  // Generate recommendations when switching to recommendations tab
  useEffect(() => {
    if (activeTab === 'recommendations' && moodEntries.length > 0 && habitEntries.length > 0 && recommendations.length === 0) {
      generateAIRecommendations();
    }
  }, [activeTab, moodEntries, habitEntries, recommendations, generateAIRecommendations]);
  
  // Function to update a recommendation activity
  const updateActivity = (recommendationId, activityIndex, updates) => {
    setRecommendations(prev => 
      prev.map(rec => {
        if (rec.id === recommendationId) {
          const updatedActivities = [...rec.activities];
          updatedActivities[activityIndex] = {
            ...updatedActivities[activityIndex],
            ...updates
          };
          return { ...rec, activities: updatedActivities };
        }
        return rec;
      })
    );
    setIsEditingActivity(null);
  };
  
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Habit-Based Recommendations</h2>
      
      {/* Tab navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`px-4 py-2 font-medium text-sm focus:outline-none ${
            activeTab === 'journal'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('journal')}
        >
          Daily Journal
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm focus:outline-none ${
            activeTab === 'recommendations'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('recommendations')}
        >
          Recommendations
        </button>
      </div>
      
      {activeTab === 'journal' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mood tracking */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">How are you feeling today?</h3>
            
            {/* Time of day specific mood tracking */}
            <div className="mb-6">
              <h4 className="text-md font-medium text-gray-700 mb-2">Track your mood throughout the day</h4>
              <div className="grid grid-cols-3 gap-4">
                {TIME_PERIODS.map(period => {
                  // Find today's mood entry for this time period
                  const today = new Date().toISOString().split('T')[0];
                  const todaysMoodForPeriod = moodEntries.find(entry => {
                    const entryDate = new Date(entry.date).toISOString().split('T')[0];
                    return entryDate === today && entry.timePeriod?.id === period.id;
                  });
                  
                  return (
                    <div key={period.id} className="bg-gray-50 p-3 rounded-md">
                      <h5 className="font-medium flex items-center mb-2">
                        <span className="mr-2">{period.icon}</span>
                        <span>{period.label}</span>
                      </h5>
                      <div className="flex justify-between">
                        {MOOD_OPTIONS.map(mood => (
                          <button
                            key={`${period.id}-${mood.id}`}
                            type="button"
                            className={`p-2 rounded-full ${
                              todaysMoodForPeriod?.mood.id === mood.id
                                ? 'bg-blue-100 border-2 border-blue-400'
                                : 'bg-white hover:bg-gray-100 border border-gray-200'
                            }`}
                            onClick={() => handleLogTimedMood(period, mood)}
                          >
                            <span>{mood.emoji}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* General mood tracking */}
            <div className="mt-6">
              <h4 className="text-md font-medium text-gray-700 mb-2">Current Mood</h4>
              <div className="grid grid-cols-5 gap-2 mb-4">
                {MOOD_OPTIONS.map(mood => (
                  <button
                    key={mood.id}
                    type="button"
                    className={`p-3 rounded-lg flex flex-col items-center ${
                      currentMood?.id === mood.id
                        ? 'bg-blue-100 border-2 border-blue-400'
                        : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                    }`}
                    onClick={() => setCurrentMood(mood)}
                  >
                    <span className="text-2xl">{mood.emoji}</span>
                    <span className="mt-1 text-sm">{mood.label}</span>
                  </button>
                ))}
              </div>
              
              {currentMood && (
                <div className="mb-4">
                  <h4 className="text-md font-medium text-gray-700 mb-2">Select Time Period (Optional)</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {TIME_PERIODS.map(period => (
                      <button
                        key={period.id}
                        type="button"
                        className={`p-2 rounded-lg flex items-center justify-center ${
                          currentTimePeriod?.id === period.id
                            ? 'bg-blue-100 border-2 border-blue-400'
                            : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                        }`}
                        onClick={() => setCurrentTimePeriod(period)}
                      >
                        <span className="mr-2">{period.icon}</span>
                        <span>{period.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <button
                type="button"
                className="btn btn-primary w-full"
                disabled={!currentMood}
                onClick={handleLogMood}
              >
                Log Mood
              </button>
            </div>
            
            {/* Mood history */}
            <div className="mt-6">
              <h4 className="text-md font-medium text-gray-700 mb-2">Recent Mood History</h4>
              
              {moodEntries.length === 0 ? (
                <p className="text-gray-500">No mood entries yet. Start tracking your mood above.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {moodEntries.slice(0, 10).map(entry => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                    >
                      <div className="flex items-center">
                        <span className="text-xl mr-2">{entry.mood.emoji}</span>
                        <div>
                          <span>{entry.mood.label}</span>
                          {entry.timePeriod && (
                            <span className="ml-2 text-xs bg-gray-200 rounded px-2 py-1">
                              {entry.timePeriod.icon} {entry.timePeriod.label}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">
                        {format(new Date(entry.date), 'MMM d, h:mm a')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Activity tracking */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Log Your Activities</h3>
            
            <form onSubmit={handleLogActivity}>
              <div className="mb-4">
                <label htmlFor="activity" className="block text-sm font-medium text-gray-700 mb-1">
                  What did you do?
                </label>
                <input
                  type="text"
                  id="activity"
                  className="input"
                  placeholder="e.g., Morning jog, Read a book"
                  value={currentActivity}
                  onChange={(e) => setCurrentActivity(e.target.value)}
                  required
                />
              </div>
              
              <div className="mb-4">
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {ACTIVITY_CATEGORIES.map(category => (
                    <button
                      key={category.id}
                      type="button"
                      className={`p-2 rounded-lg flex flex-col items-center ${
                        currentCategory?.id === category.id
                          ? 'bg-blue-100 border-2 border-blue-400'
                          : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                      }`}
                      onClick={() => setCurrentCategory(category)}
                    >
                      <span className="text-xl">{category.icon}</span>
                      <span className="mt-1 text-xs">{category.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <button type="submit" className="btn btn-primary w-full">
                Log Activity
              </button>
            </form>
            
            {/* Activity history */}
            <div className="mt-6">
              <h4 className="text-md font-medium text-gray-700 mb-2">Recent Activities</h4>
              
              {habitEntries.length === 0 ? (
                <p className="text-gray-500">No activity entries yet. Start tracking your activities above.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {habitEntries.slice(0, 10).map(entry => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                    >
                      <div className="flex items-center">
                        <span className="text-xl mr-2">{entry.category.icon}</span>
                        <div>
                          <div>{entry.activity}</div>
                          <div className="text-xs text-gray-500">{entry.category.label}</div>
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">
                        {format(new Date(entry.date), 'MMM d, h:mm a')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Your Ideal Day</h3>
            
            <p className="text-gray-600 mb-4">
              Based on your mood patterns and activity history, here are personalized recommendations to optimize your day.
            </p>
            
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
                <span className="ml-3 text-gray-600">Generating personalized recommendations...</span>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">
                  Start logging your mood and activities to receive personalized recommendations.
                </p>
                <button
                  onClick={() => setActiveTab('journal')}
                  className="mt-4 btn btn-primary"
                >
                  Go to Journal
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {recommendations.map(recommendation => (
                  <div key={recommendation.id} className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 p-3 border-b flex justify-between items-center">
                      <h4 className="font-medium">{recommendation.title}</h4>
                    </div>
                    <div className="p-4">
                      <ul className="space-y-3">
                        {recommendation.activities.map((activity, index) => {
                          const category = ACTIVITY_CATEGORIES.find(c => c.id === activity.category);
                          const isEditing = isEditingActivity && 
                                          isEditingActivity.recommendationId === recommendation.id && 
                                          isEditingActivity.activityIndex === index;
                          
                          return (
                            <li key={index} className="flex items-center">
                              {isEditing ? (
                                <div className="flex items-center w-full">
                                  <input 
                                    type="text" 
                                    className="input w-16 mr-2"
                                    value={activity.time}
                                    onChange={(e) => updateActivity(
                                      recommendation.id, 
                                      index, 
                                      {time: e.target.value}
                                    )}
                                  />
                                  <input 
                                    type="text" 
                                    className="input flex-grow mr-2"
                                    value={activity.description}
                                    onChange={(e) => updateActivity(
                                      recommendation.id, 
                                      index, 
                                      {description: e.target.value}
                                    )}
                                  />
                                  <select 
                                    className="input w-28"
                                    value={activity.category}
                                    onChange={(e) => updateActivity(
                                      recommendation.id, 
                                      index, 
                                      {category: e.target.value}
                                    )}
                                  >
                                    {ACTIVITY_CATEGORIES.map(cat => (
                                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                                    ))}
                                  </select>
                                  <button 
                                    className="ml-2 text-blue-500"
                                    onClick={() => setIsEditingActivity(null)}
                                  >
                                    Save
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div 
                                    className="flex-shrink-0 w-16 text-sm text-gray-500"
                                  >
                                    {activity.time}
                                  </div>
                                  <div 
                                    className="ml-2 px-3 py-2 rounded-md flex-1 flex justify-between items-center"
                                    style={{ backgroundColor: `${category?.color}20` }}
                                  >
                                    <div className="flex items-center">
                                      <span className="mr-2">{category?.icon}</span>
                                      <span>{activity.description}</span>
                                    </div>
                                    <button 
                                      className="text-gray-500 hover:text-gray-700"
                                      onClick={() => setIsEditingActivity({
                                        recommendationId: recommendation.id,
                                        activityIndex: index
                                      })}
                                    >
                                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                      </svg>
                                    </button>
                                  </div>
                                </>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6">
              <button
                onClick={generateAIRecommendations}
                className={`btn btn-primary w-full ${
                  isLoading || (moodEntries.length === 0 || habitEntries.length === 0)
                    ? 'opacity-50 cursor-not-allowed'
                    : ''
                }`}
                disabled={isLoading || moodEntries.length === 0 || habitEntries.length === 0}
              >
                {isLoading ? 'Generating...' : 'Refresh Recommendations'}
              </button>
              
              {(moodEntries.length === 0 || habitEntries.length === 0) && (
                <p className="text-center text-sm text-red-500 mt-2">
                  You need to log both mood and activities to generate recommendations.
                </p>
              )}
            </div>
          </div>
          
          {/* Evening reflection */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-medium text-gray-800 mb-4">Evening Reflection</h3>
            
            <div className="p-4 bg-indigo-50 rounded-lg mb-4">
              <h4 className="font-medium text-indigo-800 mb-2">Questions to consider:</h4>
              <ul className="space-y-2 text-indigo-700">
                <li>• What went well today?</li>
                <li>• What could have gone better?</li>
                <li>• What am I grateful for today?</li>
                <li>• What did I learn today?</li>
                <li>• What's one thing I want to focus on tomorrow?</li>
              </ul>
            </div>
            
            <textarea
              className="input h-32 mb-4"
              placeholder="Write your evening reflection here..."
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
            ></textarea>
            
            <button 
              type="button" 
              className="btn btn-primary w-full"
              onClick={handleSaveReflection}
              disabled={!reflection.trim() || isProcessingReflection}
            >
              {isProcessingReflection ? 'Processing...' : 'Save Reflection'}
            </button>
            
            {reflectionFeedback && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Feedback:</h4>
                <p className="text-blue-700">{reflectionFeedback}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default HabitRecommendations;