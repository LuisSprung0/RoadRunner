async function initMap() {
  // Request needed libraries.
  const { Map, InfoWindow } = await google.maps.importLibrary("maps");
  const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");

  const bounds = new google.maps.LatLngBounds();

  // initialize services
  const geocoder = new google.maps.Geocoder();
  const service = new google.maps.DistanceMatrixService();

  const myLatlng = { lat: 38.9072, lng: -77.0369 }; // Washington, DC
  const map = new Map(document.getElementById("map"), { //Create the map with defaults
    zoom: 4,
    center: myLatlng,
    mapId: "mapId",
  });

  const markers = [];
  
  //Event listeners
  map.addListener("click", (event) => {
    const clickedLatLng = [event.latLng.lat().toFixed(4), event.latLng.lng().toFixed(4)];
    console.log("Clicked at " + clickedLatLng[0] + ", " + clickedLatLng[1]);

    const latText = document.getElementById("lat");
    const lngText = document.getElementById("lng");
    latText.innerText = clickedLatLng[0];
    lngText.innerText = clickedLatLng[1];

    if (markers.length <= 1) {
      const stopList = document.getElementById("stops-list");
      const newStop = document.createElement("li");
      newStop.innerText = `Stop at (${clickedLatLng[0]}, ${clickedLatLng[1]})`;
      stopList.appendChild(newStop);
      markers.push(placeMarkerAndPanTo(map, event.latLng));
      if (markers.length == 2) {
        getDistance(map, bounds, geocoder, service, markers[0], markers[1]);
      }
    } else {
      console.log("Maximum of two stops reached");  
    }
  });
}

function placeMarkerAndPanTo(map, latLng) {
  const pin = new google.maps.marker.PinElement({
    scale: 1.5,
  });
  const marker = new google.maps.marker.AdvancedMarkerElement({
    map: map,
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

  map.panTo(latLng);
  if (map.getZoom() < 8)
    map.setZoom(8);

  return marker;
}

function getDistance(map, bounds, geocoder, service, marker1, marker2) {
  //Request distance matrix
  const origin1 = marker1.position;
  const destination1 = marker2.position;
  const request = {
    origins: [origin1],
    destinations: [destination1],
    travelMode: google.maps.TravelMode.DRIVING,
    unitSystem: google.maps.UnitSystem.METRIC,
    avoidHighways: false,
    avoidTolls: false,
  };

  service.getDistanceMatrix(request).then((response) => {
    //Testing distance, remove in future
    const responseEl = response.rows[0].elements[0];
    document.getElementById("distance-time").innerText = responseEl.distance.text + ", " + responseEl.duration.text;
    document.getElementById("start-end").innerText = "From " + response.originAddresses[0] + " to " + response.destinationAddresses[0];
    return response;
  });
}

initMap();