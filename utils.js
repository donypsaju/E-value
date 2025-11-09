import { gradeConfig, EXAM_CONFIG } from './config.js';

function findTermConfig(termKey) {
    const lowerTermKey = termKey.toLowerCase().trim();
    
    // Dynamically check all keys from EXAM_CONFIG
    for (const examName in EXAM_CONFIG) {
        if (lowerTermKey.includes(examName.toLowerCase())) {
            return gradeConfig.maxMarks[examName];
        }
    }
    
    // Fallback if no specific exam config is found
    return gradeConfig.maxMarks.default;
}

export function sanitize(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

export function getSection(className) {
    const classNum = parseInt(className, 10);
    if (classNum >= 1 && classNum <= 4) return 'LP';
    if (classNum >= 5 && classNum <= 7) return 'UP';
    if (classNum >= 8 && classNum <= 10) return 'HS';
    return 'Other';
}

export function getTeacherSection(designation) {
    if (designation === 'LPST') return ['LP'];
    if (designation === 'UPST') return ['UP'];
    if (designation && (designation.startsWith('HST'))) return ['HS'];
    if (designation === 'PET' || designation === 'Drawing Teacher') return ['UP', 'HS'];
    return null;
}

export function customClassSort(a, b) {
    const partsA = a.split('-');
    const partsB = b.split('-');
    const numA = parseInt(partsA[0], 10);
    const numB = parseInt(partsB[0], 10);
    if (numA !== numB) return numA - numB;
    return (partsA[1] || '').localeCompare(partsB[1] || '');
}

/**
 * A more robust function to check if an activity belongs to a student.
 * It safely handles null or undefined values in the data.
 * @param {object} activity The activity object from activities.json.
 * @param {object} student The student object from the processed list.
 * @returns {number} The number of times the student is linked to the activity.
 */
export function isActivityForStudent(activity, student) {
    // Safety check: ensure the student object and its admissionNo are valid
    if (!student || student.admissionNo == null) {
        return 0;
    }

    const studentAdmNoStr = student.admissionNo.toString();
    const activityAdmNo = activity.admissionNo;

    // Safety check for the activity's admission number
    if (activityAdmNo == null) {
        return 0;
    }

    if (Array.isArray(activityAdmNo)) {
        // More robust check: explicitly check for null or undefined inside the array.
        return activityAdmNo.filter(adm => adm != null && adm.toString() === studentAdmNoStr).length;
    } else {
        return activityAdmNo.toString() === studentAdmNoStr ? 1 : 0;
    }
}


export function getGradeInfo(mark, subject, termKey, studentClass) {
    const section = getSection(studentClass);
    const classNum = parseInt(studentClass, 10);
    const termMarksConfig = findTermConfig(termKey);
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

export function calculateCE_HS(mark, teMaxMark) {
    if (typeof mark !== 'number' || teMaxMark === 0) return (teMaxMark === 80 ? 14 : 7);

    const ceMaxMark = teMaxMark === 80 ? 20 : 10;
    const minCeMark = teMaxMark === 80 ? 14 : 7;
    
    const percentage = (mark / teMaxMark) * 100;
    
    if (percentage >= 90) return ceMaxMark;
    if (percentage >= 75) return Math.round(ceMaxMark - (ceMaxMark * 0.1));
    if (percentage >= 60) return Math.round(ceMaxMark - (ceMaxMark * 0.2));
    
    return minCeMark;
}

export function calculateCE_UP(grade) {
    const gradeOrder = ['E', 'D', 'C', 'B', 'A'];
    const minGradeIndex = gradeOrder.indexOf('C');
    const studentGradeIndex = gradeOrder.indexOf(grade);
    
    if (studentGradeIndex === -1 || studentGradeIndex < minGradeIndex) {
        return 'C';
    }
    return grade;
}

