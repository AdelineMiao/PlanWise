# PlanWise

A smart schedule management application built with React, featuring natural language event entry, automated task scheduling, and habit-based recommendations.

## Features

### Core Features
- **User Authentication**: Create accounts, login securely
- **Membership Tiers**:
  - Basic Plan (Free): Access to Smart Event Entry
  - Monthly Plan ($5/month): Full access to all premium features
  - Lifetime Plan ($80 one-time): Permanent access to all features
- **Smart Event Entry**: Add events using natural language (e.g., "Lunch with Sarah next Friday at noon")
- **Responsive Design**: Works on all device sizes

### Premium Features
- **Auto Task Scheduler**: Input tasks with deadlines and priorities for optimized scheduling with color-coded categories
- **Group Availability Coordination**: Find common free time slots among multiple users (similar to When2Meet)
- **Habit-Based Recommendations**: Get personalized daily routine suggestions based on past behavior and mood tracking

## Tech Stack

- **Frontend**: React (create-react-app)
- **Backend**: Express.js
- **Styling**: Tailwind CSS
- **Payment Processing**: Stripe
- **AI Integration**: OpenAI API for natural language processing

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

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)
- Stripe account for payment processing

### Environment Variables

#### Frontend (.env in client directory)
```
REACT_APP_STRIPE_PUBLIC_KEY=your_stripe_public_key
```

#### Backend (.env in server directory)
```
PORT=4000
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PRICE_ID_MONTHLY=price_xyz_monthly
STRIPE_PRICE_ID_LIFETIME=price_xyz_lifetime
CLIENT_URL=http://localhost:3000
```

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd planwise
```

2. Install frontend dependencies
```bash
cd client
npm install
```

3. Install backend dependencies
```bash
cd ../server
npm install
```

### Running the Application

1. Start the backend server
```bash
cd server
npm run dev
```

2. In a new terminal, start the frontend application
```bash
cd client
npm start
```

3. Open your browser and navigate to http://localhost:3000

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
