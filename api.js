import { APP_VERSION } from './config.js';

// --- CONFIGURATION ---
// The maximum age of the cache in milliseconds.
// 1 * 60 * 60 * 1000 = 1 hour. Change the first number to set a different duration in hours.
const CACHE_DURATION_MS = 1 * 60 * 60 * 1000;

// Private function to fetch data from the network
async function fetchAllData() {
    try {
        const [usersRes, marksRes, activitiesRes] = await Promise.all([
            fetch('./users.json'),
            fetch('./marks.json'),
            fetch('./activities.json')
        ]);
        if (!usersRes.ok || !marksRes.ok || !activitiesRes.ok) {
            throw new Error('Network response was not ok');
        }
        const users = await usersRes.json();
        const marks = await marksRes.json();
        const activities = await activitiesRes.json();
        return { users, marks, activities };
    } catch (error) {
        console.error("Failed to fetch critical data:", error);
        throw new Error("Could not load school data. Please check your network connection.");
    }
}

/**
 * Caching layer for application data. Fetches from the network only if
 * the cache is empty, the app version has changed, OR the cache is too old.
 * @returns {Promise<object>} A promise that resolves to { users, marks, activities }.
 */
export async function getOrFetchAllData() {
    const cachedData = JSON.parse(localStorage.getItem('appDataCache'));
    const cachedVersion = localStorage.getItem('appDataVersion');
    const cachedTimestamp = localStorage.getItem('appDataCacheTimestamp');
    const now = Date.now();

    // Check if the cache is valid
    if (cachedData && cachedVersion === APP_VERSION && cachedTimestamp && (now - parseInt(cachedTimestamp, 10) < CACHE_DURATION_MS)) {
        console.log("Using fresh, cached data.");
        return cachedData;
    }

    // If cache is invalid, old, or doesn't exist, fetch new data
    console.log("Cache is old or invalid. Fetching new data from network...");
    const newData = await fetchAllData();
    localStorage.setItem('appDataCache', JSON.stringify(newData));
    localStorage.setItem('appDataVersion', APP_VERSION);
    localStorage.setItem('appDataCacheTimestamp', now.toString()); // Store the current timestamp
    return newData;
}

