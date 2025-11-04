// API Configuration
const API_URL = 'http://localhost:5001/api';  // Simple relative path

// Show message helper
function showMessage(message, isError = false) {
    const msgBox = document.createElement('div');
    msgBox.textContent = message;
    msgBox.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background: ${isError ? '#ff4444' : '#44ff44'};
        color: white;
        border-radius: 5px;
        z-index: 1000;
    `;
    document.body.appendChild(msgBox);
    setTimeout(() => msgBox.remove(), 3000);
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
