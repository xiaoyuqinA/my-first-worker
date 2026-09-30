import { Router } from "../utils/router.js";
import { ok, fail, readJson } from "../utils/response.js";

const router = new Router();

// 内存示例数据（生产建议用 D1 / KV）
const users = new Map();

// GET /api/users
router.get("/", ({ query }) => {
	const list = [...users.values()];
	return ok(list, `共 ${list.length} 个用户`);
});

// GET /api/users/:id
router.get("/:id", ({ params }) => {
	const user = users.get(params.id);
	if (!user) return fail("用户不存在", 404);
	return ok(user);
});

// POST /api/users
router.post("/", async ({ request }) => {
	const body = await readJson(request);
	if (!body?.name) return fail("name 不能为空", 422);

	const id = crypto.randomUUID();
	const user = {
		id,
		name: body.name,
		email: body.email ?? null,
		createdAt: new Date().toISOString(),
	};
	users.set(id, user);
	return ok(user, "创建成功");
});

// PUT /api/users/:id
router.put("/:id", async ({ params, request }) => {
	const user = users.get(params.id);
	if (!user) return fail("用户不存在", 404);

	const body = await readJson(request);
	if (!body) return fail("请求体必须是 JSON", 400);

	const updated = { ...user, ...body, id: user.id };
	users.set(params.id, updated);
	return ok(updated, "更新成功");
});

// DELETE /api/users/:id
router.delete("/:id", ({ params }) => {
	if (!users.delete(params.id)) return fail("用户不存在", 404);
	return ok(null, "删除成功");
});

export default router;
