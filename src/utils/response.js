/**
 * 统一的响应工具
 */

const JSON_HEADERS = {
	"content-type": "application/json; charset=utf-8",
};

/**
 * 返回 JSON 响应
 * @param {unknown} data
 * @param {number} [status=200]
 * @param {Record<string, string>} [headers]
 */
export function json(data, status = 200, headers = {}) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { ...JSON_HEADERS, ...headers },
	});
}

/**
 * 成功响应
 */
export function ok(data = null, message = "ok") {
	return json({ success: true, message, data });
}

/**
 * 失败响应
 */
export function fail(message = "error", status = 400, data = null) {
	return json({ success: false, message, data }, status);
}

/**
 * 解析请求体 JSON，失败时返回 null
 * @param {Request} request
 */
export async function readJson(request) {
	try {
		return await request.json();
	} catch {
		return null;
	}
}
