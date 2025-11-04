# Stop model - defines stop data structure and methods

from enum import Enum

class StopType(Enum):
    FOOD = "images/Road Runner.png" #Going to be filepaths for images later
    REST = "images/Road Runner.png" #relative from frontend folder
    FUEL = "images/Road Runner.png"
    ENTERTAINMENT = "images/Road Runner.png"
    MISC = "images/Road Runner.png"

class Stop:
    def __init__(self, location, type, time=0, cost=0):
        self.location = location #lat/lng tuple
        self.type = type  # Should be of type StopType
        self.time = time  # in minutes
        self.cost = cost  # in dollars

    def get_location(self):
        return self.location
    
    def get_type(self):
        return self.type

    def get_time(self):
        return self.time
    
    def get_cost(self):
        return self.cost
    
    def get_image(self):
        return self.type.value
    
    def set_location(self, location):
        self.location = location

    def set_type(self, type):
        self.type = type

    def set_time(self, time):
        self.time = time
        
    def set_cost(self, cost):
        self.cost = cost

    def to_dict(self):
        return {
            'location' : self.location,
            'image' : self.type.value,
            'time' : self.time,
            'cost' : self.cost
        }
    
    def save_to_db(self):
        # Placeholder
        pass

    @staticmethod
    def get_from_db():
        # Placeholder
        pass