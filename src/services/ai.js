/**
 * AI 服务封装
 *
 * 默认走 Workers AI（env.AI 绑定）。
 * 如未配置绑定，可通过 env.AI_API_KEY + env.AI_BASE_URL 走兼容 OpenAI 的 HTTP 接口。
 */

const DEFAULT_MODEL = "@cf/meta/llama-3.1-8b-instruct";

/**
 * 文本生成
 * @param {object} env
 * @param {{ prompt: string, model?: string, system?: string }} options
 * @returns {Promise<{ text: string, model: string, raw: unknown }>}
 */
export async function generateText(env, { prompt, model = DEFAULT_MODEL, system }) {
	if (!prompt) throw new Error("prompt is required");

	// 1) Workers AI 绑定
	if (env.AI) {
		const messages = [];
		if (system) messages.push({ role: "system", content: system });
		messages.push({ role: "user", content: prompt });

		const result = await env.AI.run(model, { messages });
		return {
			text: result?.response ?? "",
			model,
			raw: result,
		};
	}

	// 2) OpenAI 兼容接口
	if (env.AI_API_KEY && env.AI_BASE_URL) {
		const res = await fetch(`${env.AI_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				authorization: `Bearer ${env.AI_API_KEY}`,
			},
			body: JSON.stringify({
				model,
				messages: [
					...(system ? [{ role: "system", content: system }] : []),
					{ role: "user", content: prompt },
				],
			}),
		});

		if (!res.ok) {
			throw new Error(`AI upstream error: ${res.status} ${await res.text()}`);
		}
		const data = await res.json();
		return {
			text: data?.choices?.[0]?.message?.content ?? "",
			model,
			raw: data,
		};
	}

	throw new Error("AI 服务未配置：请绑定 Workers AI (env.AI) 或设置 AI_API_KEY / AI_BASE_URL");
}

/**
 * 生成剧本/文案
 * @param {object} env
 * @param {{ topic: string, style?: string, length?: number }} options
 */
export async function generateScript(env, { topic, style = "通用", length = 300 }) {
	const system = "你是一位专业的内容创作者，擅长撰写结构清晰、有吸引力的剧本与文案。";
	const prompt = `请围绕主题「${topic}」创作一段${style}风格的剧本，约 ${length} 字。`;
	return generateText(env, { prompt, system });
}
