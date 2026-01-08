import { sanitize, getGradeInfo, getSection, getTeacherSection, customClassSort, isActivityForStudent, calculateCE_HS, calculateCE_UP } from './utils.js';
import { translations, activityRules, EXAM_CONFIG } from './config.js';

// --- GLOBAL UI STATE ---
let standingsChartInstance = null;
let teacherStandingsChartInstance = null;
let appData = {};
let currentUser = null;

// DOM elements
let homeView, loginView, dashboardView, progressBar, globalControls;
let detailModal, iframeModal, dobVerifyModal;

// --- INITIALIZATION ---

export function initializeUI(modals) {
    homeView = document.getElementById('homeView');
    loginView = document.getElementById('loginView');
    dashboardView = document.getElementById('dashboardView');
    progressBar = document.getElementById('progressBarContainer');
    globalControls = document.getElementById('globalControls');
    detailModal = modals.detail;
    iframeModal = modals.iframe;
    dobVerifyModal = modals.dobVerify;
}

export function setAppData(data, user) {
    appData = data;
    currentUser = user;
}

export function showView(viewName) {
    if (homeView) homeView.classList.add('d-none');
    if (loginView) {
        loginView.classList.remove('d-flex');
        loginView.classList.add('d-none');
    }
    if (dashboardView) dashboardView.classList.add('d-none');
    if (globalControls) globalControls.classList.add('d-none');

    if (viewName === 'home' || viewName === 'login') {
        if (globalControls) globalControls.classList.remove('d-none');
    }

    if (viewName === 'home' && homeView) {
        homeView.classList.remove('d-none');
    } else if (viewName === 'login' && loginView) {
        loginView.classList.remove('d-none');
        loginView.classList.add('d-flex');
        const phoneInput = document.getElementById('phone');
        if (phoneInput) phoneInput.placeholder = "Phone or Admission No.";
    } else if (viewName === 'dashboard' && dashboardView) {
        dashboardView.classList.remove('d-none');
    }
}

export function showProgressBar() {
    if (progressBar) progressBar.classList.remove('d-none');
}

export function hideProgressBar() {
    if (progressBar) progressBar.classList.add('d-none');
}

export function updateDashboardHeader(user) {
    if (!user) return;
    const roleText = user.role === 'siu' ? 'SIU' : (user.designation || 'Student');
    const userInfoHTML = `<p class="fw-semibold text-primary mb-0">${sanitize(user.name)}</p><p class="small text-muted mb-0">${sanitize(roleText)}</p>`;
    const userInfoMobile = document.getElementById('userInfoMobile');
    const userInfoDesktop = document.getElementById('userInfoDesktop');
    if (userInfoMobile) userInfoMobile.innerHTML = userInfoHTML;
    if (userInfoDesktop) userInfoDesktop.innerHTML = userInfoHTML;
}

export function buildSearchResults(results) {
    const searchResultsEl = document.getElementById('headerSearchResults');
    if (!searchResultsEl) return;

    if (results.length > 0) {
        searchResultsEl.innerHTML = `<ul class="list-group">${results.map(s =>
            `<li class="list-group-item list-group-item-action" style="cursor: pointer;" data-admission-no="${s.admissionNo}">${sanitize(s.name)} - ${sanitize(s.class)}${sanitize(s.division)}</li>`
        ).join('')}</ul>`;
    } else {
        searchResultsEl.innerHTML = `<div class="p-2 text-muted small">No students found.</div>`;
    }
}

// --- HELPER FUNCTIONS ---

function getSelectedValues(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return [];
    return Array.from(select.selectedOptions).map(option => option.value);
}

/**
 * Dynamically updates the "Target" dropdown based on the "Criteria" selection.
 */
function updateTargetOptions(criteria, students, targetSelectId) {
    const targetSelect = document.getElementById(targetSelectId);
    if (!targetSelect) return;

    let options = [];
    if (criteria === 'section') {
        options = ['LP', 'UP', 'HS']; 
    } else if (criteria === 'class') {
        options = [...new Set(students.map(s => s.class))].sort((a, b) => a - b);
    } else { // 'division'
        options = [...new Set(students.map(s => `${s.class}-${s.division}`))].sort(customClassSort);
    }

    targetSelect.innerHTML = options.map(o => `<option value="${o}" selected>${o}</option>`).join('');
}

/**
 * Dynamically updates the "Subject" dropdown based on Selected Exams and Students.
 * FIXED: Now looks at 'marks' property instead of 'subjects'.
 */
function updateSubjectOptions(students, selectedExams, subjectSelectId) {
    const subjectSelect = document.getElementById(subjectSelectId);
    if (!subjectSelect) return;

    const useAllExams = selectedExams.includes('ALL') || selectedExams.length === 0;
    const uniqueSubjects = new Set();

    students.forEach(s => {
        if (!s.marksRecord?.terms) return;
        
        const examsToScan = useAllExams ? Object.keys(s.marksRecord.terms) : selectedExams;
        
        examsToScan.forEach(examKey => {
            const termData = s.marksRecord.terms[examKey];
            // Check 'marks' object specifically
            if (termData?.marks) {
                Object.keys(termData.marks).forEach(subj => uniqueSubjects.add(subj));
            }
        });
    });

    const sortedSubjects = Array.from(uniqueSubjects).sort();
    subjectSelect.innerHTML = sortedSubjects.map(s => `<option value="${s}" selected>${s}</option>`).join('');
}


function buildBirthdayCardsHTML(staffBirthdays, studentBirthdays) {
    const safeStaffBirthdays = staffBirthdays || [];
    const safeStudentBirthdays = studentBirthdays || [];

    if (safeStaffBirthdays.length === 0 && safeStudentBirthdays.length === 0) {
        return '';
    }

    let staffCardHTML = '';
    if (safeStaffBirthdays.length > 0) {
        const staffCarouselItems = safeStaffBirthdays.map((staff, index) => `
            <div class="carousel-item ${index === 0 ? 'active' : ''}">
                <div class="d-flex flex-column justify-content-center align-items-center h-100 p-3 text-center">
                    <i class="fa-solid fa-cake-candles fa-2x text-warning mb-2"></i>
                    <h5 class="fw-bold mb-1">${sanitize(staff.name)}</h5>
                    <p class="text-muted mb-0 small">${sanitize(staff.designation)}</p>
                </div>
            </div>`).join('');
        
        staffCardHTML = `
            <div class="card shadow-sm h-100">
                <div class="card-body">
                    <h5 class="card-title fw-bold text-center mb-2">Staff Birthdays</h5>
                    <div id="staffBirthdayCarousel" class="carousel slide" data-bs-ride="carousel" data-bs-interval="3000">
                        <div class="carousel-inner rounded" style="min-height: 120px; background-color: var(--bs-light-bg-subtle);">
                            ${staffCarouselItems}
                        </div>
                        <button class="carousel-control-prev" type="button" data-bs-target="#staffBirthdayCarousel" data-bs-slide="prev"><span class="carousel-control-prev-icon" aria-hidden="true"></span></button>
                        <button class="carousel-control-next" type="button" data-bs-target="#staffBirthdayCarousel" data-bs-slide="next"><span class="carousel-control-next-icon" aria-hidden="true"></span></button>
                    </div>
                </div>
            </div>`;
    }

    let studentCardHTML = '';
    if (safeStudentBirthdays.length > 0) {
        const studentCarouselItems = safeStudentBirthdays.map((student, index) => `
            <div class="carousel-item ${index === 0 ? 'active' : ''}">
                <div class="d-flex flex-column justify-content-center align-items-center h-100 p-3 text-center">
                    <i class="fa-solid fa-gift fa-2x text-info mb-2"></i>
                    <h5 class="fw-bold mb-1">${sanitize(student.name)}</h5>
                    <p class="text-muted mb-0 small">Class ${sanitize(student.class)}-${sanitize(student.division)}</p>
                </div>
            </div>`).join('');

        studentCardHTML = `
            <div class="card shadow-sm h-100">
                <div class="card-body">
                    <h5 class="card-title fw-bold text-center mb-2">Student Birthdays</h5>
                    <div id="studentBirthdayCarousel" class="carousel slide" data-bs-ride="carousel" data-bs-interval="3500">
                        <div class="carousel-inner rounded" style="min-height: 120px; background-color: var(--bs-light-bg-subtle);">
                            ${studentCarouselItems}
                        </div>
                        <button class="carousel-control-prev" type="button" data-bs-target="#studentBirthdayCarousel" data-bs-slide="prev"><span class="carousel-control-prev-icon" aria-hidden="true"></span></button>
                        <button class="carousel-control-next" type="button" data-bs-target="#studentBirthdayCarousel" data-bs-slide="next"><span class="carousel-control-next-icon" aria-hidden="true"></span></button>
                    </div>
                </div>
            </div>`;
    }

    let finalHTML = '';
    if (staffCardHTML && studentCardHTML) {
        finalHTML = `<div class="col-md-6">${staffCardHTML}</div><div class="col-md-6">${studentCardHTML}</div>`;
    } else {
        finalHTML = `<div class="col-md-12">${staffCardHTML || studentCardHTML}</div>`;
    }

    return `<div class="row g-4 mb-4">${finalHTML}</div>`;
}

