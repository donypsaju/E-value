import { getOrFetchAllData } from './api.js';

const SESSION_KEY = 'currentUser';

/**
 * Saves the logged-in user's data to the browser's local storage.
 * @param {object} user The user object to save.
 */
export function setSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

/**
 * Retrieves the logged-in user's data from local storage.
 * @returns {object|null} The user object or null if no session exists.
 */
export function getSession() {
    const user = localStorage.getItem(SESSION_KEY);
    return user ? JSON.parse(user) : null;
}

/**
 * Clears the current user session and reloads the page to reset the application state.
 */
export function logout() {
    localStorage.removeItem(SESSION_KEY);
    // Reloading is a simple way to ensure the entire app state is reset.
    location.reload();
}

/**
 * Attempts to log in a user by matching their phone and DOB against the user data.
 * @param {string} phone The phone number from the login form.
 * @param {string} dob The date of birth from the login form.
 * @returns {Promise<object|null>} A promise that resolves to the found user object, or null if login fails.
 */
export async function handleLoginAttempt(phone, dob) {
    // Fetches fresh or cached data before attempting to log in.
    const { users } = await getOrFetchAllData();

    // Find a user whose credentials match the input.
    const foundUser = users.find(user => {
        if (!user.phone || !user.dob) return false;
        // Handles cases where 'phone' is an array (for students with multiple contacts) or a single string.
        const phoneMatch = Array.isArray(user.phone) ? user.phone.includes(phone) : user.phone === phone;
        return phoneMatch && user.dob === dob;
    });

    if (foundUser) {
        setSession(foundUser);
        return foundUser;
    }

    return null; // Return null if no matching user was found.
}

