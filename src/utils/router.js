/**
 * 极简路由器（无第三方依赖）
 *
 * 支持：
 *   router.get("/users/:id", handler)
 *   router.post("/tasks", handler)
 *   router.use("/api/users", subRouter)  // 挂载子路由
 *
 * handler 签名：async (ctx) => Response
 * ctx = { request, env, ctx, params, query, url }
 */

function matchPath(pattern, pathname) {
	const p = pattern.split("/").filter(Boolean);
	const a = pathname.split("/").filter(Boolean);
	if (p.length !== a.length) return null;

	const params = {};
	for (let i = 0; i < p.length; i++) {
		if (p[i].startsWith(":")) {
			params[p[i].slice(1)] = decodeURIComponent(a[i]);
		} else if (p[i] !== a[i]) {
			return null;
		}
	}
	return params;
}

export class Router {
	constructor() {
		/** @type {{ method: string, pattern: string, handler: Function }[]} */
		this.routes = [];
		/** @type {{ prefix: string, router: Router }[]} */
		this.mounts = [];
	}

	add(method, pattern, handler) {
		this.routes.push({ method: method.toUpperCase(), pattern, handler });
		return this;
	}

	get(pattern, handler) {
		return this.add("GET", pattern, handler);
	}
	post(pattern, handler) {
		return this.add("POST", pattern, handler);
	}
	put(pattern, handler) {
		return this.add("PUT", pattern, handler);
	}
	patch(pattern, handler) {
		return this.add("PATCH", pattern, handler);
	}
	delete(pattern, handler) {
		return this.add("DELETE", pattern, handler);
	}

	/**
	 * 挂载子路由到某个前缀
	 * @param {string} prefix
	 * @param {Router} router
	 */
	use(prefix, router) {
		this.mounts.push({ prefix: prefix.replace(/\/$/, ""), router });
		return this;
	}

	/**
	 * 处理请求
	 * @param {Request} request
	 * @param {object} env
	 * @param {ExecutionContext} ctx
	 */
	async handle(request, env, ctx) {
		const url = new URL(request.url);
		const method = request.method.toUpperCase();

		// 先尝试挂载的子路由
		for (const { prefix, router } of this.mounts) {
			if (url.pathname === prefix || url.pathname.startsWith(prefix + "/")) {
				const rest = url.pathname.slice(prefix.length) || "/";
				const res = await router.#dispatch(method, rest, url, request, env, ctx);
				if (res) return res;
			}
		}

		const res = await this.#dispatch(method, url.pathname, url, request, env, ctx);
		if (res) return res;

		return new Response(
			JSON.stringify({ success: false, message: `Not Found: ${method} ${url.pathname}` }),
			{ status: 404, headers: { "content-type": "application/json; charset=utf-8" } },
		);
	}

	async #dispatch(method, pathname, url, request, env, ctx) {
		let pathMatched = false;

		for (const route of this.routes) {
			const params = matchPath(route.pattern, pathname);
			if (!params) continue;
			pathMatched = true;
			if (route.method !== method) continue;

			const query = Object.fromEntries(url.searchParams.entries());
			return route.handler({ request, env, ctx, params, query, url });
		}

		// 路径存在但方法不匹配
		if (pathMatched) {
			return new Response(
				JSON.stringify({ success: false, message: "Method Not Allowed" }),
				{ status: 405, headers: { "content-type": "application/json; charset=utf-8" } },
			);
		}

		return null;
	}
}
