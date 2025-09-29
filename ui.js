import { sanitize, getGradeInfo, getSection, getTeacherSection, customClassSort, isActivityForStudent, calculateCE_HS, calculateCE_UP } from './utils.js';
import { translations, activityRules } from './config.js';

// --- GLOBAL UI STATE ---
let standingsChart = null;
let appData = {};
let currentUser = null;

// DOM elements
let homeView, loginView, dashboardView, progressBar, globalControls;
let disciplineModal, iframeModal, dobVerifyModal;

export function initializeUI(modals) {
    homeView = document.getElementById('homeView');
    loginView = document.getElementById('loginView');
    dashboardView = document.getElementById('dashboardView');
    progressBar = document.getElementById('progressBarContainer');
    globalControls = document.getElementById('globalControls');
    disciplineModal = modals.discipline;
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
    const userInfoHTML = `<p class="fw-semibold text-primary mb-0">${sanitize(user.name)}</p><p class="small text-muted mb-0">${sanitize(user.designation || 'Student')}</p>`;
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

export function showBirthdayNotification(staffList) {
    const names = staffList.map(s => sanitize(s.name)).join(', ');
    const toastContainer = document.createElement('div');
    toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
    toastContainer.style.zIndex = '1100';
    toastContainer.innerHTML = `
        <div class="toast show" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
                <i class="fa-solid fa-cake-candles rounded me-2 themed-text"></i>
                <strong class="me-auto">Happy Birthday!</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                Wishing a very happy birthday to: ${names}!
            </div>
        </div>
    `;
    document.body.appendChild(toastContainer);
    const toast = new bootstrap.Toast(toastContainer.querySelector('.toast'));
    toast.show();
}


export function buildHMDashboard(user, allStudents, processedStudents) {
    const dashboardContainer = document.getElementById('dashboard-container');
    dashboardContainer.innerHTML = `
    <div class="card shadow-sm dashboard-card"><div class="card-body"><h2 class="h5 card-title fw-bold mb-3">Quick Actions</h2><div class="d-flex flex-wrap gap-2"><button id="launchWidgetBtn" class="btn themed-bg action-btn rounded-pill"><i class="fa-solid fa-trophy me-1"></i> Launch House Widget</button><button data-action="discipline" class="btn themed-bg action-btn rounded-pill">Discipline Entry</button><a href="https://docs.google.com/spreadsheets/d/1RcXcqDDMi2sAjXGgEyKIFKjwVVmkikfj/edit" target="_blank" class="btn themed-bg action-btn rounded-pill">LP Marks</a><a href="https://docs.google.com/spreadsheets/d/17vdYpWYELcUE--q_9s2JaGcT-GwgNX28/edit" target="_blank" class="btn themed-bg action-btn rounded-pill">UP Marks</a><a href="https://docs.google.com/spreadsheets/d/1qSlfrIqTrJGg_zN-R7b9zVRBG0l-OB8K/edit" target="_blank" class="btn themed-bg action-btn rounded-pill">HS Marks</a></div></div></div>
    <div class="card shadow-sm dashboard-card"><div class="card-body"><div class="d-flex justify-content-between align-items-center mb-3"><h2 class="h5 card-title fw-bold">House Standings</h2><select id="standingsFilter" class="form-select form-select-sm w-auto"><option value="school">School-wide</option></select></div><div style="height: 300px;"><canvas id="standingsChart"></canvas></div><p class="text-muted small mt-2 text-end">Data last synced: ${new Date().toLocaleString()}</p></div></div>
    <div id="leaderboardCard"></div>
    <div id="classToppersCard"></div>
    <div id="subjectToppersCard"></div>
    <div id="reportGeneratorCard"></div>`;

    buildStandingsChart(processedStudents);
    buildLeaderboardCard(processedStudents, appData.activities, false);
    buildClassToppersCard(processedStudents);
    buildSubjectToppersCard(processedStudents);
    buildReportGeneratorCard(processedStudents);
}

export function buildTeacherDashboard(user, allStudents, processedStudents) {
    const dashboardContainer = document.getElementById('dashboard-container');
    const teacherSections = getTeacherSection(user.designation);
    if (!teacherSections || teacherSections.length === 0) {
        dashboardContainer.innerHTML = `<div class="card text-danger shadow-sm dashboard-card"><div class="card-body"><h2 class="h5 card-title fw-bold">Configuration Error</h2><p>Your user profile is missing a valid section designation. Please contact an administrator.</p></div></div>`;
        return;
    }

    const markEntryUrls = {
        LP: "https://docs.google.com/spreadsheets/d/1RcXcqDDMi2sAjXGgEyKIFKjwVVmkikfj/edit",
        UP: "https://docs.google.com/spreadsheets/d/1RyqclF_XUeMHNY3yAsJ8m4i1e3RDJOGQVor_4KyRqDU/edit?usp=sharing",
        HS: "https://docs.google.com/spreadsheets/d/16xR0xvCIR1ulNVzB0D2ZddccDFLlwwLAuFZp_m5IJLI/edit?usp=sharing"
    };

    const markEntryButtons = teacherSections.map(section =>
        `<a href="${markEntryUrls[section]}" target="_blank" class="btn themed-bg action-btn rounded-pill">${section} Mark Entry</a>`
    ).join('');

    const sectionStudents = processedStudents.filter(s => teacherSections.includes(getSection(s.class)));

    dashboardContainer.innerHTML = `
        <div class="card shadow-sm dashboard-card"><div class="card-body"><h2 class="h5 card-title fw-bold mb-3">Quick Actions</h2><div class="d-flex flex-wrap gap-2"><button data-action="discipline" class="btn themed-bg action-btn rounded-pill">Discipline Entry</button>${markEntryButtons}</div></div></div>
        <div class="card shadow-sm dashboard-card"><div class="card-body"><div class="d-flex justify-content-between align-items-center mb-3"><h2 class="h5 card-title fw-bold">House Standings (${teacherSections.join(' & ')})</h2><select id="standingsFilter" class="form-select form-select-sm w-auto"><option value="section">Section-wide</option></select></div><div style="height: 300px;"><canvas id="standingsChart"></canvas></div><p class="text-muted small mt-2 text-end">Data last synced: ${new Date().toLocaleString()}</p></div></div>
        <div id="leaderboardCard"></div>
        <div id="classToppersCard"></div>
        <div id="subjectToppersCard"></div>
        <div id="reportGeneratorCard"></div>`;

    buildStandingsChart(sectionStudents, true);
    buildLeaderboardCard(sectionStudents, appData.activities, true);
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
                                </div>` : ''
            }
                                <button class="btn btn-sm themed-bg w-100 mt-auto view-sibling-profile" data-admission-no="${sanitize(child.admissionNo)}">
                                    ${currentUser && child.admissionNo.toString() === currentUser.admissionNo.toString() ? 'View Full Profile' : 'Switch to Profile'}
                                </button>
                            </div>
                        </div>
                    </div>
                    `;
    }).join('')}
            </div>
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

    const termOrder = ["Monthly Exam 01", "First Mid Term Exam", "First Term Exam"];
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

