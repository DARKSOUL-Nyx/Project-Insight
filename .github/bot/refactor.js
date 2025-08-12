// .github/bot/refactor.js

// Using require for Node.js in compatibility in Github Actions 
const fetch = require('node-fetch');

const {
    GITHUB_TOKEN,
    GEMINI_API_KEY,
    GITHUB_CONTEXT
} = process.env;
const prContext = JSON.parse(GITHUB_CONTEXT);
console.log("GitHub Context:", prContext);
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
    const commentsUrl = prContext.payload.repository.comments_url.replace('{/number}', `/${prNumber}`);

    try {
        await fetch(commentsUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ body: `### 🤖 Smart Refactor Suggestions\n\n${commentBody}` })
        });
        console.log("Successfully posted comment to PR #" + prNumber);
    } catch (error) {
        console.error("Error posting PR comment:", error);
    }
}

/**
 * Main function to run the bot.
**/

async function main() {
    // Directly check the event name from the context.
    if (prContext.event_name !== 'pull_request') {
        // When run by a 'push', this code runs...
        console.log("This event was not a pull request. The trigger was:", prContext.event_name);
        return; // ...and it stops right here.
    }

    
    // 1. Get the URL for the diff from the PR context
    const diffUrl = prContext.payload.pull_request.diff_url; 
    console.log(`Fetching diff from: ${diffUrl}`);

    // 2. Fetch the actual code changes
    const diffResponse = await fetch(diffUrl, { headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` } });
    const diffText = await diffResponse.text();

    if (!diffText) {
        console.log("Could not fetch diff or diff is empty.");
        return;
    }

    // 3. Get the review from Gemini
    const review = await getGeminiReview(diffText);

    // 4. Post the review back to the PR
    await postToPR(review);
}

// Run the main function
main();
