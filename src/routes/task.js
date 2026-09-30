import { Router } from "../utils/router.js";
import { ok, fail, readJson } from "../utils/response.js";
import { createPayment, getPayment, handleCallback } from "../services/payment.js";

const router = new Router();

// 内存示例数据
const tasks = new Map();

// GET /api/tasks
router.get("/", ({ query }) => {
	let list = [...tasks.values()];
	if (query.status) list = list.filter((t) => t.status === query.status);
	return ok(list);
});

// GET /api/tasks/:id
router.get("/:id", ({ params }) => {
	const task = tasks.get(params.id);
	if (!task) return fail("任务不存在", 404);
	return ok(task);
});

// POST /api/tasks
router.post("/", async ({ request }) => {
	const body = await readJson(request);
	if (!body?.title) return fail("title 不能为空", 422);

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
	return ok(task, "创建成功");
});

// PATCH /api/tasks/:id  —— 更新状态
router.patch("/:id", async ({ params, request }) => {
	const task = tasks.get(params.id);
	if (!task) return fail("任务不存在", 404);

	const body = await readJson(request);
	if (!body) return fail("请求体必须是 JSON", 400);

	Object.assign(task, body, { id: task.id, updatedAt: new Date().toISOString() });
	tasks.set(params.id, task);
	return ok(task, "更新成功");
});

// POST /api/tasks/:id/pay  —— 发起支付
router.post("/:id/pay", async ({ params, request, env }) => {
	const task = tasks.get(params.id);
	if (!task) return fail("任务不存在", 404);

	const body = (await readJson(request)) ?? {};
	const payment = await createPayment(env, {
		amount: body.amount ?? 1,
		currency: body.currency,
		subject: task.title,
		userId: task.userId,
		channel: body.channel,
	});

	task.payment = { orderId: payment.orderId, status: payment.status };
	tasks.set(params.id, task);
	return ok(payment, "支付订单已创建");
});

// GET /api/tasks/:id/pay  —— 查询支付状态
router.get("/:id/pay", async ({ params, env }) => {
	const task = tasks.get(params.id);
	if (!task) return fail("任务不存在", 404);
	if (!task.payment?.orderId) return fail("该任务尚未创建支付订单", 404);

	const payment = await getPayment(env, task.payment.orderId);
	if (!payment) return fail("订单不存在", 404);
	return ok(payment);
});

// POST /api/tasks/pay/callback  —— 支付回调
router.post("/pay/callback", async ({ request, env }) => {
	const body = await readJson(request);
	if (!body?.orderId) return fail("orderId 不能为空", 422);

	const order = await handleCallback(env, body);
	return ok(order, "回调处理成功");
});

// DELETE /api/tasks/:id
router.delete("/:id", ({ params }) => {
	if (!tasks.delete(params.id)) return fail("任务不存在", 404);
	return ok(null, "删除成功");
});

export default router;
