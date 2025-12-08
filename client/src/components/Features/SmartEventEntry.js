import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import moment from 'moment';
import { format } from 'date-fns';
import SmartEventEntryHeader from './SmartEventEntryHeader';
import HabitRecommendations from './HabitRecommendations';
import GroupAvailability from './GroupAvailability';
import AutoTaskScheduler from './AutoTaskScheduler';
import openAIService from '../../Services/openAIservice';

/**
 * Fallback function to parse natural language event text into structured event data
 * @param {string} text - Natural language description of event
 * @returns {Object} - Parsed event data
 */
function parseEventText(text) {
  if (!text) return null;
  
  const lowerText = text.toLowerCase().trim();
  
  // Check if this is a cancellation request
  if (lowerText.includes('cancel') || lowerText.includes('delete') || lowerText.includes('remove')) {
    const eventToCancel = text.replace(/cancel|delete|remove/gi, '').trim();
    return { 
      action: 'cancel',
      title: eventToCancel
    };
  }
  
  // Default values
  const result = {
    action: 'add',
    title: text,
    start: new Date(),
    end: new Date(new Date().getTime() + 60 * 60 * 1000), // Default 1 hour
    location: '',
    notes: ''
  };
  
  // Try to extract date and time information
  try {
    // Look for common date patterns
    let dateAdjusted = false;
    
    // Check for "tomorrow"
    if (lowerText.includes('tomorrow')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      result.start = new Date(tomorrow);
      result.end = new Date(tomorrow.getTime() + 60 * 60 * 1000);
      dateAdjusted = true;
    }
    // Check for "next week"
    else if (lowerText.includes('next week')) {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      result.start = new Date(nextWeek);
      result.end = new Date(nextWeek.getTime() + 60 * 60 * 1000);
      dateAdjusted = true;
    }
    // Check for day of the week
    else {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      for (let i = 0; i < days.length; i++) {
        if (lowerText.includes(days[i])) {
          const today = new Date();
          const currentDay = today.getDay();
          const targetDay = i;
          let daysToAdd = targetDay - currentDay;
          if (daysToAdd <= 0) daysToAdd += 7; // Next week
          
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + daysToAdd);
          result.start = new Date(futureDate);
          result.end = new Date(futureDate.getTime() + 60 * 60 * 1000);
          dateAdjusted = true;
          break;
        }
      }
    }
    
    // Look for time information with "at" pattern
    const timePattern = /at\s+(\d{1,2})(?::(\d{1,2}))?\s*(am|pm)?/i;
    const timeMatch = lowerText.match(timePattern);
    
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      const period = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
      
      // Adjust hours for AM/PM
      if (period === 'pm' && hours < 12) {
        hours += 12;
      } else if (period === 'am' && hours === 12) {
        hours = 0;
      }
      
      // Set the time
      result.start.setHours(hours, minutes, 0, 0);
      result.end = new Date(result.start.getTime() + 60 * 60 * 1000);
    }
    
    // Look for duration patterns
    const durationPattern = /for\s+(\d+)\s*(hour|hr|hours|hrs)/i;
    const durationMatch = lowerText.match(durationPattern);
    
    if (durationMatch) {
      const duration = parseInt(durationMatch[1], 10);
      result.end = new Date(result.start.getTime() + duration * 60 * 60 * 1000);
    }
    
    // Extract location if mentioned with "at" or "in"
    const locationPattern = /(?:at|in)\s+([^,\.]+)(?:,|\.|$)/i;
    const locationMatch = lowerText.match(locationPattern);
    
    if (locationMatch && !timeMatch) { // Make sure it's not matching the time pattern
      result.location = locationMatch[1].trim();
    }
    
    // Extract title by removing date/time/location information
    let title = text;
    
    // Remove time information
    if (timeMatch) {
      title = title.replace(timeMatch[0], '');
    }
    
    // Remove location information
    if (locationMatch) {
      title = title.replace(locationMatch[0], '');
    }
    
    // Remove date-related words
    const dateWords = ['tomorrow', 'next week', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    for (const word of dateWords) {
      if (title.toLowerCase().includes(word)) {
        title = title.replace(new RegExp(word, 'i'), '');
      }
    }
    
    // Remove duration information
    if (durationMatch) {
      title = title.replace(durationMatch[0], '');
    }
    
    // Clean up the title (remove multiple spaces, trim)
    title = title.replace(/\s+/g, ' ').trim();
    
    // Set the cleaned title if we have one
    if (title.length > 0) {
      result.title = title;
    }
    
    return result;
  } catch (error) {
    console.error('Error parsing event text:', error);
    // Return basic event with default values if parsing fails
    return {
      action: 'add',
      title: text,
      start: new Date(),
      end: new Date(new Date().getTime() + 60 * 60 * 1000),
      location: '',
      notes: ''
    };
  }
}

