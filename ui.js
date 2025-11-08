import { sanitize, getGradeInfo, getSection, getTeacherSection, customClassSort, isActivityForStudent, calculateCE_HS, calculateCE_UP } from './utils.js';
import { translations, activityRules } from './config.js';

// --- GLOBAL UI STATE ---
let standingsChart = null;
let appData = {};
let currentUser = null;

// DOM elements
let homeView, loginView, dashboardView, progressBar, globalControls;
let detailModal, iframeModal, dobVerifyModal;

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

export function buildHMDashboard(user, allStudents, processedStudents, staffBirthdays, studentBirthdays) {
    const birthdayCarouselsHTML = buildBirthdayCardsHTML(staffBirthdays, studentBirthdays);
    const months = [...new Set(appData.activities.map(a => new Date(a.activityDate || a.submissionTimestamp).toLocaleString('default', { month: 'long', year: 'numeric' })))];
    
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
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h2 class="h5 card-title fw-bold mb-0">House Standings</h2>
                    <select id="standingsFilter" class="form-select form-select-sm w-auto">
                        <option value="school">Overall</option>
                        ${months.map(m => `<option value="${m}">${m}</option>`).join('')}
                    </select>
                </div>
                <div style="height: 300px;"><canvas id="standingsChart"></canvas></div>
            </div>
        </div>
        <div id="leaderboardCard"></div>
        <div id="classToppersCard"></div>
        <div id="subjectToppersCard"></div>
        <div id="reportGeneratorCard"></div>`;

    buildStandingsChart(processedStudents, appData.activities);
    buildLeaderboardCard(processedStudents, appData.activities, false);
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
        HS: "https://docs.google.com/spreadsheets/d/16xR0xvCIR1ulNVzB0D2ZddccDFLlwwLAuFZp_m5IJLI/edit?usp=sharing"
    };
    const markEntryButtons = teacherSections.map(section => `<a href="${markEntryUrls[section]}" target="_blank" class="btn themed-bg action-btn rounded-pill">${section} Mark Entry</a>`).join('');
    const sectionStudents = processedStudents.filter(s => teacherSections.includes(getSection(s.class)));

    const relevantClasses = [...new Set(sectionStudents.map(s => `${s.class}-${s.division}`))].sort(customClassSort);
    let filterOptions = `<option value="school">School-wide</option>`;
    teacherSections.forEach(section => {
        filterOptions += `<option value="${section.toLowerCase()}">${section} Section</option>`;
    });
    relevantClasses.forEach(cls => {
        filterOptions += `<option value="${cls}">${cls}</option>`;
    });
    
    const birthdayCarouselsHTML = buildBirthdayCardsHTML(staffBirthdays, studentBirthdays);

    dashboardContainer.innerHTML = `
        <div class="card shadow-sm dashboard-card mb-4"><div class="card-body"><h2 class="h5 card-title fw-bold mb-3">Quick Actions</h2><div class="d-flex flex-wrap gap-2"><button data-action="evaluate-houses" class="btn btn-warning action-btn rounded-pill text-dark">Evaluate Houses</button><button data-action="discipline" class="btn themed-bg action-btn rounded-pill">Discipline Entry</button>${markEntryButtons}</div></div></div>
        ${birthdayCarouselsHTML}
        <div class="card shadow-sm mb-4">
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h2 class="h5 card-title fw-bold mb-0">House Standings</h2>
                    <select id="teacherStandingsFilter" class="form-select form-select-sm w-auto">${filterOptions}</select>
                </div>
                <div style="height: 300px;"><canvas id="teacherStandingsChart"></canvas></div>
            </div>
        </div>
        <div id="leaderboardCard" class="mb-4"></div>
        <div id="classToppersCard" class="mb-4"></div>
        <div id="subjectToppersCard" class="mb-4"></div>
        <div id="reportGeneratorCard"></div>`;

    const filter = document.getElementById('teacherStandingsFilter');
    const chartCtx = document.getElementById('teacherStandingsChart')?.getContext('2d');
    let chartInstance = null;

    if (filter && chartCtx) {
        const houses = ['Blue', 'Green', 'Rose', 'Yellow'];
        const updateChart = () => {
            const value = filter.value;
            let filteredStudents = processedStudents;
            if (value === 'up' || value === 'hs' || value === 'lp') {
                filteredStudents = processedStudents.filter(s => getSection(s.class).toLowerCase() === value);
            } else if (value !== 'school') {
                filteredStudents = processedStudents.filter(s => `${s.class}-${s.division}` === value);
            }
            const chartHouseData = filteredStudents.reduce((acc, s) => {
                if (s.house) {
                    if (!acc[s.house]) acc[s.house] = 0;
                    acc[s.house] += s.housePoints;
                }
                return acc;
            }, {});
            const data = houses.map(house => chartHouseData[house] || 0);
            const backgroundColors = houses.map(house => ({ 'Blue': '#0d6efd', 'Green': '#198754', 'Rose': '#dc3545', 'Yellow': '#ffc107' }[house] || '#6c757d'));
            if (chartInstance) chartInstance.destroy();
            chartInstance = new Chart(chartCtx, { type: 'bar', data: { labels: houses, datasets: [{ label: 'Total Points', data, backgroundColor: backgroundColors }] }, options: { responsive: true, maintainAspectRatio: false } });
        };
        filter.addEventListener('change', updateChart);
        updateChart();
    }

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
    
    // --- NEW: Month Filter Dropdown ---
    const monthOptions = `<option value="All-Time">All-Time</option>` +
        availableMonths.map(month => `<option value="${month}" ${month === selectedMonth ? 'selected' : ''}>${month}</option>`).join('');

    const filterHTML = `
        <div class="col-12 col-md-auto">
            <label for="siuRankFilter" class="form-label small">Filter by Month</label>
            <select class="form-select form-select-sm" id="siuRankFilter">
                ${monthOptions}
            </select>
        </div>
    `;

    const mainHeader = isModal ? '' : `
        <div class="row g-3 justify-content-between align-items-center mb-4">
            <div class="col-auto"><h2 class="h4 fw-bold themed-text mb-0">SIU Performance Dashboard</h2></div>
            <div class="col-auto d-flex gap-2">
                ${isModal ? '' : filterHTML}
                <button data-action="add-activity" class="btn themed-bg action-btn rounded-pill"><i class="fa-solid fa-plus me-1"></i> Add Activity Entry</button>
            </div>
        </div>`;

    // --- NEW: Rank Change Logic ---
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
        </div>
    `;
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
    
    // Use the *filtered* activities list to calculate points
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
        <div class="list-group">${memberListHTML}</div>
    `;
}
// --- DASHBOARD WIDGETS AND CHARTS ---

export function buildStandingsChart(students, activities, chartId = 'standingsChart', filterId = 'standingsFilter') {
    const filter = document.getElementById(filterId);
    const chartCtx = document.getElementById(chartId)?.getContext('2d');
    if (!filter || !chartCtx) return;
    
    let chartInstance = null;
    const houses = ['Blue', 'Green', 'Rose', 'Yellow'];
    
    const updateChart = () => {
        const value = filter.value;
        let pointData = {};

        if (value === 'school') { // Overall points
            pointData = students.reduce((acc, s) => {
                if (s.house) {
                    if (!acc[s.house]) acc[s.house] = 0;
                    acc[s.house] += s.housePoints;
                }
                return acc;
            }, {});
        } else if (value.includes('Section')) { // Section-wide points
             const section = value.split(' ')[0];
             const sectionStudents = students.filter(s => getSection(s.class).toLowerCase() === section);
             pointData = sectionStudents.reduce((acc, s) => { /*...*/}, {});
        } else if (value.includes('-')) { // Class-specific points
            const classStudents = students.filter(s => `${s.class}-${s.division}` === value);
            pointData = classStudents.reduce((acc, s) => { /*...*/}, {});
        } else { // Monthly points
            pointData = houses.reduce((acc, house) => {
                acc[house] = 0;
                return acc;
            }, {});
            
            activities.forEach(act => {
                const activityMonth = new Date(act.activityDate || act.submissionTimestamp).toLocaleString('default', { month: 'long', year: 'numeric' });
                if (activityMonth === value) {
                    const points = (act.Rating / 10) * (activityRules[act.Activity] || 0);
                    const actAdmNos = Array.isArray(act.admissionNo) ? act.admissionNo.map(String) : [String(act.admissionNo)];
                    actAdmNos.forEach(admNo => {
                        const student = students.find(s => s.admissionNo.toString() === admNo);
                        if (student && student.house) {
                            pointData[student.house] += points;
                        }
                    });
                }
            });
        }
        
        const data = houses.map(house => Math.round(pointData[house] || 0));
        const backgroundColors = houses.map(house => ({ 'Blue': '#0d6efd', 'Green': '#198754', 'Rose': '#dc3545', 'Yellow': '#ffc107' }[house] || '#6c757d'));

        if (chartInstance) chartInstance.destroy();
        chartInstance = new Chart(chartCtx, { type: 'bar', data: { labels: houses, datasets: [{ label: 'Points', data, backgroundColor: backgroundColors }] }, options: { responsive: true, maintainAspectRatio: false } });
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
            const points = (act.Rating / 10) * (activityRules[act.Activity] || 0); // Use 10 for rating
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

