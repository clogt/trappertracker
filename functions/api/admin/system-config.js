// Admin endpoint for managing system configuration (emergency controls)
import { verifyAdminAuth } from './auth-helper.js';

/**
 * GET /api/admin/system-config
 * Get all system configuration settings
 */
export async function onRequestGet({ request, env }) {
    const adminAuth = await verifyAdminAuth(request, env);
    if (!adminAuth.authenticated) {
        return new Response(JSON.stringify({ error: adminAuth.error }), {
            status: adminAuth.status,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const stmt = env.DB.prepare(`
            SELECT
                config_key,
                config_value,
                config_type,
                description,
                modified_by_admin_id,
                modified_at
            FROM system_configuration
            ORDER BY config_key
        `);

        const { results } = await stmt.all();

        // Parse values based on type
        const config = {};
        results.forEach(row => {
            let value = row.config_value;
            if (row.config_type === 'boolean') {
                value = value === 'true';
            } else if (row.config_type === 'integer') {
                value = parseInt(value, 10);
            } else if (row.config_type === 'json') {
                try {
                    value = JSON.parse(value);
                } catch (e) {
                    value = row.config_value;
                }
            }

            config[row.config_key] = {
                value,
                type: row.config_type,
                description: row.description,
                modified_at: row.modified_at,
                modified_by: row.modified_by_admin_id
            };
        });

        return new Response(JSON.stringify({ config }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error fetching system config:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch system config' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * POST /api/admin/system-config
 * Update system configuration settings
 */
export async function onRequestPost({ request, env }) {
    const adminAuth = await verifyAdminAuth(request, env);
    if (!adminAuth.authenticated) {
        return new Response(JSON.stringify({ error: adminAuth.error }), {
            status: adminAuth.status,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const { config_key, config_value } = await request.json();

        if (!config_key || config_value === undefined) {
            return new Response(JSON.stringify({ error: 'Missing config_key or config_value' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Get the config to determine type
        const getStmt = env.DB.prepare(`
            SELECT config_type FROM system_configuration WHERE config_key = ?
        `).bind(config_key);

        const existingConfig = await getStmt.first();

        if (!existingConfig) {
            return new Response(JSON.stringify({ error: 'Invalid config key' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Convert value to string based on type
        let valueStr;
        if (existingConfig.config_type === 'boolean') {
            valueStr = config_value ? 'true' : 'false';
        } else if (existingConfig.config_type === 'json') {
            valueStr = JSON.stringify(config_value);
        } else {
            valueStr = String(config_value);
        }

        // Update the configuration
        const updateStmt = env.DB.prepare(`
            UPDATE system_configuration
            SET
                config_value = ?,
                modified_by_admin_id = ?,
                modified_at = CURRENT_TIMESTAMP
            WHERE config_key = ?
        `).bind(valueStr, adminAuth.userId, config_key);

        await updateStmt.run();

        // Log the change
        const auditStmt = env.DB.prepare(`
            INSERT INTO admin_audit_log (
                admin_user_id,
                action_type,
                target_type,
                target_id,
                action_details,
                ip_address
            ) VALUES (?, 'system_config_update', 'system', ?, ?, ?)
        `).bind(
            adminAuth.userId,
            config_key,
            JSON.stringify({ old_value: existingConfig.config_value, new_value: valueStr }),
            request.headers.get('CF-Connecting-IP') || 'unknown'
        );

        await auditStmt.run();

        // Log as security event if it's a critical setting
        const criticalSettings = ['submissions_enabled', 'maintenance_mode', 'captcha_enabled'];
        if (criticalSettings.includes(config_key)) {
            const securityEventStmt = env.DB.prepare(`
                INSERT INTO security_events (
                    event_type,
                    severity,
                    user_id,
                    event_details
                ) VALUES ('system_config_change', 'high', ?, ?)
            `).bind(
                adminAuth.userId,
                JSON.stringify({ config_key, new_value: valueStr })
            );

            await securityEventStmt.run();
        }

        return new Response(JSON.stringify({
            success: true,
            message: 'Configuration updated',
            config_key,
            new_value: config_value
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error updating system config:', error);
        return new Response(JSON.stringify({ error: 'Failed to update system config' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

/**
 * POST /api/admin/system-config/emergency-mode
 * Quick toggle for emergency lockdown
 */
export async function onRequestPut({ request, env }) {
    const adminAuth = await verifyAdminAuth(request, env);
    if (!adminAuth.authenticated) {
        return new Response(JSON.stringify({ error: adminAuth.error }), {
            status: adminAuth.status,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const { enabled } = await request.json();

        if (enabled === undefined) {
            return new Response(JSON.stringify({ error: 'Missing enabled parameter' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const valueStr = enabled ? 'false' : 'true'; // Disable submissions when emergency mode enabled

        // Update multiple configs at once for emergency mode
        const configs = [
            ['submissions_enabled', valueStr],
            ['extension_submissions_enabled', valueStr],
            ['rate_limit_standard_user', enabled ? '1' : '10'], // Reduce to 1 per day in emergency
            ['captcha_enabled', enabled ? 'true' : 'false']
        ];

        for (const [key, value] of configs) {
            await env.DB.prepare(`
                UPDATE system_configuration
                SET config_value = ?, modified_by_admin_id = ?, modified_at = CURRENT_TIMESTAMP
                WHERE config_key = ?
            `).bind(value, adminAuth.userId, key).run();
        }

        // Log the emergency action
        const auditStmt = env.DB.prepare(`
            INSERT INTO admin_audit_log (
                admin_user_id,
                action_type,
                target_type,
                target_id,
                action_details,
                ip_address
            ) VALUES (?, 'emergency_mode_toggle', 'system', 'emergency', ?, ?)
        `).bind(
            adminAuth.userId,
            JSON.stringify({ enabled }),
            request.headers.get('CF-Connecting-IP') || 'unknown'
        );

        await auditStmt.run();

        // Create high-severity security event
        await env.DB.prepare(`
            INSERT INTO security_events (
                event_type,
                severity,
                user_id,
                event_details
            ) VALUES ('emergency_mode_activated', 'critical', ?, ?)
        `).bind(
            adminAuth.userId,
            JSON.stringify({ enabled, timestamp: new Date().toISOString() })
        ).run();

        return new Response(JSON.stringify({
            success: true,
            message: enabled ? 'Emergency mode activated' : 'Emergency mode deactivated',
            emergency_mode: enabled
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Error toggling emergency mode:', error);
        return new Response(JSON.stringify({ error: 'Failed to toggle emergency mode' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