// --- DASHBOARD BUILDERS ---

export function buildHMDashboard(user, allStudents, processedStudents, staffBirthdays, studentBirthdays) {
    const birthdayCarouselsHTML = buildBirthdayCardsHTML(staffBirthdays, studentBirthdays);
    
    document.getElementById('dashboard-container').innerHTML = `
        <div class="card shadow-sm dashboard-card mb-4">
            <div class="card-body"><h2 class="h5 card-title fw-bold mb-3">Quick Actions</h2>
                <div class="d-flex flex-wrap gap-2">
                    <button id="launchWidgetBtn" class="btn themed-bg action-btn rounded-pill"><i class="fa-solid fa-trophy me-1"></i> Launch House Widget</button>
                    <button data-action="evaluate-siu" class="btn btn-info action-btn rounded-pill text-white">Evaluate SIU</button>
                    <button data-action="evaluate-houses" class="btn btn-warning action-btn rounded-pill text-dark">Evaluate Houses</button>
                    <button data-action="discipline" class="btn themed-bg action-btn rounded-pill">Discipline Entry</button>
                    <a href="https://docs.google.com/spreadsheets/d/1qSlfrIqTrJGg_zN-R7b9zVRBG0l-OB8K/edit" target="_blank" class="btn themed-bg action-btn rounded-pill">HS Marks</a>
                </div>
            </div>
        </div>
        ${birthdayCarouselsHTML}
        
        <div class="card shadow-sm dashboard-card mb-4">
            <div class="card-body">
                <h2 class="h5 card-title fw-bold mb-3">House Standings</h2>
                <div id="standingsFilterContainer" class="mb-3"></div>
                <div style="height: 300px;"><canvas id="standingsChart"></canvas></div>
            </div>
        </div>

        <div id="leaderboardCard" class="mb-4"></div>
        <div id="classToppersCard" class="mb-4"></div>
        <div id="subjectToppersCard" class="mb-4"></div>
        <div id="reportGeneratorCard"></div>`;

    buildStandingsChart(processedStudents, appData.activities, appData.marks, 'standingsChart', 'standingsFilterContainer');
    buildLeaderboardCard(processedStudents, appData.activities);
    buildClassToppersCard(processedStudents);
    buildSubjectToppersCard(processedStudents);
    buildReportGeneratorCard(processedStudents);
}

export function buildTeacherDashboard(user, allStudents, processedStudents, staffBirthdays, studentBirthdays) {
    const dashboardContainer = document.getElementById('dashboard-container');
    const teacherSections = getTeacherSection(user.designation);
    if (!teacherSections || teacherSections.length === 0) {
        dashboardContainer.innerHTML = `<div class="card text-danger shadow-sm dashboard-card"><div class="card-body"><h2 class="h5 card-title fw-bold">Configuration Error</h2><p>Your user profile is missing a valid section designation.</p></div></div>`;
        return;
    }

    const markEntryUrls = {
        UP: "https://docs.google.com/spreadsheets/d/1RyqclF_XUeMHNY3yAsJ8m4i1e3RDJOGQVor_4KyRqDU/edit?usp=sharing",
        HS: "https://docs.google.com/spreadsheets/d/16xR0xvCIR1ulNVzB0D2ZddccDFLlwwLAuFZp_m5IJLI/edit?usp=drivesdk"
    };
    const markEntryButtons = teacherSections.map(section => `<a href="${markEntryUrls[section]}" target="_blank" class="btn themed-bg action-btn rounded-pill">${section} Mark Entry</a>`).join('');
    
    const sectionStudents = processedStudents.filter(s => teacherSections.includes(getSection(s.class)));
    const birthdayCarouselsHTML = buildBirthdayCardsHTML(staffBirthdays, studentBirthdays);

    dashboardContainer.innerHTML = `
        <div class="card shadow-sm dashboard-card mb-4"><div class="card-body"><h2 class="h5 card-title fw-bold mb-3">Quick Actions</h2><div class="d-flex flex-wrap gap-2"><button data-action="evaluate-houses" class="btn btn-warning action-btn rounded-pill text-dark">Evaluate Houses</button><button data-action="discipline" class="btn themed-bg action-btn rounded-pill">Discipline Entry</button>${markEntryButtons}</div></div></div>
        ${birthdayCarouselsHTML}
        
        <div class="card shadow-sm mb-4">
            <div class="card-body">
                <h2 class="h5 card-title fw-bold mb-3">House Standings</h2>
                <div id="teacherStandingsFilterContainer" class="mb-3"></div>
                <div style="height: 300px;"><canvas id="teacherStandingsChart"></canvas></div>
            </div>
        </div>

        <div id="leaderboardCard" class="mb-4"></div>
        <div id="classToppersCard" class="mb-4"></div>
        <div id="subjectToppersCard" class="mb-4"></div>
        <div id="reportGeneratorCard"></div>`;

    buildStandingsChart(sectionStudents, appData.activities, appData.marks, 'teacherStandingsChart', 'teacherStandingsFilterContainer');
    buildLeaderboardCard(sectionStudents, appData.activities);
    buildClassToppersCard(sectionStudents);
    buildSubjectToppersCard(sectionStudents);
    buildReportGeneratorCard(sectionStudents);
}

