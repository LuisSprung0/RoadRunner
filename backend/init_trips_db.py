import sqlite3

def init_database():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    
    # Create trips table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS trips (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            image_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # Create stops table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS stops (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trip_id INTEGER NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            stop_type TEXT NOT NULL,
            time_minutes INTEGER DEFAULT 0,
            cost REAL DEFAULT 0.0,
            stop_order INTEGER NOT NULL,
            FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
        )
    ''')
    
    conn.commit()
    conn.close()
    print("✅ Trips and stops tables created successfully!")

if __name__ == '__main__':
    init_database()
