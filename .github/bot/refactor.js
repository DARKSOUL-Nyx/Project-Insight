// .github/bot/refactor.js

// Using require for Node.js in compatibility in Github Actions 
import fetch from 'node-fetch';

const {
    GITHUB_TOKEN,
    GEMINI_API_KEY,
    GITHUB_CONTEXT
} = process.env;
const prContext = JSON.parse(GITHUB_CONTEXT);
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;


const PROMPT_TEMPLATE = `
Act as an expert senior software engineer. Your task is to review the following code changes (in git diff format) and identify opportunities for refactoring.

Focus on these key areas:
1.  **Code Smells:** Look for long methods, deep nesting, large classes, or duplicated code.
2.  **Readability:** Can the code be made clearer or more self-explanatory?
3.  **Modern Practices:** Suggest modern language features or patterns that could simplify the code.

For each suggestion, provide a code snippet of the proposed change. If there are no significant issues, simply respond with "No major refactoring suggestions found. The code looks clean."

Here is the diff:
`;

/**
 * Calls the Gemini API to get refactoring suggestions.
 * @param {string} diff - The code changes from the pull request.
 * @returns {Promise<string>} The review comment from Gemini.
 */
async function getGeminiReview(diff) {
    const prompt = PROMPT_TEMPLATE + diff;
    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        if (!response.ok) {
            console.error("Gemini API Error:", await response.text());
            return "Could not get a review from the AI model.";
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return "An error occurred while contacting the AI model.";
    }
}

/**
 * Posts a comment to the GitHub pull request.
 * @param {string} commentBody - The content of the comment.
 */
async function postToPR(commentBody) {
    const prNumber = prContext.event.pull_request.number;
    const commentsUrl = prContext.event.repository.comments_url.replace('{/number}', `/${prNumber}`);

    console.log(`Attempting to post comment to: ${commentsUrl}`);

    try {
        const response = await fetch(commentsUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json' // Recommended header
            },
            body: JSON.stringify({ body: `### 🤖 Smart Refactor Suggestions\n\n${commentBody}` })
        });

        // NEW: Check if the HTTP request was actually successful (status 2xx)
        if (response.ok) {
            console.log(`Successfully posted comment to PR #${prNumber}. GitHub API responded with status: ${response.status}`);
        } else {
            // NEW: If not successful, log the error details from GitHub's response
            const errorBody = await response.text();
            console.error(`Failed to post comment. GitHub API responded with status: ${response.status}`);
            console.error("Error Response Body:", errorBody);
        }

    } catch (error) {
        console.error("A network or execution error occurred while trying to post the comment:", error);
    }
}

/**
 * Main function to run the bot.
**/

async function main() {
    if (prContext.event_name !== 'pull_request') {
        console.log("This event was not a pull request. Skipping.");
        return;
    }

    const diffUrl = prContext.event.pull_request.diff_url;
    console.log(`Fetching diff from: ${diffUrl}`);

    const diffResponse = await fetch(diffUrl, { headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` } });
    const diffText = await diffResponse.text();

    if (!diffText) {
        console.log("Could not fetch diff or diff is empty. Exiting.");
        return;
    }

    // --- DEBUGGING STEP 1 ---
    // Log the first 500 characters of the diff to confirm we have it.
    console.log("--- Diff Found ---");
    console.log(diffText.substring(0, 500) + "...");
    console.log("--------------------");

    const review = await getGeminiReview(diffText);

    // --- DEBUGGING STEP 2 ---
    // Log the raw response we get from Gemini before posting.
    console.log("--- Gemini API Response ---");
    console.log(review);
    console.log("---------------------------");
    
    // Add a check to ensure the review is not empty
    if (review && review.trim().length > 0) {
        await postToPR(review);
    } else {
        console.log("Gemini response was empty or null. Nothing to post.");
    }
}


// Run the main function
main();
