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
 * Calculates scores and ranks for SIU members based on an additive point system.
 */
export function processSiuMemberData(siuMembers, activities, attendanceData, allUsers) {
    if (!siuMembers || siuMembers.length === 0) return [];

    const augmentedSiuMembers = siuMembers.map(member => {
        const userProfile = allUsers.find(u => u.admissionNo && u.admissionNo.toString() === member.admissionNo.toString());
        return { ...member, dob: userProfile ? userProfile.dob : null };
    });
    
    const totalAttendanceDays = attendanceData.length;

    const processedMembers = augmentedSiuMembers.map(member => {
        const memberActivities = activities.filter(act => 
            act.submittedBy && member.email && act.submittedBy.toLowerCase() === member.email.toLowerCase()
        );
        
        let timelinessScore = 0;
        let totalStudentEntries = 0; // Use a direct counter

        memberActivities.forEach(act => {
            // Ensure admissionNo exists and is not null before processing
            if (act.admissionNo == null) return; 
            
            const numStudentsInEntry = Array.isArray(act.admissionNo) ? act.admissionNo.length : 1;
            
            // Directly count the number of students
            totalStudentEntries += numStudentsInEntry;

            // Check if the submission was timely
            const submissionTime = new Date(act.submissionTimestamp).getTime();
            const activityDayStart = new Date(act.activityDate + 'T00:00:00Z').getTime();
            const deadline = activityDayStart + (48 * 60 * 60 * 1000);
            
            // If timely, add 10 points for every student in that submission
            if (submissionTime < deadline) {
                timelinessScore += numStudentsInEntry * 10;
            }
        });
        
        // Calculate Entry Count Score from the direct count
        const entryCountScore = totalStudentEntries * 5;
        
        // 3. Calculate Attendance Score (3 points per present day)
        const absentDays = attendanceData.filter(day => day.absentees.includes(member.admissionNo)).length;
        const presentDays = totalAttendanceDays - absentDays;
        const attendanceScore = presentDays * 3;

        // Combine all scores for the total
        const totalPoints = timelinessScore + entryCountScore + attendanceScore;

        const last5Entries = memberActivities.slice(-5).reverse();

        return {
            ...member,
            totalEntries: totalStudentEntries, // Use the direct, correct count for display
            timelinessScore,
            entryCountScore,
            attendanceScore,
            totalPoints,
            presentDays,
            last5Entries
        };
    });

    processedMembers.sort((a, b) => b.totalPoints - a.totalPoints);
    processedMembers.forEach((member, index) => { member.rank = index + 1; });

    return processedMembers;
}

