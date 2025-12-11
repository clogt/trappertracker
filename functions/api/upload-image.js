/**
 * Upload Image endpoint - wraps handleImageUpload from upload/index.js
 */
import { handleImageUpload } from './upload/index.js';

export async function onRequestPost(context) {
  return await handleImageUpload(context.request, context.env);
}