export function buildParentDashboard(currentChild, siblings, processedStudents) {
    const dashboardContainer = document.getElementById('dashboard-container');
    const allChildren = [currentChild, ...siblings].sort((a, b) => a.name.localeCompare(b.name));
    dashboardContainer.innerHTML = `
    <div class="card shadow-sm dashboard-card">
        <div class="card-body">
            <h2 class="h5 card-title fw-bold">Parent Dashboard</h2>
            <p class="card-text mb-4">Select a child to view their detailed academic profile.</p>
            <div class="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
                ${allChildren.map(child => {
                    const studentData = processedStudents.find(s => s.admissionNo.toString() === child.admissionNo.toString());
                    const borderClass = currentUser && child.admissionNo.toString() === currentUser.admissionNo.toString() ? 'border-primary' : '';
                    return `
                    <div class="col">
                        <div class="card h-100 ${borderClass}">
                            <div class="card-body d-flex flex-column">
                                <h3 class="h6 card-title fw-bold">${sanitize(child.name)}</h3>
                                <p class="small">Class ${sanitize(child.class)}-${sanitize(child.division)}</p>
                                <p class="small">House: ${sanitize(child.house)}</p>
                                ${studentData ? `
                                <div class="mt-2 small">
                                    <p>Academic Rank: <span class="fw-bold themed-text">#${studentData.academicRank}</span></p>
                                    <p>Discipline Rank: <span class="fw-bold themed-text">#${studentData.disciplineRank}</span></p>
                                </div>` : ''}
                                <button class="btn btn-sm themed-bg w-100 mt-auto view-sibling-profile" data-admission-no="${sanitize(child.admissionNo)}">
                                    ${currentUser && child.admissionNo.toString() === currentUser.admissionNo.toString() ? 'View Full Profile' : 'Switch to Profile'}
                                </button>
                            </div>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>
    </div>`;
}

export function buildSiuDashboard(siuMemberData, allSiuMembers, availableMonths, selectedMonth = 'All-Time', isModal = false) {
    const lastEntriesHTML = siuMemberData.last5Entries.map(entry => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
            <div>
                <p class="mb-0 fw-semibold">${sanitize(entry.Activity)}</p>
                <p class="small text-muted mb-0">For Adm No: ${sanitize(String(Array.isArray(entry.admissionNo) ? entry.admissionNo.join(', ') : entry.admissionNo))}</p>
            </div>
            <span class="badge bg-secondary rounded-pill">${new Date(entry.activityDate).toLocaleDateString()}</span>
        </li>
    `).join('');

    const rankingTableHTML = allSiuMembers.map(member => `
        <tr class="${member.admissionNo === siuMemberData.admissionNo ? 'table-primary' : ''}">
            <th scope="row">${member.rank}</th>
            <td>${sanitize(member.name)}</td>
            <td>${member.totalPoints}</td>
        </tr>
    `).join('');
    
    const monthOptions = `<option value="All-Time">All-Time</option>` +
        availableMonths.map(month => `<option value="${month}" ${month === selectedMonth ? 'selected' : ''}>${month}</option>`).join('');

    const filterHTML = `
        <div class="col-12 col-md-auto">
            <label for="siuRankFilter" class="form-label small">Filter by Month</label>
            <select class="form-select form-select-sm" id="siuRankFilter">
                ${monthOptions}
            </select>
        </div>`;

    const mainHeader = isModal ? '' : `
        <div class="row g-3 justify-content-between align-items-center mb-4">
            <div class="col-auto"><h2 class="h4 fw-bold themed-text mb-0">SIU Performance Dashboard</h2></div>
            <div class="col-auto d-flex gap-2">
                ${isModal ? '' : filterHTML}
                <button data-action="add-activity" class="btn themed-bg action-btn rounded-pill"><i class="fa-solid fa-plus me-1"></i> Add Activity Entry</button>
            </div>
        </div>`;

    let rankChangeHTML = '';
    if (siuMemberData.previousRank && siuMemberData.previousRank !== siuMemberData.rank) {
        const change = siuMemberData.previousRank - siuMemberData.rank;
        if (change > 0) {
            rankChangeHTML = `<span class="ms-2 small trend-up fw-bold">(+${change}) <i class="fa-solid fa-arrow-trend-up"></i></span>`;
        } else {
            rankChangeHTML = `<span class"ms-2 small trend-down fw-bold">(${change}) <i class="fa-solid fa-arrow-trend-down"></i></span>`;
        }
    }

    return `
        ${mainHeader}
        ${isModal ? filterHTML : ''} 
        <div class="row g-4 ${isModal ? 'mt-3' : ''}">
            <div class="col-lg-8">
                <div class="row g-4">
                    <div class="col-md-6 col-lg-4"><div class="card h-100 shadow-sm text-center"><div class="card-body d-flex flex-column justify-content-center"><p class="display-5 fw-bold themed-text">${siuMemberData.totalEntries}</p><p class="small text-muted mb-0">Activities Entered</p></div></div></div>
                    <div class="col-md-6 col-lg-4"><div class="card h-100 shadow-sm text-center"><div class="card-body d-flex flex-column justify-content-center"><p class="display-5 fw-bold themed-text">${siuMemberData.timelinessScore}</p><p class="small text-muted mb-0">Timeliness Score</p></div></div></div>
                    <div class="col-md-6 col-lg-4"><div class="card h-100 shadow-sm text-center"><div class="card-body d-flex flex-column justify-content-center">
                        <p class="display-5 fw-bold themed-text">#${siuMemberData.rank}${rankChangeHTML}</p>
                        <p class="small text-muted mb-0">Your Rank</p>
                    </div></div></div>
                    <div class="col-md-6 col-lg-4"><div class="card h-100 shadow-sm text-center"><div class="card-body d-flex flex-column justify-content-center"><p class="display-5 fw-bold themed-text">${siuMemberData.presentDays}</p><p class="small text-muted mb-0">Days Present</p></div></div></div>
                    <div class="col-md-12 col-lg-8">
                        <button class="card h-100 shadow-sm text-center bg-primary text-white w-100 border-0" id="showScoreBreakdownBtn" data-timeliness="${siuMemberData.timelinessScore}" data-entrycount="${siuMemberData.entryCountScore}" data-attendance="${siuMemberData.attendanceScore}">
                            <div class="card-body d-flex flex-column justify-content-center"><p class="display-4 fw-bold">${siuMemberData.totalPoints}</p><p class="mb-0">Total Points Earned</p></div>
                        </button>
                    </div>
                </div>
            </div>
            <div class="col-lg-4">
                <div class="card shadow-sm h-100">
                    <div class="card-body d-flex flex-column">
                        <h3 class="h5 card-title fw-bold mb-3">Last 5 Entries</h3>
                        <div style="overflow-y: auto; max-height: 250px;"><ul class="list-group list-group-flush">${lastEntriesHTML || '<li class="list-group-item text-center text-muted">No entries yet.</li>'}</ul></div>
                    </div>
                </div>
            </div>
        </div>
        <div class="card shadow-sm mt-4">
            <div class="card-body">
                <h3 class="h5 card-title fw-bold mb-3">SIU Member Rankings</h3>
                <div class="table-responsive" style="max-height: 400px;"><table class="table table-striped table-hover"><thead><tr><th scope="col">Rank</th><th scope="col">Name</th><th scope="col">Points</th></tr></thead><tbody>${rankingTableHTML}</tbody></table></div>
            </div>
        </div>`;
}

export function buildStudentDashboard(student, activities, viewer = null, siblings = []) {
    const dashboardContainer = document.getElementById('dashboard-container');
    const { marksRecord } = student;
    if (!marksRecord || !marksRecord.terms) {
        dashboardContainer.innerHTML = `<div class="card shadow-sm dashboard-card"><div class="card-body"><p class="text-center">No marks data found for this student.</p></div></div>`;
        return;
    }

    const termOrder = Object.keys(EXAM_CONFIG);
    const termKeys = Object.keys(marksRecord.terms).sort((a, b) => termOrder.indexOf(a) - termOrder.indexOf(b));
    const allSubjects = [...new Set(termKeys.flatMap(key => marksRecord.terms[key].marks ? Object.keys(marksRecord.terms[key].marks) : []))];

    const getTrend = (subject, currentTermKey) => {
        const currentTermIndex = termKeys.indexOf(currentTermKey);
        if (currentTermIndex < 1) return '<span>-</span>';

        const prevTermKey = termKeys[currentTermIndex - 1];
        const currentMark = marksRecord.terms[currentTermKey]?.marks?.[subject];
        const prevMark = marksRecord.terms[prevTermKey]?.marks?.[subject];

        if (typeof currentMark !== 'number' || typeof prevMark !== 'number') return '<span>-</span>';

        const { maxMark: currentMaxMark } = getGradeInfo(currentMark, subject, currentTermKey, student.class);
        const { maxMark: prevMaxMark } = getGradeInfo(prevMark, subject, prevTermKey, student.class);

        if (currentMaxMark === 0 || prevMaxMark === 0) return '<span>-</span>';

        const currentPercentage = (currentMark / currentMaxMark) * 100;
        const prevPercentage = (prevMark / prevMaxMark) * 100;

        if (currentPercentage > prevPercentage + 1) return `<span class="trend-up">&uarr; Improving</span>`;
        if (currentPercentage < prevPercentage - 1) return `<span class="trend-down">&darr; Declining</span>`;
        return `<span class="trend-stable">&rarr; Stable</span>`;
    };

    let previousRank = null;
    const termCardsHTML = termKeys.map(key => {
        const term = marksRecord.terms[key];
        if (!term) return '';
        const maxTotal = Object.keys(term.marks || {}).reduce((sum, subject) => sum + getGradeInfo(0, subject, key, student.class).maxMark, 0);
        const percentage = maxTotal > 0 && typeof term.total === 'number' ? ((term.total / maxTotal) * 100).toFixed(1) : 'N/A';
        let rankChangeHTML = '';
        if (previousRank !== null && typeof term.rank === 'number') {
            const change = previousRank - term.rank;
            if (change > 0) rankChangeHTML = `<span class="small trend-up fw-medium ms-2">(+${change})</span>`;
            else if (change < 0) rankChangeHTML = `<span class="small trend-down fw-medium ms-2">(${change})</span>`;
        }
        previousRank = term.rank;
        return `<div class="col"><div class="card h-100 shadow-sm dashboard-card"><div class="card-body text-center"><h3 class="h6 card-title fw-semibold border-bottom pb-2 mb-3">${sanitize(key)}</h3><div class="d-grid gap-1"><p class="mb-0"><span class="fw-bold fs-5 text-primary">Total: ${sanitize(String(term.total || 'N/A'))}</span> / ${maxTotal}</p><p class="mb-0">Rank: ${sanitize(String(term.rank || 'N/A'))}${rankChangeHTML}</p><p class="mb-0">Percentage: ${percentage}${percentage !== 'N/A' ? '%' : ''}</p></div></div></div></div>`;
    }).join('');

    const detailedMarksHTML = allSubjects.map(subject => {
        const cells = termKeys.map(k => {
            const mark = marksRecord.terms[k]?.marks?.[subject];
            const displayMark = (mark !== undefined && mark !== null) ? mark : '-';
            const { grade, cssClass } = getGradeInfo(mark, subject, k, student.class);
            return `<td class="text-center fw-medium">${displayMark}<br><span class="fw-bold ${cssClass}">${grade}</span></td>`;
        }).join('');
        const trend = getTrend(subject, termKeys[termKeys.length - 1]);
        return `<tr><td class="fw-medium text-primary">${sanitize(subject)}</td>${cells}<td class="text-center small">${trend}</td></tr>`;
    }).join('');

    let backButtonHTML = '';
    if (viewer && viewer.role === 'staff') {
        backButtonHTML = `<div class="mb-3"><button id="backToDashboardBtn" class="btn btn-sm themed-bg action-btn rounded-pill"><i class="fa-solid fa-arrow-left"></i> Back to Teacher Dashboard</button></div>`;
    } else if (viewer && viewer.role === 'student' && siblings && siblings.length > 0) {
        const switchChildOptions = siblings.map(s => `<li><button class="dropdown-item view-sibling-profile" data-admission-no="${s.admissionNo}">${sanitize(s.name)}</button></li>`).join('');
        backButtonHTML = `
            <div class="d-flex gap-2 mb-3">
                <button id="backToParentDashboardBtn" class="btn btn-sm themed-bg action-btn rounded-pill"><i class="fa-solid fa-arrow-left"></i> Parent Dashboard</button>
                <div class="dropdown">
                    <button class="btn btn-sm btn-secondary dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                        Switch Child
                    </button>
                    <ul class="dropdown-menu">
                        ${switchChildOptions}
                    </ul>
                </div>
            </div>`;
    }

    dashboardContainer.innerHTML = backButtonHTML + `
        <div class="card shadow-sm dashboard-card"><div class="card-body d-flex flex-wrap justify-content-between align-items-center gap-3"><div><h2 class="h4 fw-bold text-primary">${sanitize(student.name)}</h2><p class="mb-0">Class ${sanitize(student.class)}-${sanitize(student.division)} | Adm No: ${sanitize(student.admissionNo)} | House: ${sanitize(student.house)}</p></div><div class="d-flex align-items-center gap-4 text-center"><div><p class="h4 fw-bold themed-text">#${student.academicRank}</p><p class="small mb-0">Academic Rank (Class)</p></div><div><p class="h4 fw-bold themed-text">#${student.disciplineRank}</p><p class="small mb-0">Discipline Rank (Class)</p></div></div></div></div>
        <div class="row row-cols-1 row-cols-sm-2 row-cols-md-3 g-4">${termCardsHTML}</div>
        <div class="row row-cols-1 row-cols-lg-2 g-4"><div class="col"><div class="card shadow-sm dashboard-card h-100"><div class="card-body"><h3 class="h6 card-title fw-semibold mb-3">Subject-wise Marks</h3><div style="height: 300px;"><canvas id="subjectChart"></canvas></div></div></div></div><div class="col"><div class="card shadow-sm dashboard-card h-100"><div class="card-body"><h3 class="h6 card-title fw-semibold mb-3">Term-wise Performance</h3><div style="height: 300px;"><canvas id="termChart"></canvas></div></div></div></div></div>
        <div class="card shadow-sm dashboard-card"><div class="card-body"><div class="d-flex justify-content-between align-items-center mb-3"><h3 class="h6 card-title fw-semibold">Detailed Marks Summary</h3>
        <button id="showDiscipline" class="btn btn-sm themed-bg rounded-pill" data-admission-no="${sanitize(student.admissionNo)}">View Discipline Log (${student.disciplinePoints.toFixed(0)} pts)</button>
        </div><div class="table-responsive"><table class="table table-striped table-hover"><thead><tr><th>Subject</th>${termKeys.map(k => `<th class="text-center">${sanitize(k)}</th>`).join('')}<th>Progress</th></tr></thead><tbody>${detailedMarksHTML}</tbody></table></div></div></div>`;

    const subjectChartCtx = document.getElementById('subjectChart')?.getContext('2d');
    if (subjectChartCtx) {
        const subjectChartColors = ['#F38181', '#FCE38A', '#95E1D3', '#81B2D9'];
        new Chart(subjectChartCtx, { type: 'radar', data: { labels: allSubjects, datasets: termKeys.map((key, index) => ({ label: key, data: allSubjects.map(subject => marksRecord.terms[key]?.marks?.[subject] ?? 0), borderColor: subjectChartColors[index % subjectChartColors.length], backgroundColor: subjectChartColors[index % subjectChartColors.length].replace(')', ', 0.2)').replace('rgb', 'rgba'), borderWidth: 2, pointBackgroundColor: subjectChartColors[index % subjectChartColors.length] })) }, options: { responsive: true, maintainAspectRatio: false, scales: { r: { beginAtZero: true } } } });
    }

    const termChartCtx = document.getElementById('termChart')?.getContext('2d');
    if (termChartCtx) {
        const termData = termKeys.map(k => {
            const term = marksRecord.terms[k];
            const maxTotal = Object.keys(term.marks || {}).reduce((sum, subject) => sum + getGradeInfo(0, subject, k, student.class).maxMark, 0);
            const total = typeof term.total === 'number' ? term.total : 0;
            return { total: total, rank: term.rank, percentage: maxTotal > 0 ? (total / maxTotal) * 100 : 0 };
        });
        new Chart(termChartCtx, { type: 'bar', data: { labels: termKeys, datasets: [{ label: 'Percentage (%)', data: termData.map(d => d.percentage), type: 'line', borderColor: 'var(--house-green)', borderWidth: 2, yAxisID: 'y-percent', tension: 0.2 }, { label: 'Rank', data: termData.map(d => d.rank), type: 'line', borderColor: 'var(--house-rose)', borderWidth: 2, yAxisID: 'y-rank', tension: 0.2 }, { label: 'Total Marks', data: termData.map(d => d.total), backgroundColor: 'var(--house-blue)', yAxisID: 'y-total' }] }, options: { responsive: true, maintainAspectRatio: false, scales: { 'y-total': { type: 'linear', position: 'left', title: { display: true, text: 'Total Marks' } }, 'y-percent': { type: 'linear', position: 'right', display: false, max: 100, min: 0 }, 'y-rank': { type: 'linear', position: 'right', reverse: true, title: { display: true, text: 'Rank' }, grid: { drawOnChartArea: false } } } } });
    }
}

