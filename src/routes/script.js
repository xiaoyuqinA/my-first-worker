import { Hono } from "hono";
import * as z from "zod";
import { zValidator } from "../utils/validator.js";
import { ok, fail } from "../utils/response.js";
import { generateScript } from "../services/ai.js";

const router = new Hono();

// 内存示例数据
const scripts = new Map();

const createScriptSchema = z.object({
	title: z.string().min(1, "title 不能为空"),
	content: z.string().optional(),
	topic: z.string().optional(),
});

const generateScriptSchema = z.object({
	topic: z.string().min(1, "topic 不能为空"),
	title: z.string().optional(),
	style: z.string().optional(),
	length: z.coerce.number().int().positive().max(5000).optional(),
});

// GET /api/scripts
router.get("/", (c) => ok(c, [...scripts.values()]));

// POST /api/scripts/generate —— 调用 AI 生成（需注册在 /:id 之前）
router.post("/generate", zValidator("json", generateScriptSchema), async (c) => {
	const body = c.req.valid("json");
	const result = await generateScript(c.env, {
		topic: body.topic,
		style: body.style,
		length: body.length,
	});

	const id = crypto.randomUUID();
	const script = {
		id,
		title: body.title ?? body.topic,
		topic: body.topic,
		content: result.text,
		model: result.model,
		status: "generated",
		createdAt: new Date().toISOString(),
	};
	scripts.set(id, script);
	return ok(c, script, "生成成功");
});

// POST /api/scripts —— 创建（手动）
router.post("/", zValidator("json", createScriptSchema), (c) => {
	const body = c.req.valid("json");
	const id = crypto.randomUUID();
	const script = {
		id,
		title: body.title,
		content: body.content ?? "",
		topic: body.topic ?? null,
		status: "draft",
		createdAt: new Date().toISOString(),
	};
	scripts.set(id, script);
	return ok(c, script, "创建成功");
});

// GET /api/scripts/:id
router.get("/:id", (c) => {
	const script = scripts.get(c.req.param("id"));
	if (!script) return fail(c, "剧本不存在", 404);
	return ok(c, script);
});

// DELETE /api/scripts/:id
router.delete("/:id", (c) => {
	if (!scripts.delete(c.req.param("id"))) return fail(c, "剧本不存在", 404);
	return ok(c, null, "删除成功");
});

export default router;
