import { gradeConfig } from './config.js';

function findTermConfig(termKey) {
    const lowerTermKey = termKey.toLowerCase().trim();
    if (lowerTermKey.includes('monthly exam 01')) return gradeConfig.maxMarks['Monthly Exam 01'];
    if (lowerTermKey.includes('first mid term')) return gradeConfig.maxMarks['First Mid Term Exam'];
    if (lowerTermKey.includes('first term')) return gradeConfig.maxMarks['First Term Exam'];
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

/**
 * NEW: Calculates CE marks for High School based on new rules.
 */
export function calculateCE_HS(mark, teMaxMark) {
    if (typeof mark !== 'number' || teMaxMark === 0) return (teMaxMark === 80 ? 14 : 7); // Minimum CE

    const ceMaxMark = teMaxMark === 80 ? 20 : 10;
    const minCeMark = teMaxMark === 80 ? 14 : 7;
    
    const percentage = (mark / teMaxMark) * 100;
    
    if (percentage >= 90) return ceMaxMark;
    if (percentage >= 75) return ceMaxMark - (ceMaxMark * 0.1); // 18 or 9
    if (percentage >= 60) return ceMaxMark - (ceMaxMark * 0.2); // 16 or 8
    
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

