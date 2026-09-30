import { Hono } from "hono";
import * as z from "zod";
import { zValidator } from "../utils/validator.js";
import { ok, fail } from "../utils/response.js";

const router = new Hono();

// 内存示例数据（生产建议用 D1 / KV）
const users = new Map();

const createUserSchema = z.object({
	name: z.string().min(1, "name 不能为空"),
	email: z.email("email 格式不正确").optional(),
});

const updateUserSchema = createUserSchema.partial();

// GET /api/users
router.get("/", (c) => {
	const list = [...users.values()];
	return ok(c, list, `共 ${list.length} 个用户`);
});

// GET /api/users/:id
router.get("/:id", (c) => {
	const user = users.get(c.req.param("id"));
	if (!user) return fail(c, "用户不存在", 404);
	return ok(c, user);
});

// POST /api/users
router.post("/", zValidator("json", createUserSchema), (c) => {
	const body = c.req.valid("json");
	const id = crypto.randomUUID();
	const user = {
		id,
		name: body.name,
		email: body.email ?? null,
		createdAt: new Date().toISOString(),
	};
	users.set(id, user);
	return ok(c, user, "创建成功");
});

// PUT /api/users/:id
router.put("/:id", zValidator("json", updateUserSchema), (c) => {
	const id = c.req.param("id");
	const user = users.get(id);
	if (!user) return fail(c, "用户不存在", 404);

	const body = c.req.valid("json");
	const updated = { ...user, ...body, id: user.id };
	users.set(id, updated);
	return ok(c, updated, "更新成功");
});

// DELETE /api/users/:id
router.delete("/:id", (c) => {
	if (!users.delete(c.req.param("id"))) return fail(c, "用户不存在", 404);
	return ok(c, null, "删除成功");
});

export default router;
