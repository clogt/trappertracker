// assets/js/ui.js

document.addEventListener('DOMContentLoaded', () => {
    const reportType = document.getElementById('reportType');
    const formDetailsContainer = document.getElementById('form-details');
    const reportForm = document.getElementById('reportForm');
    const locationInput = document.getElementById('location');
    const themeToggle = document.getElementById('toggle-theme');
    const reportErrorMessage = document.getElementById('report-error-message'); // New line

    // Check user role and show dangerous animals filter for enforcement users
    const userRole = localStorage.getItem('userRole');
    const dangerousAnimalsToggle = document.getElementById('dangerous-animals-toggle');
    if (dangerousAnimalsToggle && (userRole === 'enforcement' || userRole === 'admin')) {
        dangerousAnimalsToggle.classList.remove('hidden');
    }

    // Check if user is logged in and toggle logout/login buttons
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutBtnMobile = document.getElementById('logoutBtnMobile');
    const loginLink = document.getElementById('loginLink');
    const loginLinkMobile = document.getElementById('loginLinkMobile');

    if (userRole) {
        // User is logged in - show logout buttons, hide login links
        if (logoutBtn) logoutBtn.classList.remove('hidden');
        if (logoutBtnMobile) logoutBtnMobile.classList.remove('hidden');
        if (loginLink) loginLink.classList.add('hidden');
        if (loginLinkMobile) loginLinkMobile.classList.add('hidden');
    }

    // Logout functionality
    function handleLogout() {
        // Clear localStorage
        localStorage.removeItem('userRole');
        // Clear cookies
        document.cookie = 'auth_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        // Redirect to home
        window.location.href = '/';
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    if (logoutBtnMobile) {
        logoutBtnMobile.addEventListener('click', handleLogout);
    }

    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuBtn && mobileMenu) {
        // Toggle menu on button click
        mobileMenuBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            const isShowing = mobileMenu.classList.contains('show');
            if (isShowing) {
                mobileMenu.classList.remove('show');
            } else {
                mobileMenu.classList.add('show');
            }
        });

        // Close menu when clicking menu links
        const menuLinks = mobileMenu.querySelectorAll('a');
        menuLinks.forEach(link => {
            link.addEventListener('click', () => {
                mobileMenu.classList.remove('show');
            });
        });

        // Close menu on window resize to desktop size
        window.addEventListener('resize', () => {
            if (window.innerWidth >= 768) { // md breakpoint
                mobileMenu.classList.remove('show');
            }
        });
    }

    // Helper function to display error messages
    function displayErrorMessage(message) {
        if (reportErrorMessage) {
            reportErrorMessage.textContent = message;
            reportErrorMessage.classList.remove('hidden');
            setTimeout(() => {
                reportErrorMessage.classList.add('hidden');
                reportErrorMessage.textContent = '';
            }, 5000); // Hide after 5 seconds
        }
    }

    // Geocoding elements
    const geocodeButton = document.getElementById('geocode-button');
    const cityInput = document.getElementById('city');
    const stateInput = document.getElementById('state');
    const zipInput = document.getElementById('zip');
    const streetInput = document.getElementById('street');

    // Address autocomplete functionality
    let autocompleteTimeout;
    let lastAutocompleteRequest = 0;
    const AUTOCOMPLETE_DEBOUNCE = 300; // ms
    const NOMINATIM_RATE_LIMIT = 1000; // 1 req/sec

    // Create autocomplete dropdown containers
    function createAutocompleteDropdown(inputElement) {
        const existingDropdown = inputElement.parentElement.querySelector('.autocomplete-dropdown');
        if (existingDropdown) return existingDropdown;

        const dropdown = document.createElement('div');
        dropdown.className = 'autocomplete-dropdown hidden absolute z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg mt-1 max-h-48 overflow-y-auto w-full';
        dropdown.style.position = 'absolute';
        dropdown.style.top = '100%';
        dropdown.style.left = '0';
        dropdown.style.right = '0';
        inputElement.parentElement.style.position = 'relative';
        inputElement.parentElement.appendChild(dropdown);
        return dropdown;
    }

    // Debounced autocomplete search
    async function searchAddress(query, inputElement, dropdown) {
        if (!query || query.length < 3) {
            dropdown.classList.add('hidden');
            dropdown.innerHTML = '';
            return;
        }

        clearTimeout(autocompleteTimeout);

        autocompleteTimeout = setTimeout(async () => {
            // Respect rate limiting
            const now = Date.now();
            const timeSinceLastRequest = now - lastAutocompleteRequest;
            if (timeSinceLastRequest < NOMINATIM_RATE_LIMIT) {
                await new Promise(resolve => setTimeout(resolve, NOMINATIM_RATE_LIMIT - timeSinceLastRequest));
            }
            lastAutocompleteRequest = Date.now();

            try {
                const response = await fetch(
                    `https://nominatim.openstreetmap.org/search?` +
                    `q=${encodeURIComponent(query)}&` +
                    `format=json&` +
                    `limit=5&` +
                    `countrycodes=us&` +
                    `addressdetails=1`,
                    {
                        headers: {
                            'User-Agent': 'TrapperTracker/1.0'
                        }
                    }
                );

                if (!response.ok) throw new Error('Autocomplete unavailable');

                const data = await response.json();

                if (data && data.length > 0) {
                    dropdown.innerHTML = '';
                    data.forEach(place => {
                        const item = document.createElement('div');
                        item.className = 'px-4 py-2 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900 text-gray-900 dark:text-gray-100 text-sm';
                        item.textContent = place.display_name;
                        item.addEventListener('click', () => {
                            // Parse address components
                            const addr = place.address;
                            if (addr) {
                                if (streetInput && (addr.road || addr.house_number)) {
                                    const street = [addr.house_number, addr.road].filter(Boolean).join(' ');
                                    streetInput.value = street;
                                }
                                if (cityInput && addr.city) cityInput.value = addr.city;
                                if (cityInput && !addr.city && addr.town) cityInput.value = addr.town;
                                if (cityInput && !addr.city && !addr.town && addr.village) cityInput.value = addr.village;
                                if (stateInput && addr.state) stateInput.value = addr.state;
                                if (zipInput && addr.postcode) zipInput.value = addr.postcode;

                                // Also set coordinates
                                if (locationInput) {
                                    locationInput.value = `${place.lat}, ${place.lon}`;
                                    if (window.updateMapMarker) {
                                        window.updateMapMarker(parseFloat(place.lat), parseFloat(place.lon));
                                    }
                                }
                            }
                            dropdown.classList.add('hidden');
                            dropdown.innerHTML = '';
                        });
                        dropdown.appendChild(item);
                    });
                    dropdown.classList.remove('hidden');
                } else {
                    dropdown.classList.add('hidden');
                    dropdown.innerHTML = '';
                }
            } catch (error) {
                console.error('Autocomplete error:', error);
                dropdown.classList.add('hidden');
                dropdown.innerHTML = '';
            }
        }, AUTOCOMPLETE_DEBOUNCE);
    }

    // Setup autocomplete for street input
    if (streetInput) {
        const streetDropdown = createAutocompleteDropdown(streetInput);
        streetInput.addEventListener('input', (e) => {
            const query = `${e.target.value} ${cityInput?.value || ''} ${stateInput?.value || ''}`.trim();
            searchAddress(query, streetInput, streetDropdown);
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!streetInput.contains(e.target) && !streetDropdown.contains(e.target)) {
                streetDropdown.classList.add('hidden');
            }
        });
    }

    // Setup autocomplete for city input
    if (cityInput) {
        const cityDropdown = createAutocompleteDropdown(cityInput);
        cityInput.addEventListener('input', (e) => {
            const query = `${e.target.value} ${stateInput?.value || ''}`.trim();
            searchAddress(query, cityInput, cityDropdown);
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!cityInput.contains(e.target) && !cityDropdown.contains(e.target)) {
                cityDropdown.classList.add('hidden');
            }
        });
    }

    // --- Dynamic Form Templates ---
    const formTemplates = {
        dangerZone: `
            <div>
                <label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Description of Danger</label>
                <textarea id="description" rows="3" class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" placeholder="e.g., Red truck, man with net, seen near park" required></textarea>
            </div>
        `,
        lostPet: `
            <div class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label for="petName" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Pet Name</label>
                        <input type="text" id="petName" class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" required>
                    </div>
                    <div>
                        <label for="speciesBreed" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Species/Breed</label>
                        <input type="text" id="speciesBreed" class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" placeholder="e.g., Dog, Golden Retriever">
                    </div>
                    <div>
                        <label for="ownerContact" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Your Contact Info (Email/Phone)</label>
                        <input type="text" id="ownerContact" class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" required>
                    </div>
                    <div>
                        <label for="photoUpload" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Upload Photo (Optional)</label>
                        <input type="file" id="photoUpload" accept="image/*" class="mt-1 block w-full text-gray-900 dark:text-gray-200">
                        <input type="hidden" id="photoUrl"> <!-- Hidden field to store the uploaded URL -->
                    </div>
                </div>
                <div>
                    <label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Description (e.g., color, collar, last seen wearing)</label>
                    <textarea id="description" rows="3" class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"></textarea>
                </div>
            </div>
        `,
        foundPet: `
             <div class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label for="speciesBreed" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Species/Breed Found</label>
                        <input type="text" id="speciesBreed" class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" placeholder="e.g., Cat, Siamese">
                    </div>
                    <div>
                        <label for="contactInfo" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Your Contact Info (Email/Phone)</label>
                        <input type="text" id="contactInfo" class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" required>
                    </div>
                    <div>
                        <label for="photoUpload" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Upload Photo (Optional)</label>
                        <input type="file" id="photoUpload" accept="image/*" class="mt-1 block w-full text-gray-900 dark:text-gray-200">
                        <input type="hidden" id="photoUrl"> <!-- Hidden field to store the uploaded URL -->
                    </div>
                </div>
                <div>
                    <label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Description (e.g., location found, temperament, collar)</label>
                    <textarea id="description" rows="3" class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200"></textarea>
                </div>
            </div>
        `,
        dangerousAnimal: `
            <div class="space-y-4">
                <div>
                    <label for="animalType" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Animal Type</label>
                    <select id="animalType" class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200">
                        <option value="wild">Wild Animal</option>
                        <option value="domestic">Domestic Animal</option>
                    </select>
                </div>
                <div>
                    <label for="description" class="block text-sm font-medium text-gray-700 dark:text-gray-200">Description of Animal and Behavior</label>
                    <textarea id="description" rows="3" class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-200" required></textarea>
                </div>
            </div>
        `
    };

    function renderFormDetails(type) {
        if (formDetailsContainer) {
            formDetailsContainer.innerHTML = formTemplates[type] || '';
        }
    }

    // Handle report type tabs
    const reportTabs = document.querySelectorAll('.report-tab');
    reportTabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            // Remove active class from all tabs
            reportTabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            this.classList.add('active');
            // Update hidden input value
            const reportTypeValue = this.getAttribute('data-report-type');
            if (reportType) {
                reportType.value = reportTypeValue;
                renderFormDetails(reportTypeValue);

                // Reset submit button when switching tabs
                const submitButton = reportForm?.querySelector('button[type="submit"]');
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit Report';
                }
            }
        });
    });

    // Handle dropdown change (legacy support if dropdown is still used)
    if (reportType) {
        reportType.addEventListener('change', (event) => {
            renderFormDetails(event.target.value);
        });
        // Initial render on page load
        renderFormDetails(reportType.value);
    }

    if (geocodeButton) {
        geocodeButton.addEventListener('click', async () => {
            const street = streetInput.value;
            const city = cityInput.value;
            const state = stateInput.value;
            const zip = zipInput.value;

            // Build address string (prioritize zip for better accuracy)
            let address = '';
            if (zip) {
                address = zip; // Start with zip for most accurate results
                if (city || state) {
                    address = `${street ? street + ', ' : ''}${city ? city + ', ' : ''}${state ? state + ' ' : ''}${zip}`;
                }
            } else if (city && state) {
                address = `${street ? street + ', ' : ''}${city}, ${state}`;
            } else {
                displayErrorMessage('Please enter at least City and State, or a Zip Code.');
                return;
            }

            if (address.trim()) {
                geocodeButton.disabled = true;
                geocodeButton.textContent = '🔄 Finding location...';

                try {
                    // Add delay to respect Nominatim rate limits (1 req/sec)
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/search?` +
                        `q=${encodeURIComponent(address)}&` +
                        `format=json&` +
                        `limit=1&` +
                        `countrycodes=us`, // Limit to US for better accuracy
                        {
                            headers: {
                                'User-Agent': 'TrapperTracker/1.0'
                            }
                        }
                    );

                    if (!response.ok) {
                        throw new Error('Geocoding service unavailable');
                    }

                    const data = await response.json();
                    if (data && data.length > 0) {
                        locationInput.value = `${data[0].lat}, ${data[0].lon}`;
                        // Update map marker if available
                        if (window.updateMapMarker) {
                            window.updateMapMarker(parseFloat(data[0].lat), parseFloat(data[0].lon));
                        }
                        displayErrorMessage('✓ Location found!');
                    } else {
                        displayErrorMessage('Address not found. Try entering just City, State, Zip or click on the map.');
                    }
                } catch (error) {
                    console.error('Error geocoding address:', error);
                    displayErrorMessage('Geocoding failed. Please click on the map instead or try again in a moment.');
                } finally {
                    geocodeButton.disabled = false;
                    geocodeButton.textContent = '🌍 Find Location from Address';
                }
            }
        });
    }

    // --- Form Submission Logic ---
    if (reportForm) {
        reportForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const submitButton = reportForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Submitting...';
            }

            const type = reportType.value;
            const [lat, lng] = locationInput.value.split(',').map(s => parseFloat(s.trim()));

            if (isNaN(lat) || isNaN(lng)) {
                displayErrorMessage('Please click on the map to set a location for the report.');
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit Report';
                }
                return;
            }

            const reportData = {
                report_type: type,
                latitude: lat,
                longitude: lng,
                description: document.getElementById('description')?.value || ''
            };

            // Helper function to upload image
            async function uploadImage(file) {
                const formData = new FormData();
                formData.append('image', file);

                try {
                    const response = await fetch('/api/upload-image', {
                        method: 'POST',
                        body: formData,
                    });

                    if (response.ok) {
                        const result = await response.json();
                        return result.url; // Assuming the API returns { url: '...' }
                    } else {
                        const error = await response.json();
                        displayErrorMessage(`Image upload failed: ${error.error}`);
                        return null;
                    }
                } catch (error) {
                    console.error('Error uploading image:', error);
                    displayErrorMessage('An unexpected error occurred during image upload.');
                    return null;
                }
            }

            // Gather data from the correct dynamic form
            if (type === 'lostPet' || type === 'foundPet') {
                const photoUploadInput = document.getElementById('photoUpload');
                if (photoUploadInput && photoUploadInput.files && photoUploadInput.files.length > 0) {
                    const imageUrl = await uploadImage(photoUploadInput.files[0]);
                    if (imageUrl) {
                        reportData.photo_url = imageUrl;
                    } else {
                        // If upload failed, reset button and prevent submission
                        if (submitButton) {
                            submitButton.disabled = false;
                            submitButton.textContent = 'Submit Report';
                        }
                        return;
                    }
                } else {
                    reportData.photo_url = ''; // No file uploaded
                }
            }

            if (type === 'lostPet') {
                reportData.pet_name = document.getElementById('petName').value;
                reportData.species_breed = document.getElementById('speciesBreed').value;
                reportData.owner_contact_email = document.getElementById('ownerContact').value;
            } else if (type === 'foundPet') {
                reportData.species_breed = document.getElementById('speciesBreed').value;
                reportData.contact_info = document.getElementById('contactInfo').value;
            } else if (type === 'dangerousAnimal') {
                reportData.animal_type = document.getElementById('animalType').value;
            }

            try {
                const response = await fetch('/api/report', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(reportData)
                });

                if (response.ok) {
                    displaySuccessMessage('✓ Report submitted successfully!');
                    reportForm.reset(); // Clear the form
                    renderFormDetails(reportType.value); // Re-render dynamic part
                    locationInput.value = ''; // Clear location input
                    if (window.fetchMapData) {
                        window.fetchMapData(); // Refresh map data
                    }
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.textContent = 'Submit Report';
                    }
                } else if (response.status === 401) {
                    displayErrorMessage('You must be logged in to submit reports. Please login first.');
                    setTimeout(() => {
                        window.location.href = '/login.html';
                    }, 2000);
                } else {
                    let errorMessage = 'Error submitting report';
                    try {
                        const error = await response.json();
                        errorMessage = error.error || error.message || errorMessage;
                    } catch {
                        errorMessage = await response.text() || errorMessage;
                    }
                    displayErrorMessage(errorMessage);
                    if (submitButton) {
                        submitButton.disabled = false;
                        submitButton.textContent = 'Submit Report';
                    }
                }
            } catch (error) {
                console.error('Error submitting report:', error);
                displayErrorMessage('Network error. Please try again.');
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit Report';
                }
            }
        });
    }

    // Helper function to display success messages
    const reportSuccessMessage = document.getElementById('report-success-message');
    function displaySuccessMessage(message) {
        if (reportSuccessMessage) {
            reportSuccessMessage.textContent = message;
            reportSuccessMessage.classList.remove('hidden');
            setTimeout(() => {
                reportSuccessMessage.classList.add('hidden');
                reportSuccessMessage.textContent = '';
            }, 5000); // Hide after 5 seconds
        }
    }

    // --- Existing Logic to Keep ---

    // Theme toggle logic
    const applyTheme = (isDark) => {
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    // Default to light mode if no preference saved
    const savedTheme = localStorage.getItem('theme');
    const isDarkMode = savedTheme === 'dark';

    applyTheme(isDarkMode);
    if (themeToggle) {
        themeToggle.checked = isDarkMode;
    }

    if (themeToggle) {
        themeToggle.addEventListener('change', (event) => {
            const isDark = event.target.checked;
            applyTheme(isDark);
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }

    // Error Report Form Logic
    const errorReportForm = document.getElementById('errorReportForm');
    if (errorReportForm) {
        errorReportForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const descriptionInput = document.getElementById('errorDescription');
            const description = descriptionInput.value.trim();

            if (!description) {
                displayErrorMessage('Please enter your feedback.');
                return;
            }

            const submitButton = errorReportForm.querySelector('button[type="submit"]');
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'Submitting...';
            }

            try {
                const response = await fetch('/api/error-report', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        description: description,
                        user_agent: navigator.userAgent,
                        page_url: window.location.href
                    })
                });

                if (response.ok) {
                    displaySuccessMessage('✓ Thank you! Your feedback has been submitted.');
                    descriptionInput.value = '';
                } else {
                    const errorData = await response.json();
                    displayErrorMessage(errorData.error || 'Failed to submit feedback. Please try again.');
                }
            } catch (error) {
                console.error('Error submitting feedback:', error);
                displayErrorMessage('Network error. Please try again.');
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = 'Submit Feedback';
                }
            }
        });
    }

    // Advanced Filter Modal Logic
    const advancedFilterBtn = document.getElementById('advanced-filter-btn');
    const advancedFilterModal = document.getElementById('advanced-filter-modal');
    const applyAdvancedFilterBtn = document.getElementById('apply-advanced-filter-btn');
    const closeAdvancedFilterBtn = document.getElementById('close-advanced-filter-btn');
    const closeAdvancedFilterXBtn = document.getElementById('close-advanced-filter-x-btn'); // New line
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');

    if (advancedFilterBtn) {
        advancedFilterBtn.addEventListener('click', () => {
            advancedFilterModal.classList.remove('hidden');
        });
    }

    if (closeAdvancedFilterBtn) {
        closeAdvancedFilterBtn.addEventListener('click', () => {
            advancedFilterModal.classList.add('hidden');
        });
    }

    if (closeAdvancedFilterXBtn) { // New block for the X button
        closeAdvancedFilterXBtn.addEventListener('click', () => {
            advancedFilterModal.classList.add('hidden');
        });
    }

    if (applyAdvancedFilterBtn) {
        applyAdvancedFilterBtn.addEventListener('click', () => {
            const startDate = startDateInput.value;
            const endDate = endDateInput.value;

            if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
                displayErrorMessage('Start date cannot be after end date.'); // Replaced alert
                return;
            }

            if (window.fetchMapData) {
                window.fetchMapData(startDate, endDate);
            }

            advancedFilterModal.classList.add('hidden');
        });
    }
});
