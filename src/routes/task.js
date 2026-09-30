import { Hono } from "hono";
import * as z from "zod";
import { zValidator } from "../utils/validator.js";
import { ok, fail } from "../utils/response.js";
import { createPayment, getPayment, handleCallback } from "../services/payment.js";

const router = new Hono();

// 内存示例数据
const tasks = new Map();

const TASK_STATUS = ["pending", "processing", "completed", "failed"];

const createTaskSchema = z.object({
	title: z.string().min(1, "title 不能为空"),
	description: z.string().optional(),
	userId: z.string().optional(),
	scriptId: z.string().optional(),
});

const updateTaskSchema = z.object({
	title: z.string().min(1).optional(),
	description: z.string().optional(),
	status: z.enum(TASK_STATUS).optional(),
	userId: z.string().optional(),
	scriptId: z.string().optional(),
});

const listQuerySchema = z.object({
	status: z.enum(TASK_STATUS).optional(),
});

const paySchema = z.object({
	amount: z.coerce.number().positive("amount 必须为正数").default(1),
	currency: z.string().optional(),
	channel: z.string().optional(),
});

const callbackSchema = z.object({
	orderId: z.string().min(1, "orderId 不能为空"),
	status: z.enum(["paid", "failed", "refunded"]).optional(),
	transactionId: z.string().optional(),
});

// GET /api/tasks?status=
router.get("/", zValidator("query", listQuerySchema), (c) => {
	const { status } = c.req.valid("query");
	let list = [...tasks.values()];
	if (status) list = list.filter((t) => t.status === status);
	return ok(c, list);
});

// POST /api/tasks/pay/callback —— 支付回调（需注册在 /:id 之前）
router.post("/pay/callback", zValidator("json", callbackSchema), async (c) => {
	const order = await handleCallback(c.env, c.req.valid("json"));
	return ok(c, order, "回调处理成功");
});

// POST /api/tasks
router.post("/", zValidator("json", createTaskSchema), (c) => {
	const body = c.req.valid("json");
	const id = crypto.randomUUID();
	const task = {
		id,
		title: body.title,
		description: body.description ?? "",
		status: "pending",
		userId: body.userId ?? null,
		scriptId: body.scriptId ?? null,
		createdAt: new Date().toISOString(),
	};
	tasks.set(id, task);
	return ok(c, task, "创建成功");
});

// GET /api/tasks/:id
router.get("/:id", (c) => {
	const task = tasks.get(c.req.param("id"));
	if (!task) return fail(c, "任务不存在", 404);
	return ok(c, task);
});

// PATCH /api/tasks/:id —— 更新
router.patch("/:id", zValidator("json", updateTaskSchema), (c) => {
	const id = c.req.param("id");
	const task = tasks.get(id);
	if (!task) return fail(c, "任务不存在", 404);

	Object.assign(task, c.req.valid("json"), {
		id: task.id,
		updatedAt: new Date().toISOString(),
	});
	tasks.set(id, task);
	return ok(c, task, "更新成功");
});

// POST /api/tasks/:id/pay —— 发起支付
router.post("/:id/pay", zValidator("json", paySchema), async (c) => {
	const id = c.req.param("id");
	const task = tasks.get(id);
	if (!task) return fail(c, "任务不存在", 404);

	const body = c.req.valid("json");
	const payment = await createPayment(c.env, {
		amount: body.amount,
		currency: body.currency,
		subject: task.title,
		userId: task.userId,
		channel: body.channel,
	});

	task.payment = { orderId: payment.orderId, status: payment.status };
	tasks.set(id, task);
	return ok(c, payment, "支付订单已创建");
});

// GET /api/tasks/:id/pay —— 查询支付状态
router.get("/:id/pay", async (c) => {
	const task = tasks.get(c.req.param("id"));
	if (!task) return fail(c, "任务不存在", 404);
	if (!task.payment?.orderId) return fail(c, "该任务尚未创建支付订单", 404);

	const payment = await getPayment(c.env, task.payment.orderId);
	if (!payment) return fail(c, "订单不存在", 404);
	return ok(c, payment);
});

// DELETE /api/tasks/:id
router.delete("/:id", (c) => {
	if (!tasks.delete(c.req.param("id"))) return fail(c, "任务不存在", 404);
	return ok(c, null, "删除成功");
});

export default router;
