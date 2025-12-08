import React, { useState } from 'react';
import openAIService from '../../Services/openAIservice';

function GroupAvailability() {
  // State for form inputs
  const [meetingName, setMeetingName] = useState('');
  const [duration, setDuration] = useState('1 hour');
  const [newParticipant, setNewParticipant] = useState('');
  const [participants, setParticipants] = useState([
    { id: 1, name: 'Sarah Johnson', email: 'sarah.johnson@example.com' },
    { id: 2, name: 'Michael Chen', email: 'michael.chen@example.com' },
    { id: 3, name: 'Taylor Kim', email: 'taylor.kim@example.com' }
  ]);
  const [preferredDays, setPreferredDays] = useState({
    monday: false,
    tuesday: false,
    wednesday: false,
    thursday: false,
    friday: false
  });
  const [timeRange, setTimeRange] = useState({
    from: '9:00 AM',
    to: '5:00 PM'
  });
  
  // Available duration options
  const durationOptions = [
    '30 minutes',
    '1 hour',
    '1.5 hours',
    '2 hours',
    '2.5 hours',
    '3 hours',
    '4 hours',
    'Full day'
  ];
  
  // Time options
  const timeOptions = [
    '8:00 AM', '8:30 AM', 
    '9:00 AM', '9:30 AM', 
    '10:00 AM', '10:30 AM', 
    '11:00 AM', '11:30 AM', 
    '12:00 PM', '12:30 PM', 
    '1:00 PM', '1:30 PM', 
    '2:00 PM', '2:30 PM', 
    '3:00 PM', '3:30 PM', 
    '4:00 PM', '4:30 PM', 
    '5:00 PM', '5:30 PM',
    '6:00 PM', '6:30 PM'
  ];
  
  // States for availability data and email sending
  const [participantAvailability, setParticipantAvailability] = useState({});
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [emailsSent, setEmailsSent] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  
  // Handle participant removal
  const handleRemoveParticipant = (id) => {
    setParticipants(participants.filter(participant => participant.id !== id));
    // Also remove their availability data if it exists
    if (participantAvailability[id]) {
      const updatedAvailability = { ...participantAvailability };
      delete updatedAvailability[id];
      setParticipantAvailability(updatedAvailability);
    }
  };
  
  // Handle adding new participant
  const handleAddParticipant = () => {
    if (!newParticipant.trim()) return;
    
    // Check if it's a valid email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmail = emailRegex.test(newParticipant);
    
    const newId = participants.length > 0 
      ? Math.max(...participants.map(p => p.id)) + 1 
      : 1;
    
    // If it's an email, try to extract a name, otherwise use the email as name
    let name = newParticipant;
    let email = newParticipant;
    
    if (isEmail) {
      const possibleName = newParticipant.split('@')[0];
      name = possibleName
        .replace(/[._-]/g, ' ')
        .replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    }
    
    setParticipants([...participants, { id: newId, name, email }]);
    setNewParticipant('');
  };
  
  // Toggle preferred day
  const toggleDay = (day) => {
    setPreferredDays(prev => ({
      ...prev,
      [day]: !prev[day]
    }));
  };
  
  // Simulated function to send availability request emails
  const sendAvailabilityRequests = async () => {
    if (participants.length === 0) {
      alert('Please add at least one participant');
      return;
    }
    
    setIsSendingEmails(true);
    
    try {
      // Simulating API call to send emails
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate some random availability data for each participant
      const mockAvailability = {};
      participants.forEach(participant => {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        const availableDays = {};
        
        days.forEach(day => {
          if (Math.random() > 0.3) { // 70% chance the person is available on this day
            availableDays[day] = [];
            
            // Add some random time slots
            const numSlots = Math.floor(Math.random() * 4) + 1; // 1-4 slots
            for (let i = 0; i < numSlots; i++) {
              const startHour = 9 + Math.floor(Math.random() * 8); // 9 AM to 4 PM
              const endHour = startHour + 1 + Math.floor(Math.random() * 3); // 1-3 hour slots
              
              availableDays[day].push({
                start: `${startHour}:00`,
                end: `${endHour}:00`
              });
            }
          }
        });
        
        mockAvailability[participant.id] = availableDays;
      });
      
      setParticipantAvailability(mockAvailability);
      setEmailsSent(true);
      
      // After "emails are sent", automatically find available slots
      findAvailableSlots(mockAvailability);
    } catch (error) {
      console.error('Error sending emails:', error);
      alert('Failed to send invitations. Please try again.');
    } finally {
      setIsSendingEmails(false);
    }
  };
  
  // Find available time slots using OpenAI service
  const findAvailableSlots = async (availabilityData = participantAvailability) => {
    // Validate form data
    if (!meetingName || participants.length === 0 || !Object.values(preferredDays).some(day => day)) {
      alert('Please fill in all required fields and select at least one preferred day.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Prepare meeting parameters
      const meetingParams = {
        duration,
        preferredDays: Object.entries(preferredDays)
          .filter(([_, selected]) => selected)
          .map(([day]) => day),
        timeRange
      };
      
      // Call OpenAI service to find optimal slots
      const bestSlots = await openAIService.findBestMeetingSlots(
        availabilityData,
        meetingParams
      );
      
      setAvailableSlots(bestSlots);
    } catch (error) {
      console.error('Error finding available slots:', error);
      
      // Fallback to basic slot generation
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
      const selectedDays = days.filter(day => preferredDays[day]);
      
      // Generate dummy available slots
      const dummySlots = [
        {
          day: selectedDays[0] || 'monday',
          date: 'May 1',
          time: '10:00 AM - 11:00 AM',
          availability: 'all'
        },
        {
          day: selectedDays[selectedDays.length > 1 ? 1 : 0] || 'wednesday',
          date: 'May 3',
          time: '2:00 PM - 3:00 PM',
          availability: 'all'
        },
        {
          day: selectedDays[0] || 'monday',
          date: 'May 8',
          time: '11:00 AM - 12:00 PM',
          availability: 'partial',
          availableCount: 2,
          totalCount: 3
        }
      ];
      
      setAvailableSlots(dummySlots);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // If we already have availability data, use it to find slots
    if (Object.keys(participantAvailability).length > 0) {
      findAvailableSlots();
    } else {
      // Otherwise send availability requests first
      sendAvailabilityRequests();
    }
  };
  
  // Select a slot for scheduling
  const handleSelectSlot = (slot) => {
    setSelectedSlot(slot);
  };
  
  // Schedule the selected meeting
  const scheduleSelectedSlot = () => {
    if (!selectedSlot) return;
    
    alert(`Meeting "${meetingName}" scheduled for ${selectedSlot.day}, ${selectedSlot.date} at ${selectedSlot.time}`);
    
    // Here you would typically make an API call to save the meeting
    // and send calendar invites to participants
    
    // Reset states after scheduling
    setMeetingName('');
    setParticipants([]);
    setPreferredDays({
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false
    });
    setTimeRange({
      from: '9:00 AM',
      to: '5:00 PM'
    });
    setEmailsSent(false);
    setParticipantAvailability({});
    setAvailableSlots([]);
    setSelectedSlot(null);
  };
  
  return (
    <div className="flex-1 p-6">
      <div className="bg-white shadow-md rounded-lg p-4 h-full">
        <h2 className="text-2xl font-bold mb-4">Group Availability</h2>
        
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Schedule a Group Meeting</h3>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Name</label>
                <input 
                  type="text" 
                  className="input"
                  placeholder="Weekly Team Sync"
                  value={meetingName}
                  onChange={(e) => setMeetingName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                <select 
                  className="input"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                >
                  {durationOptions.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Participants</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {participants.map(participant => (
                  <div 
                    key={participant.id} 
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center"
                  >
                    {participant.name}
                    <button 
                      type="button"
                      className="ml-2 text-blue-500 hover:text-blue-700"
                      onClick={() => handleRemoveParticipant(participant.id)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex">
                <input 
                  type="text" 
                  className="input flex-grow mr-2"
                  placeholder="Add participant email"
                  value={newParticipant}
                  onChange={(e) => setNewParticipant(e.target.value)}
                />
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={handleAddParticipant}
                >
                  Add
                </button>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Days</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries({
                  monday: 'Monday',
                  tuesday: 'Tuesday',
                  wednesday: 'Wednesday',
                  thursday: 'Thursday',
                  friday: 'Friday'
                }).map(([key, label]) => (
                  <div 
                    key={key} 
                    className={`px-3 py-1 rounded-md text-sm cursor-pointer ${
                      preferredDays[key] 
                        ? 'bg-primary text-white' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    onClick={() => toggleDay(key)}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Time Range</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">From</label>
                  <select 
                    className="input"
                    value={timeRange.from}
                    onChange={(e) => setTimeRange({...timeRange, from: e.target.value})}
                  >
                    {timeOptions.map(time => (
                      <option key={`from-${time}`} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">To</label>
                  <select 
                    className="input"
                    value={timeRange.to}
                    onChange={(e) => setTimeRange({...timeRange, to: e.target.value})}
                  >
                    {timeOptions.map(time => (
                      <option key={`to-${time}`} value={time}>{time}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex">
              <button 
                type="submit" 
                className="btn btn-primary mr-2 flex-grow"
                disabled={isLoading || isSendingEmails}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Finding Times...
                  </span>
                ) : (
                  'Find Available Times'
                )}
              </button>
              
              {!emailsSent && (
                <button 
                  type="button" 
                  className="btn btn-secondary flex-grow"
                  onClick={sendAvailabilityRequests}
                  disabled={isSendingEmails || participants.length === 0}
                >
                  {isSendingEmails ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending...
                    </span>
                  ) : (
                    'Send Availability Requests'
                  )}
                </button>
              )}
            </div>
            
            {emailsSent && (
              <div className="mt-3 text-sm text-green-600">
                Availability requests sent to all participants! 
                <button 
                  type="button"
                  className="ml-2 text-blue-600 underline"
                  onClick={() => setEmailsSent(false)}
                >
                  Reset
                </button>
              </div>
            )}
          </form>
        </div>
        
        {availableSlots.length > 0 && (
          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">Best Available Slots</h3>
            <div className="space-y-3">
              {availableSlots.map((slot, index) => (
                <div 
                  key={index} 
                  className={`p-3 bg-white rounded-md border ${
                    slot.availability === 'all' ? 'border-green-200' : 'border-yellow-200'
                  } flex justify-between items-center ${
                    selectedSlot === slot ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleSelectSlot(slot)}
                >
                  <div>
                    <span className="font-medium capitalize">{slot.day}, {slot.date}</span>
                    <span className="text-gray-500 ml-2">{slot.time}</span>
                  </div>
                  <div className="flex items-center">
                    {slot.availability === 'all' ? (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">All available</span>
                    ) : (
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                        {slot.availableCount}/{slot.totalCount} available
                      </span>
                    )}
                    <input 
                      type="radio" 
                      className="ml-3"
                      checked={selectedSlot === slot}
                      onChange={() => handleSelectSlot(slot)}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4">
              <button 
                className="btn btn-primary w-full"
                disabled={!selectedSlot}
                onClick={scheduleSelectedSlot}
              >
                Schedule Selected Slot
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GroupAvailability;