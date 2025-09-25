import { getOrFetchAllData } from './api.js';
import { getSession, logout, handleLoginAttempt, setSession } from './auth.js';
import { processStudentData } from './dataProcessor.js';
import {
    initializeUI, setAppData, showView, hideProgressBar, showProgressBar,
    buildHMDashboard, buildTeacherDashboard, buildParentDashboard, buildStudentDashboard,
    renderHouseWidget, setLanguage, buildSearchResults, updateDashboardHeader
} from './ui.js';
import { isActivityForStudent } from './utils.js';
import { activityRules } from './config.js';

// --- GLOBAL APP STATE ---
let appData = {};
let currentUser = null;
let widgetRefreshInterval = null;
let disciplineModal, iframeModal, dobVerifyModal, houseWidgetModal;

/**
* The main application initializer. Orchestrates data fetching and UI rendering.
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

        const searchContainer = document.getElementById('header-search-container');
        const searchInput = document.getElementById('headerSearch');
        
        if ((currentUser.designation === 'HM' || currentUser.role === 'staff') && searchInput) {
            searchContainer.classList.remove('d-none');
            searchInput.addEventListener('input', e => {
                const query = e.target.value.toLowerCase();
                const searchResultsEl = document.getElementById('headerSearchResults');
                if (!query) {
                    if(searchResultsEl) searchResultsEl.innerHTML = '';
                    return;
                }
                const results = appData.processedStudents.filter(s =>
                    s.name.toLowerCase().includes(query) || s.admissionNo.toString().includes(query)
                );
                buildSearchResults(results);
            });
        } else if(searchContainer) {
            searchContainer.classList.add('d-none');
        }

        if (currentUser.designation === 'HM') {
            buildHMDashboard(currentUser, allStudents, appData.processedStudents);
        } else if (currentUser.role === 'staff') {
            buildTeacherDashboard(currentUser, allStudents, appData.processedStudents);
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
        console.error("Initialization failed:", error);
        alert("A critical error occurred while loading the application. Please try again later.");
        logout();
    } finally {
        hideProgressBar();
    }
}

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    disciplineModal = new bootstrap.Modal(document.getElementById('disciplineModal'));
    iframeModal = new bootstrap.Modal(document.getElementById('iframeModal'));
    dobVerifyModal = new bootstrap.Modal(document.getElementById('dobVerifyModal'));
    houseWidgetModal = new bootstrap.Modal(document.getElementById('houseWidgetModal'));

    initializeUI({ discipline: disciplineModal, iframe: iframeModal, dobVerify: dobVerifyModal });

    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            showProgressBar();
            const errorElement = document.getElementById('loginError');
            if (errorElement) errorElement.textContent = '';
            try {
                const phone = document.getElementById('phone').value;
                const dob = document.getElementById('dob').value;
                const user = await handleLoginAttempt(phone, dob);
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

    const dashboardView = document.getElementById('dashboardView');
    if (dashboardView) {
        dashboardView.addEventListener('click', e => {
            const target = e.target;

            if (target.closest('#backToParentDashboardBtn') || target.closest('#backToDashboardBtn')) {
                initializeApp();
            } else if (target.closest('#showDiscipline')) {
                const button = target.closest('#showDiscipline');
                const admNo = button.dataset.admissionNo;
                const student = appData.processedStudents.find(s => s.admissionNo.toString() === admNo);
                if (student) {
                    const modalBody = document.getElementById('modal-content-body');
                    const studentActivities = appData.activities.filter(a => isActivityForStudent(a, student));
                    modalBody.innerHTML = `<div class="table-responsive"><table class="table table-sm"><thead><tr><th>Date</th><th>Activity</th><th>Points</th></tr></thead><tbody>${studentActivities.length > 0 ? studentActivities.map(act => `<tr><td>${new Date(act.Timestamp).toLocaleDateString()}</td><td>${act.Activity}</td><td class="${(activityRules[act.Activity] || 0) > 0 ? 'text-success' : 'text-danger'} fw-semibold">${((act.Rating / 5) * (activityRules[act.Activity] || 0)).toFixed(1)}</td></tr>`).join('') : '<tr><td colspan="3" class="text-center">No activities logged.</td></tr>'}</tbody></table></div>`;
                    disciplineModal.show();
                }
            } else if (target.matches('[data-admission-no]')) {
                const admNo = target.dataset.admissionNo;
                const student = appData.processedStudents.find(s => s.admissionNo.toString() === admNo);
                if (student) {
                    buildStudentDashboard(student, appData.activities, currentUser, []);
                }
                const searchInput = document.getElementById('headerSearch');
                const searchResultsEl = document.getElementById('headerSearchResults');
                if(searchInput) searchInput.value = '';
                if(searchResultsEl) searchResultsEl.innerHTML = '';
            } else if (target.closest('#launchWidgetBtn')) {
                renderHouseWidget(appData.processedStudents, appData.activities);
                houseWidgetModal.show();
            }
        });
    }

    const widgetModalEl = document.getElementById('houseWidgetModal');
    if (widgetModalEl) {
        widgetModalEl.addEventListener('shown.bs.modal', () => {
            widgetRefreshInterval = setInterval(() => {
                renderHouseWidget(appData.processedStudents, appData.activities);
            }, 60000);
        });
        widgetModalEl.addEventListener('hidden.bs.modal', () => {
            clearInterval(widgetRefreshInterval);
        });
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

    const savedLang = localStorage.getItem('language') || 'en';
    setLanguage(savedLang);

    initializeApp();
});

