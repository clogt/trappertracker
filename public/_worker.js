import { handleMapDataRequest, handleReportRequest } from "./api/report/index.js";
import { handleRegisterRequest, handleLoginRequest } from "./api/auth/index.js";
import { handleMatchRequest } from "./api/match/index.js";
import { handleImageUpload, handleImageServe } from "./api/upload/index.js";
import { handleErrorReportRequest } from "./api/error-report/index.js";
import { handleAdminVerify, handleAdminStats, handleAdminErrorReports, handleAdminUsers, handleAdminAllReports, handleUpdateUserRole, handleDeleteUser } from "./api/admin/index.js";
import { handleUserReports, handleDeleteReport, handleUpdateReport, handleUserProfile } from "./api/user/index.js";

function addSecurityHeaders(response) {
  const newResponse = new Response(response.body, response);
  newResponse.headers.set("X-Content-Type-Options", "nosniff");
  newResponse.headers.set("X-Frame-Options", "SAMEORIGIN"); // Allow embedding for GoFundMe widget
  newResponse.headers.set("X-XSS-Protection", "1; mode=block");
  newResponse.headers.set("Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://unpkg.com https://www.gofundme.com; " +
    "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://unpkg.com; " +
    "img-src 'self' data: https:; " +
    "font-src 'self' https:; " +
    "connect-src 'self' https:; " +
    "frame-src https://www.gofundme.com;" // Allow GoFundMe iframes
  );
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
    } else if (url.pathname.startsWith('/api/error-report')) {
      response = await handleErrorReportRequest(request, env);
    } else if (url.pathname === '/api/admin/verify') {
      response = await handleAdminVerify(request, env);
    } else if (url.pathname === '/api/admin/stats') {
      response = await handleAdminStats(request, env);
    } else if (url.pathname === '/api/admin/error-reports') {
      response = await handleAdminErrorReports(request, env);
    } else if (url.pathname === '/api/admin/users') {
      response = await handleAdminUsers(request, env);
    } else if (url.pathname === '/api/admin/all-reports') {
      response = await handleAdminAllReports(request, env);
    } else if (url.pathname === '/api/admin/update-user-role') {
      response = await handleUpdateUserRole(request, env);
    } else if (url.pathname === '/api/admin/delete-user') {
      response = await handleDeleteUser(request, env);
    } else if (url.pathname === '/api/user/reports') {
      response = await handleUserReports(request, env);
    } else if (url.pathname === '/api/user/delete-report') {
      response = await handleDeleteReport(request, env);
    } else if (url.pathname === '/api/user/update-report') {
      response = await handleUpdateReport(request, env);
    } else if (url.pathname === '/api/user/profile') {
      response = await handleUserProfile(request, env);
    } else if (url.pathname.startsWith('/images/')) {
      // Serve images from R2
      const filename = url.pathname.replace('/images/', '');
      response = await handleImageServe(request, env, filename);
    } else if (env.ASSETS) { // Serve static assets using ASSETS binding
      response = await env.ASSETS.fetch(request);
    } else {
      response = new Response('Static assets not configured', { status: 500 });
    }

    return addSecurityHeaders(response);
  },
};