export function buildHouseEvaluationContent(processedStudents, activities) {
    const houseColors = { Blue: 'primary', Green: 'success', Rose: 'danger', Yellow: 'warning' };
    const houses = Object.keys(houseColors);
    const houseData = {};
    houses.forEach(houseName => {
        const members = processedStudents.filter(s => s.house === houseName);
        const houseActivities = activities.filter(act => {
             const actAdmNos = Array.isArray(act.admissionNo) ? act.admissionNo.map(String) : [String(act.admissionNo)];
             return actAdmNos.some(admNo => new Set(members.map(m => m.admissionNo.toString())).has(admNo));
        });
        const activityPoints = houseActivities.reduce((acc, act) => {
            const points = (act.Rating / 10) * (activityRules[act.Activity] || 0);
            if (!acc[act.Activity]) acc[act.Activity] = 0;
            acc[act.Activity] += points;
            return acc;
        }, {});
        const sortedActivities = Object.entries(activityPoints).sort((a,b) => b[1] - a[1]);
        
        houseData[houseName] = {
            members,
            memberCount: members.length,
            totalPoints: members.reduce((sum, s) => sum + s.housePoints, 0),
            topPositiveActivities: sortedActivities.filter(a => a[1] > 0).slice(0, 5),
            topNegativeActivities: sortedActivities.filter(a => a[1] < 0).sort((a,b) => a[1] - b[1]).slice(0, 5),
            topStudents: [...members].sort((a, b) => b.housePoints - a.housePoints).slice(0, 10)
        };
    });
    
    let navTabs = '', tabContent = '';
    houses.forEach((house, index) => {
        const data = houseData[house];
        const rank = houses.sort((a,b) => houseData[b].totalPoints - houseData[a].totalPoints).indexOf(house) + 1;
        navTabs += `<li class="nav-item" role="presentation"><button class="nav-link ${index === 0 ? 'active' : ''} text-${houseColors[house]}" data-bs-toggle="tab" data-bs-target="#eval-${house}-pane" type="button">${house}</button></li>`;
        tabContent += `<div class="tab-pane fade show ${index === 0 ? 'active' : ''}" id="eval-${house}-pane" role="tabpanel">
            <div class="row g-3">
                <div class="col-md-4"><div class="card text-center clickable-card" data-house="${house}" data-modal="members"><div class="card-body"><p class="display-6 fw-bold">${data.memberCount}</p><p class="small text-muted mb-0">Members</p></div></div></div>
                <div class="col-md-4"><div class="card text-center"><div class="card-body"><p class="display-6 fw-bold">${Math.round(data.totalPoints).toLocaleString()}</p><p class="small text-muted mb-0">Total Points</p></div></div></div>
                <div class="col-md-4"><div class="card text-center"><div class="card-body"><p class="display-6 fw-bold">#${rank}</p><p class="small text-muted mb-0">Rank</p></div></div></div>
                <div class="col-lg-6"><div class="card"><div class="card-body"><h5 class="card-title">Top Positive Activities</h5><ul class="list-group list-group-flush">${data.topPositiveActivities.map(([n,p]) => `<li class="list-group-item">${sanitize(n)}<span class="float-end fw-bold text-success">+${Math.round(p)}</span></li>`).join('')}</ul></div></div></div>
                <div class="col-lg-6"><div class="card"><div class="card-body"><h5 class="card-title">Top Negative Activities</h5><ul class="list-group list-group-flush">${data.topNegativeActivities.map(([n,p]) => `<li class="list-group-item">${sanitize(n)}<span class="float-end fw-bold text-danger">${Math.round(p)}</span></li>`).join('')}</ul></div></div></div>
                <div class="col-12"><div class="card clickable-card" data-house="${house}" data-modal="students"><div class="card-body"><h5 class="card-title">Top 10 Students</h5><div class="table-responsive"><table class="table table-sm"><thead><tr><th>Rank</th><th>Name</th><th>Class</th><th>Points</th></tr></thead><tbody>
                ${data.topStudents.map((s,i) => `<tr><td>${i+1}</td><td>${sanitize(s.name)}</td><td>${s.class}-${s.division}</td><td>${Math.round(s.housePoints)}</td></tr>`).join('')}
                </tbody></table></div></div></div></div>
            </div>
        </div>`;
    });

    return `<ul class="nav nav-tabs">${navTabs}</ul><div class="tab-content pt-3">${tabContent}</div>`;
}

