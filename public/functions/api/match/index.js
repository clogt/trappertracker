export async function handleMatchRequest(request, env) {
    if (request.method !== 'GET') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        // Fetch all lost pets
        const lostPetsStmt = env.DB.prepare('SELECT * FROM lost_pets WHERE is_found = 0');
        const { results: lostPets } = await lostPetsStmt.all();

        // Fetch all found pets
        const foundPetsStmt = env.DB.prepare('SELECT * FROM found_pets WHERE is_reunited = 0');
        const { results: foundPets } = await foundPetsStmt.all();

        const potentialMatches = [];

        // Simple matching logic (can be expanded)
        for (const lostPet of lostPets) {
            for (const foundPet of foundPets) {
                // Basic matching criteria: species/breed and proximity
                const speciesMatch = lostPet.species_breed && foundPet.species_breed &&
                                     lostPet.species_breed.toLowerCase() === foundPet.species_breed.toLowerCase();

                // Calculate distance (simple approximation for now)
                const distance = Math.sqrt(
                    Math.pow(lostPet.latitude - foundPet.latitude, 2) +
                    Math.pow(lostPet.longitude - foundPet.longitude, 2)
                );

                // Consider a match if species/breed matches and within a certain distance (e.g., 0.1 degrees lat/lon)
                if (speciesMatch && distance < 0.1) {
                    potentialMatches.push({
                        lostPetId: lostPet.pet_id,
                        foundPetId: foundPet.found_pet_id,
                        lostPet: lostPet,
                        foundPet: foundPet,
                        matchScore: 1 - distance // Higher score for closer matches
                    });

                    // Send email notification for the match
                    await sendMatchEmail(lostPet, foundPet, env);
                }
            }
        }

        return new Response(JSON.stringify(potentialMatches), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (e) {
        console.error("Matching error:", e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}

// Helper function to send email notification
async function sendMatchEmail(lostPet, foundPet, env) {
    const emailBody = `
        <h1>Potential Pet Match Found!</h1>
        <p>A potential match has been found between a lost pet and a found pet:</p>
        
        <h2>Lost Pet Details:</h2>
        <ul>
            <li>Name: ${lostPet.pet_name || 'N/A'}</li>
            <li>Species/Breed: ${lostPet.species_breed || 'N/A'}</li>
            <li>Description: ${lostPet.description || 'N/A'}</li>
            <li>Last Seen Location: Lat ${lostPet.latitude}, Lng ${lostPet.longitude}</li>
            <li>Owner Contact: ${lostPet.owner_contact_email}</li>
            ${lostPet.photo_url ? `<li>Photo: <a href="${lostPet.photo_url}">${lostPet.photo_url}</a></li>` : ''}
        </ul>

        <h2>Found Pet Details:</h2>
        <ul>
            <li>Species/Breed: ${foundPet.species_breed || 'N/A'}</li>
            <li>Description: ${foundPet.description || 'N/A'}</li>
            <li>Found Location: Lat ${foundPet.latitude}, Lng ${foundPet.longitude}</li>
            <li>Finder Contact: ${foundPet.contact_info}</li>
            ${foundPet.photo_url ? `<li>Photo: <a href="${foundPet.photo_url}">${foundPet.photo_url}</a></li>` : ''}
        </ul>

        <p>Please review these details and contact the respective parties if you believe this is a match.</p>
        <p>TrapperTracker Team</p>
    `;

    const mailBody = {
        personalizations: [
            {
                to: [{ email: lostPet.owner_contact_email }], // Notify the lost pet owner
                dkim_domain: env.MAILCHANNELS_DKIM_DOMAIN || 'trappertracker.com',
                dkim_selector: env.MAILCHANNELS_DKIM_SELECTOR || 'mailchannels', // default for Mailchannels
                dkim_private_key: env.MAILCHANNELS_DKIM_PRIVATE_KEY || 'your-dkim-private-key',
            },
            {
                to: [{ email: foundPet.contact_info }], // Notify the found pet finder
                dkim_domain: env.MAILCHANNELS_DKIM_DOMAIN || 'trappertracker.com',
                dkim_selector: env.MAILCHANNELS_DKIM_SELECTOR || 'mailchannels', // default for Mailchannels
                dkim_private_key: env.MAILCHANNELS_DKIM_PRIVATE_KEY || 'your-dkim-private-key',
            },
        ],
        from: { email: env.EMAIL_FROM_ADDRESS || 'noreply@trappertracker.com', name: 'TrapperTracker' },
        subject: 'Potential TrapperTracker Pet Match Found!',
        content: [
            { type: 'text/html', value: emailBody },
        ],
    };

    try {
        const response = await fetch('https://api.mailchannels.net/tx/v1/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // No API key needed for Mailchannels when sent from a Cloudflare Worker
            },
            body: JSON.stringify(mailBody),
        });

        if (!response.ok) {
            console.error(`Failed to send match email: ${response.statusText}`);
        }
    } catch (e) {
        console.error('Error sending match email:', e);
    }
}
