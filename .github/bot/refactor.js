// .github/bot/refactor.js

import fetch from 'node-fetch';

const {
    GITHUB_TOKEN,
    GEMINI_API_KEY,
    GITHUB_CONTEXT
} = process.env;
const prContext = JSON.parse(GITHUB_CONTEXT);
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

const REFACTOR_PROMPT_TEMPLATE = `
Act as an expert senior software engineer. Your task is to review the following code changes (in git diff format) and identify opportunities for refactoring. Focus on code smells, readability, and modern practices. For each suggestion, provide a code snippet of the proposed change. If there are no significant issues, simply respond with "No major refactoring suggestions found. The code looks clean." Here is the diff:
`;

const RELEASE_NOTES_PROMPT_TEMPLATE = `
Act as a technical writer creating release notes. Based on the following commit messages since the last release, generate a summary in markdown format. Organize the summary into "✨ New Features", "🐛 Bug Fixes", and "🔨 Improvements". If a category is empty, omit it. Make the notes clear and user-friendly. Here are the commit messages:
`;

async function callGemini(prompt) {
    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (!response.ok) {
            console.error("Gemini API Error:", await response.text());
            return "Could not get a response from the AI model.";
        }
        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return "An error occurred while contacting the AI model.";
    }
}

async function postToPR(commentBody) {
    const commentsUrl = prContext.event.pull_request.comments_url;
    const prNumber = prContext.event.pull_request.number;
    try {
        await fetch(commentsUrl, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ body: `### 🤖 Smart Refactor Suggestions\n\n${commentBody}` })
        });
        console.log(`Successfully posted comment to PR #${prNumber}.`);
    } catch (error) {
        console.error("Error posting PR comment:", error);
    }
}

// --- NEW FUNCTION for Release Notes ---
async function updateReleaseNotes(releaseId, releaseNotes) {
    const releaseUrl = `${prContext.event.repository.url}/releases/${releaseId}`;
    console.log(`Updating release at: ${releaseUrl}`);
    try {
        await fetch(releaseUrl, {
            method: 'PATCH', // PATCH is used to update an existing resource
            headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ body: releaseNotes })
        });
        console.log(`Successfully updated release notes for release ID ${releaseId}.`);
    } catch (error) {
        console.error("Error updating release notes:", error);
    }
}

async function main() {
    // --- Logic for Pull Request Reviews ---
    if (prContext.event_name === 'pull_request') {
        console.log('Pull request event detected. Running refactor check...');
        const diffUrl = prContext.event.pull_request.diff_url;
        const diffResponse = await fetch(diffUrl, { headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` } });
        const diffText = await diffResponse.text();
        if (diffText) {
            const review = await callGemini(REFACTOR_PROMPT_TEMPLATE + diffText);
            if (review && review.trim().length > 0) {
                await postToPR(review);
            }
        }
    }
    
    // --- NEW LOGIC for Release Notes ---
    else if (prContext.event_name === 'release') {
        console.log('Release event detected. Generating release notes...');
        const release = prContext.event.release;
        
        // 1. Get the list of releases to find the previous tag
        const releasesUrl = prContext.event.repository.releases_url.replace('{/id}', '');
        const releasesResponse = await fetch(releasesUrl, { headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` } });
        const releases = await releasesResponse.json();
        
        let previousTag = null;
        if (releases.length > 1) {
            // Assumes releases are sorted newest first, so the second one is the previous.
            previousTag = releases[1].tag_name;
        }

        if (!previousTag) {
            console.log("Could not determine the previous release tag. Using the first commit.");
            // Fallback: Get all commits if no previous tag is found
            previousTag = execSync('git rev-list --max-parents=0 HEAD').toString().trim();
        }

        // 2. Get the commit comparison between the new release and the previous one
        const compareUrl = prContext.event.repository.compare_url
            .replace('{base}', previousTag)
            .replace('{head}', release.tag_name);
            
        const compareResponse = await fetch(compareUrl, { headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` } });
        const compareData = await compareResponse.json();
        
        if (compareData.commits && compareData.commits.length > 0) {
            const commitMessages = compareData.commits.map(c => `- ${c.commit.message}`).join('\n');
            const releaseNotes = await callGemini(RELEASE_NOTES_PROMPT_TEMPLATE + commitMessages);
            await updateReleaseNotes(release.id, releaseNotes);
        } else {
            console.log("No new commits found since last release.");
        }
    } else {
        console.log("Event was not a pull request or a release. Skipping.");
    }
}

main();