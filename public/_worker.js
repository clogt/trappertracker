import { handleMapDataRequest, handleReportRequest } from "../functions/api/report/index.js";
import { handleRegisterRequest, handleLoginRequest } from "../functions/api/auth/index.js";
import { handleMatchRequest } from "../functions/api/match/index.js";
import { handleImageUpload } from "../functions/api/upload/index.js";

function addSecurityHeaders(response) {
  const newResponse = new Response(response.body, response);
  newResponse.headers.set("X-Content-Type-Options", "nosniff");
  newResponse.headers.set("X-Frame-Options", "DENY");
  newResponse.headers.set("X-XSS-Protection", "1; mode=block");
  newResponse.headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://unpkg.com https://challenges.cloudflare.com https://www.gofundme.com; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://unpkg.com; img-src 'self' data: https:; font-src 'self' https:; connect-src 'self' https:; frame-src https://challenges.cloudflare.com https://www.gofundme.com;");
  newResponse.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return newResponse;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    let response;

    // Handle API routes
    if (url.pathname.startsWith('/api/mapdata')) {
      response = await handleMapDataRequest(request, env);
    } else if (url.pathname.startsWith('/api/report')) {
      response = await handleReportRequest(request, env);
    } else if (url.pathname.startsWith('/api/register')) {
      response = await handleRegisterRequest(request, env);
    } else if (url.pathname.startsWith('/api/login')) {
      response = await handleLoginRequest(request, env);
    } else if (url.pathname.startsWith('/api/match')) {
      response = await handleMatchRequest(request, env);
    } else if (url.pathname.startsWith('/api/upload-image')) {
      response = await handleImageUpload(request, env);
    } else if (env.ASSETS) { // Serve static assets using ASSETS binding
      response = await env.ASSETS.fetch(request);
    } else {
      response = new Response('Static assets not configured', { status: 500 });
    }

    return addSecurityHeaders(response);
  },
};