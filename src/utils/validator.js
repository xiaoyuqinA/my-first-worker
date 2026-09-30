import { zValidator as zv } from "@hono/zod-validator";

/**
 * Zod 校验中间件包装，统一 422 错误响应格式
 *
 * @param {"json" | "query" | "param" | "header" | "cookie" | "form"} target
 * @param {import("zod").ZodType} schema
 */
export function zValidator(target, schema) {
	return zv(target, schema, (result, c) => {
		if (!result.success) {
			return c.json(
				{
					success: false,
					message: "参数校验失败",
					errors: result.error.issues.map((issue) => ({
						path: issue.path.join("."),
						code: issue.code,
						message: issue.message,
					})),
				},
				422,
			);
		}
	});
}
