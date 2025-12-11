/**
 * MapData endpoint - wraps handleMapDataRequest from report/index.js
 */
import { handleMapDataRequest } from './report/index.js';

export async function onRequestGet(context) {
  return await handleMapDataRequest(context.request, context.env);
}
