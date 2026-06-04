import { Page } from '@playwright/test';
import { LoginSelectors } from './selectors';

class Login {
	/**
	 * Creates a new Login instance.
	 */
	constructor() {}

	/**
	 * Fills in the username and password fields and submits the login form.
	 * Waits for the shopping cart button to confirm a successful login.
	 *
	 * @param page - The Playwright Page object.
	 * @param username - The username to log in with.
	 * @param password - The password to log in with.
	 * @returns A promise that resolves when login is complete.
	 */
	async loginWithUsernameAndPassword(
		page: Page,
		username: string,
		password: string,
	): Promise<void> {
		await page.fill(LoginSelectors.usernameInput, username);
		await page.fill(LoginSelectors.passwordInput, password);
		await page.click(LoginSelectors.loginButton);
		await page.waitForSelector(LoginSelectors.cartButton, {
			state: "attached",
		});
	}

	/**
	 * Confirms the login page is visible by waiting for the username input,
	 * password input, and login button to be present in the DOM.
	 *
	 * @param page - The Playwright Page object.
	 * @returns A promise that resolves when all login page elements are attached.
	 */
	async confirmLoginPage(page: Page): Promise<void> {
		await page.waitForSelector(LoginSelectors.usernameInput, {
			state: "attached",
		});
		await page.waitForSelector(LoginSelectors.passwordInput, {
			state: "attached",
		});
		await page.waitForSelector(LoginSelectors.loginButton, {
			state: "attached",
		});
	}
}

export default new Login();
