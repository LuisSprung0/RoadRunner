import {API_URL} from './utils.js'
// Request needed libraries.
const { Map, InfoWindow} = await google.maps.importLibrary("maps");
const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");
const { encoding, Polyline } = await google.maps.importLibrary("geometry");
const bounds = new google.maps.LatLngBounds();


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

  if (window.trip) {
    initializeMarkersFromTrip(window.trip);
    window.polyline = await drawRoute();
  }
  
  //Event listeners
  window.map.addListener("click", async (event) => {
    //following code from ChatGPT to debug information not properly displaying
    // Add marker first
    const marker = placeMarker(event.latLng);

    // Fetch price for this stop
    const price = 0; //await fetchStopPrice(lat, lng);

    // Attach price to marker object for saveTripToBackend()
    marker.stopPrice = price;

    window.tripMarkers.push(marker);

    // Update stop list UI
    updateStopListUI();
    panTo(event.latLng);

    if (window.tripMarkers.length >= 2) {
      if (window.polyline) {
        window.polyline.setMap(null);
        window.polyline = null;
      }
      window.polyline = await drawRoute();
    }
  });
}

function updateStopListUI() { //based off window.tripMarkers
  const stopList = document.getElementById("stops-list");
  stopList.innerHTML = ''; 

  for (const marker of window.tripMarkers) {
    const lat = marker.position.lat;
    const lng = marker.position.lng;
    const price = marker.stopPrice;

    const newStop = document.createElement("li");
    newStop.innerText = price !== null
      ? `Stop at (${lat.toFixed(2)}, ${lng.toFixed(2)}): $${price}`
      : `Stop at (${lat.toFixed(2)}, ${lng.toFixed(2)}) (price unavailable)`;
    stopList.appendChild(newStop);
  }
}

function updateEstimates(time, distance) {
  //Updates time and distance estimates in the UI
  const timeEl = document.getElementById("time");
  const distanceEl = document.getElementById("distance");

  let hours = Math.floor(time / 3600);
  let mins = Math.floor(time / 60) % 60;

  let miles = (distance*0.000621371).toFixed(1); //convert meters to miles

  timeEl.innerText = hours != 0 ? `${hours} hours & ${mins} mins` : `${mins} mins`;
  distanceEl.innerText = `${miles} miles`;
}

async function fetchDirections() {
  if (window.tripMarkers.length < 2) {
    updateEstimates(0, 0);
    return null
  };

  try {
  const response = await fetch(`${API_URL}/maps/directions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      origin: { //Could just be the address if you have it
        latitude: window.tripMarkers[0].position.lat,
        longitude: window.tripMarkers[0].position.lng
      },
      destination: {
        latitude: window.tripMarkers[window.tripMarkers.length-1].position.lat,
        longitude: window.tripMarkers[window.tripMarkers.length-1].position.lng
      },
      waypoints: window.tripMarkers.slice(1, -1).map(marker => ({
        latitude: marker.position.lat,
        longitude: marker.position.lng
        })),
        mode: 'driving',
    })
  });

  const data = await response.json();
  if (response.ok) {
      return data['directions'];
    } else {
      throw new Error(data.error || 'Failed to fetch directions');
    }
  } catch (error) {
    if (data.error == 'Unroutable location')
      console.error("One or more locations are unroutable. Please adjust your markers.");
    else
      console.error("Failed to fetch directions:", data.error);
  }
}

async function drawRoute(data=null) { //Draws the route for the current markers
  if (data === null)
    data = await fetchDirections();

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

    return polyline;
}

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

  marker.addListener('click', ({ domEvent, latLng }) => {
    const infoWindow = new google.maps.InfoWindow();
    infoWindow.close();
    infoWindow.setContent(marker.title);
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

async function initializeMarkersFromTrip() {
  if (!window.trip) return;

  const trip = window.trip;
  const stopList = document.getElementById("stops-list");
  trip.stops.forEach(stop => {
    const newStop = document.createElement("li");
    newStop.innerText = `Stop at (${stop.location[0]}, ${stop.location[1]})`;
    stopList.appendChild(newStop);

    const latLng = new google.maps.LatLng(stop.location[0], stop.location[1]);
    window.tripMarkers.push(placeMarker(latLng));
  });
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

      if (response.ok)
        return data.trip;
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

initMap();