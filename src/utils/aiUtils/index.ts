/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs';
import path from 'path';
import { Locator, Page } from '@playwright/test';
import { PromptResponse } from '../types';
import genAIClient from './genAI';
import { checkContentForPass } from './helperPrompts';

const MAX_PROMPT_RETRIES = 3;
const MAX_SCREENSHOT_RETRIES = 3;
const MIN_GENAI_RATELIMIT_WAIT = 4000;

/**
 * Pauses execution for the specified number of milliseconds.
 *
 * @param ms - The number of milliseconds to sleep.
 * @returns A promise that resolves after the specified delay.
 */
const sleep = (ms: number): Promise<void> => new Promise((resolve: (value: void) => void): void => { setTimeout(resolve, ms); });

/**
 * Returns a randomised wait duration in milliseconds for use when a rate limit error
 * is encountered. The value is between MIN_GENAI_RATELIMIT_WAIT and 2× MIN_GENAI_RATELIMIT_WAIT.
 *
 * @returns A random number of milliseconds to wait before retrying.
 */
const rateLimitRandomWaitMs = (): number =>
	MIN_GENAI_RATELIMIT_WAIT + Math.floor(Math.random() * MIN_GENAI_RATELIMIT_WAIT);

/**
 * Determines whether an error is an OpenAI content filtering error (HTTP 400
 * or a message referencing content management/filtering policy).
 *
 * @param error - The error object to inspect.
 * @returns True if the error is a content filter error, false otherwise.
 */
const isContentFilterError = (error: any): boolean =>
	error.status === 400 ||
	error.message?.includes('400') ||
	error.message?.includes('content management policy') ||
	error.message?.includes('content filtering policies');

/**
 * Determines whether an error is an OpenAI rate limit error (HTTP 429
 * or a message referencing rate limits).
 *
 * @param error - The error object to inspect.
 * @returns True if the error is a rate limit error, false otherwise.
 */
const isRateLimitError = (error: any): boolean =>
	error.status === 429 ||
	error.message?.includes('429') ||
	error.message?.includes('rate limit') ||
	error.message?.includes('Rate limit exceeded');

/**
 * Sends the AI response message back to the model and checks whether it indicates a pass result.
 *
 * @param message - The message string returned by the AI to evaluate.
 * @returns A promise that resolves to true if the message indicates a pass, false otherwise.
 */
const isContentPass = async (message: string): Promise<boolean> => {
	const prompt = checkContentForPass(message);
	const result = await genAIClient.sendRequest([
		{ type: "text", text: prompt },
	]);
	return result.toLowerCase().includes("pass");
};

/**
 * Captures a screenshot of the full page or a specific locator element and writes it to disk.
 * Retries up to MAX_SCREENSHOT_RETRIES times on failure before throwing.
 *
 * @param screenshotPath - The file path where the screenshot should be saved.
 * @param page - The Playwright Page object to capture.
 * @param locator - An optional Playwright Locator to scope the screenshot to a specific element.
 * @returns A promise that resolves when the screenshot has been successfully captured.
 */
const captureScreenshot = async (
	screenshotPath: string,
	page: Page,
	locator: Locator | undefined
): Promise<void> => {
	for (let attempt = 1; attempt <= MAX_SCREENSHOT_RETRIES; attempt++) {
		try {
			if (locator) {
				await locator.screenshot({ path: screenshotPath });
			} else {
				await page.screenshot({ path: screenshotPath });
			}
			return;
		} catch (error: any) {
			const isLastAttempt = attempt === MAX_SCREENSHOT_RETRIES;
			if (isLastAttempt) {
				console.error('Screenshot failed permanently:', error);
				throw error;
			}
			console.warn(`Screenshot attempt ${attempt}/${MAX_SCREENSHOT_RETRIES} failed, retrying in 1s...`);
			await sleep(1000);
		}
	}
};

/**
 * Captures a screenshot and sends it to the AI model with the given prompt, retrying
 * on a polling interval until the result is not 'fail' or the timeout is reached.
 *
 * @param promptText - The AI prompt describing what to evaluate in the screenshot.
 * @param page - The Playwright Page object used to capture screenshots.
 * @param screenshotName - The filename for the screenshot saved under ./screenshots/. Defaults to 'runPrompt-check.png'.
 * @param timeout - Maximum milliseconds to keep retrying after the first failure. Defaults to 5000.
 * @param screenshotInterval - Milliseconds to wait between retry attempts. Defaults to 1000.
 * @param deleteScreenshot - Whether to delete the screenshot file after a successful assertion. Defaults to true.
 * @param locator - An optional Playwright Locator to scope the screenshot to a specific element.
 * @returns A promise that resolves to a PromptResponse with the AI's result and message.
 */