function SmartEventEntry({ user, membership, logoutUser }) {
  const [events, setEvents] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [chatHistory, setChatHistory] = useState([
    {
      sender: 'assistant',
      text: 'Welcome to PlanWise! Try typing something like "Dinner with Sam tomorrow at 7pm" or "cancel Dinner with Sam" to remove an event.'
    }
  ]);
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [currentFeature, setCurrentFeature] = useState('calendar');
  
  // Load saved events from localStorage based on user ID
  useEffect(() => {
    if (user) {
      const userEvents = localStorage.getItem(`events_${user.username}`);
      if (userEvents) {
        // Convert string dates back to Date objects
        const parsedEvents = JSON.parse(userEvents).map(event => ({
          ...event,
          start: new Date(event.start),
          end: new Date(event.end)
        }));
        setEvents(parsedEvents);
      }
    }
  }, [user]);
  
  // Save events to localStorage when updated
  useEffect(() => {
    if (user && events) {
      localStorage.setItem(`events_${user.username}`, JSON.stringify(events));
    }
  }, [events, user]);
  
  const handleInputChange = (e) => {
    setInputText(e.target.value);
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && inputText.trim()) {
      handleSubmit();
    }
  };
  
  const handleSubmit = async () => {
    if (!inputText.trim() || isProcessing) return;
    
    // Add user message to chat
    setChatHistory(prev => [
      ...prev,
      { sender: 'user', text: inputText }
    ]);
    
    setIsProcessing(true);
    
    try {
      // Try using OpenAI service first
      let processedEvent;
      try {
        processedEvent = await openAIService.parseEventText(inputText);
        console.log("OpenAI response:", processedEvent); // Debug log
      } catch (openAIError) {
        console.error("OpenAI service failed:", openAIError);
        // Fall back to local parsing
        processedEvent = parseEventText(inputText);
        console.log("Fallback parsing:", processedEvent); // Debug log
      }
      
      if (processedEvent.action === 'cancel') {
        // Find events with matching title
        const eventTitle = processedEvent.title;
        const matchingEvents = events.filter(event => 
          event.title.toLowerCase().includes(eventTitle.toLowerCase())
        );
        
        if (matchingEvents.length > 0) {
          // Remove the matching events
          const updatedEvents = events.filter(event => 
            !event.title.toLowerCase().includes(eventTitle.toLowerCase())
          );
          setEvents(updatedEvents);
          
          setChatHistory(prev => [
            ...prev,
            { 
              sender: 'assistant', 
              text: `Removed ${matchingEvents.length} event(s) with the title "${eventTitle}".`
            }
          ]);
        } else {
          setChatHistory(prev => [
            ...prev,
            { 
              sender: 'assistant', 
              text: `I couldn't find any events matching "${eventTitle}" to cancel.`
            }
          ]);
        }
      } else {
        // Handle event creation
        const newEvent = {
          id: Date.now(),
          title: processedEvent.title || inputText, // Fallback to input if no title
          start: processedEvent.start,
          end: processedEvent.end,
          location: processedEvent.location || '',
          notes: processedEvent.notes || ''
        };
        
        setEvents(prev => [...prev, newEvent]);
        
        // Format the dates for display
        const startFormatted = format(newEvent.start, 'EEEE, MMMM d, yyyy h:mm a');
        const endFormatted = format(newEvent.end, 'h:mm a');
        
        setChatHistory(prev => [
          ...prev,
          { 
            sender: 'assistant', 
            text: `Added "${newEvent.title}" to your calendar on ${startFormatted} to ${endFormatted}.`
          }
        ]);
      }
    } catch (error) {
      console.error('Error processing event:', error);
      
      // Try one more time with the original parsing function
      try {
        const fallbackEvent = parseEventText(inputText);
        
        if (fallbackEvent.action !== 'cancel') {
          const newEvent = {
            id: Date.now(),
            title: fallbackEvent.title,
            start: fallbackEvent.start,
            end: fallbackEvent.end
          };
          
          setEvents(prev => [...prev, newEvent]);
          
          const startFormatted = format(newEvent.start, 'EEEE, MMMM d, yyyy h:mm a');
          const endFormatted = format(newEvent.end, 'h:mm a');
          
          setChatHistory(prev => [
            ...prev,
            { 
              sender: 'assistant', 
              text: `Added "${newEvent.title}" to your calendar on ${startFormatted} to ${endFormatted}.`
            }
          ]);
        }
      } catch (fallbackError) {
        console.error('Fallback parsing also failed:', fallbackError);
        setChatHistory(prev => [
          ...prev,
          { 
            sender: 'assistant', 
            text: 'Sorry, I had trouble understanding that. Could you try rephrasing?'
          }
        ]);
      }
    } finally {
      setIsProcessing(false);
      setInputText('');
    }
  };
  
  // Handle calendar navigation and view changes
  const handleNavigate = (newDate) => {
    setDate(newDate);
  };
  
  const handleViewChange = (newView) => {
    setView(newView);
  };
  
  // Clear all events function
  const clearAllEvents = () => {
    setEvents([]);
    localStorage.removeItem(`events_${user.username}`);
    setChatHistory(prev => [
      ...prev,
      { 
        sender: 'assistant', 
        text: 'All events have been cleared from your calendar.'
      }
    ]);
  };
  
  // Feature selection handler
  const handleFeatureChange = (featureId) => {
    setCurrentFeature(featureId);
  };
  
  // Render the appropriate feature component based on selection
  const renderFeature = () => {
    switch (currentFeature) {
      case 'calendar':
        return (
          <div className="flex-1 p-6 overflow-hidden">
            {/* Calendar view */}
            <div className="bg-white shadow-md rounded-lg p-4 h-full">
              <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">
                  {user ? `${user.firstName}'s Calendar` : 'My Calendar'}
                </h1>
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={clearAllEvents}
                >
                  Clear All Events
                </button>
              </div>
              <Calendar
                localizer={momentLocalizer(moment)}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: 'calc(100% - 40px)' }}
                views={['month', 'week', 'day']}
                view={view}
                date={date}
                onNavigate={handleNavigate}
                onView={handleViewChange}
                popup
              />
            </div>
          </div>
        );
      
      case 'habits':
        return <HabitRecommendations />;
      
      case 'group':
        return <GroupAvailability />;
      
      case 'tasks':
        return <AutoTaskScheduler events={events} />;
      
      default:
        return <div>Feature not found</div>;
    }
  };
    
  return (
    <div className="flex flex-col h-screen">
      <SmartEventEntryHeader 
        user={user} 
        logoutUser={logoutUser} 
        membership={membership} 
        currentFeature={currentFeature}
        onFeatureChange={handleFeatureChange}
      />
      
      {renderFeature()}
      
      {/* Only show chat interface for calendar feature */}
      {currentFeature === 'calendar' && (
        <div className="bg-white shadow-md h-72 border-t">
          <div className="flex flex-col h-full">
            <div className="flex-1 p-4 overflow-y-auto">
              {chatHistory.map((message, index) => (
                <div
                  key={index}
                  className={`mb-3 ${
                    message.sender === 'user' ? 'text-right' : 'text-left'
                  }`}
                >
                  <div
                    className={`inline-block p-3 rounded-lg ${
                      message.sender === 'user'
                        ? 'bg-primary text-white'
                        : 'bg-secondary text-gray-800'
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t flex">
              <input
                type="text"
                className="flex-1 mr-2 input"
                placeholder="Add or cancel an event..."
                value={inputText}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                disabled={isProcessing}
              />
              <button
                className={`btn btn-primary ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={handleSubmit}
                disabled={!inputText.trim() || isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SmartEventEntry;