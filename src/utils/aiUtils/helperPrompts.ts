/**
 * Returns a prompt suffix that instructs the AI to respond with a JSON object
 * containing "result" and "message" keys.
 *
 * @param expectedText - The expected pass condition text to embed in the result field instruction. Defaults to 'pass'.
 * @returns A string to append to an AI prompt to enforce JSON-formatted responses.
 */
export const suffixJsonPrompt = (expectedText?: string): string => {
	return `
    Respond only with a valid JSON object and with only two keys, "result" and "message".
    {"result": <"${expectedText ?? "pass"}" or "fail">, "message": "<Reason for the result>"}`;
};

/**
 * Returns a prompt suffix that instructs the AI to respond with only 'pass' or 'fail'.
 *
 * @returns A string to append to an AI prompt to enforce binary pass/fail responses.
 */
export const suffixBinaryPrompt = (): string => {
	return `respond ONLY with either 'pass' or 'fail'`;
};

/**
 * Builds a prompt that asks the AI to determine whether the provided content
 * indicates a pass or fail result.
 *
 * @param content - The text content to evaluate for pass/fail indication.
 * @returns A prompt string ready to be sent to the AI model.
 */
export const checkContentForPass = (content: string): string => {
	return `
    Check the provided content and determine if the message indicates success or failure.
    Usually, the success message contains "result: pass" or similar.
    If the "result: pass" is not present, determine from the text whether it is a pass or a fail

    Following is the content:
    ---
    ${content}
    ---
    ${suffixBinaryPrompt()}
    `;
};
