// API Configuration
const API_BASE_URL = 'http://localhost:5001/api';

// Helper function: show messages
function showMessage(message, isError = false) {
    const msgBox = document.createElement('div');
    msgBox.textContent = message;
    msgBox.classList.add('msg-box');
    msgBox.classList.add(isError ? 'error' : 'success');
    document.body.appendChild(msgBox);
    setTimeout(() => msgBox.remove(), 3000);
}

// Helper function: get auth token from localStorage
function getAuthToken() {
    return localStorage.getItem('authToken');
}

// Helper function: save auth token to localStorage
function saveAuthToken(token) {
    localStorage.setItem('authToken', token);
}

// Helper function: remove auth token
function removeAuthToken() {
    localStorage.removeItem('authToken');
}

// Helper function: make API requests
async function apiRequest(endpoint, method = 'GET', data = null) {
    const options = {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    // Add authorization token if available
    const token = getAuthToken();
    if (token) {
        options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (data) {
        options.body = JSON.stringify(data);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(responseData.error || `Error: ${response.status}`);
        }

        return responseData;
    } catch (error) {
        throw error;
    }
}

// REGISTER
const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = registerForm.email.value.trim();
        const password = registerForm.password.value.trim();
        const confirmPassword = registerForm['confirm-password'].value.trim();

        if (password !== confirmPassword) {
            showMessage("Passwords don't match!", true);
            return;
        }

        try {
            const response = await apiRequest('/auth/register', 'POST', {
                email: email,
                password: password,
                confirm_password: confirmPassword
            });

            showMessage("Registration successful!");
            registerForm.reset();
        } catch (error) {
            showMessage("Error: " + error.message, true);
        }
    });
}

// LOGIN
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = loginForm.email.value.trim();
        const password = loginForm.password.value.trim();

        try {
            const response = await apiRequest('/auth/login', 'POST', {
                email: email,
                password: password
            });

            // Save the authentication token
            saveAuthToken(response.token);

            showMessage("Logged in successfully!");
            setTimeout(() => {
                window.location.href = "trip_menu.html";
            }, 1500);
        } catch (error) {
            showMessage("Login failed: " + error.message, true);
        }
    });
}

// Check if user is logged in (on page load)
document.addEventListener('DOMContentLoaded', async () => {
    const token = getAuthToken();
    
    // If on trip_menu page and user is not logged in, redirect to login
    if (window.location.href.includes('trip_menu.html') && !token) {
        window.location.href = "login_page.html";
    }
});

// Optional: Add logout functionality
async function logout() {
    try {
        await apiRequest('/auth/logout', 'POST');
        removeAuthToken();
        showMessage("Logged out successfully!");
        setTimeout(() => {
            window.location.href = "login_page.html";
        }, 1500);
    } catch (error) {
        showMessage("Error logging out: " + error.message, true);
        // Force logout anyway
        removeAuthToken();
        window.location.href = "login_page.html";
    }
}
