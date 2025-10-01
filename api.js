import { APP_VERSION } from './config.js';

const CACHE_DURATION_MS = 1 * 60 * 60 * 1000; // 1 hour

async function fetchAllData() {
    try {
        const filePromises = [
            fetch('./users.json'),
            fetch('./marks.json'),
            fetch('./activities.json'),
            fetch('./siu_members.json'),
            fetch('./attendance_siu.json')
        ];

        const responses = await Promise.all(filePromises);

        // Helper function to safely parse JSON, even if the file is empty.
        const safeJsonParse = async (response, isOptional = false) => {
            // If the file was not found (404) and it's optional, return an empty array.
            if (!response.ok && response.status === 404 && isOptional) {
                return [];
            }
            // If any other error occurred, throw.
            if (!response.ok) {
                throw new Error(`Failed to fetch a required file (status: ${response.status})`);
            }

            const text = await response.text();
            // If the file is empty, return an empty array. Otherwise, parse the text.
            return text.trim() === '' ? [] : JSON.parse(text);
        };

        const users = await safeJsonParse(responses[0]);
        const marks = await safeJsonParse(responses[1]);
        const activities = await safeJsonParse(responses[2]);
        const siu_members = await safeJsonParse(responses[3], true); // Mark as optional
        const attendance_siu = await safeJsonParse(responses[4], true); // Mark as optional

        // Final check to ensure essential data arrays exist.
        if (!users || !marks || !activities) {
             throw new Error('Essential data files (users, marks, or activities) could not be loaded.');
        }

        return { users, marks, activities, siu_members, attendance_siu };

    } catch (error) {
        console.error("Failed to fetch critical data:", error);
        // Provide a more helpful error message to the user.
        throw new Error("Could not load school data. Please check your network connection and ensure all JSON files in the repository are not empty or malformed.");
    }
}


export async function getOrFetchAllData() {
    const cachedData = JSON.parse(localStorage.getItem('appDataCache'));
    const cachedVersion = localStorage.getItem('appDataVersion');
    const cachedTimestamp = localStorage.getItem('appDataCacheTimestamp');
    const now = Date.now();

    if (cachedData && cachedVersion === APP_VERSION && cachedTimestamp && (now - parseInt(cachedTimestamp, 10) < CACHE_DURATION_MS)) {
        console.log("Using fresh, cached data.");
        return cachedData;
    }

    console.log("Cache is old or invalid. Fetching new data from network...");
    const newData = await fetchAllData();
    localStorage.setItem('appDataCache', JSON.stringify(newData));
    localStorage.setItem('appDataVersion', APP_VERSION);
    localStorage.setItem('appDataCacheTimestamp', now.toString());
    return newData;
}

