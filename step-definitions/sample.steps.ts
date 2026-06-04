// https://www.saucedemo.com/
import { Page } from "@playwright/test";
import { createBdd } from "playwright-bdd";
import Login from "../src/components/login/login";
import Sort from "../src/components/sort/sort";
import Products from "../src/components/products/products";
import assert from "assert";

const { Given, When, Then } = createBdd();

Given(
	"I am on sauce login page",
	async ({ page }: { page: Page }): Promise<void> => {
		await page.goto("https://www.saucedemo.com/");
		await Login.confirmLoginPage(page);
	},
);

When("I login to the site", async ({ page }: { page: Page }): Promise<void> => {
	await Login.loginWithUsernameAndPassword(
		page,
		process.env.SAUCE_USERNAME!,
		process.env.SAUCE_PASSWORD!,
	);
});

When(
	"I sort the products by {string} {string}",
	async (
		{ page }: { page: Page },
		sortBy: string,
		order: string,
	): Promise<void> => {
		await Sort.sortProductsBy(page, sortBy, order);
	},
);

Then(
	"I should see all products sorted by price in ascending order",
	async ({ page }: { page: Page }): Promise<void> => {
		assert(
			await Products.checkProductsSortedByPriceAscending(page),
			"Products are not sorted by price in ascending order",
		);
	},
);
