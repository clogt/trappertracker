// functions/api/_middleware.js

import { ipBlockMiddleware } from './admin/ip-block-middleware.js';

const handler = async ({ next }) => {
  return await next();
};

export const onRequest = ipBlockMiddleware(handler);
