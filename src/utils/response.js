/**
 * 统一的响应工具（基于 Hono Context）
 */

/**
 * 成功响应
 * @param {import("hono").Context} c
 * @param {unknown} [data]
 * @param {string} [message]
 */
export function ok(c, data = null, message = "ok") {
	return c.json({ success: true, message, data });
}

/**
 * 失败响应
 * @param {import("hono").Context} c
 * @param {string} [message]
 * @param {number} [status]
 * @param {unknown} [data]
 */
export function fail(c, message = "error", status = 400, data = null) {
	return c.json({ success: false, message, data }, status);
}
