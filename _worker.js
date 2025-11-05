import { handleMapDataRequest, handleReportRequest } from "./functions/api/report/index.js";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/mapdata')) {
      return handleMapDataRequest(request, env);
    } else if (url.pathname.startsWith('/api/report')) {
      return handleReportRequest(request, env);
    }

    // Serve static assets
    return env.ASSETS.fetch(request);
  },
};