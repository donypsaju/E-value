import { activityRules } from './config.js';
import { isActivityForStudent } from './utils.js';

/**
 * Processes raw student, marks, and activity data to calculate ranks and points.
 * @param {Array<object>} students - The array of all student users.
 * @param {Array<object>} marksData - The array of all mark records.
 * @param {Array<object>} activities - The array of all activity records.
 * @returns {Array<object>} A new array of student objects with processed data (ranks, totals).
 */
export function processStudentData(students, marksData, activities) {
    // Group students by their class and division for ranking within those groups.
    const studentsByClass = students.reduce((acc, student) => {
        const classKey = `${student.class}-${student.division}`;
        if (!acc[classKey]) acc[classKey] = [];
        acc[classKey].push(student);
        return acc;
    }, {});

    let finalProcessedStudents = [];

    // Process each class group individually.
    for (const classKey in studentsByClass) {
        const classStudents = studentsByClass[classKey];
        const studentScores = classStudents.map(student => {
            const studentMarksRecord = marksData.find(m => m.admissionNo.toString() === student.admissionNo.toString());
            let academicTotal = 0;
            if (studentMarksRecord && studentMarksRecord.terms) {
                // Sum up the 'total' from each term for an overall academic score.
                academicTotal = Object.values(studentMarksRecord.terms).reduce((sum, term) => sum + (typeof term.total === 'number' ? term.total : 0), 0);
            }

            // Calculate the total discipline points from all activities.
            const disciplinePoints = activities
                .reduce((sum, act) => {
                    const occurrences = isActivityForStudent(act, student);
                    if (occurrences > 0) {
                        const basePoints = activityRules[act.Activity] || 0;
                        // Prorate points based on the activity's rating.
                        const calculatedPoints = (act.Rating / 5) * basePoints;
                        return sum + (calculatedPoints * occurrences);
                    }
                    return sum;
                }, 0);

            // House points are a combination of academic and discipline scores.
            const housePoints = academicTotal + disciplinePoints;

            return { ...student, academicTotal, disciplinePoints, housePoints, marksRecord: studentMarksRecord };
        });

        // Rank students within their class based on academic and discipline scores.
        studentScores.sort((a, b) => b.academicTotal - a.academicTotal).forEach((s, i) => s.academicRank = i + 1);
        studentScores.sort((a, b) => b.disciplinePoints - a.disciplinePoints).forEach((s, i) => s.disciplineRank = i + 1);

        // Add the processed students from this class to the final list.
        finalProcessedStudents.push(...studentScores);
    }

    return finalProcessedStudents;
}

