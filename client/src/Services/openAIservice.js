// openAIservice.js
import axios from 'axios';

const API_URL = 'http://localhost:4000/api';
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY || 'your-openai-api-key-here';
const API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';


// Default values to use when encountering NaN
const DEFAULT_VALUES = {
  estimatedHours: 1,
  maxTasksPerDay: 5,
  breakBetweenTasks: 15,
  splitTaskThreshold: 2,
  priorityValue: 2
};



/**
 * Safely parses a date string or object into a valid Date object
 * @param {string|Date} dateValue - Date string or object to parse
 * @param {Date} fallback - Fallback date to use if parsing fails
 * @returns {Date} - Valid Date object
 */
/**
 * Safely parses a date string or object into a valid Date object,
 * and corrects for UTC “Z” timestamps by shifting to local.
 */
const safeParseDate = (dateValue, fallback = new Date()) => {
  try {
    if (dateValue instanceof Date) {
      return isNaN(dateValue.getTime()) ? fallback : dateValue;
    }
    if (typeof dateValue === 'string') {
      let date;
      // If it ends with Z (UTC), parse then shift by local offset
      if (/Z$/.test(dateValue)) {
        date = new Date(dateValue);
        // Add the timezone offset (in minutes) to convert UTC→local
        date.setMinutes(date.getMinutes() + date.getTimezoneOffset());
      } else {
        // Otherwise parse normally (will treat as local)
        date = new Date(dateValue);
      }
      return isNaN(date.getTime()) ? fallback : date;
    }
    return fallback;
  } catch (e) {
    console.warn("Error parsing date:", e);
    return fallback;
  }
};

/**
 * Parse natural language input to calendar events with OpenAI
 * @param {string} text - Natural language description of event
 * @returns {Promise<Object>} - Parsed event data
 */
