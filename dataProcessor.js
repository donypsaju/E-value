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
 * Calculates scores and ranks for SIU members, including previous day's rank.
 */
export function processSiuMemberData(siuMembers, allActivities, allAttendance, allUsers, filterMonth = null) {
    if (!siuMembers || siuMembers.length === 0) return [];

    const augmentedSiuMembers = siuMembers.map(member => {
        const userProfile = allUsers.find(u => u.admissionNo && u.admissionNo.toString() === member.admissionNo.toString());
        return { ...member, dob: userProfile ? userProfile.dob : null };
    });

    // --- Filter data based on the selected month ---
    let activities, attendanceData, activitiesBefore, attendanceBefore;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let currentPeriodStart = new Date(0); // The beginning of time

    if (filterMonth) {
        const [monthName, year] = filterMonth.split(' ');
        const monthIndex = new Date(Date.parse(monthName +" 1, 2021")).getMonth();
        
        currentPeriodStart = new Date(year, monthIndex, 1);
        const nextMonthStart = new Date(year, monthIndex + 1, 1);

        activities = allActivities.filter(act => {
            const actDate = new Date(act.activityDate || act.submissionTimestamp);
            return actDate >= currentPeriodStart && actDate < nextMonthStart;
        });
        attendanceData = allAttendance.filter(att => {
            const attDate = new Date(att.date);
            return attDate >= currentPeriodStart && attDate < nextMonthStart;
        });
    } else {
        activities = allActivities;
        attendanceData = allAttendance;
    }

    // --- Calculate Previous Ranks (relative to the start of the current period) ---
    activitiesBefore = allActivities.filter(act => new Date(act.activityDate || act.submissionTimestamp) < currentPeriodStart);
    attendanceBefore = allAttendance.filter(att => new Date(att.date) < currentPeriodStart);

    const previousDayRanks = augmentedSiuMembers.map(member => {
        const memberActivities = activitiesBefore.filter(act => act.submittedBy && member.email && act.submittedBy.toLowerCase() === member.email.toLowerCase());
        
        let timelinessScore = 0;
        let entryCountScore = 0;
        memberActivities.forEach(act => {
            const numStudents = Array.isArray(act.admissionNo) ? act.admissionNo.length : 1;
            entryCountScore += numStudents * 5;
            const subTime = new Date(act.submissionTimestamp).getTime();
            const actTime = new Date(act.activityDate + 'T00:00:00Z').getTime();
            if (subTime < (actTime + 48 * 3600 * 1000)) {
                timelinessScore += numStudents * 10;
            }
        });
        
        const absentDays = attendanceBefore.filter(day => day.absentees.includes(member.admissionNo)).length;
        const presentDays = attendanceBefore.length - absentDays;
        const attendanceScore = presentDays * 3;

        return {
            admissionNo: member.admissionNo,
            previousPoints: timelinessScore + entryCountScore + attendanceScore
        };
    }).sort((a, b) => b.previousPoints - a.previousPoints)
      .map((member, index) => ({ ...member, previousRank: index + 1 }));

    // --- Calculate Current Ranks (for the selected period) ---
    const totalAttendanceDays = attendanceData.length;
    const processedMembers = augmentedSiuMembers.map(member => {
        const memberActivities = activities.filter(act => act.submittedBy && member.email && act.submittedBy.toLowerCase() === member.email.toLowerCase());
        
        let timelinessScore = 0;
        let totalStudentEntries = 0;
        memberActivities.forEach(act => {
            if (act.admissionNo == null) return; 
            const numStudentsInEntry = Array.isArray(act.admissionNo) ? act.admissionNo.length : 1;
            totalStudentEntries += numStudentsInEntry;
            const submissionTime = new Date(act.submissionTimestamp).getTime();
            const activityDayStart = new Date(act.activityDate + 'T00:00:00Z').getTime();
            if (submissionTime < activityDayStart + (48 * 60 * 60 * 1000)) {
                timelinessScore += numStudentsInEntry * 10;
            }
        });
        
        const entryCountScore = totalStudentEntries * 5;
        const absentDays = attendanceData.filter(day => day.absentees.includes(member.admissionNo)).length;
        const presentDays = totalAttendanceDays - absentDays;
        const attendanceScore = presentDays * 3;
        const totalPoints = timelinessScore + entryCountScore + attendanceScore;

        const previousRankData = previousDayRanks.find(r => r.admissionNo === member.admissionNo);
        const previousRank = previousRankData ? previousRankData.previousRank : null;

        return {
            ...member,
            totalEntries: totalStudentEntries,
            timelinessScore, entryCountScore, attendanceScore, totalPoints, presentDays,
            last5Entries: memberActivities.slice(-5).reverse(),
            previousRank: previousRank
        };
    });

    processedMembers.sort((a, b) => b.totalPoints - a.totalPoints);
    processedMembers.forEach((member, index) => { member.rank = index + 1; });

    return processedMembers;
}

