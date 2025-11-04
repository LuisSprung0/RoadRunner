import {API_URL, showMessage} from './utils.js';

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
            const response = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showMessage("Registration successful!");
                registerForm.reset();
            } else {
                showMessage(data.error || "Registration failed", true);
            }
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
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showMessage("Login successful!");
                localStorage.setItem('userEmail', data.user.email);
                setTimeout(() => {
                    window.location.href = "trip_menu.html";
                }, 1500);
            } else {
                showMessage(data.error || "Login failed", true);
            }
        } catch (error) {
            showMessage("Error: " + error.message, true);
        }
    });
}
