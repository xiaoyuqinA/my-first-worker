/**
 * Cloudflare Worker 入口
 *
 * 目录结构：
 *   src/
 *   ├── index.js          # 入口 + 路由注册
 *   ├── routes/           # 路由层
 *   │   ├── user.js
 *   │   ├── script.js
 *   │   └── task.js
 *   ├── services/         # 业务/外部服务
 *   │   ├── ai.js
 *   │   └── payment.js
 *   └── utils/            # 工具
 *       ├── router.js
 *       └── response.js
 *
 * 运行：npx wrangler dev
 */

import { Router } from "./utils/router.js";
import { json } from "./utils/response.js";

import userRouter from "./routes/user.js";
import scriptRouter from "./routes/script.js";
import taskRouter from "./routes/task.js";

const router = new Router();

// 健康检查
router.get("/", () => json({ name: "my-first-worker", status: "ok" }));
router.get("/health", () => json({ status: "ok", time: new Date().toISOString() }));

// 挂载业务路由
router.use("/api/users", userRouter);
router.use("/api/scripts", scriptRouter);
router.use("/api/tasks", taskRouter);

export default {
	/**
	 * @param {Request} request
	 * @param {object} env
	 * @param {ExecutionContext} ctx
	 */
	async fetch(request, env, ctx) {
		try {
			return await router.handle(request, env, ctx);
		} catch (err) {
			console.error("Unhandled error:", err);
			return json(
				{ success: false, message: err?.message ?? "Internal Server Error" },
				500,
			);
		}
	},
};
