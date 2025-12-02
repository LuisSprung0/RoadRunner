import {API_URL, showMessage} from './utils.js';

const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        button.classList.add('active');
        const tabId = button.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
    });
});

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
                localStorage.setItem('user_id', data.user.id);
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

const adminLoginForm = document.getElementById('adminLoginForm');
if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = adminLoginForm.email.value.trim();
        const password = adminLoginForm.password.value.trim();
        
        try {
            const response = await fetch(`${API_URL}/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                showMessage("Admin login successful!");
                localStorage.setItem('isAdmin', 'true');
                setTimeout(() => {
                    window.location.href = "admin_dashboard.html";
                }, 1500);
            } else {
                showMessage(data.error || "Admin login failed", true);
            }
        } catch (error) {
            showMessage("Error: " + error.message, true);
        }
    });
}
