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
    tripCard.id = `trip-card-${trip.id}`;

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

    // Button container for Open and Delete buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'button-container';

    const openButton = document.createElement('button');
    openButton.className = 'submit-button';
    openButton.innerText = 'Open Trip';
    openButton.addEventListener('click', () => navigateToMap(trip.id), false);
    buttonContainer.appendChild(openButton);

    const deleteButton = document.createElement('button');
    deleteButton.className = 'delete-button';
    deleteButton.innerHTML = '<i class="fas fa-trash"></i> Delete';
    deleteButton.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTrip(trip.id, trip.name);
    }, false);
    buttonContainer.appendChild(deleteButton);

    tripCard.appendChild(buttonContainer);

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

async function deleteTrip(tripId, tripName) {
    // Confirm before deleting
    const confirmed = confirm(`Are you sure you want to delete "${tripName}"?\n\nThis will permanently remove the trip and all its stops.`);
    
    if (!confirmed) return;
    
    try {
        const response = await fetch(`${API_URL}/trips/${tripId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            // Remove the card from the DOM
            const tripCard = document.getElementById(`trip-card-${tripId}`);
            if (tripCard) {
                tripCard.style.transition = 'all 0.3s ease';
                tripCard.style.opacity = '0';
                tripCard.style.transform = 'scale(0.8)';
                setTimeout(() => tripCard.remove(), 300);
            }
            showMessage(`Trip "${tripName}" deleted successfully`);
        } else {
            const data = await response.json();
            showMessage(`Failed to delete trip: ${data.error || 'Unknown error'}`, true);
        }
    } catch (error) {
        showMessage(`Error deleting trip: ${error.message}`, true);
    }
}