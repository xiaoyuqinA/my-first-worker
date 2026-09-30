import { SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";

describe("my-first-worker", () => {
	it("健康检查返回 ok", async () => {
		const response = await SELF.fetch("http://example.com/health");
		expect(response.status).toBe(200);
		const data = await response.json();
		expect(data.status).toBe("ok");
	});

	it("创建用户成功", async () => {
		const response = await SELF.fetch("http://example.com/api/users", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ name: "Alice", email: "alice@example.com" }),
		});
		expect(response.status).toBe(200);

		const data = await response.json();
		expect(data.success).toBe(true);
		expect(data.data.name).toBe("Alice");
		expect(data.data.id).toBeTruthy();
	});

	it("非法参数返回 422", async () => {
		const response = await SELF.fetch("http://example.com/api/users", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ name: "" }),
		});
		expect(response.status).toBe(422);

		const data = await response.json();
		expect(data.success).toBe(false);
		expect(data.errors.length).toBeGreaterThan(0);
	});

	it("未知路由返回 404", async () => {
		const response = await SELF.fetch("http://example.com/api/unknown");
		expect(response.status).toBe(404);
	});
});
