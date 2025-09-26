import { gradeConfig } from './config.js';

/**
 * Sanitizes a string to prevent XSS attacks by converting HTML special characters.
 * @param {string} str The input string.
 * @returns {string} The sanitized string.
 */
export function sanitize(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

/**
 * Determines the school section (LP, UP, HS) based on a class name.
 * @param {string} className The class (e.g., "5", "10").
 * @returns {string} The corresponding section.
 */
export function getSection(className) {
    const classNum = parseInt(className, 10);
    if (classNum >= 1 && classNum <= 4) return 'LP';
    if (classNum >= 5 && classNum <= 7) return 'UP';
    if (classNum >= 8 && classNum <= 10) return 'HS';
    return 'Other';
}

/**
 * Determines the sections a teacher is responsible for based on their designation.
 * @param {string} designation The teacher's designation (e.g., "HST", "LPST").
 * @returns {Array<string>|null} An array of sections or null.
 */
export function getTeacherSection(designation) {
    if (designation === 'LPST') return ['LP'];
    if (designation === 'UPST') return ['UP'];
    if (designation && (designation.startsWith('HST'))) return ['HS'];
    if (designation === 'PET' || designation === 'Drawing Teacher') return ['UP', 'HS'];
    return null;
}

/**
 * Custom sort function to correctly order class names (e.g., "10-A" after "9-B").
 */
export function customClassSort(a, b) {
    const partsA = a.split('-');
    const partsB = b.split('-');
    const numA = parseInt(partsA[0], 10);
    const numB = parseInt(partsB[0], 10);
    if (numA !== numB) return numA - numB;
    return (partsA[1] || '').localeCompare(partsB[1] || '');
}

/**
 * Checks if an activity entry applies to a given student and returns the number of occurrences.
 */
export function isActivityForStudent(activity, student) {
    const studentAdmNoStr = student.admissionNo.toString();
    const activityAdmNo = activity.admissionNo;

    if (Array.isArray(activityAdmNo)) {
        return activityAdmNo.filter(adm => adm.toString() === studentAdmNoStr).length;
    } else if (activityAdmNo) {
        return activityAdmNo.toString() === studentAdmNoStr ? 1 : 0;
    }
    return 0;
}

/**
 * Calculates grade info based on the central gradeConfig object.
 * @returns {object} An object containing { grade, cssClass, maxMark }.
 */
export function getGradeInfo(mark, subject, termKey, studentClass) {
    const section = getSection(studentClass);
    const classNum = parseInt(studentClass, 10);

    const termMarksConfig = gradeConfig.maxMarks[termKey] || gradeConfig.maxMarks.default;
    let maxMark = termMarksConfig.default;
    if (termMarksConfig[section]) {
        maxMark = termMarksConfig[section][classNum]?.[subject] || termMarksConfig[section][classNum]?.default || termMarksConfig[section].default || maxMark;
    }

    if (typeof mark !== 'number' || mark === null) {
        return { grade: 'Ab', cssClass: '', maxMark };
    }

    const percentage = (mark / maxMark) * 100;
    const grades = (section === 'UP' || classNum === 8) ? gradeConfig.upHs8Grades : gradeConfig.defaultGrades;
    const thresholds = Object.keys(grades).map(Number).sort((a, b) => b - a);

    for (const threshold of thresholds) {
        if (percentage >= threshold) {
            const grade = grades[threshold];
            const cssClass = `grade-${grade.charAt(0).toLowerCase()}${grade.includes('+') ? '-plus' : ''}`;
            return { grade, cssClass, maxMark };
        }
    }
    return { grade: 'E', cssClass: 'grade-e', maxMark };
}

/**
 * Calculates the Continuous Evaluation (CE) mark for a High School student.
 * The minimum CE mark is 7.
 * @param {number} teMark The Terminal Evaluation (TE) mark.
 * @param {number} maxMark The maximum possible TE mark.
 * @returns {number} The calculated CE mark.
 */
export function calculateCE_HS(teMark, maxMark) {
    if (typeof teMark !== 'number' || maxMark === 0) return 7; // Return minimum if TE is absent
    const percentage = (teMark / maxMark) * 100;
    const ceMark = (percentage / 100) * 20; // CE is out of 20
    return Math.max(7, Math.round(ceMark)); // Ensure minimum is 7
}

/**
 * Calculates the Continuous Evaluation (CE) grade for an Upper Primary student.
 * The minimum CE grade is 'C'.
 * @param {string} teGrade The Terminal Evaluation (TE) grade.
 * @returns {string} The calculated CE grade.
 */
export function calculateCE_UP(teGrade) {
    const gradeOrder = ['E', 'D', 'C', 'B', 'A'];
    if (!teGrade || teGrade === 'Ab') return 'C'; // Return minimum if TE is absent
    const teIndex = gradeOrder.indexOf(teGrade);
    const cIndex = gradeOrder.indexOf('C');
    return teIndex < cIndex ? 'C' : teGrade; // Return 'C' if TE grade is lower, otherwise return TE grade
}

