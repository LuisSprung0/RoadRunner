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

  //following code from ChatGPT to debug information not properly displaying
  async function fetchStopPrice(lat, lng) {
    try {
      const response = await fetch(`${API_URL}/maps/stop-price`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lng })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to get price");

      return data.price;
    } catch (e) {
      console.error("Price fetch failed:", e);
      return null;
    }
  }


  // Store markers globally so we can access them from saveTripToBackend
  window.trip = await fetchUserTrip(); //So we are not constantly fetching the trip (If there is a preexisting trip)
  window.tripMarkers = [];
  let polyline = null;

  if (window.trip) {
    initializeMarkersFromTrip(window.trip);
    drawRoute();
  }
  
  //Event listeners
  window.map.addListener("click", async (event) => {
    //PURELY FOR TESTING PURPOSES, TO BE REMOVED LATER
    const clickedLatLng = [event.latLng.lat().toFixed(4), event.latLng.lng().toFixed(4)];
    console.log("Clicked at " + clickedLatLng[0] + ", " + clickedLatLng[1]);

    const latText = document.getElementById("lat");
    const lngText = document.getElementById("lng");
    latText.innerText = clickedLatLng[0];
    lngText.innerText = clickedLatLng[1];

    //following code from ChatGPT to debug information not properly displaying
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();

    // Add marker first
    const marker = placeMarker(event.latLng);
    window.tripMarkers.push(marker);

    // Fetch price for this stop
    const price = 0;//await fetchStopPrice(lat, lng);

    // Update stop list UI
    const stopList = document.getElementById("stops-list");
    const newStop = document.createElement("li");
    newStop.innerText = price !== null
      ? `Stop at (${lat.toFixed(4)}, ${lng.toFixed(4)}): $${price}`
      : `Stop at (${lat.toFixed(4)}, ${lng.toFixed(4)}) (price unavailable)`;
    stopList.appendChild(newStop);

    // Attach price to marker object for saveTripToBackend()
    marker.stopPrice = price;

    panTo(event.latLng);

    if (window.tripMarkers.length >= 2) {
      if (polyline) 
        polyline.map = null; //Remove old polyline
      polyline = drawRoute();
    }
  });
}

async function drawRoute() { //Draws the route for the current markers
  if (window.tripMarkers.length < 2) return null;

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
      }))
    })
  });

  const data = await response.json();

  if (response.ok) {
    const encoded = data['directions']['polyline'];
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
    return polyline;
  } else {
    console.error("Failed to fetch directions:", data.error);
  }

  return null;
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
    const { target } = domEvent;
    infoWindow.close();
    infoWindow.setContent(marker.title);
    infoWindow.open(marker.map, marker);
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