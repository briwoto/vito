import { Page } from "@playwright/test";
import { SortSelectors } from "./selectors";

class Sort {
	/**
	 * Creates a new Sort instance.
	 */
	constructor() {}

	/**
	 * Selects a sort option from the product sort dropdown and verifies
	 * the active sort option text matches the expected value.
	 *
	 * @param page - The Playwright Page object.
	 * @param sortBy - The field to sort by ('price' or 'name').
	 * @param order - The sort order ('ascending' or 'descending').
	 * @returns A promise that resolves when the sort has been applied and verified.
	 */
	async sortProductsBy(
		page: Page,
		sortBy: string,
		order: string,
	): Promise<void> {
		const sortOptionValue = this.findSortOptionValue(sortBy, order);
		await page.click(SortSelectors.sortDropdown);
		await page.selectOption(SortSelectors.sortDropdown, sortOptionValue);
		await page.waitForLoadState("load"); // Wait for the page to reload after sorting
		const activeSortOptionText = await page.textContent(
			SortSelectors.activeSortOption,
		);
		const expectedSortOptionText = this.findSortOptionDisplayText(
			sortBy,
			order,
		);
		if (activeSortOptionText?.trim() !== expectedSortOptionText) {
			throw new Error(
				`Sorting failed. Expected active sort option to be "${expectedSortOptionText}", but got "${activeSortOptionText?.trim()}"`,
			);
		}
	}

	/**
	 * Maps a sortBy field and order to the corresponding dropdown option value.
	 *
	 * @param sortBy - The field to sort by ('price' or 'name').
	 * @param order - The sort order ('ascending' or 'descending').
	 * @returns The option value string used in the sort dropdown.
	 */
	private findSortOptionValue(sortBy: string, order: string): string {
		switch (sortBy.toLowerCase()) {
		case "price":
			return order.toLowerCase() === "ascending" ? "lohi" : "hilo";
		case "name":
			return order.toLowerCase() === "ascending" ? "az" : "za";
		default:
			throw new Error(`Unsupported sortBy value: ${sortBy}`);
		}
	}

	/**
	 * Maps a sortBy field and order to the expected display text shown in the active sort option.
	 *
	 * @param sortBy - The field to sort by ('price' or 'name').
	 * @param order - The sort order ('ascending' or 'descending').
	 * @returns The display text string shown in the active sort option element.
	 */
	private findSortOptionDisplayText(sortBy: string, order: string): string {
		switch (sortBy.toLowerCase()) {
		case "price":
			return order.toLowerCase() === "ascending"
				? "Price (low to high)"
				: "Price (high to low)";
		case "name":
			return order.toLowerCase() === "ascending"
				? "Name (A to Z)"
				: "Name (Z to A)";
		default:
			throw new Error(`Unsupported sortBy value: ${sortBy}`);
		}
	}
}

export default new Sort();
