// assets/js/auth.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showRegisterLink = document.getElementById('showRegister');
    const showLoginLink = document.getElementById('showLogin');
    const registerSection = document.getElementById('registerSection');
    const authMessage = document.getElementById('auth-message'); // New line

    // Helper function to display auth messages
    function displayAuthMessage(message, isError = true) {
        if (authMessage) {
            authMessage.textContent = message;
            authMessage.classList.remove('hidden');
            if (isError) {
                authMessage.classList.remove('text-green-500');
                authMessage.classList.add('text-red-500');
            } else {
                authMessage.classList.remove('text-red-500');
                authMessage.classList.add('text-green-500');
            }
            setTimeout(() => {
                authMessage.classList.add('hidden');
                authMessage.textContent = '';
            }, 5000); // Hide after 5 seconds
        }
    }

    // Toggle between login and register forms
    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.closest('.bg-white').classList.add('hidden');
            registerSection.classList.remove('hidden');
        });
    }

    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            registerSection.classList.add('hidden');
            loginForm.closest('.bg-white').classList.remove('hidden');
        });
    }

    // Handle Login Form Submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                if (response.ok) {
                    displayAuthMessage('Login successful!', false); // Replaced alert
                    // Redirect or update UI
                    window.location.href = '/'; // Redirect to home page
                } else {
                    const errorData = await response.json();
                    displayAuthMessage(`Login failed: ${errorData.error || response.statusText}`); // Replaced alert
                }
            } catch (error) {
                console.error('Error during login:', error);
                displayAuthMessage('An unexpected error occurred during login.'); // Replaced alert
            }
        });
    }

    // Handle Register Form Submission
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                if (response.ok) {
                    displayAuthMessage('Registration successful! You can now log in.', false); // Replaced alert
                    // Optionally switch to login form
                    loginForm.closest('.bg-white').classList.remove('hidden');
                    registerSection.classList.add('hidden');
                } else {
                    const errorData = await response.json();
                    displayAuthMessage(`Registration failed: ${errorData.error || response.statusText}`); // Replaced alert
                }
            } catch (error) {
                console.error('Error during registration:', error);
                displayAuthMessage('An unexpected error occurred during registration.'); // Replaced alert
            }
        });
    }
});