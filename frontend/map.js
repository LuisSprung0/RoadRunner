import {API_URL, showMessage} from './utils.js'
// Request needed libraries.
const { Map, InfoWindow} = await google.maps.importLibrary("maps");
const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");
const { encoding, Polyline } = await google.maps.importLibrary("geometry");
const bounds = new google.maps.LatLngBounds();
let startTime = null;

async function initMap() {
  const myLatlng = { lat: 38.9072, lng: -77.0369 }; // Washington, DC
  window.map = new Map(document.getElementById("map"), { //Create the map with defaults
    zoom: 4,
    center: myLatlng,
    mapId: "mapId",
  });

  // Store markers globally so we can access them from saveTripToBackend
  window.trip = await fetchUserTrip(); //So we are not constantly fetching the trip (If there is a preexisting trip)
  window.tripMarkers = [];
  window.polyline = null;
  const costEl = document.getElementById("cost");

  if (window.trip && window.trip.stops && window.trip.stops.length > 0) {
    initializeMarkersFromTrip();
    window.polyline = await drawRoute();

    // Calculate total cost from stops
    const totalCost = window.trip.stops.reduce((sum, stop) => sum + (stop.cost || 0), 0);
    costEl.innerText = `$${totalCost.toFixed(2)}`;
  }
  
  //Event listeners
  window.map.addListener("click", async (event) => {
    //following code from ChatGPT to debug information not properly displaying
    // Add marker first
    const marker = placeMarker(event.latLng);

    // Fetch price for this stop
    let price = 10;  //TODO: REPLACE WITH ACTUAL USER INPUTTED PRICE LOGIC
    let userInput = "";
    const userCost = document.getElementById("usr");
    // Attach price to marker object for saveTripToBackend()
    userCost.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        price = parseInt(userInput)
        userInput = ""; // reset after Enter
    } else if (event.key.length === 1) { 
        // Only add printable characters
        userInput += event.key;
    }
});
    marker.stopPrice = price;
    console.log(price);

    window.tripMarkers.push(marker);

    // Update stop list UI
    updateStopListUI();
    panTo(event.latLng);

    if (window.tripMarkers.length >= 2) {
      if (window.polyline) {
        window.polyline.setMap(null);
        window.polyline = null;
      }

      try {
        const directions = await fetchDirections();
        window.polyline = await drawRoute(directions);

        if (startTime) {
          const arrivalTime = new Date(startTime.getTime() + directions['total_duration'] * 1000);
          showMessage(`Estimated arrival time at final destination: 
            ${arrivalTime.getHours().toString().padStart(2, '0')}:${arrivalTime.getMinutes().toString().padStart(2, '0')}`);
        }
      } catch (error) {
        console.error("Error drawing route after adding marker:", error);
      }
    }
  });
}

// AI-ASSISTED: GitHub Copilot - Updated to add delete buttons with coordinate extraction handling
function updateStopListUI() { //based off window.tripMarkers
  const stopList = document.getElementById("stops-list");
  stopList.innerHTML = ''; 

  window.tripMarkers.forEach((marker, index) => {
    const lat = typeof marker.position.lat === 'function' ? marker.position.lat() : marker.position.lat;
    const lng = typeof marker.position.lng === 'function' ? marker.position.lng() : marker.position.lng;
    const price = marker.stopPrice;

    const newStop = document.createElement("li");
    newStop.className = "stop-item";
    
    const stopText = document.createElement("span");
    stopText.className = "stop-text";
    stopText.innerText = price !== null
      ? `Stop ${index + 1}: (${lat.toFixed(4)}, ${lng.toFixed(4)}) - $${price}`
      : `Stop ${index + 1}: (${lat.toFixed(4)}, ${lng.toFixed(4)}) (price unavailable)`;
    
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-stop-btn";
    deleteBtn.innerText = "✕";
    deleteBtn.title = "Remove this stop";
    deleteBtn.onclick = () => removeStop(index);
    
    newStop.appendChild(stopText);
    newStop.appendChild(deleteBtn);
    stopList.appendChild(newStop);
  });
}

