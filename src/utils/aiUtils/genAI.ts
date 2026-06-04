/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs';
import { OpenAI } from 'openai';
import { PromptResponse } from '../types';

class GenAIAPI {
	private client: OpenAI;
	private model: string;

	/**
	 * Initialises the OpenAI client using the API key from environment variables
	 * and sets the model name from the environment or falls back to 'gpt-4o'.
	 */
	constructor() {
		this.model = process.env.OPENAI_MODEL || "gpt-4o";
		this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
	}

	/**
	 * Sends a chat completion request to the OpenAI API with the provided content array.
	 *
	 * @param content - An array of content parts (text, image_url, etc.) to send as the user message.
	 * @returns A promise that resolves to the trimmed text content of the model's response.
	 */
	public async sendRequest(content: any[]): Promise<string> {
		const res = await this.client.chat.completions.create({
			model: this.model,
			messages: [{ role: "user", content }],
		});
		return res.choices[0].message?.content?.trim() ?? "";
	}

	/**
	 * Strips markdown code fences from the AI response and parses it as a PromptResponse JSON object.
	 * Returns a failure response if the content is not valid JSON.
	 *
	 * @param content - The raw string content returned by the AI model.
	 * @returns A PromptResponse object with result and message fields.
	 */
	public cleanedPromptResponse(content: string): PromptResponse {
		const cleanedContent = content.replace(/```json|```/g, "").trim();
		try {
			const parsedJson = JSON.parse(cleanedContent);
			if (!parsedJson.message) {
				console.warn(
					`OpenAI response parsed but does not contain "message". Parsed JSON: ${JSON.stringify(parsedJson)}`,
				);
			}
			return parsedJson as PromptResponse;
		} catch {
			return {
				result: "fail",
				message: `AI response is not valid JSON: ${cleanedContent}`,
			};
		}
	}

	/**
	 * Reads a screenshot from disk, encodes it as a base64 data URL, and sends it
	 * along with the prompt text to the AI model for analysis.
	 *
	 * @param prompt - The prompt text describing what to evaluate in the image.
	 * @param screenshotPath - The absolute or relative path to the screenshot file.
	 * @returns A promise that resolves to a PromptResponse with the AI's result and message.
	 */
	public async runAI(
		prompt: string,
		screenshotPath: string,
	): Promise<PromptResponse> {
		const imageBuffer = await fs.promises.readFile(screenshotPath);
		const base64 = imageBuffer.toString("base64");
		const dataUrl = `data:image/png;base64,${base64}`;
		const content = await this.sendRequest([
			{ type: "text", text: prompt },
			{ type: "image_url", image_url: { url: dataUrl } },
		]);
		return this.cleanedPromptResponse(content);
	}

	/**
	 * Reads multiple screenshots from disk, encodes each as a base64 data URL,
	 * and sends them along with the prompt text to the AI model for comparison.
	 *
	 * @param prompt - The prompt text describing what to compare across the images.
	 * @param screenshotPaths - An array of absolute or relative paths to the screenshot files.
	 * @returns A promise that resolves to a PromptResponse with the AI's result and message.
	 */
	public async compareScreenshots(
		prompt: string,
		screenshotPaths: string[],
	): Promise<PromptResponse> {
		if (screenshotPaths.length === 0) {
			return { result: "", message: "No screenshot paths provided" };
		}
		const imageDataUrls = await Promise.all(
			screenshotPaths.map(async (screenshotPath: string): Promise<string> => {
				const imageBuffer = await fs.promises.readFile(screenshotPath);
				const base64 = imageBuffer.toString("base64");
				return `data:image/png;base64,${base64}`;
			}),
		);
		const content = [
			{ type: "text", text: prompt },
			...imageDataUrls.map(
				(dataUrl: string): { type: string; image_url: { url: string } } => ({
					type: "image_url",
					image_url: { url: dataUrl },
				}),
			),
		];
		const responseContent = await this.sendRequest(content);
		return this.cleanedPromptResponse(responseContent);
	}
}

export default new GenAIAPI();
