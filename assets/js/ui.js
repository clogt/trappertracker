// assets/js/ui.js

document.addEventListener('DOMContentLoaded', () => {
    const reportType = document.getElementById('reportType');
    const petDetails = document.getElementById('petDetails');
    const dangerZoneDetails = document.getElementById('dangerZoneDetails');
    const reportForm = document.getElementById('reportForm');

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

    if (reportForm) {
        reportForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const reportType = document.getElementById('reportType').value;
            const locationInput = document.getElementById('location').value;
            const [lat, lng] = locationInput.split(',').map(s => parseFloat(s.trim()));

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
