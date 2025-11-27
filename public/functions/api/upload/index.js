import { v4 as uuidv4 } from 'uuid';

export async function handleImageUpload(request, env) {
    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const formData = await request.formData();
        const imageFile = formData.get('image');

        if (!imageFile) {
            return new Response(JSON.stringify({ error: 'No image file provided.' }), { status: 400 });
        }

        // Generate a unique filename
        const filename = `images/${uuidv4()}-${imageFile.name}`;

        // Upload to R2
        await env.R2_BUCKET.put(filename, imageFile.stream());

        // Construct the public URL (assuming R2 bucket is configured for public access)
        const imageUrl = `https://${env.R2_BUCKET_PUBLIC_URL}/${filename}`;

        return new Response(JSON.stringify({ url: imageUrl }), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (e) {
        console.error("Image upload error:", e);
        return new Response(JSON.stringify({ error: e.message }), { status: 500 });
    }
}