export function buildSiuEvaluationContent(processedSiuMembers, activities, availableMonths, selectedMonth = 'All-Time') {
    const totalActivities = processedSiuMembers.reduce((sum, m) => sum + m.totalEntries, 0);
    let totalPositive = 0, totalNegative = 0;
    
    activities.forEach(act => {
        const points = (act.Rating / 10) * (activityRules[act.Activity] || 0);
        const count = Array.isArray(act.admissionNo) ? act.admissionNo.length : 1;
        if(points > 0) totalPositive += (points * count);
        else totalNegative += (points * count);
    });

    const memberListHTML = processedSiuMembers.map(m => `
        <a href="#" class="list-group-item list-group-item-action siu-member-link" data-admission-no="${m.admissionNo}">
            <div class="d-flex w-100 justify-content-between">
                <h5 class="mb-1">${sanitize(m.name)}</h5>
                <small>Rank #${m.rank}</small>
            </div>
            <p class="mb-1">Total Points: <span class="fw-bold">${m.totalPoints}</span></p>
        </a>`).join('');

    const monthOptions = `<option value="All-Time">All-Time</option>` +
        availableMonths.map(month => `<option value="${month}" ${month === selectedMonth ? 'selected' : ''}>${month}</option>`).join('');

    return `
        <div class="row g-3 mb-4 align-items-center">
            <div class="col-md-8">
                <div class="row g-3">
                    <div class="col-md-4"><div class="card text-center"><div class="card-body"><p class="display-6 fw-bold">${totalActivities}</p><p class="small text-muted mb-0">Total Activities</p></div></div></div>
                    <div class="col-md-4"><div class="card text-center"><div class="card-body"><p class="display-6 fw-bold text-success">+${Math.round(totalPositive)}</p><p class="small text-muted mb-0">Points Added</p></div></div></div>
                    <div class="col-md-4"><div class="card text-center"><div class="card-body"><p class="display-6 fw-bold text-danger">${Math.round(totalNegative)}</p><p class="small text-muted mb-0">Points Deducted</p></div></div></div>
                </div>
            </div>
            <div class="col-md-4">
                 <label for="siuEvalFilter" class="form-label small">Filter by Month</label>
                 <select class="form-select" id="siuEvalFilter">
                    ${monthOptions}
                 </select>
            </div>
        </div>
        <h4 class="mt-4">Member Leaderboard</h4>
        <div class="list-group">${memberListHTML}</div>`;
}

// --- WIDGETS AND CARDS ---

export function buildStandingsChart(students, activities, marksData, chartId = 'standingsChart', filterContainerId = 'standingsFilterContainer') {
    const container = document.getElementById(filterContainerId);
    const chartCtx = document.getElementById(chartId)?.getContext('2d');
    if (!container || !chartCtx) return;

    // 1. Generate Unique Options
    const classes = [...new Set(students.map(s => s.class))].sort((a,b) => a-b);
    const divisions = [...new Set(students.map(s => s.division))].sort();
    const exams = Object.keys(EXAM_CONFIG || {});
    const houses = ['Blue', 'Green', 'Rose', 'Yellow'];

    // 2. Inject Multi-Select Controls
    container.innerHTML = `
        <div class="d-flex gap-2 flex-wrap mb-3">
            <div class="flex-grow-1">
                <label class="form-label small fw-bold">Classes (Hold Ctrl/Cmd to select multiple)</label>
                <select id="${filterContainerId}_class" class="form-select" multiple size="3">
                    ${classes.map(c => `<option value="${c}" selected>${c}</option>`).join('')}
                </select>
            </div>
            <div class="flex-grow-1">
                <label class="form-label small fw-bold">Divisions</label>
                <select id="${filterContainerId}_div" class="form-select" multiple size="3">
                    ${divisions.map(d => `<option value="${d}" selected>${d}</option>`).join('')}
                </select>
            </div>
            <div class="flex-grow-1">
                <label class="form-label small fw-bold">Data Source (Exams/Activities)</label>
                <select id="${filterContainerId}_data" class="form-select" multiple size="3">
                    <option value="ACTIVITIES" selected>All Activities</option>
                    ${exams.map(e => `<option value="${e}">${e}</option>`).join('')}
                </select>
            </div>
        </div>
    `;

    const updateChart = () => {
        // 3. Get Selected Values
        const selectedClasses = getSelectedValues(`${filterContainerId}_class`);
        const selectedDivs = getSelectedValues(`${filterContainerId}_div`);
        const selectedSources = getSelectedValues(`${filterContainerId}_data`);

        // 4. Filter Population (Who?)
        const filteredStudents = students.filter(s => 
            selectedClasses.includes(s.class) && 
            selectedDivs.includes(s.division)
        );

        // 5. Calculate Points based on Data Source (What?)
        const pointData = houses.reduce((acc, h) => ({ ...acc, [h]: 0 }), {});

        // A. Process Activity Points (If selected)
        if (selectedSources.includes('ACTIVITIES')) {
            const targetAdmins = new Set(filteredStudents.map(s => String(s.admissionNo)));

            activities.forEach(act => {
                const actAdmNos = Array.isArray(act.admissionNo) ? act.admissionNo.map(String) : [String(act.admissionNo)];
                actAdmNos.forEach(admNo => {
                    if (targetAdmins.has(admNo)) {
                        const student = filteredStudents.find(s => String(s.admissionNo) === admNo);
                        if (student && student.house) {
                            const points = (act.Rating / 10) * (activityRules[act.Activity] || 0);
                            pointData[student.house] += points;
                        }
                    }
                });
            });
        }

        // B. Process Exam Marks (If specific exams are selected)
        const examKeys = selectedSources.filter(s => s !== 'ACTIVITIES');
        if (examKeys.length > 0) {
            filteredStudents.forEach(student => {
                if (student.house && student.marksRecord?.terms) {
                    examKeys.forEach(exam => {
                        const termData = student.marksRecord.terms[exam];
                        if (termData && typeof termData.total === 'number') {
                            pointData[student.house] += termData.total;
                        }
                    });
                }
            });
        }

        // 6. Render Chart
        const data = houses.map(house => Math.round(pointData[house] || 0));
        const backgroundColors = houses.map(house => ({ 'Blue': '#0d6efd', 'Green': '#198754', 'Rose': '#dc3545', 'Yellow': '#ffc107' }[house] || '#6c757d'));

        // Handle instances correctly based on which chart we are updating
        let instanceRef = chartId === 'teacherStandingsChart' ? teacherStandingsChartInstance : standingsChartInstance;
        if (instanceRef) instanceRef.destroy();

        instanceRef = new Chart(chartCtx, { 
            type: 'bar', 
            data: { labels: houses, datasets: [{ label: 'Points', data, backgroundColor: backgroundColors }] }, 
            options: { responsive: true, maintainAspectRatio: false } 
        });

        // Update global reference
        if (chartId === 'teacherStandingsChart') teacherStandingsChartInstance = instanceRef;
        else standingsChartInstance = instanceRef;
    };

    // Attach listeners
    [`${filterContainerId}_class`, `${filterContainerId}_div`, `${filterContainerId}_data`].forEach(id => {
        document.getElementById(id).addEventListener('change', updateChart);
    });

    updateChart();
}


