// assets/js/ui.js

document.addEventListener('DOMContentLoaded', () => {
    const reportType = document.getElementById('reportType');
    const formDetailsContainer = document.getElementById('form-details');
    const reportForm = document.getElementById('reportForm');
    const locationInput = document.getElementById('location');
    const themeToggle = document.getElementById('toggle-theme');
    const reportErrorMessage = document.getElementById('report-error-message'); // New line

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
            const address = `${street}, ${city}, ${state} ${zip}`.trim();

            if (address) {
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`);
                    const data = await response.json();
                    if (data && data.length > 0) {
                        locationInput.value = `${data[0].lat}, ${data[0].lon}`;
                        // Clear address fields after successful geocoding
                        streetInput.value = '';
                        cityInput.value = '';
                        stateInput.value = '';
                        zipInput.value = '';
                    } else {
                        displayErrorMessage('Address not found.'); // Replaced alert
                    }
                } catch (error) {
                    console.error('Error geocoding address:', error);
                    displayErrorMessage('Error geocoding address. Please try again.'); // Replaced alert
                }
            } else {
                displayErrorMessage('Please enter at least a City, State, or Zip Code.'); // Replaced alert
            }
        });
    }

    // --- Form Submission Logic ---
    if (reportForm) {
        reportForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const type = reportType.value;
            const [lat, lng] = locationInput.value.split(',').map(s => parseFloat(s.trim()));

            if (isNaN(lat) || isNaN(lng)) {
                displayErrorMessage('Please click on the map to set a location for the report.');
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
                        // If upload failed, prevent report submission or handle as needed
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
                    displaySuccessMessage('Report submitted successfully!');
                    reportForm.reset(); // Clear the form
                    renderFormDetails(reportType.value); // Re-render dynamic part
                    locationInput.value = ''; // Clear location input
                    window.fetchMapData(); // Refresh map data
                } else {
                    const error = await response.json();
                    displayErrorMessage(`Error submitting report: ${error.error}`);
                }
            } catch (error) {
                console.error('Error submitting report:', error);
                displayErrorMessage('An unexpected error occurred. Please try again.');
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
        document.documentElement.classList.toggle('dark', isDark);
    };

    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        applyTheme(true);
        if (themeToggle) themeToggle.checked = true;
    } else {
        applyTheme(false);
        if (themeToggle) themeToggle.checked = false;
    }

    if (themeToggle) {
        themeToggle.addEventListener('change', (event) => {
            const isDark = event.target.checked;
            applyTheme(isDark);
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
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
    // --- Error Report Form Submission Logic ---
    const errorReportForm = document.getElementById('errorReportForm');
    if (errorReportForm) {
        errorReportForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const errorDescription = document.getElementById('errorDescription').value;

            if (!errorDescription.trim()) {
                displayErrorMessage('Please provide a description for the error report.');
                return;
            }

            console.log('Error Report Submitted:', errorDescription);
            displaySuccessMessage('Error report submitted successfully! Thank you for your feedback.');
            errorReportForm.reset();
        });
    }
});
