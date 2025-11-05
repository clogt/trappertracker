// assets/js/ui.js

document.addEventListener('DOMContentLoaded', () => {
    const reportType = document.getElementById('reportType');
    const petDetails = document.getElementById('petDetails');
    const dangerZoneDetails = document.getElementById('dangerZoneDetails');
    const reportForm = document.getElementById('reportForm');
    const geocodeButton = document.getElementById('geocode-button');
    const addressInput = document.getElementById('address');
    const locationInput = document.getElementById('location');

    if (reportType) {
        reportType.addEventListener('change', (event) => {
            if (event.target.value === 'lostPet') {
                petDetails.classList.remove('hidden');
                dangerZoneDetails.classList.add('hidden');
            } else {
                petDetails.classList.add('hidden');
                dangerZoneDetails.classList.remove('hidden');
            }
        });
    }

    if (geocodeButton) {
        geocodeButton.addEventListener('click', async () => {
            const address = addressInput.value;
            if (address) {
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`);
                    const data = await response.json();
                    if (data && data.length > 0) {
                        locationInput.value = `${data[0].lat}, ${data[0].lon}`;
                    } else {
                        alert('Address not found.');
                    }
                } catch (error) {
                    console.error('Error geocoding address:', error);
                    alert('Error geocoding address. Please try again.');
                }
            } else {
                alert('Please enter an address.');
            }
        });
    }

    if (reportForm) {
        reportForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const reportType = document.getElementById('reportType').value;
            const [lat, lng] = locationInput.value.split(',').map(s => parseFloat(s.trim()));

            if (isNaN(lat) || isNaN(lng)) {
                alert('Please enter a valid Latitude, Longitude or click on the map.');
                return;
            }

            const reportData = {
                report_type: reportType,
                latitude: lat,
                longitude: lng,
            };

            if (reportType === 'lostPet') {
                reportData.pet_name = document.getElementById('petName').value;
                reportData.contact_info = document.getElementById('contactInfo').value;
            } else { // dangerZone
                reportData.description = document.getElementById('dangerDescription').value;
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
                    alert('Report submitted successfully!');
                    reportForm.reset();
                    // Optionally, refresh the map data
                    if (window.fetchMapData) {
                        window.fetchMapData();
                    }
                } else {
                    const error = await response.json();
                    alert(`Error submitting report: ${error.error}`);
                }
            } catch (error) {
                console.error('Error submitting report:', error);
                alert('An unexpected error occurred. Please try again.');
            }
        });
    }
});