// --- DASHBOARD WIDGETS AND CHARTS ---

export function buildStandingsChart(students, isSection = false) {
    const filter = document.getElementById('standingsFilter');
    if(!filter) return;
    const classes = [...new Set(students.map(s => `${s.class}-${s.division}`))].sort(customClassSort);

    if (isSection) {
        filter.innerHTML = `<option value="section">Section-wide</option>` + classes.map(c => `<option value="${c}">${c}</option>`).join('');
    } else {
        filter.innerHTML = `<option value="school">School-wide</option><option value="lp">LP Section</option><option value="up">UP Section</option><option value="hs">HS Section</option>` + classes.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    const updateChart = () => {
        let filteredStudents = students;
        const value = filter.value;
        if (value === 'lp' || value === 'up' || value === 'hs') {
            filteredStudents = students.filter(s => getSection(s.class).toLowerCase() === value);
        } else if (value !== 'school' && value !== 'section') {
            filteredStudents = students.filter(s => `${s.class}-${s.division}` === value);
        }

        const houseData = filteredStudents.reduce((acc, s) => {
            if (!acc[s.house]) acc[s.house] = 0;
            acc[s.house] += s.housePoints;
            return acc;
        }, {});

        const labels = Object.keys(houseData).sort();
        const data = labels.map(house => houseData[house]);
        const backgroundColors = labels.map(house => ({ 'Blue': '#0d6efd', 'Green': '#198754', 'Rose': '#dc3545', 'Yellow': '#ffc107' }[house] || '#6c757d'));

        if (standingsChart) standingsChart.destroy();
        const chartEl = document.getElementById('standingsChart');
        if(chartEl){
            standingsChart = new Chart(chartEl.getContext('2d'), { type: 'bar', data: { labels, datasets: [{ label: 'Total House Points', data, backgroundColor: backgroundColors }] }, options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y' } });
        }
    };

    filter.addEventListener('change', updateChart);
    updateChart();
}

export function buildLeaderboardCard(students, activities, isSection = false) {
    const leaderboardCard = document.getElementById('leaderboardCard');
    if (!leaderboardCard) return;

    const classes = [...new Set(students.map(s => `${s.class}-${s.division}`))].sort(customClassSort);
    const filterOptions = isSection
        ? `<option value="section">Section-wide</option>${classes.map(c => `<option value="${c}">${c}</option>`).join('')}`
        : `<option value="school">School-wide</option><option value="lp">LP</option><option value="up">UP</option><option value="hs">HS</option>${classes.map(c => `<option value="${c}">${c}</option>`).join('')}`;

    leaderboardCard.innerHTML = `
    <div class="card shadow-sm">
        <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h2 class="h4 card-title mb-0 fw-bold">Discipline Leaderboards</h2>
                <select id="leaderboardFilter" class="form-select w-auto">${filterOptions}</select>
            </div>
            <div id="leaderboardContent"></div>
        </div>
    </div>`;

    const updateLeaderboards = () => {
        const value = document.getElementById('leaderboardFilter').value;
        let filteredStudents = students;
        let filteredActivities = activities;

        if (value === 'lp' || value === 'up' || value === 'hs') {
            const studentAdmNos = new Set(students.filter(s => getSection(s.class).toLowerCase() === value).map(s => s.admissionNo.toString()));
            filteredStudents = students.filter(s => studentAdmNos.has(s.admissionNo.toString()));
            filteredActivities = activities.filter(a => {
                const activityAdmNos = Array.isArray(a.admissionNo) ? a.admissionNo.map(String) : [String(a.admissionNo)];
                return activityAdmNos.some(admNo => studentAdmNos.has(admNo));
            });
        } else if (value !== 'school' && value !== 'section') {
            const studentAdmNos = new Set(students.filter(s => `${s.class}-${s.division}` === value).map(s => s.admissionNo.toString()));
            filteredStudents = students.filter(s => studentAdmNos.has(s.admissionNo.toString()));
            filteredActivities = activities.filter(a => {
                const activityAdmNos = Array.isArray(a.admissionNo) ? a.admissionNo.map(String) : [String(a.admissionNo)];
                return activityAdmNos.some(admNo => studentAdmNos.has(admNo));
            });
        }

        const topPositiveStudents = [...filteredStudents].sort((a, b) => b.disciplinePoints - a.disciplinePoints).slice(0, 5);
        const topNegativeStudents = [...filteredStudents].sort((a, b) => a.disciplinePoints - b.disciplinePoints).slice(0, 5);
        
        const activityPoints = filteredActivities.reduce((acc, act) => {
            const points = (act.Rating / 5) * (activityRules[act.Activity] || 0);
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

    document.getElementById('leaderboardFilter').addEventListener('change', updateLeaderboards);
    updateLeaderboards();
}


export function buildClassToppersCard(students) {
    setupTopperFilters('classToppersCard', students, 'Class Toppers', updateClassToppersView);
}

export function buildSubjectToppersCard(students) {
    setupTopperFilters('subjectToppersCard', students, 'Subject Toppers', updateSubjectToppersView);
}

export function buildReportGeneratorCard(students) {
    const cardContainer = document.getElementById('reportGeneratorCard');
    if (!cardContainer) return;

    const classes = [...new Set(students.map(s => `${s.class}-${s.division}`))].sort(customClassSort);

    cardContainer.innerHTML = `
    <div class="card shadow-sm">
        <div class="card-body">
            <h2 class="h4 card-title fw-bold mb-3">Report Generator</h2>
            
            <ul class="nav nav-tabs" id="reportTab" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active" id="classwise-tab" data-bs-toggle="tab" data-bs-target="#classwise-tab-pane" type="button" role="tab">Class Wise</button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="sampoorna-tab" data-bs-toggle="tab" data-bs-target="#sampoorna-tab-pane" type="button" role="tab">Sampoorna List</button>
                </li>
            </ul>

            <div class="tab-content pt-3" id="reportTabContent">
                <div class="tab-pane fade show active" id="classwise-tab-pane" role="tabpanel">
                    <!-- Class Wise Generator UI -->
                    <div class="row g-3 align-items-end">
                        <div class="col-lg col-md-4"><label class="form-label small">Class</label><select id="report-class" class="form-select">${classes.map(c => `<option value="${c}">${c}</option>`).join('')}</select></div>
                        <div class="col-lg col-md-4"><label class="form-label small">Term</label><select id="report-term" class="form-select" disabled></select></div>
                        <div class="col-lg col-md-4"><label class="form-label small">Subject</label><select id="report-subject" class="form-select" disabled></select></div>
                        <div class="col-lg-auto col-md-12"><button id="generateReportBtn" class="w-100 btn btn-primary" disabled>Generate</button></div>
                    </div>
                    <div id="reportResultContainer" class="mt-4"></div>
                </div>
                <div class="tab-pane fade" id="sampoorna-tab-pane" role="tabpanel">
                    <!-- Sampoorna List Generator UI -->
                    <p class="text-muted">Generate a JSON file for the Sampoorna student list. This will use the data from your 'Sampoorna - Reports' Google Sheet.</p>
                    <button id="generateSampoornaBtn" class="btn btn-success">Generate sampoorna.json</button>
                    <div id="sampoornaResultContainer" class="mt-3"></div>
                </div>
            </div>
        </div>
    </div>`;

    const classSelect = document.getElementById('report-class');
    const termSelect = document.getElementById('report-term');
    const subjectSelect = document.getElementById('report-subject');
    const generateBtn = document.getElementById('generateReportBtn');
    const resultContainer = document.getElementById('reportResultContainer');
    const generateSampoornaBtn = document.getElementById('generateSampoornaBtn');
    generateSampoornaBtn.addEventListener('click', async () => {
        const resultContainer = document.getElementById('sampoornaResultContainer');
        resultContainer.innerHTML = `<p class="text-info">Fetching Sampoorna list...</p>`;
        try {
            // This assumes your sampoorna.json is in the same folder
            const res = await fetch('./sampoorna.json'); 
            if(!res.ok) throw new Error('Could not fetch sampoorna.json');
            const sampoornaData = await res.json();
            
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sampoornaData, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "sampoorna_students.json");
            document.body.appendChild(downloadAnchorNode); // required for firefox
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            resultContainer.innerHTML = `<p class="text-success">Successfully generated and downloaded sampoorna_students.json!</p>`;

        } catch(e) {
            resultContainer.innerHTML = `<p class="text-danger">Error: ${e.message}</p>`;
        }
    });


    classSelect.addEventListener('change', () => {
        termSelect.innerHTML = '<option value="">Select Term</option>';
        subjectSelect.innerHTML = '<option value="">Select Subject</option>';
        termSelect.disabled = true; subjectSelect.disabled = true; generateBtn.disabled = true;

        const className = classSelect.value;
        if (!className) return;

        const classStudents = students.filter(s => `${s.class}-${s.division}` === className);
        if (classStudents.length === 0) return;

        const terms = [...new Set(classStudents.flatMap(s => s.marksRecord ? Object.keys(s.marksRecord.terms) : []))];
        termSelect.innerHTML += terms.map(t => `<option value="${t}">${t}</option>`).join('');
        termSelect.disabled = false;
    });

    termSelect.addEventListener('change', () => {
        subjectSelect.innerHTML = '<option value="">Select Subject</option>';
        subjectSelect.disabled = true; generateBtn.disabled = true;

        const className = classSelect.value;
        const term = termSelect.value;
        if (!className || !term) return;

        const classStudents = students.filter(s => `${s.class}-${s.division}` === className);
        const subjects = [...new Set(classStudents.flatMap(s => s.marksRecord?.terms?.[term] ? Object.keys(s.marksRecord.terms[term].marks) : []))].sort();

        subjectSelect.innerHTML += subjects.map(s => `<option value="${s}">${s}</option>`).join('');
        subjectSelect.disabled = false;
    });

    subjectSelect.addEventListener('change', () => { generateBtn.disabled = !subjectSelect.value; });

    generateBtn.addEventListener('click', () => {
        const className = classSelect.value;
        const [classNum, division] = className.split('-');
        const section = getSection(classNum);
        const term = termSelect.value;
        const subject = subjectSelect.value;

        const classStudents = students.filter(s => `${s.class}-${s.division}` === className)
            .sort((a, b) => a.name.localeCompare(b.name));

        let tableHTML = `<div class="table-responsive"><table id="reportTable" class="table table-bordered"><thead><tr><th>Name</th><th>TE</th><th>CE</th></tr></thead><tbody>`;
        let teClipboardText = "";
        let ceClipboardText = "";

        classStudents.forEach(s => {
            const mark = s.marksRecord?.terms?.[term]?.marks?.[subject];
            const { grade, maxMark } = getGradeInfo(mark, subject, term, s.class);
            const displayMark = (typeof mark === 'number') ? mark : 'Ab';

            let teDisplay, ceDisplay;

            if (section === 'HS') {
                teDisplay = displayMark;
                ceDisplay = calculateCE_HS(mark, maxMark);
                teClipboardText += `${teDisplay}\n`;
                ceClipboardText += `${ceDisplay}\n`;
            } else { // UP or LP
                teDisplay = grade;
                ceDisplay = calculateCE_UP(grade);
                teClipboardText += `${teDisplay}\n`;
                ceClipboardText += `${ceDisplay}\n`;
            }

            tableHTML += `<tr><td>${sanitize(s.name)}</td><td>${teDisplay}</td><td>${ceDisplay}</td></tr>`;
        });

        tableHTML += '</tbody></table></div><div class="mt-3 d-flex gap-2 justify-content-end"><button id="copyTeBtn" class="btn btn-success">Copy TE</button><button id="copyCeBtn" class="btn btn-info">Copy CE</button></div>';
        resultContainer.innerHTML = tableHTML;

        document.getElementById('copyTeBtn').addEventListener('click', e => copyToClipboard(e.target, teClipboardText.trim()));
        document.getElementById('copyCeBtn').addEventListener('click', e => copyToClipboard(e.target, ceClipboardText.trim()));
    });
}

function copyToClipboard(button, text) {
    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => { button.textContent = originalText; }, 2000);
    }).catch(err => console.error('Failed to copy text: ', err));
}


function setupTopperFilters(cardId, students, title, updateFunction) {
    const cardContainer = document.getElementById(cardId);
    if (!cardContainer) return;

    const allTerms = [...new Set(students.flatMap(s => s.marksRecord ? Object.keys(s.marksRecord.terms) : []))];

    cardContainer.innerHTML = `
    <div class="card shadow-sm">
        <div class="card-body">
            <h2 class="h4 card-title fw-bold mb-3">${title}</h2>
            <div class="row g-3 mb-4 align-items-end">
                <div class="col-md-3">
                    <label class="form-label small">Ranking Basis</label>
                    <select id="${cardId}-basis" class="form-select mt-1">
                        <option value="all-time">All Time</option>
                        ${allTerms.map(t => `<option value="${t}">${t}</option>`).join('')}
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label small">Student Group</label>
                    <select id="${cardId}-scope" class="form-select mt-1">
                        <option value="school">School-wide</option>
                        <option value="section">By Section</option>
                        <option value="standard">By Standard</option>
                        <option value="division">By Division</option>
                    </select>
                </div>
                <div class="col-md-3">
                    <label class="form-label small">Detail</label>
                    <select id="${cardId}-detail" class="form-select mt-1" disabled><option value="">-</option></select>
                </div>
                <div class="col-md-3">
                    <button id="${cardId}-resetBtn" class="w-100 btn btn-outline-secondary">Reset</button>
                </div>
            </div>
            <div id="${cardId}-content">
                <p class="text-muted">Please make a selection to view toppers.</p>
            </div>
        </div>
    </div>`;

    const basisEl = document.getElementById(`${cardId}-basis`);
    const scopeEl = document.getElementById(`${cardId}-scope`);
    const detailEl = document.getElementById(`${cardId}-detail`);
    const resetBtn = document.getElementById(`${cardId}-resetBtn`);

    const triggerUpdate = () => {
        const basis = basisEl.value;
        const scope = scopeEl.value;
        const detail = detailEl.value;
        updateFunction(students, basis, scope, detail, `${cardId}-content`);
    };

    scopeEl.addEventListener('change', () => {
        const scope = scopeEl.value;
        detailEl.innerHTML = '<option value="">Select</option>';
        detailEl.disabled = true;

        let options = [];
        if (scope === 'section') {
            options = [...new Set(students.map(s => getSection(s.class)))];
        } else if (scope === 'standard') {
            options = [...new Set(students.map(s => s.class))].sort((a, b) => a - b);
        } else if (scope === 'division') {
            options = [...new Set(students.map(s => `${s.class}-${s.division}`))].sort(customClassSort);
        }

        if (options.length > 0) {
            detailEl.innerHTML = '<option value="">Select</option>' + options.map(o => `<option value="${o}">${o}</option>`).join('');
            detailEl.disabled = false;
        } else {
            detailEl.innerHTML = '<option value="">-</option>';
        }
        triggerUpdate();
    });

    resetBtn.addEventListener('click', () => {
        basisEl.value = 'all-time';
        scopeEl.value = 'school';
        scopeEl.dispatchEvent(new Event('change'));
    });

    basisEl.addEventListener('change', triggerUpdate);
    detailEl.addEventListener('change', triggerUpdate);
    triggerUpdate();
}

function updateClassToppersView(students, basis, scope, detail, contentId) {
    const contentEl = document.getElementById(contentId);
    let filteredStudents = students;

    if (scope === 'section' && detail) {
        filteredStudents = students.filter(s => getSection(s.class) === detail);
    } else if (scope === 'standard' && detail) {
        filteredStudents = students.filter(s => s.class.toString() === detail.toString());
    } else if (scope === 'division' && detail) {
        filteredStudents = students.filter(s => `${s.class}-${s.division}` === detail);
    }

    let finalTopperList;
    let isRankedList = false;
    let rankHeader = "Rank";

    if ((scope === 'division' && detail) || (scope === 'standard' && detail)) {
        isRankedList = true;
        rankHeader = "Rank";
        let sortedStudents;
        if (basis === 'all-time') {
            sortedStudents = [...filteredStudents].sort((a, b) => b.academicTotal - a.academicTotal);
        } else {
            sortedStudents = [...filteredStudents]
                .map(s => ({ ...s, termTotal: s.marksRecord?.terms?.[basis]?.total ?? -1 }))
                .filter(s => s.termTotal !== -1)
                .sort((a, b) => b.termTotal - a.termTotal);
        }
        finalTopperList = sortedStudents.slice(0, 10);
    } else {
        isRankedList = false;
        rankHeader = "Class";
        const uniqueDivisions = [...new Set(filteredStudents.map(s => `${s.class}-${s.division}`))].sort(customClassSort);

        finalTopperList = uniqueDivisions.map(division => {
            let divisionStudents = filteredStudents.filter(s => `${s.class}-${s.division}` === division);
            let sortedDivisionStudents;
            if (basis === 'all-time') {
                sortedDivisionStudents = [...divisionStudents].sort((a, b) => b.academicTotal - a.academicTotal);
            } else {
                sortedDivisionStudents = [...divisionStudents]
                    .map(s => ({ ...s, termTotal: s.marksRecord?.terms?.[basis]?.total ?? -1 }))
                    .filter(s => s.termTotal !== -1)
                    .sort((a, b) => b.termTotal - a.termTotal);
            }
            return sortedDivisionStudents.length > 0 ? sortedDivisionStudents[0] : null;
        }).filter(Boolean);
    }

    if (finalTopperList.length === 0) {
        contentEl.innerHTML = `<p class="text-muted">No data available for this selection.</p>`;
        return;
    }
    
    contentEl.innerHTML = `
    <div class="table-responsive">
        <table class="table table-striped table-hover">
            <thead class="table-light"><tr><th>${rankHeader}</th><th>Name</th><th>Score</th></tr></thead>
            <tbody>
                ${finalTopperList.map((s, i) => `
                    <tr>
                        <td class="fw-bold">${isRankedList ? i + 1 : `${s.class}-${s.division}`}</td>
                        <td>${sanitize(s.name)} ${!isRankedList ? '' : `(${s.class}-${s.division})`}</td>
                        <td>${(basis === 'all-time' ? s.academicTotal : s.termTotal).toFixed(0)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    </div>`;
}

function updateSubjectToppersView(students, basis, scope, detail, contentId) {
    const contentEl = document.getElementById(contentId);
    const term = (basis === 'all-time') ? null : basis;

    if (!term) {
        contentEl.innerHTML = `<p class="text-muted">Please select a specific exam to view subject toppers.</p>`;
        return;
    }

    let filteredStudents = students;
    if (scope === 'section' && detail) {
        filteredStudents = students.filter(s => getSection(s.class) === detail);
    } else if (scope === 'standard' && detail) {
        filteredStudents = students.filter(s => s.class.toString() === detail.toString());
    } else if (scope === 'division' && detail) {
        filteredStudents = students.filter(s => `${s.class}-${s.division}` === detail);
    }

    if (!filteredStudents.length) {
        contentEl.innerHTML = `<p class="text-muted">No students found for this selection.</p>`;
        return;
    }

    const subjects = [...new Set(filteredStudents.flatMap(s =>
        s.marksRecord?.terms?.[term] ? Object.keys(s.marksRecord.terms[term].marks) : []
    ))].sort();

    if (subjects.length === 0) {
        contentEl.innerHTML = `<p class="text-muted">No subjects found for this selection.</p>`;
        return;
    }

    let toppersHTML = '';
    subjects.forEach(subject => {
        let toppers = [];
        let topScore = -1;

        if (scope === 'school' || scope === 'section' || scope === 'standard') {
            const groupingKeyFn = s => (scope === 'standard') ? `${s.class}-${s.division}`: s.class;
            const groupsToIterate = [...new Set(filteredStudents.map(groupingKeyFn))].sort((a,b) => scope === 'standard' ? customClassSort(a,b) : parseInt(a,10) - parseInt(b,10) );

            groupsToIterate.forEach(group => {
                const groupStudents = filteredStudents.filter(s => groupingKeyFn(s) == group);
                let groupTopScore = -1;
                let groupTopper = null;
                groupStudents.forEach(student => {
                    const mark = student.marksRecord?.terms?.[term]?.marks?.[subject];
                    if (typeof mark === 'number' && mark > groupTopScore) {
                        groupTopScore = mark;
                        groupTopper = student;
                    }
                });
                if (groupTopper) {
                    toppers.push({student: groupTopper, score: groupTopScore});
                }
            });

        } else { // scope === 'division'
            filteredStudents.forEach(student => {
                const mark = student.marksRecord?.terms?.[term]?.marks?.[subject];
                if (typeof mark === 'number') {
                    if (mark > topScore) {
                        topScore = mark;
                        toppers = [{student, score: mark}];
                    } else if (mark === topScore) {
                        toppers.push({student, score: mark});
                    }
                }
            });
        }
        
        if (toppers.length > 0) {
            const { maxMark } = getGradeInfo(0, subject, term, toppers[0].student.class);
            const topperNames = toppers.map(t => `${sanitize(t.student.name)} (${t.score})`).join(', ');
            toppersHTML += `
            <div class="col-lg-4 col-md-6">
                <div class="bg-light p-3 rounded h-100">
                    <h4 class="h6 fw-bold text-dark">${sanitize(subject)}</h4>
                    <p class="small text-muted mb-1">Max Mark: <span class="fw-semibold text-primary">${maxMark}</span></p>
                    <p class="small mb-0">${topperNames}</p>
                </div>
            </div>`;
        }
    });

    contentEl.innerHTML = `<div class="row g-3">${toppersHTML}</div>`;
    if (!toppersHTML) {
        contentEl.innerHTML = `<p class="text-muted">No marks recorded for this selection.</p>`;
    }
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
        const activityDate = new Date(act.Timestamp);
        return activityDate >= yesterday && activityDate < today;
    });

    yesterdaysActivities.forEach(act => {
        const basePoints = activityRules[act.Activity] || 0;
        const calculatedPoints = (act.Rating / 5) * basePoints;
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

