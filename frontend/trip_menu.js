import {API_URL, showMessage} from './utils.js'

try {
    const user_id = localStorage.getItem('user_id');
    if (!user_id) {
        throw new Error("User not logged in");
    }

    const response = await fetch(`${API_URL}/trips/user/${user_id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();

    const tripList = document.getElementById('product-card-wrapper');
    if (response.ok) {
        data.trips.forEach(trip => {
            const tripDiv = createTripCard(trip); //Existing trips
            tripList.appendChild(tripDiv); 
        });
    } else {
        showMessage("Failed to fetch trips", true);
    }

    const newTripDiv = createNewTripCard(); // Card to create new trip at the end
    tripList.appendChild(newTripDiv); 
} catch (error) {
    showMessage("Error: " + error.message, true);
}

function createTripCard(trip) {
    const tripCard = document.createElement('div');
    tripCard.className = 'product-card';

    const tripImage = document.createElement('img');
    tripImage.className = 'product-card-image';
    if (trip.image_url === undefined || trip.image_url === null || trip.image_url === '')
        tripImage.src = 'https://mobirise.com/extensions/organicamp/assets/images/face5.jpg';
    else
        tripImage.src = trip.image_url;
    tripCard.appendChild(tripImage);

    const tripName = document.createElement('h1');
    tripName.className = 'product-name';
    tripName.innerText = trip.name || 'Trip Name';
    tripCard.appendChild(tripName);

    const tripDescription = document.createElement('p');
    tripDescription.className = 'product-description';
    tripDescription.innerText = trip.description || 'No description available.';
    tripCard.appendChild(tripDescription);

    const openButton = document.createElement('button');
    openButton.className = 'submit-button';
    openButton.innerText = 'Open Trip';
    tripCard.appendChild(openButton);

    //Maybe add a way to delete trips 
    openButton.addEventListener('click', () => navigateToMap(trip.trip_id), false);

    return tripCard;
}

function createNewTripCard() { //Allows user to create a new trip
    const tripCard = document.createElement('div');
    tripCard.className = 'product-card';

    const tripImage = document.createElement('img');
    tripImage.className = 'product-card-image';
    tripImage.src = 'images/Road Runner.png';
    tripCard.appendChild(tripImage);

    const tripName = document.createElement('h1');
    tripName.className = 'product-name';
    tripName.innerText = 'Create New Trip';
    tripCard.appendChild(tripName);

    const tripDescription = document.createElement('p');
    tripDescription.className = 'product-description';
    tripDescription.innerText = 'Create a new trip from stratch.';
    tripCard.appendChild(tripDescription);

    const openButton = document.createElement('button');
    openButton.className = 'submit-button';
    openButton.innerText = 'Create New Trip';
    tripCard.appendChild(openButton);

    //Maybe add a way to delete trips 
    openButton.addEventListener('click', () => navigateToMap(-1), false);

    return tripCard;
}

function navigateToMap(trip_id) {
    localStorage.setItem('current_trip_id', trip_id);
    window.location.href = "map.html";
}