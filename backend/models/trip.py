# Trip model - defines trip data structure and methods
from stop import Stop

class Trip:
    def __init__(self):
        self.stops = []
        self.name = "Unnamed Trip"
        self.description = "No description"
        self.image_url = ""

    def add_stop(self, stop):
        self.stops.append(stop)

    def delete_stop(self, index):
        if 0 <= index < len(self.stops):
            del self.stops[index]

    def get_stops(self):
        return self.stops
    
    def get_stop(self, index):
        if 0 <= index < len(self.stops):
            return self.stops[index]

    def get_name(self):
        return self.name
    
    def set_name(self, name):
        self.name = name

    def get_description(self):
        return self.description
    
    def set_description(self, description):
        self.description = description

    def get_image_url(self):
        return self.image_url
    
    def set_image_url(self, image_url):
        self.image_url = image_url

    def total_stops(self):
        return len(self.stops)
    
    def total_time(self):
        total = 0
        for stop in self.stops:
            total += stop.get_time()
        return total

    def total_cost(self):
        total = 0
        for stop in self.stops:
            total += stop.get_cost()
        return total
    
    def sum_time(self):
        pass

    def to_dict(self):
        dict = {
            'name': self.name,
            'description': self.description,
            'image_url': self.image_url,
            'stops': [stop.to_dict() for stop in self.stops]
        }
        return dict

    def save_to_db(self):
        # Placeholder
        pass

    @staticmethod
    def get_from_db():
        # Placeholder
        pass