// AI-ASSISTED: GitHub Copilot - Complete function for removing stops from map, database, and UI
async function removeStop(index, stopId = null) {
  // Remove marker from map
  const marker = window.tripMarkers[index];
  if (marker) {
    if (marker.setMap) {
      marker.setMap(null);
    } else if (marker.map) {
      marker.map = null;
    }
  }
  
  // Remove from tripMarkers array
  window.tripMarkers.splice(index, 1);
  
  // If this is a saved trip with a database ID, delete from backend
  if (stopId) {
    try {
      const response = await fetch(`${API_URL}/stops/${stopId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        console.error('Failed to delete stop from database');
      }
    } catch (error) {
      console.error('Error deleting stop:', error);
    }
  }
  
  // Update the UI
  updateStopListUI();
  
  // Update cost display
  const costEl = document.getElementById("cost");
  const totalCost = window.tripMarkers.reduce((sum, m) => sum + (m.stopPrice || 0), 0);
  costEl.innerText = `$${totalCost.toFixed(2)}`;
  
  // Redraw route if we have 2+ stops
  if (window.polyline) {
    window.polyline.setMap(null);
    window.polyline = null;
  }
  
  if (window.tripMarkers.length >= 2) {
    try {
      const directions = await fetchDirections();
      window.polyline = await drawRoute(directions);
    } catch (error) {
      console.error("Error redrawing route after removing stop:", error);
    }
  }
  
  showMessage(`Stop removed`);
}

async function calculateTripBudget() {
  /**
   * Call backend budget API to calculate trip costs
   * Uses Places API to get real price levels
   */
  if (window.tripMarkers.length === 0) {
    return;
  }

  try {
    // Prepare stops data for budget calculation
    const stops_data = window.tripMarkers.map(marker => ({
      location: [marker.position.lat().toFixed(4), marker.position.lng().toFixed(4)],
      type: 'MISC'  // Default type, can be customized later
    }));

    // Call backend budget API
    const response = await fetch(`${API_URL}/budget/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stops: stops_data,
        distances: []  // Can add distances later if needed
      })
    });

    const data = await response.json();

    if (response.ok && data.success) {
      // Update each marker with calculated price
      data.stops.forEach((stop_data, index) => {
        if (index < window.tripMarkers.length) {
          window.tripMarkers[index].stopPrice = stop_data.estimated_price;
        }
      });

      // Update UI with new prices
      updateStopListUI();
      
      // Update total cost display
      const costEl = document.getElementById("cost");
      costEl.innerText = `$${data.total_cost.toFixed(2)}`;
      
      console.log('Trip budget calculated:', data);
    } else {
      console.error('Budget calculation failed:', data.error);
    }
  } catch (error) {
    console.error('Error calculating budget:', error);
  }
}

function updateEstimates(time, distance) {
  //Updates time, distance, and cost estimates in the UI
  const timeEl = document.getElementById("time");
  const distanceEl = document.getElementById("distance");
  const costEl = document.getElementById("cost");

  const hours = Math.floor(time / 3600);
  const mins = Math.floor(time / 60) % 60;

  const miles = (distance*0.000621371).toFixed(1); //convert meters to miles

  let totalCost = window.tripMarkers.reduce((sum, marker) => {
    return sum + (marker.stopPrice || 0);
  }, 0);

  timeEl.innerText = hours != 0 ? `${hours} hours & ${mins} mins` : `${mins} mins`;
  distanceEl.innerText = `${miles} miles`;
  costEl.innerText = `$${totalCost.toFixed(2)}`;
}

