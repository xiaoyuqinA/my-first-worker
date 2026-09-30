/**
 * Cloudflare Worker 入口（Hono + Zod）
 *
 * 目录结构：
 *   src/
 *   ├── index.js          # 入口 + Hono 应用装配
 *   ├── routes/           # 路由层（Hono 子应用）
 *   │   ├── user.js
 *   │   ├── script.js
 *   │   └── task.js
 *   ├── services/         # 业务/外部服务
 *   │   ├── ai.js
 *   │   └── payment.js
 *   └── utils/            # 工具
 *       ├── validator.js  # Zod 校验中间件
 *       └── response.js   # 统一响应
 *
 * 运行：bun run dev
 */

import { Hono } from "hono";
import { logger } from "hono/logger";
import { HTTPException } from "hono/http-exception";

import userRouter from "./routes/user.js";
import scriptRouter from "./routes/script.js";
import taskRouter from "./routes/task.js";

const app = new Hono();

// 日志中间件
app.use("*", logger());

// 健康检查
app.get("/", (c) => c.json({ name: "my-first-worker", status: "ok" }));
app.get("/health", (c) =>
	c.json({ status: "ok", time: new Date().toISOString() }),
);

// 挂载业务路由
app.route("/api/users", userRouter);
app.route("/api/scripts", scriptRouter);
app.route("/api/tasks", taskRouter);

// 404
app.notFound((c) =>
	c.json(
		{ success: false, message: `Not Found: ${c.req.method} ${c.req.path}` },
		404,
	),
);

// 全局错误处理
app.onError((err, c) => {
	console.error("Unhandled error:", err);
	const status = err instanceof HTTPException ? err.status : 500;
	return c.json(
		{ success: false, message: err?.message ?? "Internal Server Error" },
		status,
	);
});

export default app;
