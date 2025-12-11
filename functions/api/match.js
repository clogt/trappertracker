/**
 * Match endpoint - wraps handleMatchRequest from match/index.js
 */
import { handleMatchRequest } from './match/index.js';

export async function onRequestPost(context) {
  return await handleMatchRequest(context.request, context.env);
}
