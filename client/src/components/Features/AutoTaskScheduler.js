import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import moment from 'moment';
import { format } from 'date-fns';
import openAIService from '../../Services/openAIservice';

// Constants
// Task categories for color coding
const TASK_CATEGORIES = [
  { id: 'work', name: 'Work', color: '#4CAF50' },
  { id: 'study', name: 'Study', color: '#2196F3' },
  { id: 'exercise', name: 'Exercise', color: '#FF9800' },
  { id: 'leisure', name: 'Leisure', color: '#9C27B0' },
  { id: 'personal', name: 'Personal', color: '#607D8B' },
];

// Priority levels
const PRIORITY_LEVELS = [
  { id: 'high', name: 'High', value: 3 },
  { id: 'medium', name: 'Medium', value: 2 },
  { id: 'low', name: 'Low', value: 1 },
];

// Default values to use when encountering NaN
const DEFAULT_VALUES = {
  estimatedHours: 1,
  maxTasksPerDay: 5,
  breakBetweenTasks: 15,
  splitTaskThreshold: 2,
  priorityValue: 2
};

const localizer = momentLocalizer(moment);

const AutoTaskScheduler = ({ events = [] }) => {
  // ======== State Definitions ========
  // Task and event states
  const [tasks, setTasks] = useState([]);
  const [scheduledEvents, setScheduledEvents] = useState([]);
  const [newTask, setNewTask] = useState({
    name: '',
    deadline: format(new Date(), 'yyyy-MM-dd'),
    deadlineTime: '17:00',
    estimatedHours: DEFAULT_VALUES.estimatedHours,
    category: TASK_CATEGORIES[0],
    priority: PRIORITY_LEVELS[1], // Default to medium priority
  });
  
  // UI states
  const [isScheduling, setIsScheduling] = useState(false);
  const [schedulingMessage, setSchedulingMessage] = useState('');
  const [calendarView, setCalendarView] = useState('week');
  const [calendarDate, setCalendarDate] = useState(new Date());
  
  // Settings states
  const [workingHours, setWorkingHours] = useState({
    start: '09:00', 
    end: '17:00'
  });
  const [taskSettings, setTaskSettings] = useState({
    maxTasksPerDay: DEFAULT_VALUES.maxTasksPerDay,
    breakBetweenTasks: DEFAULT_VALUES.breakBetweenTasks, // minutes
    splitTaskThreshold: DEFAULT_VALUES.splitTaskThreshold, // hours - tasks longer than this will be split
  });
  
  // Debug state
  const [debugInfo, setDebugInfo] = useState({
    lastApiRequest: null,
    lastApiResponse: null,
    hasError: false,
    errorMessage: ''
  });
  
  // ======== Effects ========
  // Load saved data from local storage
  useEffect(() => {
    try {
      const savedTasks = localStorage.getItem('tasks');
      const savedEvents = localStorage.getItem('scheduledEvents');
      const savedSettings = localStorage.getItem('taskSettings');
      const savedHours = localStorage.getItem('workingHours');
      
      if (savedTasks) {
        const parsedTasks = JSON.parse(savedTasks);
        
        // Validate numerical values in loaded tasks
        const validatedTasks = parsedTasks.map(task => ({
          ...task,
          estimatedHours: isNaN(parseFloat(task.estimatedHours)) 
            ? DEFAULT_VALUES.estimatedHours 
            : parseFloat(task.estimatedHours),
          priority: task.priority && isNaN(task.priority.value) 
            ? PRIORITY_LEVELS[1] 
            : task.priority
        }));
        
        setTasks(validatedTasks);
      }
      
      if (savedEvents) {
        try {
          // Convert string dates back to Date objects
          const parsedEvents = JSON.parse(savedEvents).map(event => ({
            ...event,
            start: new Date(event.start),
            end: new Date(event.end),
          }));
          setScheduledEvents(parsedEvents);
        } catch (e) {
          console.error('Error parsing saved scheduled events:', e);
          setScheduledEvents([]);
        }
      }
      
      if (savedSettings) {
        try {
          const parsedSettings = JSON.parse(savedSettings);
          
          // Validate numeric settings values - use defaults for NaN
          setTaskSettings({
            maxTasksPerDay: isNaN(parseInt(parsedSettings.maxTasksPerDay)) 
              ? DEFAULT_VALUES.maxTasksPerDay 
              : parseInt(parsedSettings.maxTasksPerDay),
            breakBetweenTasks: isNaN(parseInt(parsedSettings.breakBetweenTasks)) 
              ? DEFAULT_VALUES.breakBetweenTasks 
              : parseInt(parsedSettings.breakBetweenTasks),
            splitTaskThreshold: isNaN(parseFloat(parsedSettings.splitTaskThreshold)) 
              ? DEFAULT_VALUES.splitTaskThreshold 
              : parseFloat(parsedSettings.splitTaskThreshold)
          });
        } catch (e) {
          console.error('Error parsing saved task settings:', e);
          // Use default settings on error
          setTaskSettings({
            maxTasksPerDay: DEFAULT_VALUES.maxTasksPerDay,
            breakBetweenTasks: DEFAULT_VALUES.breakBetweenTasks,
            splitTaskThreshold: DEFAULT_VALUES.splitTaskThreshold
          });
        }
      }
      
      if (savedHours) {
        try {
          setWorkingHours(JSON.parse(savedHours));
        } catch (e) {
          console.error('Error parsing saved working hours:', e);
        }
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  }, []);
  
  // Save data to local storage when updated
  useEffect(() => {
    try {
      if (tasks.length > 0) {
        localStorage.setItem('tasks', JSON.stringify(tasks));
      }
      
      if (scheduledEvents.length > 0) {
        localStorage.setItem('scheduledEvents', JSON.stringify(scheduledEvents));
      }
      
      localStorage.setItem('taskSettings', JSON.stringify(taskSettings));
      localStorage.setItem('workingHours', JSON.stringify(workingHours));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }, [tasks, scheduledEvents, taskSettings, workingHours]);
  
  // ======== Event Handlers ========
  // Form input change handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Log the input change for debugging
    console.log(`Input change - ${name}: "${value}" (type: ${typeof value})`);
    
    if (name === 'category') {
      const selectedCategory = TASK_CATEGORIES.find(cat => cat.id === value);
      setNewTask({ ...newTask, category: selectedCategory || TASK_CATEGORIES[0] });
    } else if (name === 'priority') {
      const selectedPriority = PRIORITY_LEVELS.find(p => p.id === value);
      setNewTask({ ...newTask, priority: selectedPriority || PRIORITY_LEVELS[1] });
    } else if (name === 'estimatedHours') {
      // Safely parse float value with validation
      const parsedValue = parseFloat(value);
      setNewTask({ 
        ...newTask, 
        [name]: isNaN(parsedValue) ? DEFAULT_VALUES.estimatedHours : Math.max(0.5, parsedValue) 
      });
    } else {
      setNewTask({ ...newTask, [name]: value });
    }
  };
  
  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    
    // Log the settings change for debugging
    console.log(`Settings change - ${name}: "${value}" (type: ${typeof value})`);
    
    if (['breakBetweenTasks', 'maxTasksPerDay'].includes(name)) {
      // Parse integer values with validation
      const parsedValue = parseInt(value, 10);
      setTaskSettings({ 
        ...taskSettings, 
        [name]: isNaN(parsedValue) ? 
          (name === 'maxTasksPerDay' ? DEFAULT_VALUES.maxTasksPerDay : DEFAULT_VALUES.breakBetweenTasks) : 
          parsedValue 
      });
    } else if (name === 'splitTaskThreshold') {
      // Parse float value with validation
      const parsedValue = parseFloat(value);
      setTaskSettings({
        ...taskSettings,
        splitTaskThreshold: isNaN(parsedValue) ? DEFAULT_VALUES.splitTaskThreshold : parsedValue
      });
    } else {
      setTaskSettings({ ...taskSettings, [name]: value });
    }
  };
  
  // Task management handlers
  const handleAddTask = (e) => {
    e.preventDefault();
    
    if (!newTask.name.trim() || !newTask.deadline) {
      return;
    }
    
    // Validate estimated hours before adding task
    const estimatedHours = parseFloat(newTask.estimatedHours);
    if (isNaN(estimatedHours)) {
      console.error("Invalid estimatedHours:", newTask.estimatedHours);
      setSchedulingMessage('Please enter a valid number for estimated hours.');
      setTimeout(() => setSchedulingMessage(''), 3000);
      return;
    }
    
    // Combine date and time for deadline
    const deadlineDateObj = new Date(`${newTask.deadline}T${newTask.deadlineTime}`);
    
    // Add task with a unique ID
    const taskToAdd = {
      ...newTask,
      id: Date.now().toString(),
      fullDeadline: deadlineDateObj.toISOString()
    };
    
    setTasks([...tasks, taskToAdd]);
    
    // Reset form
    setNewTask({
      name: '',
      deadline: format(new Date(), 'yyyy-MM-dd'),
      deadlineTime: '17:00',
      estimatedHours: DEFAULT_VALUES.estimatedHours,
      category: TASK_CATEGORIES[0],
      priority: PRIORITY_LEVELS[1],
    });
  };
  
  const handleRemoveTask = (taskId) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };
  
  const clearSchedule = () => {
    setScheduledEvents([]);
    localStorage.removeItem('scheduledEvents');
    setSchedulingMessage('Schedule cleared.');
    
    setTimeout(() => {
      setSchedulingMessage('');
    }, 3000);
  };
  
  // Calendar handlers
  const handleNavigate = (newDate) => {
    setCalendarDate(newDate);
  };
  
  const handleViewChange = (newView) => {
    setCalendarView(newView);
  };
  
  // ======== Main Functionality ========
  // Schedule tasks using OpenAI service
  const handleScheduleTasks = async () => {
    if (tasks.length === 0) return;
    
    setIsScheduling(true);
    setSchedulingMessage('Analyzing tasks and generating optimal schedule...');
    setDebugInfo({
      lastApiRequest: null,
      lastApiResponse: null,
      hasError: false,
      errorMessage: ''
    });
    
    try {
      // Log all numerical values before preparing for API
      console.log("Task numerical values check:");
      tasks.forEach(task => {
        console.log(`Task ${task.id}: 
          - estimatedHours: ${task.estimatedHours} (${typeof task.estimatedHours})
          - priority: ${JSON.stringify(task.priority)}
        `);
      });
      
      console.log("Settings numerical values check:");
      console.log(`
        - maxTasksPerDay: ${taskSettings.maxTasksPerDay} (${typeof taskSettings.maxTasksPerDay})
        - breakBetweenTasks: ${taskSettings.breakBetweenTasks} (${typeof taskSettings.breakBetweenTasks})
        - splitTaskThreshold: ${taskSettings.splitTaskThreshold} (${typeof taskSettings.splitTaskThreshold})
      `);
      
      // Prepare task data for OpenAI service with explicit type conversions and validation
      const taskData = tasks.map(task => {
        // Get priority value safely
        let priorityValue = DEFAULT_VALUES.priorityValue;
        if (task.priority) {
          if (typeof task.priority === 'object' && task.priority.value !== undefined) {
            const parsedPriority = parseInt(task.priority.value, 10);
            priorityValue = isNaN(parsedPriority) ? DEFAULT_VALUES.priorityValue : parsedPriority;
          } else if (typeof task.priority === 'string' || typeof task.priority === 'number') {
            const parsedPriority = parseInt(task.priority, 10);
            priorityValue = isNaN(parsedPriority) ? DEFAULT_VALUES.priorityValue : parsedPriority;
          }
        }
        
        // Get duration (estimatedHours) safely
        const duration = parseFloat(task.estimatedHours);
        const safeDuration = isNaN(duration) ? DEFAULT_VALUES.estimatedHours : duration;
        
        return {
          id: task.id,
          title: task.name,
          priority: priorityValue,
          duration: safeDuration,
          deadline: task.fullDeadline || new Date(`${task.deadline}T${task.deadlineTime || '17:00'}`).toISOString(),
          category: task.category ? task.category.id : 'work'
        };
      });
      
      // Include existing calendar events to avoid conflicts
      const calendarEvents = events.map(event => ({
        title: event.title,
        start: typeof event.start === 'string' ? event.start : event.start.toISOString(),
        end: typeof event.end === 'string' ? event.end : event.end.toISOString()
      }));
      
      // Define scheduling preferences with explicit validation
      const preferences = {
        workingHours: {
          start: workingHours.start,
          end: workingHours.end
        },
        maxTasksPerDay: isNaN(parseInt(taskSettings.maxTasksPerDay, 10)) 
          ? DEFAULT_VALUES.maxTasksPerDay 
          : parseInt(taskSettings.maxTasksPerDay, 10),
        breakBetweenTasks: isNaN(parseInt(taskSettings.breakBetweenTasks, 10)) 
          ? DEFAULT_VALUES.breakBetweenTasks 
          : parseInt(taskSettings.breakBetweenTasks, 10),
        splitTaskThreshold: isNaN(parseFloat(taskSettings.splitTaskThreshold)) 
          ? DEFAULT_VALUES.splitTaskThreshold 
          : parseFloat(taskSettings.splitTaskThreshold)
      };
      
      // Log request data for debugging
      const requestData = { taskData, calendarEvents, preferences };
      setDebugInfo(prev => ({ ...prev, lastApiRequest: requestData }));
      
      console.log("Sending to OpenAI:", {
        preferences: JSON.stringify(preferences),
        taskData: JSON.stringify(taskData),
        calendarEvents: JSON.stringify(calendarEvents)
      });
      
      // Generate AI-optimized schedule using OpenAI service
      const optimizedSchedule = await openAIService.optimizeTaskSchedule(
        taskData, 
        calendarEvents,
        preferences
      );
      
      // Log response for debugging
      setDebugInfo(prev => ({ ...prev, lastApiResponse: optimizedSchedule }));
      console.log("Received optimized schedule:", optimizedSchedule);
      
      // Validate the response
      if (!Array.isArray(optimizedSchedule) || optimizedSchedule.length === 0) {
        throw new Error("Invalid or empty schedule returned");
      }
      
      // Validate each task has required fields
      const invalidTasks = optimizedSchedule.filter(task => 
        !task.id || !task.title || !task.start || !task.end
      );
      
      if (invalidTasks.length > 0) {
        console.error("Invalid tasks in schedule:", invalidTasks);
        throw new Error(`Schedule contains ${invalidTasks.length} invalid tasks`);
      }
      
      // Convert the returned schedule to calendar events with robust category mapping
      const scheduledTaskEvents = optimizedSchedule.map(task => {
        // Find original task for category info
        const originalTask = tasks.find(t => t.id === task.id);
        
        // Find the category object
        let categoryObj;
        
        if (originalTask && originalTask.category) {
          categoryObj = originalTask.category;
        } else if (task.category) {
          if (typeof task.category === 'string') {
            categoryObj = TASK_CATEGORIES.find(cat => cat.id === task.category);
            
            if (!categoryObj) {
              categoryObj = { 
                id: task.category, 
                name: task.category.charAt(0).toUpperCase() + task.category.slice(1),
                color: '#4CAF50' // Default color
              };
            }
          } else {
            categoryObj = task.category;
          }
        } else {
          categoryObj = TASK_CATEGORIES[0]; // Default to first category
        }
        
        return {
          id: task.id,
          title: task.title,
          start: new Date(task.start),
          end: new Date(task.end),
          category: categoryObj,
          notes: task.notes || '',
          isScheduledTask: true // Flag to identify scheduled tasks
        };
      });
      
      setScheduledEvents(scheduledTaskEvents);
      setSchedulingMessage('Schedule optimized! Tasks scheduled based on your priorities and deadlines.');
      
      setTimeout(() => {
        setSchedulingMessage('');
      }, 5000);
    } catch (error) {
      console.error('Error scheduling tasks:', error);
      setSchedulingMessage('There was an error generating your schedule. Please try again.');
      setDebugInfo(prev => ({ 
        ...prev, 
        hasError: true, 
        errorMessage: error.message || 'Unknown error occurred'
      }));
      
      setTimeout(() => {
        setSchedulingMessage('');
      }, 5000);
    } finally {
      setIsScheduling(false);
    }
  };
  
  // ======== Helper Functions ========
  // Custom event styling for the calendar
  const eventStyleGetter = (event) => {
    const backgroundColor = event.category?.color || '#039be5';
    
    const style = {
      backgroundColor,
      borderRadius: '4px',
      color: '#fff',
      border: 'none',
      display: 'block',
    };
    
    // Add special styling for scheduled tasks
    if (event.isScheduledTask) {
      style.borderLeft = '3px solid #333';
    }
    
    return { style };
  };
  
  // ======== Rendering ========
  return (
    <div className="flex flex-col md:flex-row h-screen">
      {/* Task input and list sidebar */}
      <div className="md:w-1/3 p-6 bg-white shadow-md overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Auto Task Scheduler</h2>
        
        {/* Debug Values - Uncomment when debugging */}
        <div className="mb-4 p-3 bg-gray-100 rounded">
          <details>
            <summary className="font-bold text-sm">Debug Values</summary>
            <div className="mt-2 text-xs font-mono">
              <div>estimatedHours: {newTask.estimatedHours} ({typeof newTask.estimatedHours})</div>
              <div>priority: {newTask.priority?.value} ({typeof newTask.priority?.value})</div>
              <div>maxTasksPerDay: {taskSettings.maxTasksPerDay} ({typeof taskSettings.maxTasksPerDay})</div>
              <div>breakBetweenTasks: {taskSettings.breakBetweenTasks} ({typeof taskSettings.breakBetweenTasks})</div>
              <div>splitTaskThreshold: {taskSettings.splitTaskThreshold} ({typeof taskSettings.splitTaskThreshold})</div>
            </div>
          </details>
        </div>
        
        {/* Task input form */}
        <form onSubmit={handleAddTask} className="mb-6">
          <div className="form-group">
            <label htmlFor="task-name" className="form-label">Task Name</label>
            <input
              type="text"
              id="task-name"
              name="name"
              className="input w-full border rounded px-3 py-2"
              value={newTask.name}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="form-group">
              <label htmlFor="deadline" className="form-label">Deadline Date</label>
              <input
                type="date"
                id="deadline"
                name="deadline"
                className="input w-full border rounded px-3 py-2"
                value={newTask.deadline}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="deadline-time" className="form-label">Deadline Time</label>
              <input
                type="time"
                id="deadline-time"
                name="deadlineTime"
                className="input w-full border rounded px-3 py-2"
                value={newTask.deadlineTime}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
          
          <div className="form-group mt-4">
            <label htmlFor="estimated-hours" className="form-label">Estimated Hours</label>
            <input
              type="number"
              id="estimated-hours"
              name="estimatedHours"
              min="0.5"
              step="0.5"
              className="input w-full border rounded px-3 py-2"
              value={newTask.estimatedHours}
              onChange={handleInputChange}
              required
            />
          </div>
          
          <div className="form-group mt-4">
            <label htmlFor="category" className="form-label">Category</label>
            <select
              id="category"
              name="category"
              className="input w-full border rounded px-3 py-2"
              value={newTask.category.id}
              onChange={handleInputChange}
            >
              {TASK_CATEGORIES.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="form-group mt-4">
            <label htmlFor="priority" className="form-label">Priority</label>
            <select
              id="priority"
              name="priority"
              className="input w-full border rounded px-3 py-2"
              value={newTask.priority.id}
              onChange={handleInputChange}
            >
              {PRIORITY_LEVELS.map(priority => (
                <option key={priority.id} value={priority.id}>
                  {priority.name}
                </option>
              ))}
            </select>
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary w-full mt-4 bg-blue-600 text-white py-2 rounded"
          >
            Add Task
          </button>
        </form>
        
        {/* Settings section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-800">Scheduling Settings</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="form-group">
              <label className="block text-xs text-gray-500 mb-1">Working Hours Start</label>
              <input
                type="time"
                className="input w-full border rounded px-3 py-2"
                value={workingHours.start}
                onChange={(e) => setWorkingHours({...workingHours, start: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label className="block text-xs text-gray-500 mb-1">Working Hours End</label>
              <input
                type="time"
                className="input w-full border rounded px-3 py-2"
                value={workingHours.end}
                onChange={(e) => setWorkingHours({...workingHours, end: e.target.value})}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-4 mb-4">
            <div className="form-group">
              <label className="block text-xs text-gray-500 mb-1">Max Tasks Per Day</label>
              <input
                type="number"
                name="maxTasksPerDay"
                className="input w-full border rounded px-3 py-2"
                value={taskSettings.maxTasksPerDay}
                onChange={handleSettingsChange}
                min="1"
                max="10"
              />
            </div>
            <div className="form-group">
              <label className="block text-xs text-gray-500 mb-1">Break Between Tasks (minutes)</label>
              <input
                type="number"
                name="breakBetweenTasks"
                className="input w-full border rounded px-3 py-2"
                value={taskSettings.breakBetweenTasks}
                onChange={handleSettingsChange}
                min="0"
                max="60"
                step="5"
              />
            </div>
            <div className="form-group">
              <label className="block text-xs text-gray-500 mb-1">Split Tasks Longer Than (hours)</label>
              <input
                type="number"
                name="splitTaskThreshold"
                className="input w-full border rounded px-3 py-2"
                value={taskSettings.splitTaskThreshold}
                onChange={handleSettingsChange}
                min="1"
                max="8"
                step="0.5"
              />
            </div>
          </div>
          
          {/* Task list and controls */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-800">Task List</h3>
            <div className="flex space-x-2">
              <button
                className={`btn btn-secondary ${(scheduledEvents.length === 0) ? 'opacity-50 cursor-not-allowed' : ''} bg-gray-300 px-2 py-1 rounded`}
                onClick={clearSchedule}
                disabled={scheduledEvents.length === 0}
              >
                Clear Schedule
              </button>
              <button
                className={`btn btn-accent ${(tasks.length === 0 || isScheduling) ? 'opacity-50 cursor-not-allowed' : ''} bg-green-600 text-white px-2 py-1 rounded`}
                onClick={handleScheduleTasks}
                disabled={tasks.length === 0 || isScheduling}
              >
                {isScheduling ? 'Scheduling...' : 'Schedule Tasks'}
              </button>
            </div>
          </div>
          
          {/* Status messages */}
          {schedulingMessage && (
            <div className={`p-3 rounded-md mb-4 ${schedulingMessage.includes('error') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
              {schedulingMessage}
            </div>
          )}
          
          {/* Debug panel - visible when there are errors */}
          {debugInfo.hasError && (
            <div className="p-3 rounded-md mb-4 bg-yellow-100 text-yellow-800">
              <details>
                <summary>Debug Information</summary>
                <pre className="text-xs mt-2 overflow-auto max-h-40">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </details>
            </div>
          )}
          
          {/* Task list display */}
          {tasks.length === 0 ? (
            <p className="text-gray-500">No tasks added yet. Add some tasks to schedule.</p>
          ) : (
            <ul className="space-y-3">
              {tasks.map(task => (
                <li
                  key={task.id}
                  className="bg-gray-50 border rounded-md p-3 flex justify-between items-center"
                >
                  <div>
                    <div className="font-medium">{task.name}</div>
                    <div className="text-sm text-gray-500">
                      Due: {format(new Date(task.deadline), 'MMM d, yyyy')} at {task.deadlineTime} | 
                      {task.estimatedHours} hour{task.estimatedHours !== 1 ? 's' : ''}
                    </div>
                    <div className="flex items-center mt-1">
                      <span
                        className="inline-block w-3 h-3 rounded-full mr-1"
                        style={{ backgroundColor: task.category.color }}
                      ></span>
                      <span className="text-xs text-gray-600">{task.category.name}</span>
                      <span className="text-xs ml-2 px-2 py-1 rounded bg-gray-200">
                        {task.priority.name}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => handleRemoveTask(task.id)}
                    aria-label="Remove task"
                  >
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      
      {/* Calendar view */}
      <div className="md:w-2/3 p-6 flex-1 overflow-hidden">
        <div className="bg-white shadow-md rounded-lg p-4 h-full">
          <h3 className="text-lg font-semibold mb-4">Optimized Schedule</h3>
          <Calendar
            localizer={localizer}
            events={[...events, ...scheduledEvents]}
            startAccessor="start"
            endAccessor="end"
            style={{ height: 'calc(100% - 40px)' }}
            views={['week', 'day']}
            view={calendarView}
            date={calendarDate}
            onNavigate={handleNavigate}
            onView={handleViewChange}
            eventPropGetter={eventStyleGetter}
            tooltipAccessor={event => `${event.title}${event.notes ? `\n${event.notes}` : ''}`}
          />
        </div>
      </div>
    </div>
  );
};

export default AutoTaskScheduler;