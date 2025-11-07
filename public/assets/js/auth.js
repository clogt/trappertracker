// assets/js/auth.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showRegisterLink = document.getElementById('showRegister');
    const showLoginLink = document.getElementById('showLogin');
    const registerSection = document.getElementById('registerSection');
    const authMessage = document.getElementById('auth-message');
    const themeToggle = document.getElementById('toggle-theme-login');

    // Theme toggle for login page
    const applyTheme = (isDark) => {
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    const savedTheme = localStorage.getItem('theme');
    const isDarkMode = savedTheme === 'dark';
    applyTheme(isDarkMode);
    if (themeToggle) {
        themeToggle.checked = isDarkMode;
        themeToggle.addEventListener('change', (event) => {
            const isDark = event.target.checked;
            applyTheme(isDark);
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }

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

            // Get Turnstile token
            const turnstileResponse = turnstile.getResponse(document.getElementById('login-turnstile'));
            if (!turnstileResponse) {
                displayAuthMessage('Please complete the CAPTCHA verification.');
                return;
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

            // Get Turnstile token
            const turnstileResponse = turnstile.getResponse(document.getElementById('register-turnstile'));
            if (!turnstileResponse) {
                displayAuthMessage('Please complete the CAPTCHA verification.');
                return;
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
});