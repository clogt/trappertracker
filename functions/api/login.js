/**
 * Login endpoint - wraps handleLoginRequest from auth/index.js
 */
import { handleLoginRequest } from './auth/index.js';

export async function onRequestPost(context) {
  return await handleLoginRequest(context.request, context.env);
}
