import { getOrFetchAllData, submitMarks } from './api.js';
import { getSession, logout, handleLoginAttempt, setSession } from './auth.js';
import { processStudentData, processSiuMemberData } from './dataProcessor.js';
import {
    initializeUI, setAppData, showView, hideProgressBar, showProgressBar,
    buildHMDashboard, buildTeacherDashboard, buildParentDashboard, buildStudentDashboard,
    renderHouseWidget, setLanguage, buildSearchResults, updateDashboardHeader, buildSiuDashboard,
    buildHouseEvaluationContent, buildSiuEvaluationContent
} from './ui.js';
import { isActivityForStudent, getTeacherSection, getSection, customClassSort, getGradeInfo } from './utils.js';
import { activityRules } from './config.js';

// --- GLOBAL APP STATE ---
let appData = {};
let currentUser = null;
let widgetRefreshInterval = null;
let detailModal, iframeModal, dobVerifyModal, houseWidgetModal, hmVerifyModal, evaluationModal;

/**
* The main application initializer.
*/
async function initializeApp() {
    currentUser = getSession();
    if (!currentUser) {
        showView('home');
        return;
    }

    showProgressBar();
    try {
        const data = await getOrFetchAllData();
        appData = { ...data };

        setAppData(appData, currentUser);
        showView('dashboard');
        updateDashboardHeader(currentUser);

        const allStudents = appData.users.filter(u => u.role === 'student');
        appData.processedStudents = processStudentData(allStudents, appData.marks, appData.activities);

        const today = new Date();
        const todayMonth = today.getMonth() + 1;
        const todayDate = today.getDate();

        const staffBirthdays = appData.users.filter(user => {
            if (user.role !== 'staff' || !user.dob) return false;
            const dob = new Date(user.dob);
            return dob.getMonth() + 1 === todayMonth && dob.getDate() === todayDate;
        });

        let studentBirthdays = [];
        if (currentUser.designation === 'HM') {
            studentBirthdays = allStudents.filter(student => {
                if (!student.dob) return false;
                const dob = new Date(student.dob);
                return dob.getMonth() + 1 === todayMonth && dob.getDate() === todayDate;
            });
        } else if (currentUser.role === 'staff') {
            const teacherSections = getTeacherSection(currentUser.designation);
            if (teacherSections) {
                const sectionStudents = allStudents.filter(s => teacherSections.includes(getSection(s.class)));
                studentBirthdays = sectionStudents.filter(student => {
                    if (!student.dob) return false;
                    const dob = new Date(student.dob);
                    return dob.getMonth() + 1 === todayMonth && dob.getDate() === todayDate;
                });
            }
        }
        
        const finalStaffBirthdays = Array.isArray(staffBirthdays) ? staffBirthdays : [];
        const finalStudentBirthdays = Array.isArray(studentBirthdays) ? studentBirthdays : [];
        
        const searchContainer = document.getElementById('header-search-container');
        const searchInput = document.getElementById('headerSearch');
        if ((currentUser.designation === 'HM' || currentUser.role === 'staff') && searchInput) {
            searchContainer.classList.remove('d-none');
            searchInput.addEventListener('input', e => {
                const query = e.target.value.toLowerCase();
                const searchResultsEl = document.getElementById('headerSearchResults');
                if (!query) {
                    if (searchResultsEl) searchResultsEl.innerHTML = '';
                    return;
                }
                const results = appData.processedStudents.filter(s =>
                    s.name.toLowerCase().includes(query) || s.admissionNo.toString().includes(query)
                );
                buildSearchResults(results);
            });
        } else if (searchContainer) {
            searchContainer.classList.add('d-none');
        }

        if (currentUser.role === 'siu') {
            const processedSiuMembers = processSiuMemberData(appData.siu_members, appData.activities, appData.attendance_siu, appData.users);
            const currentSiuMemberData = processedSiuMembers.find(m => m.admissionNo === currentUser.admissionNo);
            if (currentSiuMemberData) {
                document.getElementById('dashboard-container').innerHTML = buildSiuDashboard(currentSiuMemberData, processedSiuMembers);
            } else {
                document.getElementById('dashboard-container').innerHTML = `<p class="text-danger">Could not load SIU member data.</p>`;
            }
        } else if (currentUser.designation === 'HM') {
            buildHMDashboard(currentUser, allStudents, appData.processedStudents, finalStaffBirthdays, finalStudentBirthdays);
        } else if (currentUser.role === 'staff') {
            buildTeacherDashboard(currentUser, allStudents, appData.processedStudents, finalStaffBirthdays, finalStudentBirthdays);
        } else if (currentUser.role === 'student') {
            const currentUserPhones = Array.isArray(currentUser.phone) ? currentUser.phone : [currentUser.phone];
            const siblings = allStudents.filter(s => {
                if (s.admissionNo.toString() === currentUser.admissionNo.toString()) return false;
                const siblingPhones = Array.isArray(s.phone) ? s.phone : [s.phone];
                return currentUserPhones.some(p => siblingPhones.includes(p));
            });
            if (siblings.length > 0) {
                buildParentDashboard(currentUser, siblings, appData.processedStudents);
            } else {
                const studentData = appData.processedStudents.find(s => s.admissionNo.toString() === currentUser.admissionNo.toString());
                if (studentData) {
                    buildStudentDashboard(studentData, appData.activities, currentUser, siblings);
                }
            }
        }
    } catch (error) {
        console.error("Initialization failed: A critical error occurred.");
        console.error("Error Message:", error.message);
        console.error("Stack Trace:", error.stack);
        alert("A critical error occurred while loading the application. Please check the console for details.");
        logout();
    } finally {
        hideProgressBar();
    }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    detailModal = new bootstrap.Modal(document.getElementById('detailModal'));
    iframeModal = new bootstrap.Modal(document.getElementById('iframeModal'));
    dobVerifyModal = new bootstrap.Modal(document.getElementById('dobVerifyModal'));
    houseWidgetModal = new bootstrap.Modal(document.getElementById('houseWidgetModal'));
    hmVerifyModal = new bootstrap.Modal(document.getElementById('hmVerifyModal'));
    evaluationModal = new bootstrap.Modal(document.getElementById('evaluationModal'));

    initializeUI({ detail: detailModal, iframe: iframeModal, dobVerify: dobVerifyModal });

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js').then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            }, err => {
                console.log('ServiceWorker registration failed: ', err);
            });
        });
    }

    // 2. Show the "Add to Home Screen" prompt only for iOS users
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS && !window.navigator.standalone) {
        const installPrompt = document.getElementById('ios-install-prompt');
        if (installPrompt) {
            installPrompt.style.display = 'block';
            new bootstrap.Toast(installPrompt).show();
        }
    }

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            showProgressBar();
            const errorElement = document.getElementById('loginError');
            if (errorElement) errorElement.textContent = '';
            try {
                const phoneOrAdmNo = document.getElementById('phone').value;
                const dob = document.getElementById('dob').value;
                const user = await handleLoginAttempt(phoneOrAdmNo, dob);
                if (user) {
                    await initializeApp();
                } else {
                    if (errorElement) errorElement.textContent = 'Invalid credentials. Please try again.';
                    hideProgressBar();
                }
            } catch (error) {
                console.error("Login attempt failed:", error);
                if (errorElement) errorElement.textContent = 'An unexpected error occurred during login.';
                hideProgressBar();
            }
        });
    }

    const dobVerifyForm = document.getElementById('dobVerifyForm');
    if (dobVerifyForm) {
        dobVerifyForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const admNo = document.getElementById('dobVerifyAdmissionNo').value;
            const dob = document.getElementById('dobVerifyInput').value;
            const errorEl = document.getElementById('dobError');
            errorEl.textContent = '';
            const targetStudent = appData.users.find(s => s.role === 'student' && s.admissionNo.toString() === admNo);
            if (targetStudent && targetStudent.dob === dob) {
                setSession(targetStudent);
                dobVerifyModal.hide();
                await initializeApp();
            } else {
                errorEl.textContent = "Incorrect date of birth. Please try again.";
            }
        });
    }

    const hmVerifyForm = document.getElementById('hmVerifyForm');
    if (hmVerifyForm) {
        hmVerifyForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const dob = document.getElementById('hmDobInput').value;
            const errorEl = document.getElementById('hmDobError');
            if (currentUser && currentUser.dob === dob) {
                hmVerifyModal.hide();
                houseWidgetModal.hide();
                hmVerifyForm.reset();
                if (errorEl) errorEl.textContent = '';
            } else {
                if (errorEl) errorEl.textContent = "Incorrect Date of Birth. Authorization failed.";
            }
        });
    }

    const dashboardView = document.getElementById('dashboardView');
    if (dashboardView) {
        dashboardView.addEventListener('click', e => {
            const target = e.target;
            const studentProfileTrigger = target.closest('.view-sibling-profile, .list-group-item[data-admission-no]');

            if (target.closest('[data-action="evaluate-houses"]')) {
                document.getElementById('evaluationModalLabel').textContent = 'House Evaluation Dashboard';
                document.getElementById('evaluationModalBody').innerHTML = buildHouseEvaluationContent(appData.processedStudents, appData.activities);
                evaluationModal.show();
            } else if (target.closest('[data-action="evaluate-siu"]')) {
                const processedSiuMembers = processSiuMemberData(appData.siu_members, appData.activities, appData.attendance_siu, appData.users);
                document.getElementById('evaluationModalLabel').textContent = 'SIU Evaluation Dashboard';
                document.getElementById('evaluationModalBody').innerHTML = buildSiuEvaluationContent(processedSiuMembers, appData.activities);
                evaluationModal.show();
            } else if (target.closest('#backToParentDashboardBtn') || target.closest('#backToDashboardBtn')) {
                initializeApp();
            } else if (target.closest('#showDiscipline')) {
                const button = target.closest('#showDiscipline');
                const admNo = button.dataset.admissionNo;
                const student = appData.processedStudents.find(s => s.admissionNo.toString() === admNo);
                if (student) {
                    document.getElementById('detailModalLabel').textContent = 'Discipline & Activity Log';
                    const modalBody = document.getElementById('detailModalBody');
                    const studentActivities = appData.activities.filter(a => isActivityForStudent(a, student));
                    modalBody.innerHTML = `<div class="table-responsive"><table class="table table-sm"><thead><tr><th>Date</th><th>Activity</th><th>Points</th></tr></thead><tbody>${studentActivities.length > 0 ? studentActivities.map(act => { const dateToDisplay = act.activityDate ? new Date(act.activityDate) : new Date(act.submissionTimestamp); const basePoints = activityRules[act.Activity] || 0; const calculatedPoints = (act.Rating / 10) * basePoints; return `<tr><td>${dateToDisplay.toLocaleDateString()}</td><td>${act.Activity}</td><td class="${basePoints > 0 ? 'text-success' : 'text-danger'} fw-semibold">${calculatedPoints.toFixed(1)}</td></tr>` }).join('') : '<tr><td colspan="3" class="text-center">No activities logged.</td></tr>'}</tbody></table></div>`;
                    detailModal.show();
                }
            } else if (target.closest('#showScoreBreakdownBtn')) {
                const button = target.closest('#showScoreBreakdownBtn');
                const timeliness = button.dataset.timeliness;
                const entrycount = button.dataset.entrycount;
                const attendance = button.dataset.attendance;
                const total = parseInt(timeliness) + parseInt(entrycount) + parseInt(attendance);
                document.getElementById('detailModalLabel').textContent = 'Score Calculation Breakdown';
                document.getElementById('detailModalBody').innerHTML = `
                    <p>Your total score is an uncapped value based on your performance in three key areas.</p>
                    <ul class="list-group">
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            <div><strong>Timeliness Score</strong><p class="small mb-0 text-muted">You get <strong>10 points</strong> for every timely student entry.</p></div>
                            <span class="badge bg-primary rounded-pill fs-5">${timeliness} pts</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            <div><strong>Activity Entry Score</strong><p class="small mb-0 text-muted">You get <strong>5 points</strong> for every individual student activity you record.</p></div>
                            <span class="badge bg-info rounded-pill fs-5">${entrycount} pts</span>
                        </li>
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                             <div><strong>Attendance Score</strong><p class="small mb-0 text-muted">You get <strong>3 points</strong> for every day you are present.</p></div>
                             <span class="badge bg-success rounded-pill fs-5">${attendance} pts</span>
                        </li>
                          <li class="list-group-item d-flex justify-content-between align-items-center list-group-item-dark">
                             <strong class="fs-5">Total Points</strong><strong class="fs-4">${total} pts</strong>
                        </li>
                    </ul>`;
                detailModal.show();
            } else if (studentProfileTrigger) {
                const admNo = studentProfileTrigger.dataset.admissionNo;
                const student = appData.processedStudents.find(s => s.admissionNo.toString() === admNo);
                if (student) {
                    const allStudents = appData.users.filter(u => u.role === 'student');
                    const studentPhones = Array.isArray(student.phone) ? student.phone : [student.phone];
                    const siblings = allStudents.filter(s => {
                        if (s.admissionNo.toString() === student.admissionNo.toString()) return false;
                        const siblingPhones = Array.isArray(s.phone) ? s.phone : [s.phone];
                        return studentPhones.some(p => siblingPhones.includes(p));
                    });
                    buildStudentDashboard(student, appData.activities, currentUser, siblings);
                }
                const searchInput = document.getElementById('headerSearch');
                const searchResultsEl = document.getElementById('headerSearchResults');
                if (searchInput) searchInput.value = '';
                if (searchResultsEl) searchResultsEl.innerHTML = '';
            } else if (target.closest('#launchWidgetBtn')) {
                renderHouseWidget(appData.processedStudents, appData.activities);
                houseWidgetModal.show();
            } else if (target.closest('[data-action="add-activity"]') || target.closest('[data-action="discipline"]')) {
                const url = "https://forms.gle/FntrejQSM8tve45R7";
                document.getElementById('iframeModalTitle').textContent = "Add Activity Entry";
                document.getElementById('modalIframe').src = url;
                iframeModal.show();
            } else if (target.closest('[data-action="mark-entry"]')) {
                document.getElementById('evaluationModalLabel').textContent = 'Mark Entry';
                const teacherSections = getTeacherSection(currentUser.designation);
                document.getElementById('evaluationModalBody').innerHTML = buildMarkEntryForm(teacherSections, appData.processedStudents);
                evaluationModal.show();
            }
        });
    }
    
    // --- New listener for the evaluation modal's dynamic content ---
    const evaluationModalEl = document.getElementById('evaluationModal');
    if (evaluationModalEl) {
        evaluationModalEl.addEventListener('change', e => {
            const target = e.target;
            const form = target.closest('#markEntryForm');
            if (!form) return;

            const termSelect = form.querySelector('#entry-term');
            const classSelect = form.querySelector('#entry-class');
            const subjectSelect = form.querySelector('#entry-subject');
            const studentContainer = form.querySelector('#student-marks-container');
            const submitBtn = form.querySelector('#submitMarksBtn');

            if (target === termSelect) {
                const teacherSections = getTeacherSection(currentUser.designation);
                const sectionStudents = appData.processedStudents.filter(s => teacherSections.includes(getSection(s.class)));
                const classes = [...new Set(sectionStudents.map(s => `${s.class}-${s.division}`))].sort(customClassSort);
                classSelect.innerHTML = `<option value="">Select Class</option>` + classes.map(c => `<option value="${c}">${c}</option>`).join('');
                classSelect.disabled = false;
            }

            if (target === classSelect) {
                const className = classSelect.value;
                const term = termSelect.value;
                const subjects = [...new Set(appData.marks.flatMap(m => m.terms?.[term]?.marks ? Object.keys(m.terms[term].marks) : []))].sort();
                subjectSelect.innerHTML = `<option value="">Select Subject</option>` + subjects.map(s => `<option value="${s}">${s}</option>`).join('');
                subjectSelect.disabled = false;
            }

            if (target === subjectSelect) {
                const className = classSelect.value;
                const subject = subjectSelect.value;
                if (!className || !subject) return;

                const classStudents = appData.users.filter(u => u.role === 'student' && `${u.class}-${u.division}` === className)
                    .sort((a,b) => a.name.localeCompare(b.name));
                
                let tableHTML = `<div class="table-responsive"><table class="table"><thead><tr><th>Sl.No</th><th>Name</th><th>Mark</th><th>Grade</th></tr></thead><tbody>`;
                classStudents.forEach((student, index) => {
                    tableHTML += `
                        <tr data-admission-no="${student.admissionNo}">
                            <td>${index + 1}</td>
                            <td>${sanitize(student.name)}</td>
                            <td><input type="number" class="form-control mark-input" min="0" max="100"></td>
                            <td class="grade-cell"></td>
                        </tr>`;
                });
                tableHTML += `</tbody></table></div>`;
                studentContainer.innerHTML = tableHTML;
                submitBtn.disabled = false;
            }
        });

        evaluationModalEl.addEventListener('input', e => {
            if (e.target.matches('.mark-input')) {
                const mark = parseFloat(e.target.value);
                const row = e.target.closest('tr');
                const gradeCell = row.querySelector('.grade-cell');
                
                const term = document.getElementById('entry-term').value;
                const subject = document.getElementById('entry-subject').value;
                const className = document.getElementById('entry-class').value.split('-')[0];

                const { grade, cssClass } = getGradeInfo(mark, subject, term, className);
                gradeCell.textContent = grade;
                gradeCell.className = `grade-cell ${cssClass}`;
            }
        });

        evaluationModalEl.addEventListener('submit', async e => {
            if (e.target.id === 'markEntryForm') {
                e.preventDefault();
                const statusEl = document.getElementById('mark-entry-status');
                statusEl.innerHTML = `<p class="text-info">Submitting... Please wait.</p>`;

                const form = e.target;
                const sheetName = form.querySelector('#entry-class').value;
                const term = form.querySelector('#entry-term').value;
                const subject = form.querySelector('#entry-subject').value;
                
                const marksToSubmit = [];
                form.querySelectorAll('#student-marks-container tr').forEach(row => {
                    const markInput = row.querySelector('.mark-input');
                    if (markInput.value !== '') {
                        marksToSubmit.push({
                            admissionNo: row.dataset.admissionNo,
                            mark: parseFloat(markInput.value)
                        });
                    }
                });

                if(marksToSubmit.length > 0){
                    const result = await submitMarks({ sheetName, term, subject, marks: marksToSubmit });
                    if(result.success){
                        statusEl.innerHTML = `<p class="text-success">All marks submitted successfully! The dashboard will update after the next hourly sync.</p>`;
                        form.reset();
                        form.querySelector('#student-marks-container').innerHTML = '';
                    } else {
                           statusEl.innerHTML = `<p class="text-danger">Submission failed: ${result.message}</p>`;
                    }
                } else {
                       statusEl.innerHTML = `<p class="text-warning">No marks were entered to submit.</p>`;
                }
            }
        });
    }
    const widgetModalEl = document.getElementById('houseWidgetModal');
    if (widgetModalEl) {
        widgetModalEl.addEventListener('shown.bs.modal', () => {
            renderHouseWidget(appData.processedStudents, appData.activities);
            widgetRefreshInterval = setInterval(() => {
                renderHouseWidget(appData.processedStudents, appData.activities);
            }, 60000);
        });
        widgetModalEl.addEventListener('hidden.bs.modal', () => {
            clearInterval(widgetRefreshInterval);
        });
        const closeButton = widgetModalEl.querySelector('.btn-close');
        if (closeButton) {
            closeButton.setAttribute('data-bs-toggle', 'modal');
            closeButton.setAttribute('data-bs-target', '#hmVerifyModal');
            closeButton.removeAttribute('data-bs-dismiss');
        }
    }

    document.querySelectorAll('.logout-btn').forEach(btn => btn.addEventListener('click', logout));
    document.getElementById('goToLoginBtn')?.addEventListener('click', () => showView('login'));
    document.getElementById('backToHomeBtn')?.addEventListener('click', () => showView('home'));

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', (e) => setLanguage(e.target.dataset.lang));
    });
    document.querySelectorAll('.theme-switcher-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-bs-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-bs-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });
    });

    if (!localStorage.getItem('theme')) {
        localStorage.setItem('theme', 'dark');
        document.documentElement.setAttribute('data-bs-theme', 'dark');
    }
    const savedLang = localStorage.getItem('language') || 'ml';
    setLanguage(savedLang);

    initializeApp();
});