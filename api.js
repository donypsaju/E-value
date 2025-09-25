import { APP_VERSION } from './config.js';

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
 * the cache is empty or the app version has changed.
 * @returns {Promise<object>} A promise that resolves to { users, marks, activities }.
 */
export async function getOrFetchAllData() {
    try {
        const cachedDataString = localStorage.getItem('appDataCache');
        const cachedVersion = localStorage.getItem('appDataVersion');

        if (cachedDataString && cachedVersion === APP_VERSION) {
            console.log("Using fast, cached data.");
            const cachedData = JSON.parse(cachedDataString);
            return cachedData;
        }
    } catch (e) {
        console.warn("Could not parse cached data, fetching fresh.", e);
        // Clear potentially corrupt cache
        localStorage.removeItem('appDataCache');
        localStorage.removeItem('appDataVersion');
    }


    console.log("Fetching new data from network...");
    const newData = await fetchAllData();
    localStorage.setItem('appDataCache', JSON.stringify(newData));
    localStorage.setItem('appDataVersion', APP_VERSION);
    return newData;
}