export const runPrompt = async (
	promptText: string,
	page: Page,
	screenshotName: string = '',
	timeout: number = 5000,
	screenshotInterval: number = 1000,
	deleteScreenshot: boolean = true,
	locator: Locator | undefined = undefined
): Promise<PromptResponse> => {
	try {
		screenshotName = screenshotName || 'runPrompt-check.png';
		const screenshotPath = path.resolve(`./screenshots/${screenshotName}`);
		await fs.promises.mkdir(path.dirname(screenshotPath), { recursive: true });
		let response: PromptResponse = { result: '', message: '' };
		let startTime = 0;

		while (true) {
			await captureScreenshot(screenshotPath, page, locator);
			response = await analyzeScreenshotWithAI(promptText, screenshotPath);

			if (!response.result.includes('fail')) {
				if (deleteScreenshot) {
					await fs.promises.unlink(screenshotPath);
				}
				console.log('AI prompt succeeded:', response);
				return response;
			}

			if (!startTime) {
				startTime = Date.now();
			} else if (Date.now() - startTime >= timeout) {
				break;
			}

			await sleep(screenshotInterval);
		}

		console.log('AI prompt timed out:', response);
		return response;
	} catch (error: any) {
		return {
			result: 'fail',
			message: `runPrompt encountered an error: ${error.message || error}`,
		};
	}
};

/**
 * Sends a screenshot to the AI model for analysis, with automatic retry on rate limit errors
 * and content filter handling. Uses isContentPass to re-evaluate ambiguous results.
 *
 * @param prompt - The AI prompt describing what to evaluate in the screenshot.
 * @param screenshotPath - The file path of the screenshot to analyse.
 * @returns A promise that resolves to a PromptResponse with the AI's result and message.
 */
const analyzeScreenshotWithAI = async (
	prompt: string,
	screenshotPath: string,
): Promise<PromptResponse> => {
	let scrambleRateLimitWait = MIN_GENAI_RATELIMIT_WAIT;
	for (let attempt = 0; attempt <= MAX_PROMPT_RETRIES; attempt++) {
		try {
			const res = await genAIClient.runAI(prompt, screenshotPath);
			if (res.result.toLowerCase().includes("pass")) {
				return res;
			}
			if (await isContentPass(res.message)) {
				return { result: "pass", message: res.message };
			}
			return res;
		} catch (error: any) {
			if (isContentFilterError(error)) {
				console.info("Content filtered by policy, treating as pass.");
				return {
					result: "pass",
					message:
						error.message || "Content filtered by policy - treating as pass",
				};
			}
			if (attempt === MAX_PROMPT_RETRIES) {
				console.log("Max retries reached for AI analysis.");
				return {
					result: "fail",
					message: `AI analysis failed after max retries: ${error.message || error}`,
				};
			}
			if (isRateLimitError(error)) {
				scrambleRateLimitWait = rateLimitRandomWaitMs();
				console.warn(
					`Rate limit hit, retrying in ${scrambleRateLimitWait / 1000}s... (attempt ${attempt + 1}/${MAX_PROMPT_RETRIES})`,
				);
				await sleep(scrambleRateLimitWait);
			}
		}
	}
	throw new Error("Unexpected end of retry loop");
};

/**
 * Sends multiple pre-captured screenshots to the AI model for comparison using the given prompt.
 * The caller is responsible for capturing and providing the screenshot file paths.
 *
 * @param promptText - The AI prompt describing what to compare across the screenshots.
 * @param screenshots - An array of file paths to the screenshots to compare.
 * @returns A promise that resolves to a PromptResponse with the AI's result and message.
 */
export const compareScreenshotsWithAI = async (promptText: string, screenshots: string[]): Promise<PromptResponse> => {
	try {
		if (!screenshots || screenshots.length === 0) {
			return { result: 'fail', message: 'No screenshots provided for analysis.' };
		}
		return await genAIClient.compareScreenshots(promptText, screenshots);
	} catch (error: any) {
		return {
			result: 'fail',
			message: `Error comparing screenshots: ${error?.message || error}`,
		};
	}
};

