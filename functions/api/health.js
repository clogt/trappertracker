/**
 * Health Check Endpoint
 * Returns the operational status of the TrapperTracker platform
 * Used by uptime monitoring services and internal health checks
 */

export async function onRequestGet(context) {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    checks: {}
  };

  try {
    // Check 1: Database connectivity
    const dbStart = Date.now();
    const dbResult = await context.env.DB.prepare('SELECT 1 as test').first();
    const dbLatency = Date.now() - dbStart;

    checks.checks.database = {
      status: dbResult && dbResult.test === 1 ? 'healthy' : 'degraded',
      latency_ms: dbLatency
    };

    // Check 2: R2 bucket connectivity (optional - just verify binding exists)
    checks.checks.storage = {
      status: context.env.R2_BUCKET ? 'healthy' : 'unavailable',
      note: 'R2 bucket binding present'
    };

    // Check 3: KV namespace for JWT revocation
    checks.checks.cache = {
      status: context.env.SESSION_BLACKLIST ? 'healthy' : 'not_configured',
      note: 'KV namespace for session management'
    };

    // Determine overall status
    const hasUnhealthy = Object.values(checks.checks).some(
      check => check.status === 'unhealthy'
    );
    const hasDegraded = Object.values(checks.checks).some(
      check => check.status === 'degraded'
    );

    if (hasUnhealthy) {
      checks.status = 'unhealthy';
    } else if (hasDegraded) {
      checks.status = 'degraded';
    }

    // Return appropriate HTTP status code
    const httpStatus = {
      'healthy': 200,
      'degraded': 200, // Still operational, just warn
      'unhealthy': 503
    }[checks.status];

    return new Response(JSON.stringify(checks, null, 2), {
      status: httpStatus,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      checks: checks.checks
    }, null, 2), {
      status: 503,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}
