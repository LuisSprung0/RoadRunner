# 🚗 RoadRunner - Smart Road Trip Planner

*A comprehensive road trip planning application with interactive maps, real-time place discovery, and intelligent budget calculations.*

## ✨ Overview

RoadRunner helps travelers plan the perfect road trip by:
- 🗺️ **Interactive Google Maps** - Search for places, discover attractions, restaurants, gas stations, and hotels
- 💰 **Smart Budget Calculations** - Automatic cost estimation for each stop based on real-world pricing data
- 📍 **Place Discovery** - Filter by category (restaurants, coffee, gas, groceries, shopping, hotels, attractions, parks)
- 🛣️ **Route Optimization** - Visualize routes between multiple stops with distance and time estimates
- 💾 **Trip Persistence** - Save and load trips with all stops, routes, and budget information
- 👤 **User Authentication** - Secure login and trip management per user

## 🎯 Features

### Map & Place Discovery
- **Google Maps Integration** - Native SearchBox widget for searching places
- **Real-time Autocomplete** - Get suggestions as you type
- **Category Filters** - Quick access to:
  - 🍽️ Restaurants
  - ☕ Coffee Shops
  - ⛽ Gas Stations
  - 🛒 Supermarkets
  - 🛍️ Shopping Centers
  - 🏨 Hotels & Lodging
  - 🎭 Tourist Attractions
  - 🌳 Parks
- **One-Click Stop Addition** - Click any place to add it to your trip

### Trip Planning
- **Route Visualization** - See your route on the map with polylines
- **Stop Management** - Add, view, and manage trip stops
- **Cost Estimation** - Automatic price calculation for each stop based on type
- **Trip Saving** - Save trips with name, description, and all stops
- **Trip Loading** - Reload saved trips and continue planning

### Budget Management
- **Real-time Cost Calculation** - Updates as you add/remove stops
- **Place-Based Pricing** - Uses Google Places API price levels
- **Cost Breakdown** - See individual stop costs and total trip budget
- **Smart Estimation** - Different base prices for different establishment types

## 🏗️ Architecture

```
RoadRunner/
├── backend/
│   ├── app.py                 # Flask app (legacy)
│   ├── simple_server.py       # Unified Flask server (RECOMMENDED)
│   ├── models/
│   │   ├── trip.py           # Trip data model
│   │   ├── stop.py           # Stop data model
│   │   ├── user.py           # User data model
│   │   └── ...
│   ├── routes/
│   │   ├── trips.py          # Trip API endpoints
│   │   ├── budget.py         # Budget API endpoints
│   │   └── ...
│   ├── services/
│   │   ├── trip_service.py   # Trip business logic
│   │   ├── maps_service.py   # Google Maps integration
│   │   ├── pricing_service.py # Budget calculations
│   │   └── ...
│   ├── database.db           # SQLite database
│   └── .env                  # Environment variables
├── frontend/
│   ├── map.html              # Map interface
│   ├── map.js                # Map interactions & place search
│   ├── map.css               # Map styling
│   ├── login_page.html       # Login interface
│   ├── trip_menu.html        # Trip management
│   ├── auth.js               # Authentication
│   └── ...
├── simple_server.py          # Unified server (MAIN ENTRY POINT)
└── requirements.txt          # Python dependencies
```

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Google Maps API Key with enabled services:
  - Maps JavaScript API
  - Directions API
  - Geocoding API
  - Places API
  - Routes API

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/LuisSprung0/RoadRunner.git
cd RoadRunner
```

2. **Create virtual environment**
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Set up environment variables**
Create a `.env` file in the `backend/` directory:
```
GOOGLE_MAPS_API_KEY=your_api_key_here
SECRET_KEY=your_secret_key_here
FLASK_HOST=0.0.0.0
FLASK_PORT=5001
DEBUG=True
```

5. **Initialize database**
```bash
cd backend
python init_trips_db.py
```

6. **Run the server**
```bash
cd ..
python simple_server.py
```

7. **Open in browser**
Navigate to: `http://localhost:5001`

## 📡 API Endpoints

### Authentication
- `POST /api/register` - Register new user
- `POST /api/login` - User login

### Trips
- `GET /api/trips/user/<user_id>` - Get all user trips
- `GET /api/trips/<trip_id>` - Get trip with stops
- `POST /api/trips/save` - Save new trip
- `DELETE /api/trips/<trip_id>` - Delete trip

### Budget
- `POST /api/budget/calculate` - Calculate trip budget
- `GET /api/budget/default-price` - Get default prices by type

### Maps
- `POST /api/maps/directions` - Get route directions

### Configuration
- `GET /api/config/google-maps-key` - Get API key for frontend

## 💾 Database Schema

### Users Table
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
```

### Trips Table
```sql
CREATE TABLE trips (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
)
```

### Stops Table
```sql
CREATE TABLE stops (
  id INTEGER PRIMARY KEY,
  trip_id INTEGER NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  stop_type TEXT NOT NULL,
  time_minutes INTEGER DEFAULT 0,
  cost REAL DEFAULT 0.0,
  stop_order INTEGER NOT NULL,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
)
```

## 🔧 Usage Guide

### Planning a Trip
1. **Sign up or log in** with your email
2. **Click "Create New Trip"** to start planning
3. **Use the map search** to find places
4. **Click filter buttons** to browse by category
5. **Click any place** to add it to your trip
6. **Click "Draw Route"** to visualize your journey
7. **Enter trip name** and description
8. **Click "Save Trip"** to store your plan

### Loading a Saved Trip
1. **Log in** to your account
2. **View your saved trips** on the trips page
3. **Click "Open Trip"** to continue editing
4. **Markers and route** will automatically load
5. **Add more stops** or modify as needed

### Budget Features
- **Automatic calculation** - Budget updates as you add stops
- **Place-based pricing** - Different costs for restaurants vs. gas stations
- **Distance surcharges** - Additional costs for longer trips
- **Cost breakdown** - See individual stop prices in the stops list
- **Total display** - View total trip budget at the top

## 🛠️ Development

### Running Tests
```bash
cd backend
python -m pytest tests/
```

### Code Structure
- **Models**: Data structures and database models
- **Routes**: Flask blueprints for API endpoints
- **Services**: Business logic layer
- **Utils**: Helper functions and validators

### Adding New Features
1. Create model in `models/`
2. Create service in `services/` for business logic
3. Create routes in `routes/`
4. Register blueprint in `simple_server.py`
5. Add frontend functionality in `frontend/`

## 📝 Project Structure

Frontend -> Routes -> Services -> Database -> Frontend

This structure ensures:
- ✅ Clean separation of concerns
- ✅ Easy maintenance and scaling
- ✅ Reusable components
- ✅ Clear data flow
- ✅ Testable code

## 🤝 Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Commit with clear messages
5. Push to your fork
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 👥 Authors

- **Luis Sprung** - Project lead
- Community contributors

## 🙏 Acknowledgments

- Google Maps API for place discovery and routing
- Flask framework for backend
- SQLite for data persistence
- Bootstrap for responsive design

## 📞 Support

For issues, feature requests, or questions:
- Open an issue on GitHub
- Contact the development team

---

**Happy Road Tripping! 🚗🗺️**
