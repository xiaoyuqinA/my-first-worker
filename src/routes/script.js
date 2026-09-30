import { Router } from "../utils/router.js";
import { ok, fail, readJson } from "../utils/response.js";
import { generateScript } from "../services/ai.js";

const router = new Router();

// 内存示例数据
const scripts = new Map();

// GET /api/scripts
router.get("/", () => ok([...scripts.values()]));

// GET /api/scripts/:id
router.get("/:id", ({ params }) => {
	const script = scripts.get(params.id);
	if (!script) return fail("剧本不存在", 404);
	return ok(script);
});

// POST /api/scripts  —— 创建（手动）
router.post("/", async ({ request }) => {
	const body = await readJson(request);
	if (!body?.title) return fail("title 不能为空", 422);

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
	return ok(script, "创建成功");
});

// POST /api/scripts/generate  —— 调用 AI 生成
router.post("/generate", async ({ request, env }) => {
	const body = await readJson(request);
	if (!body?.topic) return fail("topic 不能为空", 422);

	const result = await generateScript(env, {
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
	return ok(script, "生成成功");
});

// DELETE /api/scripts/:id
router.delete("/:id", ({ params }) => {
	if (!scripts.delete(params.id)) return fail("剧本不存在", 404);
	return ok(null, "删除成功");
});

export default router;