export function buildLeaderboardCard(students, activities, isSection = false) {
    const leaderboardCard = document.getElementById('leaderboardCard');
    if (!leaderboardCard) return;

    const classes = [...new Set(students.map(s => s.class))].sort((a,b)=>a-b);
    const divisions = [...new Set(students.map(s => s.division))].sort();

    leaderboardCard.innerHTML = `
    <div class="card shadow-sm">
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h2 class="h4 card-title mb-0 fw-bold">Discipline Leaderboards</h2>
            </div>
            <div class="row g-2 mb-4">
                 <div class="col-md-6">
                    <label class="small text-muted">Filter Class (Multi-select)</label>
                    <select id="lb_classFilter" class="form-select" multiple size="3">
                        ${classes.map(c => `<option value="${c}" selected>${c}</option>`).join('')}
                    </select>
                 </div>
                 <div class="col-md-6">
                    <label class="small text-muted">Filter Division (Multi-select)</label>
                    <select id="lb_divFilter" class="form-select" multiple size="3">
                        ${divisions.map(d => `<option value="${d}" selected>${d}</option>`).join('')}
                    </select>
                 </div>
            </div>
            <div id="leaderboardContent"></div>
        </div>
    </div>`;

    const updateLeaderboards = () => {
        const selectedClasses = getSelectedValues('lb_classFilter');
        const selectedDivs = getSelectedValues('lb_divFilter');

        const filteredStudents = students.filter(s => 
            selectedClasses.includes(s.class) && 
            selectedDivs.includes(s.division)
        );

        const validAdmNos = new Set(filteredStudents.map(s => String(s.admissionNo)));
        const filteredActivities = activities.filter(a => {
            const activityAdmNos = Array.isArray(a.admissionNo) ? a.admissionNo.map(String) : [String(a.admissionNo)];
            return activityAdmNos.some(admNo => validAdmNos.has(admNo));
        });

        const topPositiveStudents = [...filteredStudents].sort((a, b) => b.disciplinePoints - a.disciplinePoints).slice(0, 5);
        const topNegativeStudents = [...filteredStudents].sort((a, b) => a.disciplinePoints - b.disciplinePoints).slice(0, 5);
        
        const activityPoints = filteredActivities.reduce((acc, act) => {
            const points = (act.Rating / 10) * (activityRules[act.Activity] || 0);
            if (!acc[act.Activity]) acc[act.Activity] = 0;
            acc[act.Activity] += points;
            return acc;
        }, {});

        const sortedActivities = Object.entries(activityPoints).sort((a, b) => b[1] - a[1]);
        const topPositiveActivities = sortedActivities.filter(a => a[1] > 0).slice(0, 5);
        const topNegativeActivities = sortedActivities.filter(a => a[1] < 0).sort((a, b) => a[1] - b[1]).slice(0, 5);

        document.getElementById('leaderboardContent').innerHTML = `
        <div class="row g-4">
            <div class="col-md-6">
                <h3 class="h6 fw-semibold mb-2 text-success">Top Students (Positive)</h3>
                <ul class="list-group list-group-flush">${topPositiveStudents.map(s => `<li class="list-group-item d-flex justify-content-between align-items-center"><span>${sanitize(s.name)} (${sanitize(s.class)}-${sanitize(s.division)})</span><span class="fw-bold text-success">${s.disciplinePoints.toFixed(1)}</span></li>`).join('')}</ul>
            </div>
            <div class="col-md-6">
                <h3 class="h6 fw-semibold mb-2 text-danger">Top Students (Negative)</h3>
                <ul class="list-group list-group-flush">${topNegativeStudents.map(s => `<li class="list-group-item d-flex justify-content-between align-items-center"><span>${sanitize(s.name)} (${sanitize(s.class)}-${sanitize(s.division)})</span><span class="fw-bold text-danger">${s.disciplinePoints.toFixed(1)}</span></li>`).join('')}</ul>
            </div>
            <div class="col-md-6">
                <h3 class="h6 fw-semibold mb-2 text-success">Top Positive Activities</h3>
                <ul class="list-group list-group-flush">${topPositiveActivities.map(([name, pts]) => `<li class="list-group-item d-flex justify-content-between align-items-center"><span>${sanitize(name)}</span><span class="fw-bold text-success">${pts.toFixed(1)}</span></li>`).join('')}</ul>
            </div>
            <div class="col-md-6">
                <h3 class="h6 fw-semibold mb-2 text-danger">Top Negative Activities</h3>
                <ul class="list-group list-group-flush">${topNegativeActivities.map(([name, pts]) => `<li class="list-group-item d-flex justify-content-between align-items-center"><span>${sanitize(name)}</span><span class="fw-bold text-danger">${pts.toFixed(1)}</span></li>`).join('')}</ul>
            </div>
        </div>`;
    };

    document.getElementById('lb_classFilter').addEventListener('change', updateLeaderboards);
    document.getElementById('lb_divFilter').addEventListener('change', updateLeaderboards);
    updateLeaderboards();
}


export function buildClassToppersCard(students) {
    const card = document.getElementById('classToppersCard');
    if (!card) return;

    // Use the imported EXAM_CONFIG
    const exams = Object.keys(EXAM_CONFIG || {}).sort();

    // 1. Inject UI with 3 Filters
    card.innerHTML = `
        <div class="card shadow-sm h-100">
            <div class="card-header bg-transparent border-0 pt-3 pb-0">
                <h3 class="h5 mb-0 fw-bold">Class Toppers</h3>
            </div>
            <div class="card-body">
                <div class="row g-2 mb-3">
                    <div class="col-md-4">
                        <label class="form-label small text-muted fw-bold">1. Exams (Ctrl+Click)</label>
                        <select id="ct_examFilter" class="form-select" multiple size="3">
                            <option value="ALL" selected>All Time (Cumulative)</option>
                            ${exams.map(e => `<option value="${e}">${e}</option>`).join('')}
                        </select>
                    </div>

                    <div class="col-md-4">
                         <label class="form-label small text-muted fw-bold">2. Group By</label>
                         <select id="ct_criteriaFilter" class="form-select" size="3">
                            <option value="section">By Section</option>
                            <option value="class" selected>By Class</option>
                            <option value="division">By Division</option>
                         </select>
                    </div>

                    <div class="col-md-4">
                         <label class="form-label small text-muted fw-bold">3. Select Targets</label>
                         <select id="ct_targetFilter" class="form-select" multiple size="3">
                            </select>
                    </div>
                </div>

                <div class="table-responsive">
                    <table class="table table-hover align-middle">
                        <thead class="table-light">
                            <tr>
                                <th>Group</th>
                                <th>Topper Name</th>
                                <th class="text-end">Score</th>
                            </tr>
                        </thead>
                        <tbody id="ct_tableBody"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    // 2. Event Listeners & Logic
    const examSelect = document.getElementById('ct_examFilter');
    const criteriaSelect = document.getElementById('ct_criteriaFilter');
    const targetSelect = document.getElementById('ct_targetFilter');

    // Update Targets when Criteria changes
    criteriaSelect.addEventListener('change', () => {
        updateTargetOptions(criteriaSelect.value, students, 'ct_targetFilter');
        updateTable();
    });

    // Update Table when Exams or Targets change
    examSelect.addEventListener('change', () => updateTable());
    targetSelect.addEventListener('change', () => updateTable());

    const updateTable = () => {
        const selectedExams = getSelectedValues('ct_examFilter');
        const selectedTargets = getSelectedValues('ct_targetFilter');
        const criteria = criteriaSelect.value;
        const useAllExams = selectedExams.includes('ALL') || selectedExams.length === 0;

        const results = [];

        // Iterate through each SELECTED Target
        selectedTargets.forEach(target => {
            // A. Filter Students belonging to this specific target
            const groupStudents = students.filter(s => {
                if (criteria === 'section') return getSection(s.class) === target;
                if (criteria === 'class') return String(s.class) === String(target);
                if (criteria === 'division') return `${s.class}-${s.division}` === target;
                return false;
            });

            if (groupStudents.length === 0) return;

            // B. Find the Topper within this group
            let groupTopper = null;
            let maxScore = -1;

            groupStudents.forEach(student => {
                let score = 0;
                if (student.marksRecord?.terms) {
                    if (useAllExams) {
                        Object.values(student.marksRecord.terms).forEach(t => score += (t.total || 0));
                    } else {
                        selectedExams.forEach(exam => {
                            const term = student.marksRecord.terms[exam];
                            if (term && typeof term.total === 'number') score += term.total;
                        });
                    }
                }

                if (score > maxScore) {
                    maxScore = score;
                    groupTopper = student;
                }
            });

            if (groupTopper) {
                results.push({ label: target, student: groupTopper, score: maxScore });
            }
        });

        // C. Render
        const tbody = document.getElementById('ct_tableBody');
        if (results.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-4">Select exams and targets to view data</td></tr>`;
            return;
        }

        // Sort results naturally
        results.sort((a, b) => customClassSort(a.label, b.label));

        tbody.innerHTML = results.map(r => `
            <tr>
                <td class="fw-bold text-secondary">${sanitize(r.label)}</td>
                <td>
                    ${sanitize(r.student.name)}
                    <small class="text-muted ms-1">(${sanitize(r.student.class)}-${sanitize(r.student.division)})</small>
                </td>
                <td class="text-end fw-bold">${Math.round(r.score)}</td>
            </tr>
        `).join('');
    };

    // Initial Load
    updateTargetOptions('class', students, 'ct_targetFilter'); 
    updateTable();
}