export const parseEventText = async (text) => {
  try {
    // First, check if we can parse the time directly using our manual parser
    // This will be our primary method to ensure correct time parsing
    const manuallyParsed = parseEventManually(text);

    // Use OpenAI to process the event text for the title and other details
    const response = await axios.post(
      API_ENDPOINT,
      {
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a calendar event assistant. Extract event information from user input and create a simplified title.
            
            Examples:
            - Input: "I will have dinner with John tomorrow night at 7pm"
              Output: Title should be "Dinner with John", date is tomorrow, time is 7pm
            - Input: "Cancel my meeting with marketing team"
              Output: Action should be cancel, event to cancel is "meeting with marketing team"
            
            Format your response as a JSON object with these fields:
            - action: 'add' or 'cancel'
            - title: Simplified event title (remove date/time info, focus on the core event)
            - location: Optional location (if mentioned)
            - notes: Optional notes (if any additional information is provided)`
          },
          {
            role: "user",
            content: text
          }
        ],
        temperature: 0.3,
        max_tokens: 250
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Parse the OpenAI response
    const result = JSON.parse(response.data.choices[0].message.content);
    
    // Log for debugging
    console.log("OpenAI parsed result:", result);
    console.log("Manually parsed date/time:", manuallyParsed);
    
    // Combine the manually parsed time (which should be accurate) with OpenAI's title and details
    return {
      action: result.action || 'add',
      title: result.title || text,
      start: manuallyParsed.start,
      end: manuallyParsed.end,
      location: result.location || '',
      notes: result.notes || ''
    };
  } catch (error) {
    console.error('Error processing event with OpenAI:', error);
    
    // If OpenAI fails, just use our manual parser as a fallback
    return parseEventManually(text);
  }
};

/**
 * Manually parse event text to extract date and time information
 * @param {string} text - Event text to parse
 * @returns {Object} - Parsed event with start and end times
 */
function parseEventManually(text) {
  // Start with default values
  const defaultTitle = text
    .replace(/\b(tomorrow|today|next\s+\w+)\b/gi, '')
    .replace(/\bat\s+\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.|noon|midnight)\b/gi, '')
    .replace(/\b\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.|noon|midnight)\b/gi, '')
    .trim();

  // Determine the date (today or tomorrow)
  const baseDate = new Date();
  if (/\btomorrow\b/i.test(text)) {
    baseDate.setDate(baseDate.getDate() + 1);
  } else if (/\bnext\s+(\w+)\b/i.test(text)) {
    // Handle "next X" where X is a day of the week
    const dayMatch = text.match(/\bnext\s+(\w+)\b/i);
    if (dayMatch) {
      const targetDay = dayMatch[1].toLowerCase();
      const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const targetDayIndex = daysOfWeek.findIndex(day => day.startsWith(targetDay.substring(0, 3)));
      
      if (targetDayIndex >= 0) {
        const currentDay = baseDate.getDay();
        let daysToAdd = targetDayIndex - currentDay;
        if (daysToAdd <= 0) {
          daysToAdd += 7; // Next week
        }
        baseDate.setDate(baseDate.getDate() + daysToAdd);
      }
    }
  }
  
  // Reset time to start of day
  baseDate.setHours(0, 0, 0, 0);
  
  // Extract time information
  let hours = 9; // Default to 9 AM if no time is specified
  let minutes = 0;
  
  // Look for time patterns like "7pm", "7:30pm", "noon", "midnight"
  const timePattern = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.|noon|midnight)?\b/i;
  const timeMatch = text.match(timePattern);
  
  if (timeMatch) {
    const timeSpecifier = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
    
    if (timeSpecifier === 'noon') {
      hours = 12;
      minutes = 0;
    } else if (timeSpecifier === 'midnight') {
      hours = 0;
      minutes = 0;
    } else {
      hours = parseInt(timeMatch[1], 10);
      minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
      
      // Convert to 24-hour format if PM
      if (timeSpecifier && timeSpecifier.startsWith('p') && hours < 12) {
        hours += 12;
      } else if (timeSpecifier && timeSpecifier.startsWith('a') && hours === 12) {
        hours = 0; // 12 AM is 0 in 24-hour format
      }
    }
  }
  
  // Set the start time
  const startTime = new Date(baseDate);
  startTime.setHours(hours, minutes, 0, 0);
  
  // End time is 1 hour after start time (default duration)
  const endTime = new Date(startTime);
  endTime.setHours(endTime.getHours() + 1);
  
  console.log(`Parsed time: ${hours}:${minutes.toString().padStart(2, '0')}`);
  console.log(`Start time: ${startTime.toLocaleString()}`);
  
  return {
    action: 'add',
    title: defaultTitle,
    start: startTime,
    end: endTime,
    location: '',
    notes: ''
  };
}

/**
 * Generate optimized task schedule based on priorities, deadlines, and existing calendar events
 * @param {Array} tasks - List of tasks with priorities and deadlines
 * @param {Array} events - Existing calendar events
 * @param {Object} preferences - User preferences for scheduling
 * @returns {Promise<Array>} - Optimized schedule of tasks
 */
export const optimizeTaskSchedule = async (tasks, events, preferences) => {
  try {
    // Validate input data before proceeding
    if (!Array.isArray(tasks) || tasks.length === 0) {
      throw new Error("No tasks provided for scheduling");
    }
    
    if (!preferences || typeof preferences !== 'object') {
      throw new Error("Invalid scheduling preferences");
    }
    
    console.log("Starting optimizeTaskSchedule with:", { 
      taskCount: tasks.length, 
      eventCount: events?.length || 0, 
      preferences 
    });
    
    // Prepare task and event data for OpenAI with validation
    const taskData = tasks.map(task => {
      // Validate priority
      let priorityValue = DEFAULT_VALUES.priorityValue;
      if (task.priority !== undefined) {
        if (typeof task.priority === 'object' && task.priority !== null) {
          const parsedPriority = parseInt(task.priority.value, 10);
          priorityValue = isNaN(parsedPriority) ? DEFAULT_VALUES.priorityValue : parsedPriority;
        } else if (typeof task.priority === 'number' || typeof task.priority === 'string') {
          const parsedValue = parseInt(task.priority, 10);
          priorityValue = isNaN(parsedValue) ? DEFAULT_VALUES.priorityValue : parsedValue;
        }
      }
      
      // Validate duration
      let duration = DEFAULT_VALUES.estimatedHours;
      if (task.duration !== undefined) {
        const parsedDuration = parseFloat(task.duration);
        duration = isNaN(parsedDuration) ? DEFAULT_VALUES.estimatedHours : parsedDuration;
      } else if (task.estimatedHours !== undefined) {
        const parsedDuration = parseFloat(task.estimatedHours);
        duration = isNaN(parsedDuration) ? DEFAULT_VALUES.estimatedHours : parsedDuration;
      }
      
      // Handle deadline safely
      let deadline;
      try {
        if (task.fullDeadline) {
          deadline = task.fullDeadline; 
        } else if (task.deadline) {
          const deadlineDate = typeof task.deadline === 'string' ? task.deadline : task.deadline.toISOString().split('T')[0];
          const deadlineTime = task.deadlineTime || '17:00';
          deadline = `${deadlineDate}T${deadlineTime}`;
        } else {
          // Default deadline: 1 week from now
          const defaultDeadline = new Date();
          defaultDeadline.setDate(defaultDeadline.getDate() + 7);
          deadline = defaultDeadline.toISOString();
        }
      } catch (e) {
        console.warn("Error creating deadline for task:", task.id, e);
        // Default to 1 week from now
        const defaultDeadline = new Date();
        defaultDeadline.setDate(defaultDeadline.getDate() + 7);
        deadline = defaultDeadline.toISOString();
      }
      
      // Validate and extract category
      let category = 'work';
      if (task.category) {
        if (typeof task.category === 'object' && task.category !== null && task.category.id) {
          category = task.category.id;
        } else if (typeof task.category === 'string') {
          category = task.category;
        }
      }
      
      return {
        id: task.id,
        title: task.title || task.name || `Task ${task.id}`,
        priority: priorityValue,
        duration: duration,
        deadline: deadline,
        category: category
      };
    });
    
    // Include existing calendar events to avoid conflicts
    const calendarEvents = Array.isArray(events) ? events.map(event => {
      let startTime, endTime;
      
      try {
        startTime = typeof event.start === 'string' ? event.start : event.start.toISOString();
      } catch (e) {
        // Fallback for invalid start time
        startTime = new Date().toISOString();
      }
      
      try {
        endTime = typeof event.end === 'string' ? event.end : event.end.toISOString();
      } catch (e) {
        // Fallback for invalid end time - set to 1 hour after start
        const start = new Date(startTime);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        endTime = end.toISOString();
      }
      
      return {
        title: event.title || 'Untitled Event',
        start: startTime,
        end: endTime
      };
    }) : [];
    
    // Validate and normalize preferences
    const safePreferences = {
      workingHours: {
        start: preferences.workingHours?.start || '09:00',
        end: preferences.workingHours?.end || '17:00',
      },
      maxTasksPerDay: isNaN(parseInt(preferences.maxTasksPerDay, 10)) 
        ? DEFAULT_VALUES.maxTasksPerDay 
        : parseInt(preferences.maxTasksPerDay, 10),
      breakBetweenTasks: isNaN(parseInt(preferences.breakBetweenTasks, 10)) 
        ? DEFAULT_VALUES.breakBetweenTasks 
        : parseInt(preferences.breakBetweenTasks, 10),
      splitTaskThreshold: isNaN(parseFloat(preferences.splitTaskThreshold)) 
        ? DEFAULT_VALUES.splitTaskThreshold 
        : parseFloat(preferences.splitTaskThreshold)
    };
    
    // Format working hours for better readability in the prompt
    const workStartFormatted = safePreferences.workingHours.start;
    const workEndFormatted = safePreferences.workingHours.end;
    
    console.log("Formatted preferences:", safePreferences);
    
    // Prepare the OpenAI prompt with explicit values
    const promptContent = `You are a task scheduling assistant. Optimize the user's tasks based on priorities, deadlines, and existing calendar events.
            
IMPORTANT SCHEDULING RULES:
1. Tasks must NEVER overlap with each other or with existing calendar events
2. Higher priority tasks should be scheduled earlier, especially those with imminent deadlines
3. If a task is longer than ${safePreferences.splitTaskThreshold} hours, break it into multiple parts of exactly ${safePreferences.splitTaskThreshold} hours each (except for the last part which may be shorter)
4. Schedule ONLY ONE task per time slot - absolutely no overlapping tasks
5. Strictly honor the user's working hours: Start at ${workStartFormatted} and end at ${workEndFormatted} each day
6. Include ${safePreferences.breakBetweenTasks}-minute breaks between consecutive tasks
7. Schedule a maximum of ${safePreferences.maxTasksPerDay} tasks per day, utilizing the full working day
8. Put highest priority on meeting the deadline for each task
9. Schedule tasks efficiently to maximize the use of available time within working hours
10. IMPORTANT: For longer tasks that need to be split (more than ${safePreferences.splitTaskThreshold} hours), create multiple sessions of exactly ${safePreferences.splitTaskThreshold} hours each (e.g., "Part 1 of 10", "Part 2 of 10", etc.)
11. Skip weekends by default - only schedule on Monday through Friday

Format your response as a JSON array of scheduled tasks, with each task having:
- id: The original task ID
- title: Task title 
- start: Start time (ISO format)
- end: End time (ISO format)
- category: Task category (use the original task's category)
- notes: For split tasks, include "Part X of Y" where X is the current part number and Y is the total number of parts

Your schedule should look similar to this example:
[
  {
    "id": "123",
    "title": "SDS542",
    "start": "2025-04-30T09:00:00.000Z",
    "end": "2025-04-30T11:00:00.000Z",
    "category": "study",
    "notes": "Part 1 of 10"
  },
  {
    "id": "123",
    "title": "SDS542",
    "start": "2025-04-30T11:15:00.000Z",
    "end": "2025-04-30T13:15:00.000Z",
    "category": "study",
    "notes": "Part 2 of 10"
  }
]

Each task must have a specific time slot with no overlaps.`;

    // Log full debug data
    console.log("Full task data being sent to OpenAI:", JSON.stringify(taskData, null, 2));
    
    // Make the API request
    const response = await axios.post(
      API_ENDPOINT,
      {
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: promptContent
          },
          {
            role: "user",
            content: JSON.stringify({
              tasks: taskData,
              events: calendarEvents,
              preferences: safePreferences
            })
          }
        ],
        temperature: 0.2, // Lower temperature for more deterministic results
        max_tokens: 2500
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log("OpenAI response received");
    
    // Parse and validate the OpenAI response
    let parsedSchedule;
    try {
      const responseContent = response.data.choices[0].message.content;
      console.log("Raw OpenAI response:", responseContent);
      
      // Handle potential JSON formatting issues in the response
      let cleanedContent = responseContent.trim();
      // Remove markdown code blocks if present
      if (cleanedContent.startsWith("```") && cleanedContent.endsWith("```")) {
        cleanedContent = cleanedContent.slice(3, -3).trim();
      }
      // Remove "json" language marker if present
      if (cleanedContent.startsWith("json")) {
        cleanedContent = cleanedContent.slice(4).trim();
      }
      
      parsedSchedule = JSON.parse(cleanedContent);
      console.log("Parsed schedule result:", parsedSchedule);
      
      // Validate each task has required fields
      if (!Array.isArray(parsedSchedule)) {
        throw new Error("Response is not an array");
      }
      
      const invalidTasks = parsedSchedule.filter(task => 
        !task.id || !task.title || !task.start || !task.end
      );
      
      if (invalidTasks.length > 0) {
        console.error("Invalid tasks in schedule:", invalidTasks);
        throw new Error(`Schedule contains ${invalidTasks.length} invalid tasks`);
      }
    } catch (error) {
      console.error("Failed to parse OpenAI response:", error);
      return fallbackScheduling(tasks, events, safePreferences);
    }
    
    // Convert string dates to Date objects and ensure proper formatting
    return parsedSchedule.map(task => {
      const originalTask = tasks.find(t => t.id === task.id);
      let categoryValue;
      
      // Handle category properly with robust fallbacks
      if (originalTask && originalTask.category) {
        categoryValue = originalTask.category;
      } else if (task.category) {
        // If task has category but we can't find original, create a category object
        if (typeof task.category === 'string') {
          // Find a matching category from the original tasks if possible
          const matchingCategoryFromTasks = tasks.find(t => 
            t.category && (
              (typeof t.category === 'object' && t.category.id === task.category) ||
              (typeof t.category === 'string' && t.category === task.category)
            )
          )?.category;
          
          if (matchingCategoryFromTasks) {
            categoryValue = matchingCategoryFromTasks;
          } else {
            // Create a basic category object
            categoryValue = { 
              id: task.category, 
              name: task.category.charAt(0).toUpperCase() + task.category.slice(1),
              color: '#4CAF50' // Default color
            };
          }
        } else {
          // Category is already an object
          categoryValue = task.category;
        }
      } else {
        // Default category as a last resort
        categoryValue = { 
          id: 'work', 
          name: 'Work',
          color: '#4CAF50'
        };
      }
      
      // Use current time as a fallback for invalid start/end times
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      
      // Ensure valid start and end dates with safe parsing
      const startTime = safeParseDate(task.start, now);
      const endTime = safeParseDate(task.end, oneHourLater);
      
      return {
        ...task,
        start: startTime,
        end: endTime,
        category: categoryValue
      };
    });
  } catch (error) {
    console.error('Error optimizing task schedule with OpenAI:', error);
    
    // Try the backend API
    try {
      console.log("Trying backend API for task scheduling");
      const response = await axios.post(`${API_URL}/schedule-tasks`, { 
        tasks, 
        events, 
        preferences 
      });
      
      // Convert string dates to Date objects in the schedule safely
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      
      return response.data.schedule.map(task => ({
        ...task,
        start: safeParseDate(task.start, now),
        end: safeParseDate(task.end, oneHourLater)
      }));
    } catch (backendError) {
      console.error('Backend API also failed:', backendError);
      console.log("Using local fallback scheduling algorithm");
      
      // Fallback to basic scheduling algorithm
      return fallbackScheduling(tasks, events, preferences);
    }
  }
};

/**
 * Find best meeting times based on participants' availability
 * @param {Array} participantAvailability - Availability data from all participants
 * @param {Object} meetingParams - Meeting parameters (duration, preferred days, etc.)
 * @returns {Promise<Array>} - Best meeting time slots
 */
export const findBestMeetingSlots = async (participantAvailability, meetingParams) => {
  try {
    const response = await axios.post(
      API_ENDPOINT,
      {
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a meeting scheduling assistant. Find the best meeting times based on all participants' availability.
            
            Important considerations:
            1. Prioritize slots where all participants are available
            2. If no slot has 100% availability, find slots with maximum participation
            3. Respect preferred days specified in the meeting parameters
            4. Ensure the slot duration accommodates the required meeting length
            5. Stay within the specified time range
            
            Format your response as a JSON array of available slots, each containing:
            - day: Day of the week (e.g., 'monday')
            - date: Formatted date (e.g., 'May 1')
            - time: Time range (e.g., '10:00 AM - 11:00 AM')
            - availability: 'all' or 'partial'
            - availableCount: Number of available participants (if partial)
            - totalCount: Total number of participants
            
            Sort the slots by best fit (all available first, then by number of available participants).`
          },
          {
            role: "user",
            content: JSON.stringify({
              participantAvailability: participantAvailability,
              meetingParams: meetingParams
            })
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return JSON.parse(response.data.choices[0].message.content);
  } catch (error) {
    console.error('Error finding best meeting slots with OpenAI:', error);
    
    // Try backend API
    try {
      const response = await axios.post(`${API_URL}/find-meeting-slots`, {
        participantAvailability,
        meetingParams
      });
      
      return response.data.slots;
    } catch (backendError) {
      console.error('Backend API also failed:', backendError);
      return fallbackMeetingSlots(participantAvailability, meetingParams);
    }
  }
};

/**
 * Generate personalized habit recommendations based on mood and activity history
 * @param {Array} moodEntries - History of mood entries
 * @param {Array} activityEntries - History of activities
 * @returns {Promise<Array>} - Personalized recommendations
 */
export const generateRecommendations = async (moodEntries, activityEntries) => {
  try {
    const response = await axios.post(
      API_ENDPOINT,
      {
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a personalized habit recommendation assistant. Analyze the user's mood patterns and activities to suggest an ideal daily schedule.
            
            Consider:
            1. Time-specific mood patterns (morning, afternoon, evening)
            2. Activities that correlate with positive moods
            3. Balance across different activity categories
            4. Sustainable habit formation principles
            
            Format your response as a JSON array of recommendation blocks, each with:
            - id: Unique identifier for the recommendation
            - title: Section title (e.g., 'Morning Routine', 'Productivity Boost')
            - activities: Array of suggested activities with:
              - time: Suggested time (e.g., '07:00 AM')
              - description: Activity description
              - category: Category ID (e.g., 'selfCare', 'work', 'exercise')
              
            The recommendations should be detailed yet realistic for daily implementation.`
          },
          {
            role: "user",
            content: JSON.stringify({
              moodEntries: moodEntries,
              activityEntries: activityEntries
            })
          }
        ],
        temperature: 0.5,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return JSON.parse(response.data.choices[0].message.content);
  } catch (error) {
    console.error('Error generating recommendations with OpenAI:', error);
    
    // Try backend API
    try {
      const response = await axios.post(`${API_URL}/generate-recommendations`, {
        moodEntries,
        activityEntries
      });
      
      return response.data.recommendations;
    } catch (backendError) {
      console.error('Backend API also failed:', backendError);
      return fallbackRecommendations(moodEntries, activityEntries);
    }
  }
};

/**
 * Analyze evening reflection and provide feedback
 * @param {string} reflectionText - User's evening reflection
 * @param {Array} moodEntries - Recent mood entries
 * @param {Array} activityEntries - Recent activity entries
 * @returns {Promise<string>} - Personalized feedback
 */
export const analyzeReflection = async (reflectionText, moodEntries, activityEntries) => {
  try {
    const response = await axios.post(
      API_ENDPOINT,
      {
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: `You are a reflection analysis assistant. Provide insightful feedback on the user's evening reflection, considering their mood and activity patterns.
            
            Your feedback should:
            1. Acknowledge positive behaviors and attitudes
            2. Identify potential improvement areas tactfully
            3. Offer specific suggestions aligned with their goals
            4. Recommend potential habit adjustments based on patterns
            5. Maintain a warm, encouraging tone
            
            Format your response as a thoughtful paragraph of feedback, keeping it concise yet meaningful.`
          },
          {
            role: "user",
            content: JSON.stringify({
              reflection: reflectionText,
              recentMoods: moodEntries?.slice(0, 5) || [],
              recentActivities: activityEntries?.slice(0, 10) || []
            })
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error analyzing reflection with OpenAI:', error);
    
    // Try backend API
    try {
      const response = await axios.post(`${API_URL}/analyze-reflection`, {
        reflectionText,
        moodEntries,
        activityEntries
      });
      
      return response.data.feedback;
    } catch (backendError) {
      console.error('Backend API also failed:', backendError);
      return fallbackReflectionAnalysis(reflectionText);
    }
  }
};

// Fallback scheduling function when APIs fail
const fallbackScheduling = (tasks, events, preferences) => {
  console.log("Using fallback scheduling function");
  
  // Ensure tasks is an array
  if (!Array.isArray(tasks) || tasks.length === 0) {
    console.warn("No tasks provided for fallback scheduling");
    return [];
  }
  
  // Validate preferences
  const safePreferences = {
    workingHours: {
      start: preferences?.workingHours?.start || '09:00',
      end: preferences?.workingHours?.end || '17:00'
    },
    maxTasksPerDay: isNaN(parseInt(preferences?.maxTasksPerDay, 10)) 
      ? DEFAULT_VALUES.maxTasksPerDay 
      : parseInt(preferences?.maxTasksPerDay, 10),
    breakBetweenTasks: isNaN(parseInt(preferences?.breakBetweenTasks, 10)) 
      ? DEFAULT_VALUES.breakBetweenTasks 
      : parseInt(preferences?.breakBetweenTasks, 10),
    splitTaskThreshold: isNaN(parseFloat(preferences?.splitTaskThreshold)) 
      ? DEFAULT_VALUES.splitTaskThreshold 
      : parseFloat(preferences?.splitTaskThreshold)
  };
  
  // Sort tasks by priority (high to low) and deadline
  const sortedTasks = [...tasks].sort((a, b) => {
    // First get priority values safely
    const getPriorityValue = (task) => {
      if (task.priority !== undefined) {
        if (typeof task.priority === 'object' && task.priority !== null) {
          const value = parseInt(task.priority.value, 10);
          return isNaN(value) ? DEFAULT_VALUES.priorityValue : value;
        } else if (typeof task.priority === 'number' || typeof task.priority === 'string') {
          const value = parseInt(task.priority, 10);
          return isNaN(value) ? DEFAULT_VALUES.priorityValue : value;
        }
      }
      return DEFAULT_VALUES.priorityValue;
    };
    
    const priorityA = getPriorityValue(a);
    const priorityB = getPriorityValue(b);
    
    // First by priority (high to low)
    if (priorityB !== priorityA) {
      return priorityB - priorityA;
    }
    
    // Then by deadline (earlier first) if we can parse them
    try {
      // Use safe date parsing
      const deadlineA = safeParseDate(a.deadline, new Date());
      const deadlineB = safeParseDate(b.deadline, new Date());
      
      return deadlineA - deadlineB;
    } catch (e) {
      return 0; // If we can't compare deadlines, consider them equal
    }
  });
  
  const scheduledTasks = [];
  const today = new Date();
  
  // Parse working hours
  const parseTimeString = (timeStr) => {
    try {
      const parts = timeStr.split(':');
      return {
        hours: parseInt(parts[0], 10) || 0,
        minutes: parseInt(parts[1], 10) || 0
      };
    } catch (e) {
      console.warn("Could not parse time string:", timeStr);
      return { hours: 0, minutes: 0 };
    }
  };
  
  const workStart = parseTimeString(safePreferences.workingHours.start);
  const workEnd = parseTimeString(safePreferences.workingHours.end);
  
  // Calculate break time in milliseconds
  const breakTimeMs = safePreferences.breakBetweenTasks * 60 * 1000;
  
  // Start scheduling from today
  let currentDay = new Date(today);
  let tasksForToday = 0;
  
  // Set current time to working hours start
  currentDay.setHours(workStart.hours, workStart.minutes, 0, 0);
  
  // Skip to next weekday if current day is weekend
  const skipToNextWeekday = (date) => {
    const day = date.getDay();
    if (day === 0) { // Sunday
      date.setDate(date.getDate() + 1);
    } else if (day === 6) { // Saturday
      date.setDate(date.getDate() + 2);
    }
    return date;
  };
  
  // Make sure we start on a weekday
  currentDay = skipToNextWeekday(currentDay);
  
  for (const task of sortedTasks) {
    // Get task duration in milliseconds - with validation
    let duration = DEFAULT_VALUES.estimatedHours;
    if (task.duration !== undefined) {
      const parsedDuration = parseFloat(task.duration);
      duration = isNaN(parsedDuration) ? DEFAULT_VALUES.estimatedHours : parsedDuration;
    } else if (task.estimatedHours !== undefined) {
      const parsedDuration = parseFloat(task.estimatedHours);
      duration = isNaN(parsedDuration) ? DEFAULT_VALUES.estimatedHours : parsedDuration;
    }
    
    const taskDurationMs = duration * 60 * 60 * 1000;
    const splitThresholdMs = safePreferences.splitTaskThreshold * 60 * 60 * 1000;
    
    // Get category with validation
    let categoryValue;
    if (task.category) {
      if (typeof task.category === 'object' && task.category !== null) {
        categoryValue = task.category;
      } else if (typeof task.category === 'string') {
        categoryValue = {
          id: task.category,
          name: task.category.charAt(0).toUpperCase() + task.category.slice(1),
          color: '#4CAF50'
        };
      }
    } else {
      categoryValue = {
        id: 'work',
        name: 'Work',
        color: '#4CAF50'
      };
    }
    
    // Check if task should be split
    if (taskDurationMs > splitThresholdMs) {
      // Calculate how many parts to split into
      const parts = Math.ceil(taskDurationMs / splitThresholdMs);
      const partDurationMs = splitThresholdMs; // Always use exactly the threshold time for parts
      
      for (let i = 0; i < parts; i++) {
        // Check if we've reached max tasks for today
        if (tasksForToday >= safePreferences.maxTasksPerDay) {
          // Move to next day
          currentDay.setDate(currentDay.getDate() + 1);
          currentDay.setHours(workStart.hours, workStart.minutes, 0, 0);
          
          // Skip weekends
          currentDay = skipToNextWeekday(currentDay);
          
          tasksForToday = 0;
        }
        
        // Set end time
        const startTime = new Date(currentDay);
        let endTime;
        
        // For the last part, use remaining duration instead of the fixed partDuration
        if (i === parts - 1) {
          const remainingDurationMs = taskDurationMs - (i * partDurationMs);
          endTime = new Date(startTime.getTime() + remainingDurationMs);
        } else {
          endTime = new Date(startTime.getTime() + partDurationMs);
        }
        
        // Check if end time exceeds working hours
        const workingDayEnd = new Date(currentDay);
        workingDayEnd.setHours(workEnd.hours, workEnd.minutes, 0, 0);
        
        if (endTime > workingDayEnd) {
          // Move to next day
          currentDay.setDate(currentDay.getDate() + 1);
          currentDay.setHours(workStart.hours, workStart.minutes, 0, 0);
          
          // Skip weekends
          currentDay = skipToNextWeekday(currentDay);
          
          tasksForToday = 0;
          
          // Recalculate start and end time
          const startTime = new Date(currentDay);
          
          // For the last part, use remaining duration instead of the fixed partDuration
          if (i === parts - 1) {
            const remainingDurationMs = taskDurationMs - (i * partDurationMs);
            endTime = new Date(startTime.getTime() + remainingDurationMs);
          } else {
            endTime = new Date(startTime.getTime() + partDurationMs);
          }
          
          scheduledTasks.push({
            id: task.id,
            title: `${task.title || task.name}`,
            start: startTime,
            end: endTime,
            category: categoryValue,
            notes: `Part ${i + 1} of ${parts}`
          });
        } else {
          scheduledTasks.push({
            id: task.id,
            title: `${task.title || task.name}`,
            start: startTime,
            end: endTime,
            category: categoryValue,
            notes: `Part ${i + 1} of ${parts}`
          });
        }
        
        // Increase task count and move time forward (including break)
        tasksForToday++;
        currentDay = new Date(endTime.getTime() + breakTimeMs);
      }
    } else {
      // Handle regular tasks
      if (tasksForToday >= safePreferences.maxTasksPerDay) {
        // Move to next day
        currentDay.setDate(currentDay.getDate() + 1);
        currentDay.setHours(workStart.hours, workStart.minutes, 0, 0);
        
        // Skip weekends
        currentDay = skipToNextWeekday(currentDay);
        
        tasksForToday = 0;
      }
      
      // Set end time
      const startTime = new Date(currentDay);
      const endTime = new Date(startTime.getTime() + taskDurationMs);
      
      // Check if end time exceeds working hours
      const workingDayEnd = new Date(currentDay);
      workingDayEnd.setHours(workEnd.hours, workEnd.minutes, 0, 0);
      
      if (endTime > workingDayEnd) {
        // Move to next day
        currentDay.setDate(currentDay.getDate() + 1);
        currentDay.setHours(workStart.hours, workStart.minutes, 0, 0);
        
        // Skip weekends
        currentDay = skipToNextWeekday(currentDay);
        
        tasksForToday = 0;
        
        // Recalculate start and end time
        const startTime = new Date(currentDay);
        const endTime = new Date(startTime.getTime() + taskDurationMs);
        
        scheduledTasks.push({
          id: task.id,
          title: task.title || task.name,
          start: startTime,
          end: endTime,
          category: categoryValue
        });
      } else {
        scheduledTasks.push({
          id: task.id,
          title: task.title || task.name,
          start: startTime,
          end: endTime,
          category: categoryValue
        });
      }
      
      // Increase task count and move time forward (including break)
      tasksForToday++;
      currentDay = new Date(endTime.getTime() + breakTimeMs);
    }
  }
  
  return scheduledTasks;
};

// Fallback functions for meeting slots, recommendations, etc.
const fallbackMeetingSlots = (participantAvailability, meetingParams) => {
  // Generate three dummy time slots
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  
  // Get preferred days or default to all weekdays
  const preferredDays = meetingParams?.preferredDays && meetingParams.preferredDays.length > 0 
    ? meetingParams.preferredDays 
    : days;
  
  // Create dummy slots
  return [
    {
      day: preferredDays[0] || 'monday',
      date: 'May 1',
      time: '10:00 AM - 11:00 AM',
      availability: 'all'
    },
    {
      day: preferredDays[preferredDays.length > 1 ? 1 : 0] || 'wednesday',
      date: 'May 3',
      time: '2:00 PM - 3:00 PM',
      availability: 'all'
    },
    {
      day: preferredDays[0] || 'monday',
      date: 'May 8',
      time: '11:00 AM - 12:00 PM',
      availability: 'partial',
      availableCount: 2,
      totalCount: 3
    }
  ];
};

const fallbackRecommendations = (moodEntries, activityEntries) => {
  // Simple recommendations
  return [
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
  ];
};

const fallbackReflectionAnalysis = (reflectionText) => {
  return "Thank you for sharing your reflection. It's great that you're taking time to review your day. Consider how your activities might be affecting your mood, and remember that small adjustments can lead to significant improvements in your well-being. Keep up the good work with your self-reflection practice!";
};

// Create a service object and export it directly
const openAIService = {
  parseEventText,
  optimizeTaskSchedule,
  findBestMeetingSlots,
  generateRecommendations,
  analyzeReflection
};

// Export the service object (fixes the ESLint warning)
export default openAIService;