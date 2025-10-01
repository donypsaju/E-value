import { isActivityForStudent } from './utils.js';
import { activityRules } from './config.js';

export function processStudentData(students, marksData, activities) {
    const studentsByClass = students.reduce((acc, student) => {
        const classKey = `${student.class}-${student.division}`;
        if (!acc[classKey]) acc[classKey] = [];
        acc[classKey].push(student);
        return acc;
    }, {});

    let finalProcessedStudents = [];
    for (const classKey in studentsByClass) {
        const classStudents = studentsByClass[classKey];
        const studentScores = classStudents.map(student => {
            const studentMarksRecord = marksData.find(m => m.admissionNo.toString() === student.admissionNo.toString());
            let academicTotal = 0;
            if (studentMarksRecord && studentMarksRecord.terms) {
                academicTotal = Object.values(studentMarksRecord.terms).reduce((sum, term) => sum + (typeof term.total === 'number' ? term.total : 0), 0);
            }

            const disciplinePoints = activities
                .reduce((sum, act) => {
                    const occurrences = isActivityForStudent(act, student);
                    if (occurrences > 0) {
                        const basePoints = activityRules[act.Activity] || 0;
                        const calculatedPoints = (act.Rating / 10) * basePoints;
                        return sum + (calculatedPoints * occurrences);
                    }
                    return sum;
                }, 0);

            const housePoints = academicTotal + disciplinePoints;

            return { ...student, academicTotal, disciplinePoints, housePoints, marksRecord: studentMarksRecord };
        });
        studentScores.sort((a, b) => b.academicTotal - a.academicTotal).forEach((s, i) => s.academicRank = i + 1);
        studentScores.sort((a, b) => b.disciplinePoints - a.disciplinePoints).forEach((s, i) => s.disciplineRank = i + 1);
        finalProcessedStudents.push(...studentScores);
    }
    return finalProcessedStudents;
}

/**
 * Calculates scores and ranks for SIU members.
 */
export function processSiuMemberData(siuMembers, activities, attendanceData, allUsers) {
    if (!siuMembers || siuMembers.length === 0) return [];

    const augmentedSiuMembers = siuMembers.map(member => {
        const userProfile = allUsers.find(u => u.admissionNo && u.admissionNo.toString() === member.admissionNo.toString());
        return { ...member, dob: userProfile ? userProfile.dob : null };
    });

    const entriesPerMember = augmentedSiuMembers.map(member => 
        activities.filter(act => act.submittedBy.toLowerCase() === member.email.toLowerCase()).length
    );
    const maxEntries = Math.max(...entriesPerMember, 1);

    const totalAttendanceDays = attendanceData.length;

    const processedMembers = augmentedSiuMembers.map(member => {
        // THE FIX: Convert both emails to lowercase for a case-insensitive comparison.
        const memberActivities = activities.filter(act => 
            act.submittedBy && member.email && act.submittedBy.toLowerCase() === member.email.toLowerCase()
        );
        const totalEntries = memberActivities.length;

        const timelyEntries = memberActivities.filter(act => {
            const submissionTime = new Date(act.submissionTimestamp).getTime();
            const activityTime = new Date(act.activityDate).getTime();
            return (submissionTime - activityTime) <= (24 * 60 * 60 * 1000);
        }).length;
        const timelinessScore = (totalEntries > 0) ? (timelyEntries / totalEntries) * 50 : 0;

        const entryCountScore = (maxEntries > 0) ? (totalEntries / maxEntries) * 40 : 0;

        const absentDays = attendanceData.filter(day => day.absentees.includes(member.admissionNo)).length;
        const presentDays = totalAttendanceDays - absentDays;
        const attendanceScore = (totalAttendanceDays > 0) ? (presentDays / totalAttendanceDays) * 10 : 10;

        const totalPoints = Math.round(timelinessScore + entryCountScore + attendanceScore);

        const last5Entries = memberActivities.slice(-5).reverse();

        return {
            ...member,
            totalEntries,
            timelinessScore: Math.round(timelinessScore),
            entryCountScore: Math.round(entryCountScore),
            attendanceScore: Math.round(attendanceScore),
            totalPoints,
            presentDays,
            last5Entries
        };
    });

    processedMembers.sort((a, b) => b.totalPoints - a.totalPoints);
    processedMembers.forEach((member, index) => { member.rank = index + 1; });

    return processedMembers;
}

