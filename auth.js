import { getOrFetchAllData } from './api.js';

const SESSION_KEY = 'currentUser';

export function setSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function getSession() {
    const user = localStorage.getItem(SESSION_KEY);
    return user ? JSON.parse(user) : null;
}

export function logout() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('appDataVersion'); // Force data refresh on next login
    location.reload();
}

export async function handleLoginAttempt(phoneOrAdmNo, dob) {
    const { users, siu_members } = await getOrFetchAllData();

    // First, try to log in as a regular user via phone number
    let foundUser = users.find(user => {
        if (!user.phone || !user.dob) return false;
        const phoneMatch = Array.isArray(user.phone) ? user.phone.includes(phoneOrAdmNo) : user.phone === phoneOrAdmNo;
        return phoneMatch && user.dob === dob;
    });

    if (foundUser) {
        setSession(foundUser);
        return foundUser;
    }

    // If that fails, try to log in as an SIU member via admission number
    const siuMemberProfile = (siu_members || []).find(siu => siu.admissionNo.toString() === phoneOrAdmNo);
    
    if (siuMemberProfile) {
        // Find the DOB for this SIU member from the main users list
        // THE FIX: Add a check for `u.admissionNo` to safely skip users without one (like staff).
        const mainProfile = users.find(u => u.admissionNo && u.admissionNo.toString() === siuMemberProfile.admissionNo.toString());
        if (mainProfile && mainProfile.dob === dob) {
            // It's a valid SIU member. Create a special user object for them.
            const siuUser = {
                role: 'siu', // New role
                name: siuMemberProfile.name,
                admissionNo: siuMemberProfile.admissionNo,
                email: siuMemberProfile.email,
                dob: mainProfile.dob
            };
            setSession(siuUser);
            return siuUser;
        }
    }

    return null; // No user found
}

