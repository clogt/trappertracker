// assets/js/auth.js

// Wait for both DOM and Turnstile to be ready
function initAuth() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showRegisterLink = document.getElementById('showRegister');
    const showLoginLink = document.getElementById('showLogin');
    const registerSection = document.getElementById('registerSection');
    const authMessage = document.getElementById('auth-message');

    console.log('Auth.js initialized');
    console.log('Turnstile available:', typeof turnstile !== 'undefined');

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
            const loginButton = document.getElementById('loginButton');

            // Get Turnstile token (with fallback)
            let turnstileResponse = 'test-token'; // Default fallback
            try {
                if (typeof turnstile !== 'undefined') {
                    const widget = document.getElementById('login-turnstile');
                    if (widget) {
                        const token = turnstile.getResponse(widget);
                        if (token) {
                            turnstileResponse = token;
                            console.log('Turnstile token obtained successfully');
                        } else {
                            console.warn('Turnstile token empty, using fallback');
                        }
                    } else {
                        console.warn('Turnstile widget not found');
                    }
                } else {
                    console.warn('Turnstile API not loaded');
                }
            } catch (error) {
                console.error('Turnstile error:', error);
            }

            loginButton.disabled = true;
            loginButton.textContent = 'Logging in...';

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, turnstileToken: turnstileResponse })
                });

                if (response.ok) {
                    const data = await response.json();
                    // Store user role in localStorage
                    if (data.role) {
                        localStorage.setItem('userRole', data.role);
                    }
                    displayAuthMessage('✓ Login successful!', false);
                    setTimeout(() => {
                        window.location.href = '/';
                    }, 1000);
                } else {
                    let errorMessage = 'Login failed';
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.error || errorData.message || errorMessage;
                    } catch {
                        errorMessage = await response.text() || response.statusText;
                    }
                    displayAuthMessage(errorMessage);
                    loginButton.disabled = false;
                    loginButton.textContent = 'Login';
                }
            } catch (error) {
                console.error('Error during login:', error);
                displayAuthMessage('Network error. Please try again.');
                loginButton.disabled = false;
                loginButton.textContent = 'Login';
            }
        });
    }

    // Handle Register Form Submission
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
            const registerButton = document.getElementById('registerButton');

            // Check if passwords match
            if (password !== passwordConfirm) {
                displayAuthMessage('Passwords do not match!');
                return;
            }

            // Get Turnstile token (with fallback)
            let turnstileResponse = 'test-token'; // Default fallback
            try {
                if (typeof turnstile !== 'undefined') {
                    const widget = document.getElementById('register-turnstile');
                    if (widget) {
                        const token = turnstile.getResponse(widget);
                        if (token) {
                            turnstileResponse = token;
                            console.log('Turnstile token obtained successfully');
                        } else {
                            console.warn('Turnstile token empty, using fallback');
                        }
                    } else {
                        console.warn('Turnstile widget not found');
                    }
                } else {
                    console.warn('Turnstile API not loaded');
                }
            } catch (error) {
                console.error('Turnstile error:', error);
            }

            registerButton.disabled = true;
            registerButton.textContent = 'Registering...';

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, turnstileToken: turnstileResponse })
                });

                if (response.ok) {
                    displayAuthMessage('✓ Registration successful! You can now log in.', false);
                    setTimeout(() => {
                        loginForm.closest('.bg-white').classList.remove('hidden');
                        registerSection.classList.add('hidden');
                        registerButton.disabled = false;
                        registerButton.textContent = 'Register';
                    }, 2000);
                } else {
                    let errorMessage = 'Registration failed';
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.error || errorData.message || errorMessage;
                    } catch {
                        errorMessage = await response.text() || response.statusText;
                    }
                    displayAuthMessage(errorMessage);
                    registerButton.disabled = false;
                    registerButton.textContent = 'Register';
                }
            } catch (error) {
                console.error('Error during registration:', error);
                displayAuthMessage('Network error. Please try again.');
                registerButton.disabled = false;
                registerButton.textContent = 'Register';
            }
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initAuth);