export function buildSubjectToppersCard(students) {
    const card = document.getElementById('subjectToppersCard');
    if (!card) return;

    // Use the imported EXAM_CONFIG
    const exams = Object.keys(EXAM_CONFIG || {}).sort();

    card.innerHTML = `
        <div class="card shadow-sm h-100">
            <div class="card-header bg-transparent border-0 pt-3 pb-0">
                <h3 class="h5 mb-0 fw-bold">Subject Toppers</h3>
            </div>
            <div class="card-body">
                <div class="row g-2 mb-3">
                    <div class="col-md-6">
                        <label class="form-label small text-muted fw-bold">1. Exams</label>
                        <select id="st_examFilter" class="form-select" multiple size="3">
                            <option value="ALL" selected>All Time</option>
                            ${exams.map(e => `<option value="${e}">${e}</option>`).join('')}
                        </select>
                    </div>
                    <div class="col-md-6">
                         <label class="form-label small text-muted fw-bold">2. Group By</label>
                         <select id="st_criteriaFilter" class="form-select" size="3">
                            <option value="section">By Section</option>
                            <option value="class" selected>By Class</option>
                            <option value="division">By Division</option>
                         </select>
                    </div>
                    
                    <div class="col-md-6">
                         <label class="form-label small text-muted fw-bold">3. Select Targets</label>
                         <select id="st_targetFilter" class="form-select" multiple size="3">
                            </select>
                    </div>
                    
                    <div class="col-md-6">
                         <label class="form-label small text-muted fw-bold">4. Subjects</label>
                         <select id="st_subjectFilter" class="form-select" multiple size="3">
                            </select>
                    </div>
                </div>

                <div class="table-responsive">
                    <table class="table table-hover align-middle">
                        <thead class="table-light">
                            <tr>
                                <th>Group / Subject</th>
                                <th>Topper Name</th>
                                <th class="text-end">Score</th>
                            </tr>
                        </thead>
                        <tbody id="st_tableBody"></tbody>
                    </table>
                </div>
            </div>
        </div>
    `;

    const examSelect = document.getElementById('st_examFilter');
    const criteriaSelect = document.getElementById('st_criteriaFilter');
    const targetSelect = document.getElementById('st_targetFilter');
    const subjectSelect = document.getElementById('st_subjectFilter');

    // -- Event Listeners --

    // 1. Criteria Changed -> Update Targets
    criteriaSelect.addEventListener('change', () => {
        updateTargetOptions(criteriaSelect.value, students, 'st_targetFilter');
        updateTable();
    });

    // 2. Exams Changed -> Update Subjects
    examSelect.addEventListener('change', () => {
        const selectedExams = getSelectedValues('st_examFilter');
        updateSubjectOptions(students, selectedExams, 'st_subjectFilter');
        updateTable();
    });

    // 3. Targets/Subjects Changed -> Just Update Table
    targetSelect.addEventListener('change', () => updateTable());
    subjectSelect.addEventListener('change', () => updateTable());

    const updateTable = () => {
        const selectedExams = getSelectedValues('st_examFilter');
        const selectedTargets = getSelectedValues('st_targetFilter');
        const selectedSubjects = getSelectedValues('st_subjectFilter'); // Specific subjects filter
        const criteria = criteriaSelect.value;
        const useAllExams = selectedExams.includes('ALL') || selectedExams.length === 0;

        let tableHTML = '';

        // Iterate through each SELECTED Target
        selectedTargets.forEach(target => {
            
            // A. Filter Students
            const groupStudents = students.filter(s => {
                if (criteria === 'section') return getSection(s.class) === target;
                if (criteria === 'class') return String(s.class) === String(target);
                if (criteria === 'division') return `${s.class}-${s.division}` === target;
                return false;
            });

            if (groupStudents.length === 0) return;

            // B. Aggregate Subject Marks for this group
            // Map: SubjectName -> { topper: StudentObj, score: MaxScore }
            const subjectLeaders = {};

            groupStudents.forEach(student => {
                if (!student.marksRecord?.terms) return;
                
                // Temp map to sum scores for this specific student across selected exams
                const mySubjectTotals = {}; 

                const examsToProcess = useAllExams ? Object.keys(student.marksRecord.terms) : selectedExams;

                examsToProcess.forEach(examKey => {
                    const termData = student.marksRecord.terms[examKey];
                    // FIX: Check 'marks' not 'subjects'
                    if (termData?.marks) {
                        Object.entries(termData.marks).forEach(([subj, marks]) => {
                            const val = Number(marks);
                            if (!isNaN(val)) {
                                if (!mySubjectTotals[subj]) mySubjectTotals[subj] = 0;
                                mySubjectTotals[subj] += val;
                            }
                        });
                    }
                });

                // Compare my totals to current leaders
                Object.entries(mySubjectTotals).forEach(([subj, total]) => {
                    if (!subjectLeaders[subj] || total > subjectLeaders[subj].score) {
                        subjectLeaders[subj] = { student: student, score: total };
                    }
                });
            });

            // C. Build HTML for this Target Group
            let subjects = Object.keys(subjectLeaders).sort();
            
            // Apply Subject Filter if any are selected
            if (selectedSubjects.length > 0) {
                subjects = subjects.filter(subj => selectedSubjects.includes(subj));
            }

            if (subjects.length > 0) {
                // Add a Header Row for the Group
                tableHTML += `<tr class="table-secondary"><td colspan="3" class="fw-bold text-center small text-uppercase letter-spacing-1">${sanitize(target)}</td></tr>`;
                
                subjects.forEach(subj => {
                    const data = subjectLeaders[subj];
                    tableHTML += `
                        <tr>
                            <td class="ps-4 fw-medium text-secondary">${sanitize(subj)}</td>
                            <td>${sanitize(data.student.name)}</td>
                            <td class="text-end fw-bold">${Math.round(data.score)}</td>
                        </tr>
                    `;
                });
            }
        });

        const tbody = document.getElementById('st_tableBody');
        if (!tableHTML) {
            tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-4">No data found based on selection</td></tr>`;
        } else {
            tbody.innerHTML = tableHTML;
        }
    };

    // Initial Load
    updateTargetOptions('class', students, 'st_targetFilter');
    updateSubjectOptions(students, ['ALL'], 'st_subjectFilter'); // Pre-populate subjects
    updateTable();
}


