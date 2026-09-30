/**
 * 支付服务封装
 *
 * 这里提供一个可扩展的骨架：创建订单、查询订单、处理回调。
 * 具体渠道（微信 / 支付宝 / Stripe）在 providers 中实现。
 */

/**
 * 生成订单号
 */
export function createOrderId(prefix = "ORD") {
	const ts = Date.now().toString(36).toUpperCase();
	const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
	return `${prefix}${ts}${rand}`;
}

/**
 * 创建支付订单
 * @param {object} env
 * @param {{ amount: number, currency?: string, subject?: string, userId?: string, channel?: string }} order
 */
export async function createPayment(env, order) {
	const { amount, currency = "CNY", subject = "订单", userId, channel = "mock" } = order;

	if (!Number.isFinite(amount) || amount <= 0) {
		throw new Error("amount must be a positive number");
	}

	const orderId = createOrderId();

	// 持久化订单（如果绑定了 KV / D1）
	if (env.PAYMENT_KV) {
		await env.PAYMENT_KV.put(
			`order:${orderId}`,
			JSON.stringify({
				orderId,
				amount,
				currency,
				subject,
				userId,
				channel,
				status: "pending",
				createdAt: new Date().toISOString(),
			}),
		);
	}

	// mock 渠道：直接返回一个假的支付参数
	return {
		orderId,
		amount,
		currency,
		channel,
		status: "pending",
		payUrl: `https://example.com/pay/${orderId}`,
	};
}

/**
 * 查询订单状态
 * @param {object} env
 * @param {string} orderId
 */
export async function getPayment(env, orderId) {
	if (!env.PAYMENT_KV) {
		throw new Error("PAYMENT_KV 未绑定，无法查询订单");
	}
	const raw = await env.PAYMENT_KV.get(`order:${orderId}`);
	if (!raw) return null;
	return JSON.parse(raw);
}

/**
 * 处理支付回调
 * @param {object} env
 * @param {{ orderId: string, status?: string, transactionId?: string }} payload
 */
export async function handleCallback(env, { orderId, status = "paid", transactionId }) {
	if (!env.PAYMENT_KV) {
		throw new Error("PAYMENT_KV 未绑定，无法处理回调");
	}

	const raw = await env.PAYMENT_KV.get(`order:${orderId}`);
	if (!raw) throw new Error(`订单不存在: ${orderId}`);

	const order = JSON.parse(raw);
	order.status = status;
	order.transactionId = transactionId ?? null;
	order.paidAt = new Date().toISOString();

	await env.PAYMENT_KV.put(`order:${orderId}`, JSON.stringify(order));
	return order;
}
