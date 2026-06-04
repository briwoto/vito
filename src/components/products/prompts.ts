import { suffixJsonPrompt } from "../../utils/aiUtils/helperPrompts";
import { expectedTexts } from "./expectedTexts";

export const assertProductsSortedByPriceAscending = `
Take a look a the image and determine if all products are sorted by price in ascending order (from lowest to highest).
The prices should appear in increasing order from left to right in the same row.
The prices should also be in increasing order from top to bottom across rows.

${suffixJsonPrompt(expectedTexts.checkProductsSortedByPriceAscending)}
`;

export const assertProductsSortedByPriceDescending = `
Take a look a the image and determine if all products are sorted by price in descending order (from highest to lowest).
The prices should appear in decreasing order from left to right in the same row.
The prices should also be in decreasing order from top to bottom across rows.

${suffixJsonPrompt(expectedTexts.checkProductsSortedByPriceDescending)}
`;