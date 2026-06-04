import { Page } from "@playwright/test";
import { runPrompt } from "../../utils/aiUtils";
import {
	assertProductsSortedByPriceAscending,
	assertProductsSortedByPriceDescending,
} from "./prompts";

class Products {
	/**
	 * Creates a new Products instance.
	 */
	constructor() {}

	/**
	 * Uses AI visual assertion to verify that all products on the page
	 * are sorted by price in ascending order.
	 *
	 * @param page - The Playwright Page object.
	 * @returns A promise that resolves to true if products are sorted by price ascending, false otherwise.
	 */
	async checkProductsSortedByPriceAscending(page: Page): Promise<boolean> {
		const promptResponse = await runPrompt(
			assertProductsSortedByPriceAscending,
			page,
		);
		return promptResponse.result.toLowerCase() === "pass";
	}

	/**
	 * Uses AI visual assertion to verify that all products on the page
	 * are sorted by price in descending order.
	 *
	 * @param page - The Playwright Page object.
	 * @returns A promise that resolves to true if products are sorted by price descending, false otherwise.
	 */
	async checkProductsSortedByPriceDescending(page: Page): Promise<boolean> {
		const promptResponse = await runPrompt(
			assertProductsSortedByPriceDescending,
			page,
		);
		return promptResponse.result.toLowerCase() === "pass";
	}
}

export default new Products();