async function fetchDirections() {
  if (window.tripMarkers.length < 2) {
    updateEstimates(0, 0);
    return null
  };

  try {
    // Get coordinates - AdvancedMarkerElement stores position as LatLng or LatLngLiteral
    const getCoords = (marker) => {
      const pos = marker.position;
      // Check if it's a LatLng object with lat/lng methods
      if (pos && typeof pos.lat === 'function') {
        return { latitude: pos.lat(), longitude: pos.lng() };
      }
      // Check if it's a LatLngLiteral object with lat/lng properties
      if (pos && typeof pos.lat === 'number') {
        return { latitude: pos.lat, longitude: pos.lng };
      }
      // Fallback - try toJSON() if available
      if (pos && typeof pos.toJSON === 'function') {
        const json = pos.toJSON();
        return { latitude: json.lat, longitude: json.lng };
      }
      console.error("Could not extract coordinates from marker:", marker);
      return { latitude: 0, longitude: 0 };
    };

    const originCoords = getCoords(window.tripMarkers[0]);
    const destCoords = getCoords(window.tripMarkers[window.tripMarkers.length-1]);
    
    console.log("Origin:", originCoords);
    console.log("Destination:", destCoords);

    const response = await fetch(`${API_URL}/maps/directions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: originCoords,
        destination: destCoords,
        waypoints: window.tripMarkers.slice(1, -1).map(marker => getCoords(marker)),
        mode: 'driving',
      })
    });

    const data = await response.json();
    console.log("Directions API response:", data);
    
    if (response.ok && data.directions) {
      return data.directions;
    } else {
      throw new Error(data.error || 'Failed to fetch directions');
    }
  } catch (error) {
    console.error("Failed to fetch directions:", error);
    return null;
  }
}

async function drawRoute(data=null) { //Draws the route for the current markers
  if (data === null)
    data = await fetchDirections();

  // Check if we have valid data
  if (!data || !data['polyline']) {
    console.error("No valid route data received");
    return null;
  }

  const encoded = data['polyline'];
  const decoded = encoding.decodePath(encoded);

  const polyline = new google.maps.Polyline({
    path: decoded,
    geodesic: true,
    strokeColor: "#4285F4",
    strokeOpacity: 0.8,
    strokeWeight: 6, 
    map: window.map
  });

  const bounds = new google.maps.LatLngBounds();
  decoded.forEach(latlng => bounds.extend(latlng));
  window.map.fitBounds(bounds);

  updateEstimates(data['total_duration'], data['total_distance']);
  
  // Calculate trip budget using backend API
  await calculateTripBudget();

  return polyline;
}

// AI-ASSISTED: GitHub Copilot - Enhanced with info window containing Remove Stop button
function placeMarker(latLng) {
  const pin = new google.maps.marker.PinElement({
    scale: 1.5,
  });
  const marker = new google.maps.marker.AdvancedMarkerElement({
    map: window.map,
    position: latLng,
    title: `Stop at (${latLng.lat().toFixed(4)}, ${latLng.lng().toFixed(4)})`,
    content: pin.element,
    gmpClickable: true,
  });

  const infoWindow = new google.maps.InfoWindow();
  
  marker.addListener('click', ({ domEvent, latLng }) => {
    // Find the index of this marker in tripMarkers
    const markerIndex = window.tripMarkers.indexOf(marker);
    const stopId = marker.stopId || null; // Database ID if exists
    
    infoWindow.close();
    infoWindow.setContent(`
      <div style="padding: 10px; min-width: 150px; text-align: center;">
        <strong>${marker.title}</strong><br/>
        ${marker.stopPrice ? `Cost: $${marker.stopPrice}` : ''}<br/>
        <button onclick="window.removeStopFromMap(${markerIndex}, ${stopId})" 
                style="margin-top: 10px; padding: 8px 16px; background: #dc3545; color: white; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
          ✕ Remove Stop
        </button>
      </div>
    `);
    infoWindow.open(marker.map, marker);
  });

  pin.element.addEventListener('contextmenu', (e) => { //right click to remove marker
    try {
      e.preventDefault();
      marker.map = null;
      window.tripMarkers = window.tripMarkers.filter(m => m !== marker);
      updateStopListUI();

      if (window.polyline) {
        window.polyline.setMap(null);
        window.polyline = null;
      }

      drawRoute().then(polyline => {
        window.polyline = polyline;
      }).catch(err => {
        console.error("Error redrawing route after marker removal:", err);
      });
    } catch (error) {
      console.error("Error handling context menu:", error);
    }
  });

  return marker;
}

function panTo(latLng, zoomLevel) {
  window.map.panTo(latLng);
  if (window.map.getZoom() < 8)
    window.map.setZoom(8);
}

// AI-ASSISTED: GitHub Copilot - Updated to include delete buttons and store database IDs
async function initializeMarkersFromTrip() {
  if (!window.trip) return;

  const trip = window.trip;
  const stopList = document.getElementById("stops-list");
  
  // Check if stops exist and are in the right format
  if (trip.stops && Array.isArray(trip.stops)) {
    trip.stops.forEach((stop, index) => {
      // Stops from database have latitude/longitude fields
      const lat = stop.latitude || stop.location[0];
      const lng = stop.longitude || stop.location[1];
      const cost = stop.cost || 0;
      const stopId = stop.id; // Database ID for deletion
      
      const newStop = document.createElement("li");
      newStop.className = "stop-item";
      
      const stopText = document.createElement("span");
      stopText.className = "stop-text";
      stopText.innerText = `Stop ${index + 1}: (${lat.toFixed(4)}, ${lng.toFixed(4)}) - $${cost}`;
      
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-stop-btn";
      deleteBtn.innerText = "✕";
      deleteBtn.title = "Remove this stop";
      deleteBtn.onclick = () => removeStop(index, stopId);
      
      newStop.appendChild(stopText);
      newStop.appendChild(deleteBtn);
      stopList.appendChild(newStop);

      const latLng = new google.maps.LatLng(lat, lng);
      const marker = placeMarker(latLng);
      marker.stopPrice = cost;
      marker.stopId = stopId; // Store database ID on marker
      window.tripMarkers.push(marker);
    });
  }
}

async function fetchUserTrip() {
  const trip_id = localStorage.getItem('current_trip_id');

  if (trip_id != -1 && trip_id != null) {
    try {
      const response = await fetch(`${API_URL}/trips/${trip_id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      if (response.ok) {
        // Combine trip and stops into a single object
        const tripData = {
          ...data.trip,
          stops: data.stops || []
        };
        return tripData;
      }
      else
        console.error("Failed to fetch trip:", data.error);
    } catch (error) {
      console.error("Error fetching user trips:", error);
      return null;
    }
  }

  return null;
}

// Function to save trip to backend
async function saveTripToBackend() {
  const statusEl = document.getElementById('save-status');
  
  // Get user ID from localStorage
  const userId = localStorage.getItem('user_id');
  if (!userId) {
    statusEl.innerText = '❌ Please login first to save trips';
    statusEl.style.color = 'red';
    return;
  }

  // Get trip name and description
  const tripName = document.getElementById('trip-name').value.trim();
  if (!tripName) {
    statusEl.innerText = '❌ Please enter a trip name';
    statusEl.style.color = 'red';
    return;
  }
  
  const tripDescription = document.getElementById('trip-description').value.trim();

  // Get stops from markers
  if (!window.tripMarkers || window.tripMarkers.length === 0) {
    statusEl.innerText = '❌ Please add at least one stop on the map';
    statusEl.style.color = 'red';
    return;
  }

  const stops = window.tripMarkers.map(marker => ({
    location: [marker.position.lat, marker.position.lng],
    type: 'MISC',  // Default type, can be enhanced later
    time: 0,       // Can be calculated or entered by user
    cost: marker.stopPrice ?? 0        // Can be calculated or entered by user
  }));

  // Prepare trip data
  const tripData = {
    user_id: parseInt(userId),
    name: tripName,
    description: tripDescription,
    image_url: '',
    stops: stops
  };

  // Show loading status
  statusEl.innerText = '⏳ Saving trip...';
  statusEl.style.color = 'blue';

  try {
    const response = await fetch(`${API_URL}/trips/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tripData)
    });

    const data = await response.json();

    if (response.ok) {
      statusEl.innerText = `✅ Trip saved successfully! Trip ID: ${data.trip_id}`;
      statusEl.style.color = 'green';
      
      //TODO: Why is it refreshing the page every time it saves successfully?
      // Clear form
      document.getElementById('trip-name').value = '';
      document.getElementById('trip-description').value = '';
    } else {
      statusEl.innerText = `❌ Error: ${data.error}`;
      statusEl.style.color = 'red';
    }
  } catch (error) {
    statusEl.innerText = `❌ Network error: ${error.message}`;
    statusEl.style.color = 'red';
    console.error('Error saving trip:', error);
  }
}

// Event listener for save button
document.getElementById('save-trip-btn').addEventListener('click', saveTripToBackend);

//Calculates travel time based on user inputted start time
const calculateTravelTimeBtn = document.getElementById('calculate-travel-time');
const startTimeInput = document.getElementById('start-time');
calculateTravelTimeBtn.addEventListener('click', async (e) => {
  e.preventDefault();

  const startTimeValue = startTimeInput.value.trim();

  if (startTimeValue == '') {
    startTime = null;
    return;
  }
  
  try {
    const now = new Date();
    const time = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      startTimeValue.split(":")[0],
      startTimeValue.split(":")[1]
    );

    startTime = time;

    if (window.tripMarkers.length >= 2) {
      const directions = await fetchDirections();
      const arrivalTime = new Date(startTime.getTime() + directions['total_duration'] * 1000);
      showMessage(`Estimated arrival time at final destination: 
        ${arrivalTime.getHours().toString().padStart(2, '0')}:${arrivalTime.getMinutes().toString().padStart(2, '0')}`);
    }
  } catch (error) {
    console.log(error);
    return;
  }
});

// ========== GOOGLE MAPS SEARCHBOX FUNCTIONALITY ==========
let searchBox = null;
let searchMarkers = []; // Store search result markers
let placeService = null;
let currentFilterType = null; // Track active filter

async function initSearchBox() {
  const { SearchBox } = await google.maps.importLibrary("places");
  const { PlacesService } = await google.maps.importLibrary("places");
  
  placeService = new PlacesService(window.map);
  const input = document.getElementById('pac-input');
  searchBox = new SearchBox(input);
  
  // Bias SearchBox results to map's viewport
  window.map.addListener('bounds_changed', () => {
    searchBox.setBounds(window.map.getBounds());
  });
  
  // Listen for search results
  searchBox.addListener('places_changed', () => {
    const places = searchBox.getPlaces();
    
    if (places.length === 0) return;
    
    // Clear previous search markers - use setMap(null) for google.maps.Marker
    searchMarkers.forEach(marker => {
      if (marker.setMap) {
        marker.setMap(null);
      } else {
        marker.map = null;
      }
    });
    searchMarkers = [];
    
    const bounds = new google.maps.LatLngBounds();
    
    places.forEach(place => {
      if (!place.geometry || !place.geometry.location) {
        return;
      }
      
      displayPlaceMarker(place, bounds);
    });
    
    window.map.fitBounds(bounds);
  });
}

function displayPlaceMarker(place, bounds) {
  // Create marker for search result (blue color)
  const icon = {
    path: google.maps.SymbolPath.CIRCLE,
    scale: 10,
    fillColor: '#4285F4',
    fillOpacity: 0.8,
    strokeColor: '#FFF',
    strokeWeight: 2
  };
  
  const marker = new google.maps.Marker({
    map: window.map,
    title: place.name,
    position: place.geometry.location,
    icon: icon
  });
  
  searchMarkers.push(marker);
  
  // Add click listener to add as stop
  marker.addListener('click', () => {
    addPlaceAsStop(place);
  });
  
  // Show info window on click
  const infoWindow = new google.maps.InfoWindow();
  marker.addListener('click', () => {
    infoWindow.close();
    infoWindow.setContent(`
      <div style="padding: 10px; min-width: 200px;">
        <strong>${place.name}</strong><br/>
        ${place.formatted_address || ''}<br/>
        ${place.rating ? `⭐ ${place.rating}` : ''}<br/>
        <button onclick="window.addPlaceAsStopFromInfoWindow('${place.name}', ${place.geometry.location.lat()}, ${place.geometry.location.lng()})" style="margin-top: 10px; padding: 5px 10px; background: #4285F4; color: white; border: none; border-radius: 3px; cursor: pointer;">
          Add to Trip
        </button>
      </div>
    `);
    infoWindow.open(window.map, marker);
  });
  
  if (bounds) bounds.extend(place.geometry.location);
}

function filterPlacesByType(placeType) {
  currentFilterType = placeType;
  
  // Clear previous search markers - use setMap(null) for google.maps.Marker objects
  searchMarkers.forEach(marker => {
    if (marker.setMap) {
      marker.setMap(null);
    } else {
      marker.map = null;
    }
  });
  searchMarkers = [];
  
  // Search for places of this type near map center
  const request = {
    location: window.map.getCenter(),
    radius: 15000, // 15km radius
    type: placeType
  };
  
  if (!placeService) {
    console.error("PlacesService not initialized");
    return;
  }
  
  placeService.nearbySearch(request, (results, status) => {
    if (status === google.maps.places.PlacesServiceStatus.OK && results) {
      const bounds = new google.maps.LatLngBounds();
      
      results.slice(0, 15).forEach(place => {
        displayPlaceMarker(place, bounds);
      });
      
      window.map.fitBounds(bounds);
    } else {
      showMessage(`No ${placeType} found nearby`, true);
    }
  });
}

// AI-ASSISTED: GitHub Copilot - Enhanced with debug logging and proper marker clearing
function clearFilters() {
  console.log('Clearing filters, markers count:', searchMarkers.length);
  
  // Clear search markers - use setMap(null) for google.maps.Marker objects
  searchMarkers.forEach(marker => {
    try {
      if (marker.setMap) {
        marker.setMap(null);
      } else if (marker.map !== undefined) {
        marker.map = null;  // For AdvancedMarkerElement
      }
    } catch (e) {
      console.error('Error removing marker:', e);
    }
  });
  searchMarkers = [];
  
  // Clear search input
  const searchInput = document.getElementById('pac-input');
  if (searchInput) {
    searchInput.value = '';
  }
  
  // Reset filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.style.background = 'white';
    btn.style.color = 'black';
  });
  
  currentFilterType = null;
  showMessage('Filters cleared', false);
}

function addPlaceAsStop(place) {
  const latLng = new google.maps.LatLng(place.geometry.location.lat(), place.geometry.location.lng());
  const marker = placeMarker(latLng);
  
  // Estimate price based on place type
  let defaultPrice = 15; // Default MISC price
  if (place.types) {
    if (place.types.includes('restaurant')) defaultPrice = 25;
    else if (place.types.includes('cafe')) defaultPrice = 20;
    else if (place.types.includes('lodging') || place.types.includes('hotel')) defaultPrice = 100;
    else if (place.types.includes('gas_station')) defaultPrice = 60;
    else if (place.types.includes('tourist_attraction')) defaultPrice = 35;
    else if (place.types.includes('parking')) defaultPrice = 10;
    else if (place.types.includes('grocery_or_supermarket')) defaultPrice = 30;
    else if (place.types.includes('shopping_mall')) defaultPrice = 25;
  }
  
  marker.stopPrice = defaultPrice;
  
  // Add to stops list
  const stopList = document.getElementById('stops-list');
  const listItem = document.createElement('li');
  listItem.innerText = `${place.name}: $${defaultPrice}`;
  stopList.appendChild(listItem);
  
  // Remove search markers - use setMap(null) for google.maps.Marker
  searchMarkers.forEach(m => {
    if (m.setMap) {
      m.setMap(null);
    } else {
      m.map = null;
    }
  });
  searchMarkers = [];
  
  showMessage(`✅ Added "${place.name}" as a stop!`, false);
}

// Make functions globally accessible
window.addPlaceAsStopFromInfoWindow = function(name, lat, lng) {
  const place = {
    name: name,
    geometry: { location: new google.maps.LatLng(lat, lng) }
  };
  addPlaceAsStop(place);
};

// AI-ASSISTED: GitHub Copilot - Global function for info window button to call removeStop
window.removeStopFromMap = async function(markerIndex, stopId) {
  if (markerIndex < 0 || markerIndex >= window.tripMarkers.length) {
    console.error('Invalid marker index:', markerIndex);
    return;
  }
  
  // Call the existing removeStop function
  await removeStop(markerIndex, stopId);
};

// Event listeners for filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    const placeType = e.target.dataset.type;
    if (placeType) {
      // Highlight active filter
      document.querySelectorAll('.filter-btn').forEach(b => {
        b.style.background = 'white';
        b.style.color = 'black';
      });
      e.target.style.background = '#4285F4';
      e.target.style.color = 'white';
      
      filterPlacesByType(placeType);
    }
  });
});

// Clear filters button
document.getElementById('clear-filters').addEventListener('click', clearFilters);

// Initialize SearchBox when map loads
setTimeout(() => {
  initSearchBox();
}, 1000);

//Initalizes map & trip
initMap();