export function buildReportGeneratorCard(students) {
    const cardContainer = document.getElementById('reportGeneratorCard');
    if (!cardContainer) return;

    let relevantStudents = students;
    if (currentUser && currentUser.role === 'staff' && currentUser.designation !== 'HM') {
        const teacherSections = getTeacherSection(currentUser.designation);
        if (teacherSections) {
            relevantStudents = students.filter(s => teacherSections.includes(getSection(s.class)));
        }
    }

    const internalClasses = [...new Set(relevantStudents.map(s => `${s.class}-${s.division}`))].sort(customClassSort);

    cardContainer.innerHTML = `
    <div class="card shadow-sm">
        <div class="card-body">
            <h2 class="h4 card-title fw-bold mb-3">Report Generator</h2>
            <ul class="nav nav-tabs" id="reportTab" role="tablist">
                <li class="nav-item" role="presentation"><button class="nav-link active" id="classwise-tab" data-bs-toggle="tab" data-bs-target="#classwise-tab-pane" type="button" role="tab">Internal List</button></li>
                <li class="nav-item" role="presentation"><button class="nav-link" id="sampoorna-tab" data-bs-toggle="tab" data-bs-target="#sampoorna-tab-pane" type="button" role="tab">Sampoorna List</button></li>
            </ul>
            <div class="tab-content pt-3" id="reportTabContent">
                <div class="tab-pane fade show active" id="classwise-tab-pane" role="tabpanel">
                    <div class="row g-3 align-items-end">
                        <div class="col-lg col-md-4"><label class="form-label small">Class</label><select id="report-class-internal" class="form-select report-class"><option value="">Select Class</option>${internalClasses.map(c => `<option value="${c}">${c}</option>`).join('')}</select></div>
                        <div class="col-lg col-md-4"><label class="form-label small">Term</label><select id="report-term-internal" class="form-select report-term" disabled><option value="">Select Term</option></select></div>
                        <div class="col-lg col-md-4"><label class="form-label small">Subject</label><select id="report-subject-internal" class="form-select report-subject" disabled><option value="">Select Subject</option></select></div>
                        <div class="col-lg-auto col-md-12"><button id="generateReportBtnInternal" class="w-100 btn btn-primary generate-report-btn" data-source="internal" disabled>Generate</button></div>
                    </div>
                    <div id="reportResultContainerInternal" class="mt-4 report-result"></div>
                </div>
                <div class="tab-pane fade" id="sampoorna-tab-pane" role="tabpanel">
                     <div class="row g-3 align-items-end">
                        <div class="col-lg col-md-4"><label class="form-label small">Class</label><select id="report-class-sampoorna" class="form-select report-class" disabled><option value="">Loading Classes...</option></select></div>
                        <div class="col-lg col-md-4"><label class="form-label small">Term</label><select id="report-term-sampoorna" class="form-select report-term" disabled><option value="">Select Term</option></select></div>
                        <div class="col-lg col-md-4"><label class="form-label small">Subject</label><select id="report-subject-sampoorna" class="form-select report-subject" disabled><option value="">Select Subject</option></select></div>
                        <div class="col-lg-auto col-md-12"><button id="generateReportBtnSampoorna" class="w-100 btn btn-primary generate-report-btn" data-source="sampoorna" disabled>Generate</button></div>
                    </div>
                    <div id="reportResultContainerSampoorna" class="mt-4 report-result"></div>
                </div>
            </div>
        </div>
    </div>`;

    let sampoornaData = null;

    cardContainer.addEventListener('click', async (e) => {
        if (e.target.matches('.generate-report-btn')) {
            const dataSource = e.target.dataset.source;
            const className = document.getElementById(`report-class-${dataSource}`).value;
            const term = document.getElementById(`report-term-${dataSource}`).value;
            const subject = document.getElementById(`report-subject-${dataSource}`).value;
            const resultContainer = document.getElementById(`reportResultContainer${dataSource.charAt(0).toUpperCase() + dataSource.slice(1)}`);
            
            const studentList = dataSource === 'internal' ? students : sampoornaData;
            if (!studentList) {
                resultContainer.innerHTML = `<p class="text-danger">Student list not loaded.</p>`;
                return;
            }

            const [classNum] = className.split('-');
            const section = getSection(classNum);
            const classStudents = studentList.filter(s => `${s.class}-${s.division}` === className).sort((a, b) => {
                if (a.gender < b.gender) return -1;
                if (a.gender > b.gender) return 1;
                return a.name.localeCompare(b.name);
            });

            let tableHTML = `<div class="table-responsive"><table class="table table-bordered"><thead><tr><th>Name</th><th>TE</th><th>CE</th></tr></thead><tbody>`;
            let teClipboardText = "", ceClipboardText = "";

            classStudents.forEach(s => {
                const marksRecord = appData.marks.find(m => m.admissionNo.toString() === s.admissionNo.toString());
                const mark = marksRecord?.terms?.[term]?.marks?.[subject];
                const { grade, maxMark } = getGradeInfo(mark, subject, term, s.class);
                const displayMark = (typeof mark === 'number') ? mark : 'Ab';
                let teDisplay, ceDisplay;

                if (section === 'HS') {
                    teDisplay = displayMark;
                    ceDisplay = calculateCE_HS(mark, maxMark);
                } else {
                    teDisplay = grade;
                    ceDisplay = calculateCE_UP(grade);
                }
                teClipboardText += `${teDisplay}\n`;
                ceClipboardText += `${ceDisplay}\n`;
                tableHTML += `<tr><td>${sanitize(s.name)}</td><td>${teDisplay}</td><td>${ceDisplay}</td></tr>`;
            });

            tableHTML += '</tbody></table></div><div class="mt-3 d-flex gap-2 justify-content-end"><button class="copy-btn btn btn-success" data-type="te">Copy TE</button><button class="copy-btn btn btn-info" data-type="ce">Copy CE</button></div>';
            resultContainer.innerHTML = tableHTML;
            
            resultContainer.querySelector('.copy-btn[data-type="te"]').addEventListener('click', btnEvent => copyToClipboard(btnEvent.target, teClipboardText.trim()));
            resultContainer.querySelector('.copy-btn[data-type="ce"]').addEventListener('click', btnEvent => copyToClipboard(btnEvent.target, ceClipboardText.trim()));
        }
    });

    cardContainer.addEventListener('change', (e) => {
        if (!e.target.matches('.report-class, .report-term, .report-subject')) return;
        
        const source = e.target.id.includes('internal') ? 'internal' : 'sampoorna';
        const classSelect = document.getElementById(`report-class-${source}`);
        const termSelect = document.getElementById(`report-term-${source}`);
        const subjectSelect = document.getElementById(`report-subject-${source}`);
        const generateBtn = document.getElementById(`generateReportBtn${source.charAt(0).toUpperCase() + source.slice(1)}`);
        const studentList = source === 'internal' ? students : sampoornaData;

        if (e.target.matches('.report-class')) {
            termSelect.innerHTML = '<option value="">Select Term</option>';
            subjectSelect.innerHTML = '<option value="">Select Subject</option>';
            termSelect.disabled = true; subjectSelect.disabled = true; generateBtn.disabled = true;

            const className = e.target.value;
            if (!className) return;

            const terms = [...new Set(appData.marks.flatMap(m => m.terms ? Object.keys(m.terms) : []))];
            termSelect.innerHTML += terms.map(t => `<option value="${t}">${t}</option>`).join('');
            termSelect.disabled = false;
        }

        if (e.target.matches('.report-term')) {
            subjectSelect.innerHTML = '<option value="">Select Subject</option>';
            subjectSelect.disabled = true; generateBtn.disabled = true;

            const className = classSelect.value;
            const term = e.target.value;
            if (!className || !term) return;

            const studentAdmNos = new Set((studentList || []).filter(s => `${s.class}-${s.division}` === className).map(s => s.admissionNo.toString()));
            const classMarks = appData.marks.filter(m => studentAdmNos.has(m.admissionNo.toString()));
            
            const subjects = [...new Set(classMarks.flatMap(m => m.terms?.[term]?.marks ? Object.keys(m.terms[term].marks) : []))].sort();
            subjectSelect.innerHTML += subjects.map(s => `<option value="${s}">${s}</option>`).join('');
            subjectSelect.disabled = false;
        }

        if (e.target.matches('.report-subject')) {
            generateBtn.disabled = !e.target.value;
        }
    });

    document.getElementById('sampoorna-tab').addEventListener('shown.bs.tab', async () => {
        const classSelect = document.getElementById('report-class-sampoorna');
        if (sampoornaData) return;

        try {
            const res = await fetch('./sampoorna.json');
            if (!res.ok) throw new Error('Could not fetch sampoorna.json.');
            let fetchedSampoornaData = await res.json();
            
            if (currentUser && currentUser.role === 'staff' && currentUser.designation !== 'HM') {
                const teacherSections = getTeacherSection(currentUser.designation);
                if (teacherSections) {
                    fetchedSampoornaData = fetchedSampoornaData.filter(s => teacherSections.includes(getSection(s.class)));
                }
            }
            sampoornaData = fetchedSampoornaData;
            
            const sampoornaClasses = [...new Set(sampoornaData.map(s => `${s.class}-${s.division}`))].sort(customClassSort);
            classSelect.innerHTML = `<option value="">Select Class</option>${sampoornaClasses.map(c => `<option value="${c}">${c}</option>`).join('')}`;
            classSelect.disabled = false;

        } catch (err) {
            classSelect.innerHTML = `<option value="">Error loading classes</option>`;
            console.error(err);
        }
    });
}

function copyToClipboard(button, text) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => { button.textContent = originalText; }, 2000);
    }).catch(err => console.error('Failed to copy text: ', err));
}

export function renderHouseWidget(processedStudents, activities) {
    const contentEl = document.getElementById('houseWidgetContent');
    if (!contentEl) return;

    const houseTotals = {};
    const yesterdayChanges = {};
    const houseColors = { 'Blue': 'var(--house-blue)', 'Green': 'var(--house-green)', 'Rose': 'var(--house-rose)', 'Yellow': 'var(--house-yellow)' };

    Object.keys(houseColors).forEach(house => {
        houseTotals[house] = 0;
        yesterdayChanges[house] = 0;
    });

    processedStudents.forEach(student => {
        if (houseTotals.hasOwnProperty(student.house)) {
            houseTotals[student.house] += student.housePoints;
        }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const yesterdaysActivities = activities.filter(act => {
        const activityDate = new Date(act.activityDate || act.submissionTimestamp);
        return activityDate >= yesterday && activityDate < today;
    });

    yesterdaysActivities.forEach(act => {
        const basePoints = activityRules[act.Activity] || 0;
        const calculatedPoints = (act.Rating / 10) * basePoints;
        const studentAdmNos = Array.isArray(act.admissionNo) ? act.admissionNo.map(String) : [String(act.admissionNo)];

        studentAdmNos.forEach(admNo => {
            const student = processedStudents.find(s => s.admissionNo.toString() === admNo);
            if (student && yesterdayChanges.hasOwnProperty(student.house)) {
                yesterdayChanges[student.house] += calculatedPoints;
            }
        });
    });

    const leaderboard = Object.keys(houseTotals)
        .map(house => ({
            name: house,
            totalPoints: Math.round(houseTotals[house]),
            yesterdayChange: Math.round(yesterdayChanges[house]),
            color: houseColors[house]
        }))
        .sort((a, b) => b.totalPoints - a.totalPoints);

    let contentHTML = '<div class="widget-grid">';
    leaderboard.forEach((house, index) => {
        const change = house.yesterdayChange;
        let changeHTML = '';

        if (change > 0) {
            changeHTML = `<span class="daily-change trend-up"><span class="arrow">&uarr;</span> Previous Day +${change}</span>`;
        } else if (change < 0) {
            changeHTML = `<span class="daily-change trend-down"><span class="arrow">&darr;</span> Previous Day ${change}</span>`;
        } else {
            changeHTML = `<span class="daily-change trend-stable">No Change Yesterday</span>`;
        }

        contentHTML += `
            <div class="widget-house-card" style="border-color: ${house.color};">
                <div class="rank">#${index + 1}</div>
                <div class="house-name" style="color: ${house.color};">${sanitize(house.name)}</div>
                <div class="total-points">${house.totalPoints.toLocaleString('en-IN')}</div>
                ${changeHTML}
            </div>
        `;
    });
    contentHTML += '</div>';

    contentEl.innerHTML = contentHTML;
    document.getElementById('widgetLastUpdated').innerText = `Last Updated: ${new Date().toLocaleTimeString()}`;
}


export function setLanguage(lang) {
    document.querySelectorAll('[data-translate-key]').forEach(el => {
        const key = el.dataset.translateKey;
        if (translations[lang] && translations[lang][key]) {
            el.innerText = translations[lang][key];
        }
    });
    localStorage.setItem('language', lang);
    document.querySelectorAll('.lang-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.lang === lang);
    });
}
