import { APP_VERSION } from './config.js';

// --- CONFIGURATION ---
const CACHE_DURATION_MS = 1 * 60 * 60 * 1000; // 1 hour

// IMPORTANT: Replace this with your own strong, secret password!
const ENCRYPTION_KEY = "Emm@nu3l-Sch00l-D@t@-2025!";

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

        // Helper function to fetch, decrypt, and safely parse JSON.
        const decryptAndParse = async (response, isOptional = false) => {
            if (!response.ok) {
                if (response.status === 404 && isOptional) return []; // File not found, but it's optional
                throw new Error(`Failed to fetch a file (status: ${response.status})`);
            }

            const encryptedText = await response.text();
            if (encryptedText.trim() === '') return []; // File is empty

            try {
                const decryptedBytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
                const decryptedText = decryptedBytes.toString(CryptoJS.enc.Utf8);
                if (!decryptedText) throw new Error("Decryption resulted in empty text. Check your key.");
                return JSON.parse(decryptedText);
            } catch (e) {
                console.error("Decryption failed. This might be due to an incorrect key or corrupted data.", e);
                throw new Error("Could not decrypt data.");
            }
        };

        const users = await decryptAndParse(responses[0]);
        const marks = await decryptAndParse(responses[1]);
        const activities = await decryptAndParse(responses[2]);
        const siu_members = await decryptAndParse(responses[3], true);
        const attendance_siu = await decryptAndParse(responses[4], true);

        if (!users || !marks || !activities) {
             throw new Error('Essential data files (users, marks, or activities) could not be decrypted or loaded.');
        }

        return { users, marks, activities, siu_members, attendance_siu };

    } catch (error) {
        console.error("Failed to fetch and decrypt critical data:", error);
        throw new Error("Could not load school data. Please check your network connection and ensure the encryption key is correct.");
    }
}


export async function getOrFetchAllData() {
    // Caching logic is disabled for simplicity with encryption. 
    // You can re-enable it if you cache the decrypted data, but direct fetching is safer.
    console.log("Fetching and decrypting fresh data from network...");
    return await fetchAllData();
}

