// Report submission endpoint wrapper for file-based routing
// Maps /api/report to the handleReportRequest function

import { handleReportRequest } from './report/index.js';

/**
 * POST /api/report
 * Submit a new report (danger zone, lost pet, found pet, dangerous animal)
 * Requires authentication
 */
export async function onRequestPost(context) {
    return handleReportRequest(context.request, context.env);
}
