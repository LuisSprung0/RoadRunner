// Initialize Supabase
const supabaseUrl = 'https://edikutufebdiqnihbkgv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkaWt1dHVmZWJkaXFuaWhia2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE0NDMwMTIsImV4cCI6MjA3NzAxOTAxMn0.ZBbJjfkN2QZyzsGvFEyMziFQruK31ldaw1czL-EOd7o';
const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Helper function: show messages
function showMessage(message, isError = false) {
    const msgBox = document.createElement('div');
    msgBox.textContent = message;
    msgBox.classList.add('msg-box');
    msgBox.classList.add(isError ? 'error' : 'success');
    document.body.appendChild(msgBox);
    setTimeout(() => msgBox.remove(), 3000);
}

// REGISTER
const registerForm = document.getElementById('registerForm');
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = registerForm.email.value.trim();
    const password = registerForm.password.value.trim();
    const confirmPassword = registerForm['confirm-password'].value.trim();

    if (password !== confirmPassword) {
        showMessage("Passwords don't match!", true);
        return;
    }

    const { data, error } = await supabaseClient.auth.signUp({ email, password });

    if (error) {
        showMessage("Error signing up: " + error.message, true);
    } else {
        showMessage("Registration successful! Check your email to confirm.");
        registerForm.reset();
    }
});

// LOGIN
const loginForm = document.getElementById('loginForm');
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = loginForm.email.value.trim();
    const password = loginForm.password.value.trim();

    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });

    if (error) {
        showMessage("Login failed: " + error.message, true);
    } else {
        showMessage("Logged in successfully!");
        setTimeout(() => {
            window.location.href = "trip_menu.html";
        }, 1500);
    }
});