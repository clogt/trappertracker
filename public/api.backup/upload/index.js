export async function handleImageUpload(request, env) {
    if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405 });
    }

    try {
        const formData = await request.formData();
        const imageFile = formData.get('image');

        if (!imageFile) {
            return new Response(JSON.stringify({ error: 'No image file provided.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(imageFile.type)) {
            return new Response(JSON.stringify({ error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Validate file size (max 5MB)
        if (imageFile.size > 5 * 1024 * 1024) {
            return new Response(JSON.stringify({ error: 'File too large. Maximum size is 5MB.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Generate a unique filename
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 15);
        const ext = imageFile.name.split('.').pop();
        const filename = `${timestamp}-${randomStr}.${ext}`;

        // Upload to R2
        if (!env.R2_BUCKET) {
            return new Response(JSON.stringify({ error: 'Image storage not configured.' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        await env.R2_BUCKET.put(filename, imageFile.stream(), {
            httpMetadata: {
                contentType: imageFile.type
            }
        });

        // Construct the public URL (served via our worker)
        const url = new URL(request.url);
        const imageUrl = `${url.origin}/images/${filename}`;

        return new Response(JSON.stringify({ url: imageUrl }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (e) {
        console.error("Image upload error:", e);
        return new Response(JSON.stringify({ error: e.message || 'Upload failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

// Serve images from R2
export async function handleImageServe(request, env, filename) {
    try {
        if (!env.R2_BUCKET) {
            return new Response('Image storage not configured', { status: 500 });
        }

        const object = await env.R2_BUCKET.get(filename);

        if (!object) {
            return new Response('Image not found', { status: 404 });
        }

        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set('Cache-Control', 'public, max-age=31536000');
        headers.set('Access-Control-Allow-Origin', '*');

        return new Response(object.body, { headers });

    } catch (e) {
        console.error("Image serve error:", e);
        return new Response('Error loading image', { status: 500 });
    }
}
