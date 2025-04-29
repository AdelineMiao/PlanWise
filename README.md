# PlanWise

A smart schedule management application built with React, featuring natural language event entry, automated task scheduling, and habit-based recommendations.

## Table of Contents
- [Features](#features)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [Option 1: Cloning the Repository](#option-1-cloning-the-repository)
  - [Option 2: Building Manually](#option-2-building-manually)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [Setup Instructions](#setup-instructions)
  - [Installing Node.js](#installing-nodejs)
  - [Stripe Account Setup](#stripe-account-setup)
  - [Setting Up the Application](#setting-up-the-application)
    - [Frontend Setup](#frontend-setup)
    - [Backend Setup](#backend-setup)
- [Running the Application](#running-the-application)
- [Using the Application](#using-the-application)
- [Troubleshooting](#troubleshooting)
- [Development Notes](#development-notes)
- [License](#license)

## Project Structure

```
planwise/
├── client/                      # Frontend React application
│   ├── node_modules/            # Frontend dependencies
│   ├── public/                  # Public assets
│   │   └── index.html           # Main HTML file
│   ├── src/
│   │   ├── components/
│   │   │   ├── Auth/            # Authentication components
│   │   │   │   ├── CreateAccount.js
│   │   │   │   ├── Login.js
│   │   │   │   └── MembershipSelection.js
│   │   │   ├── Common/          # Shared components
│   │   │   │   ├── Navbar.js
│   │   │   │   └── ProtectedRoute.js
│   │   │   ├── Features/        # App features
│   │   │   │   ├── AutoTaskScheduler.js
│   │   │   │   ├── GroupAvailability.js
│   │   │   │   ├── HabitRecommendations.js
│   │   │   │   ├── SmartEventEntry.js
│   │   │   │   └── SmartEventEntryHeader.js
│   │   │   ├── Payment/         # Payment processing
│   │   │   │   └── PaymentPage.js
│   │   │   ├── Services/        # Service integrations
│   │   │   │   └── openAIservice.js
│   │   │   └── HomePage.js      # Landing page
│   │   ├── App.js               # Main app component with routing
│   │   ├── index.js             # App entry point
│   │   ├── index.css            # Global styles
│   │   └── styles.css           # Additional styles
│   ├── .env                     # Environment variables for frontend
│   ├── package.json             # Frontend dependencies
│   ├── package-lock.json        # Dependency lock file
│   ├── postcss.config.js        # PostCSS configuration
│   └── tailwind.config.js       # Tailwind CSS configuration
│
└── server/                      # Backend server
    ├── node_modules/            # Backend dependencies
    ├── .env                     # Environment variables for backend
    ├── package.json             # Backend dependencies
    ├── package-lock.json        # Dependency lock file
    └── server.js                # Express server with Stripe integration
```

## Setup Instructions

### Installing Node.js

Node.js is required to run the React application and the backend server. Follow these steps to install Node.js:

#### Windows:
1. Go to [https://nodejs.org/en/](https://nodejs.org/en/)
2. Download the LTS (Long Term Support) version
3. Run the installer and follow the installation wizard
4. Accept the license agreement and keep clicking "Next"
5. Click "Finish" when the installation is complete

#### macOS:
1. Go to [https://nodejs.org/en/](https://nodejs.org/en/)
2. Download the LTS (Long Term Support) version
3. Run the installer and follow the installation wizard
4. Click "Continue" through the installation process
5. Click "Close" when the installation is complete

#### Verify Installation:
To verify that Node.js is installed correctly, open your terminal or command prompt and run:
```bash
node --version
npm --version
```
Both commands should display version numbers, confirming that Node.js and npm (Node Package Manager) are installed.

### Stripe Account Setup

Stripe is used for handling payments in the PlanWise app. Follow these steps to set up your Stripe account:

#### Create a Stripe Account:
1. Go to [https://stripe.com/](https://stripe.com/)
2. Click "Start now" or "Sign up"
3. Enter your email address and create a password
4. Complete the sign-up process by providing the required information

#### Get Your API Keys:
1. Once logged into your Stripe Dashboard, click on "Developers" in the left sidebar
2. Click on "API keys"
3. You'll see your Publishable key and Secret key
4. Make sure you're in "Test mode" (there should be a toggle at the top right of the dashboard)
5. Copy these keys to use in the application later

#### Create Stripe Products and Prices:
1. In the Stripe Dashboard, go to "Products" in the left sidebar
2. Click "Add product"
3. Create a product called "Monthly Subscription" with the following details:
   - Name: Monthly Subscription
   - Price: $5.00 USD / month (recurring)
4. Save this product and note the Price ID (it starts with "price_")
5. Create another product called "Lifetime Membership" with these details:
   - Name: Lifetime Membership
   - Price: $80.00 USD (one time)
6. Save this product and note the Price ID

Note: Keep your API keys and Price IDs safe. You'll need to add them to the application's environment files in the later steps.

### Setting Up the Application

#### Frontend Setup

**If you cloned the repository:**
1. Navigate to the client directory:
```bash
cd client
```
2. Create a file named `.env` in the client directory with your Stripe publishable key:
```
REACT_APP_STRIPE_PUBLIC_KEY=your_stripe_publishable_key
```

**If you're building manually:**
1. Navigate to the client directory:
```bash
cd client
```
2. Initialize a new React application:
```bash
npx create-react-app .
```
3. Install the required dependencies:
```bash
npm install @stripe/react-stripe-js @stripe/stripe-js axios date-fns react-big-calendar react-dom react-router-dom tailwindcss autoprefixer postcss
```
4. Create the necessary configuration files and component files as described in the Project Structure section
5. Create a `.env` file with your Stripe publishable key

#### Backend Setup

**If you cloned the repository:**
1. Navigate to the server directory:
```bash
cd ../server
```
2. Create a file named `.env` in the server directory with your Stripe keys:
```
PORT=4000
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PRICE_ID_MONTHLY=your_stripe_price_id_for_monthly_subscription
STRIPE_PRICE_ID_LIFETIME=your_stripe_price_id_for_lifetime_membership
CLIENT_URL=http://localhost:3000
```

**If you're building manually:**
1. Navigate to the server directory:
```bash
cd ../server
```
2. Create a `package.json` file with the required dependencies:
```json
{
  "name": "planwise-server",
  "version": "1.0.0",
  "description": "Backend for PlanWise app",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "body-parser": "^1.20.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "stripe": "^12.11.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.22"
  }
}
```
3. Install the dependencies:
```bash
npm install
```
4. Create the server.js file with the backend code
5. Create a `.env` file with your Stripe keys

## Running the Application

Now that you've set up both the frontend and backend, it's time to run the application. You'll need to run both the server and client simultaneously.

1. In your terminal, navigate to the server folder:
```bash
cd server
```

2. Start the server:
```bash
npm run dev
```
You should see a message that says "Server is running on port 4000"

3. Open a new terminal and navigate to the client folder:
```bash
cd client
```

4. Start the React development server:
```bash
npm start
```
This will open your web browser to http://localhost:3000 where you can see the app running.

## Using the Application

Once both servers are running, you can interact with the PlanWise app:

1. On the homepage, you can either log in or create a new account
2. After creating an account, select a membership plan
3. Enter payment details using Stripe's test card:
   - Card number: 4242 4242 4242 4242
   - Expiry date: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits
4. After successful payment, you'll be taken to the Smart Event Entry page
5. Use the natural language input to create calendar events (e.g., "Meeting with team on Thursday at 2pm")
6. Explore the premium features if you've purchased a paid membership:
   - Auto Task Scheduler: Add tasks with deadlines and priorities
   - Group Availability: Coordinate schedules with multiple users
   - Habit Recommendations: Get personalized routine suggestions based on your mood and activities

Note: Remember that you need to keep both the backend and frontend servers running for the application to work properly.

## Troubleshooting

If you encounter any issues while setting up or running the application, check the following common problems and solutions:

### Styling Issues
**Problem**: The app is working but the styling is not applied (default fonts and buttons).

**Solution**: Make sure your Tailwind configuration files are in the correct location (client directory, not root). Check that your index.css file contains the Tailwind directives and all custom styles.

### Server Connection Issues
**Problem**: Error connecting to the server when trying to make a payment.

**Solution**: Ensure your backend server is running on port 4000 and check that the proxy setting in client/package.json is correctly set to "http://localhost:4000".

### Stripe Payment Issues
**Problem**: Payment fails or Stripe elements don't appear.

**Solution**: Double-check your Stripe API keys in both .env files. Make sure you're using the test mode keys and that the price IDs are correct.

### Missing Dependencies
**Problem**: Errors about missing modules or packages.

**Solution**: Make sure you've run npm install in both the client and server directories. Check that your package.json files contain all the necessary dependencies.

### Natural Language Processing Issues
**Problem**: Natural language event entry not working correctly.

**Solution**: Verify that the OpenAI API key is correctly set in your environment variables and that the openAIservice.js file is properly configured.

## Development Notes

- User data is temporarily stored in localStorage (would be replaced with a proper database in production)
- Payment processing is handled securely through Stripe
- Natural language processing for event entry integrates with OpenAI API via the openAIservice.js component

## Future Enhancements

- Database integration for user data persistence
- Real NLP API integration for Smart Event Entry
- Mobile application
- Social sharing features
- Advanced analytics for habit tracking

## License

[MIT License](LICENSE)
