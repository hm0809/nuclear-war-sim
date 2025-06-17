/**
 * Fetches JSON data from a specified file path.
 * @param {string} filePath - The path to the JSON file.
 * @returns {Promise<object>} - A promise that resolves with the parsed JSON data.
 */
async function loadJSON(filePath) {
    try {
        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Could not fetch JSON from ${filePath}:`, error);
        return null;
    }
}