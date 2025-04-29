require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Configuration, OpenAIApi } = require('openai');

const app = express();
const port = process.env.PORT || 4000;

// Initialize OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Price IDs for different plans
const PRICE_IDS = {
  MONTHLY: process.env.STRIPE_PRICE_ID_MONTHLY,
  LIFETIME: process.env.STRIPE_PRICE_ID_LIFETIME
};

// Stripe payment endpoint
app.post('/api/create-payment-intent', async (req, res) => {
  const { priceId } = req.body;
  
  try {
    // Create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: priceId === PRICE_IDS.MONTHLY ? 500 : 8000, // $5 or $80 in cents
      currency: 'usd',
      metadata: {
        priceId: priceId
      }
    });

    res.send({
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).send({ error: error.message });
  }
});

// Stripe checkout session endpoint (alternative approach)
app.post('/api/create-checkout-session', async (req, res) => {
  const { priceId } = req.body;
  
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: priceId === PRICE_IDS.MONTHLY ? 'subscription' : 'payment',
      success_url: `${process.env.CLIENT_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/membership`,
    });

    res.send({ sessionId: session.id });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).send({ error: error.message });
  }
});

// OpenAI API Routes

// Parse natural language into calendar events
// In server.js, update the parse-event endpoint
app.post('/api/parse-event', async (req, res) => {
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }
  
  try {
    const response = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an intelligent calendar assistant that extracts event details from natural language.
          
          INSTRUCTIONS:
          1. Extract the event title (make it concise and descriptive)
          2. Determine the date and time (use context clues for relative dates)
          3. Estimate the event duration based on the type of event
          4. Extract any location information
          5. Extract any additional notes
          
          FORMAT RULES:
          - For dinner events without specific times, default to 7:00 PM
          - For lunch events without specific times, default to 12:00 PM
          - For meetings without specific times, default to 1 hour duration
          - For coffee meetings, default to 30 minutes
          - If no specific date is mentioned but "tomorrow" is used, set the date to tomorrow
          - If no specific date is mentioned but "next [weekday]" is used, set the date to the next occurrence of that weekday
          - The event title should be concise and descriptive, not the entire input text
          
          EXAMPLES:
          - Input: "I will have dinner with Tiga tomorrow night"
            Output: { "title": "Dinner with Tiga", "startTime": "2023-04-28T19:00:00", "endTime": "2023-04-28T20:30:00", "location": "", "notes": "" }
          
          - Input: "Meeting with marketing team at 3pm on Friday"
            Output: { "title": "Marketing Team Meeting", "startTime": "2023-04-28T15:00:00", "endTime": "2023-04-28T16:00:00", "location": "", "notes": "" }
          
          Respond with a JSON object containing title, startTime, endTime, location, and notes.`
        },
        {
          role: "user",
          content: `Parse this event: "${text}"`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    // Parse the response
    const result = JSON.parse(response.data.choices[0].message.content);
    
    res.json({
      title: result.title,
      start: result.startTime,
      end: result.endTime,
      notes: result.notes || '',
      location: result.location || '',
    });
  } catch (error) {
    console.error('Error parsing event:', error);
    res.status(500).json({
      error: 'Failed to parse event text',
      details: error.message
    });
  }
});

// Generate optimal task schedule
app.post('/api/schedule-tasks', async (req, res) => {
  const { tasks } = req.body;
  
  if (!tasks || !Array.isArray(tasks)) {
    return res.status(400).json({ error: 'Valid tasks array is required' });
  }
  
  try {
    const response = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a scheduling assistant that creates optimal schedules based on task priorities, deadlines, and time constraints. Generate a schedule that maximizes productivity."
        },
        {
          role: "user",
          content: `Generate an optimal schedule for these tasks: ${JSON.stringify(tasks)}`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    // Parse the response
    const result = JSON.parse(response.data.choices[0].message.content);
    
    res.json({ schedule: result.schedule });
  } catch (error) {
    console.error('Error scheduling tasks:', error);
    res.status(500).json({
      error: 'Failed to generate task schedule',
      details: error.message
    });
  }
});

// Generate personalized recommendations
app.post('/api/generate-recommendations', async (req, res) => {
  const { moodEntries, activityEntries } = req.body;
  
  if (!moodEntries || !activityEntries) {
    return res.status(400).json({ error: 'Mood and activity entries are required' });
  }
  
  try {
    const response = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are a lifestyle coach that provides personalized daily routine recommendations based on mood patterns and activity history. Your goal is to suggest routines that improve well-being and productivity."
        },
        {
          role: "user",
          content: `Generate personalized recommendations based on this mood history: ${JSON.stringify(moodEntries)} and activity history: ${JSON.stringify(activityEntries)}`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    // Parse the response
    const result = JSON.parse(response.data.choices[0].message.content);
    
    res.json({ recommendations: result.recommendations });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({
      error: 'Failed to generate recommendations',
      details: error.message
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});