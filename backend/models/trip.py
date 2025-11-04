# Trip model - defines trip data structure and methods
from stop import Stop

class Trip:
    def __init__(self):
        self.stops = []

    def add_stop(self, stop):
        self.stops.append(stop)

    def delete_stop(self, index):
        if 0 <= index < len(self.stops):
            del self.stops[index]

    def get_stops():
        return stops
    
    def get_stop(index):
        pass

    def total_stops():
        return len(stops)
    
    def total_time():
        pass

    def total_cost():
        pass
    
    def sum_time():
        pass

    def to_dict(self):
        return [stop.to_dict() for stop in self.stops]

    def save_to_db(self):
        # Placeholder
        pass

    def load_from_db(self):
        # Placeholder
        pass
