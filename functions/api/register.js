/**
 * Register endpoint - wraps handleRegisterRequest from auth/index.js
 */
import { handleRegisterRequest } from './auth/index.js';

export async function onRequestPost(context) {
  return await handleRegisterRequest(context.request, context.env);
}
