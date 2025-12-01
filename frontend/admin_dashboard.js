import {API_URL, showMessage} from './utils.js';

let allUsers = [];

function checkAdminAccess() {
    const isAdmin = localStorage.getItem('isAdmin');
    if (!isAdmin) {
        showMessage('Unauthorized access.', true);
        setTimeout(() => {
            window.location.href = 'login_page.html';
        }, 2000);
    }
}

async function loadUsers() {
    try {
        const response = await fetch(`${API_URL}/admin/users`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            showMessage('Failed to load users', true);
            return;
        }

        const data = await response.json();
        allUsers = data.users;
        displayUsers(allUsers);
    } catch (error) {
        showMessage('Error: ' + error.message, true);
    }
}

function displayUsers(users) {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '';

    if (users.length === 0) {
        usersList.innerHTML = '<div class="no-users">No users found</div>';
        return;
    }

    users.forEach(user => {
        const userCard = createUserCard(user);
        usersList.appendChild(userCard);
    });
}

function createUserCard(user) {
    const card = document.createElement('div');
    card.className = 'user-card';
    
    const headerHTML = `
        <div class="user-header">
            <div class="user-info">
                <h3>${escapeHtml(user.email)}</h3>
                <p class="user-email">ID: ${user.user_id}</p>
            </div>
            <div class="trip-count-badge">${user.trip_count} Trip${user.trip_count !== 1 ? 's' : ''}</div>
        </div>
    `;

    let tripsHTML = '<div class="trips-container">';
    
    if (user.trips.length === 0) {
        tripsHTML += '<div class="no-trips">No trips saved yet</div>';
    } else {
        user.trips.forEach(trip => {
            tripsHTML += createTripHTML(trip);
        });
    }
    
    tripsHTML += '</div>';

    card.innerHTML = headerHTML + tripsHTML;
    return card;
}

function createTripHTML(trip) {
    const createdDate = new Date(trip.created_at).toLocaleDateString();
    const totalTime = trip.stops.reduce((sum, stop) => sum + stop.time, 0);
    
    let stopsHTML = '';
    if (trip.stops.length > 0) {
        stopsHTML = `
            <div class="stops-list">
                <div class="stops-title">Stops (${trip.stops.length})</div>
                ${trip.stops.map((stop, index) => `
                    <div class="stop-item">
                        ${index + 1}. ${stop.type} - Lat: ${stop.latitude.toFixed(4)}, Lng: ${stop.longitude.toFixed(4)}
                        <span style="color: #999;"> | Cost: $${stop.cost.toFixed(2)} | Time: ${stop.time}min</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    return `
        <div class="trip-item">
            <div class="trip-header">
                <div>
                    <div class="trip-name">${escapeHtml(trip.name)}</div>
                    <div class="trip-date">Created: ${createdDate}</div>
                </div>
            </div>
            <div class="trip-description">${escapeHtml(trip.description)}</div>
            <div class="trip-details">
                <div class="detail-item">
                    <span class="detail-label">Total Cost:</span> $${trip.total_cost.toFixed(2)}
                </div>
                <div class="detail-item">
                    <span class="detail-label">Total Time:</span> ${totalTime} minutes
                </div>
                <div class="detail-item">
                    <span class="detail-label">Stops:</span> ${trip.stops.length}
                </div>
            </div>
            ${stopsHTML}
        </div>
    `;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function searchUsers(query) {
    const filtered = allUsers.filter(user => 
        user.email.toLowerCase().includes(query.toLowerCase())
    );
    displayUsers(filtered);
}

function sortUsers(sortBy) {
    let sorted = [...allUsers];
    
    if (sortBy === 'email') {
        sorted.sort((a, b) => a.email.localeCompare(b.email));
    } else if (sortBy === 'trips') {
        sorted.sort((a, b) => b.trip_count - a.trip_count);
    }
    
    displayUsers(sorted);
}

document.getElementById('searchInput').addEventListener('input', (e) => {
    searchUsers(e.target.value);
});

document.getElementById('sortSelect').addEventListener('change', (e) => {
    sortUsers(e.target.value);
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('isAdmin');
    showMessage('Logged out');
    setTimeout(() => {
        window.location.href = 'login_page.html';
    }, 1000);
});

checkAdminAccess();
loadUsers();
