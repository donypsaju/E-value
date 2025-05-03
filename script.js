// Global variables
let studentsData = {};
let performanceChart = null;
let subjectChart = null;

// DOM elements
const classSelect = document.getElementById('class-select');
const studentSelect = document.getElementById('student-select');
const dobInput = document.getElementById('dob-input');
const loginForm = document.getElementById('student-login-form');
const dashboardSection = document.getElementById('dashboard-section');
const loginSection = document.getElementById('login-section');
const changeStudentBtn = document.getElementById('change-student-btn');

// Helper functions
function formatDisplayDate(dateStr) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString(undefined, options);
}

function getMarkValue(mark) {
    return typeof mark === 'number' ? mark : 0;
}

// Update the calculateTermTotal function to account for different max marks
function calculateTermTotal(marks) {
    const subjects25 = ["Mal I", "Mal II", "English", "Hindi"];
    let total = 0;
    
    Object.entries(marks).forEach(([subject, mark]) => {
        if (typeof mark === 'number') {
            // Convert all marks to percentage for fair comparison
            const maxMarks = subjects25.includes(subject) ? 25 : 30;
            total += (mark / maxMarks) * 100;
        }
    });
    
    // Return average percentage
    return (total / Object.keys(marks).length).toFixed(1);
}

// Update the getGrade function to handle different max marks per subject
function getGrade(subject, mark) {
    if (typeof mark !== 'number') return '';
    
    // Subjects with max marks 25
    const subjects25 = ["Mal I", "Mal II", "English", "Hindi"];
    
    if (subjects25.includes(subject)) {
        if (mark >= 19) return '<span class="grade-A">A</span>';
        if (mark >= 15) return '<span class="grade-B">B</span>';
        if (mark >= 11) return '<span class="grade-C">C</span>';
        if (mark >= 8) return '<span class="grade-D">D</span>';
        return '<span class="grade-E">E</span>';
    } 
    // Subjects with max marks 30
    else {
        if (mark >= 23) return '<span class="grade-A">A</span>';
        if (mark >= 19) return '<span class="grade-B">B</span>';
        if (mark >= 14) return '<span class="grade-C">C</span>';
        if (mark >= 10) return '<span class="grade-D">D</span>';
        return '<span class="grade-E">E</span>';
    }
}

function getProgressIndicator(term1, term2, term3) {
    const t1 = getMarkValue(term1);
    const t2 = getMarkValue(term2);
    const t3 = getMarkValue(term3);
    
    if (t3 > t2 && t2 > t1) return '↑↑ <span class="rank-improvement">Excellent progress</span>';
    if (t3 > t1) return '↑ <span class="rank-improvement">Improving</span>';
    if (t3 === t1) return '→ <span class="rank-no-change">Stable</span>';
    return '↓ <span class="rank-decline">Needs attention</span>';
}

// Main functions
function populateClassDropdown() {
    classSelect.innerHTML = '<option value="" selected disabled>Select Class</option>';
    Object.keys(studentsData).sort().forEach(className => {
        const option = document.createElement('option');
        option.value = className;
        option.textContent = className;
        classSelect.appendChild(option);
    });
}

function populateStudentDropdown(className) {
    studentSelect.innerHTML = '<option value="" selected disabled>Select Student</option>';
    studentSelect.disabled = !className;
    
    if (className && studentsData[className]) {
        studentsData[className].forEach(student => {
            const option = document.createElement('option');
            option.value = student.name;
            option.textContent = student.name;
            option.dataset.dob = student.dob;
            studentSelect.appendChild(option);
        });
    }
}

// Helper function to calculate term percentage
function calculateTermPercentage(marks) {
    const subjects25 = ["Mal I", "Mal II", "English", "Hindi"];
    let totalPercentage = 0;
    let count = 0;
    
    Object.entries(marks).forEach(([subject, mark]) => {
        if (typeof mark === 'number') {
            const maxMarks = subjects25.includes(subject) ? 25 : 30;
            totalPercentage += (mark / maxMarks) * 100;
            count++;
        }
    });
    
    return count > 0 ? (totalPercentage / count).toFixed(1) : 0;
}

function displayTermSummary(termNum, termData, student) {
    const stats = calculateTermStats(termData.marks);
    
    document.getElementById(`term${termNum}-total`).textContent = `Total: ${stats.total}`;
    document.getElementById(`term${termNum}-percentage`).textContent = `Percentage: ${stats.percentage}%`;
    
    if (termNum === '1') {
      document.getElementById(`term${termNum}-rank`).textContent = `Rank: ${termData.rank}`;
    } else {
      const prevTermNum = String(parseInt(termNum) - 1);
      const prevRank = student.terms[prevTermNum].rank;
      const rankChange = prevRank - termData.rank;
      
      let changeText = '';
      if (rankChange > 0) {
        changeText = `<span class="rank-improvement">(+${rankChange})</span>`;
      } else if (rankChange < 0) {
        changeText = `<span class="rank-decline">(${rankChange})</span>`;
      } else {
        changeText = `<span class="rank-no-change">(No change)</span>`;
      }
      
      document.getElementById(`term${termNum}-rank`).innerHTML = `Rank: ${termData.rank} ${changeText}`;
    }
  }

// Update the createMarkCell function to pass the subject
function createMarkCell(subject, mark) {
    const cell = document.createElement('td');
    if (typeof mark === 'number') {
        cell.innerHTML = `${mark} ${getGrade(subject, mark)}`;
    } else {
        cell.innerHTML = `<span class="absent">${mark}</span>`;
    }
    return cell;
}

// Update the populateMarksTable function to pass subject to createMarkCell
function populateMarksTable(student) {
    const tableBody = document.getElementById('marks-table-body');
    tableBody.innerHTML = '';
    
    const subjects = Object.keys(student.terms[1].marks);
    
    subjects.forEach(subject => {
        const row = document.createElement('tr');
        
        // Subject name
        const subjectCell = document.createElement('td');
        subjectCell.textContent = subject;
        row.appendChild(subjectCell);
        
        // Term marks
        const term1Mark = student.terms[1].marks[subject];
        const term2Mark = student.terms[2].marks[subject];
        const term3Mark = student.terms[3].marks[subject];
        
        row.appendChild(createMarkCell(subject, term1Mark));
        row.appendChild(createMarkCell(subject, term2Mark));
        row.appendChild(createMarkCell(subject, term3Mark));
        
        // Progress indicator
        const progressCell = document.createElement('td');
        progressCell.innerHTML = getProgressIndicator(term1Mark, term2Mark, term3Mark);
        row.appendChild(progressCell);
        
        tableBody.appendChild(row);
    });
}

function createPerformanceChart(student) {
    const ctx = document.getElementById('performance-chart').getContext('2d');
    
    const termData = student.terms;
    const termLabels = ['1st Term', '2nd Term', '3rd Term'];
    
    // Calculate both totals and percentages
    const termTotals = [
      calculateTermStats(termData[1].marks).total,
      calculateTermStats(termData[2].marks).total,
      calculateTermStats(termData[3].marks).total
    ];
    
    const termPercentages = [
      calculateTermStats(termData[1].marks).percentage,
      calculateTermStats(termData[2].marks).percentage,
      calculateTermStats(termData[3].marks).percentage
    ];
    
    const termRanks = [termData[1].rank, termData[2].rank, termData[3].rank];
    
    window.performanceChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: termLabels,
        datasets: [
          {
            label: 'Total Marks',
            data: termTotals,
            backgroundColor: 'rgba(54, 162, 235, 0.7)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
            yAxisID: 'y'
          },
          {
            label: 'Percentage',
            data: termPercentages,
            type: 'line',
            borderColor: 'rgba(75, 192, 192, 1)',
            backgroundColor: 'rgba(75, 192, 192, 0.1)',
            borderWidth: 2,
            yAxisID: 'y1'
          },
          {
            label: 'Rank',
            data: termRanks,
            type: 'line',
            borderColor: 'rgba(255, 99, 132, 1)',
            backgroundColor: 'rgba(255, 99, 132, 0.1)',
            borderWidth: 2,
            yAxisID: 'y2'
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            title: { display: true, text: 'Total Marks' }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            min: 0,
            max: 100,
            title: { display: true, text: 'Percentage' },
            grid: { drawOnChartArea: false }
          },
          y2: {
            type: 'linear',
            display: true,
            position: 'right',
            reverse: true,
            title: { display: true, text: 'Rank' },
            grid: { drawOnChartArea: false }
          }
        }
      }
    });
  }

function createSubjectChart(student) {
    const ctx = document.getElementById('subject-chart').getContext('2d');
    const subjects = Object.keys(student.terms[1].marks);
    
    if (subjectChart) {
        subjectChart.destroy();
    }
    
    subjectChart = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: subjects,
            datasets: [
                {
                    label: '1st Term',
                    data: subjects.map(subject => getMarkValue(student.terms[1].marks[subject])),
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(54, 162, 235, 1)'
                },
                {
                    label: '2nd Term',
                    data: subjects.map(subject => getMarkValue(student.terms[2].marks[subject])),
                    backgroundColor: 'rgba(255, 206, 86, 0.2)',
                    borderColor: 'rgba(255, 206, 86, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(255, 206, 86, 1)'
                },
                {
                    label: '3rd Term',
                    data: subjects.map(subject => getMarkValue(student.terms[3].marks[subject])),
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(75, 192, 192, 1)'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { display: true },
                    suggestedMin: 0,
                    suggestedMax: 25,
                    ticks: { stepSize: 5 }
                }
            }
        }
    });
}

function showDashboard(student) {
    loginSection.style.display = 'none';
    dashboardSection.style.display = 'block';
    
    // Display student info
    document.getElementById('student-name').textContent = student.name;
    document.getElementById('student-details').innerHTML = `
        <p><strong>Class:</strong> ${student.class}</p>
        <p><strong>Gender:</strong> ${student.gender}</p>
        <p><strong>Date of Birth:</strong> ${formatDisplayDate(student.dob)}</p>
    `;
    
    // Display term summaries
    displayTermSummary('1', student.terms[1], student);
    displayTermSummary('2', student.terms[2], student);
    displayTermSummary('3', student.terms[3], student);
    
    // Create charts
    createPerformanceChart(student);
    createSubjectChart(student);
    
    // Populate marks table
    populateMarksTable(student);
}
function calculateTermStats(marks) {
    const subjects25 = ["Mal I", "Mal II", "English", "Hindi"];
    let totalMarks = 0;
    let totalPercentage = 0;
    let count = 0;
    
    Object.entries(marks).forEach(([subject, mark]) => {
      if (typeof mark === 'number') {
        const maxMarks = subjects25.includes(subject) ? 25 : 30;
        totalMarks += mark;
        totalPercentage += (mark / maxMarks) * 100;
        count++;
      }
    });
    
    return {
      total: totalMarks,
      percentage: count > 0 ? (totalPercentage / count).toFixed(1) : 0
    };
  }
function showLoginSection() {
    dashboardSection.style.display = 'none';
    loginSection.style.display = 'block';
    loginForm.reset();
    studentSelect.disabled = true;
    
    // Destroy charts
    if (performanceChart) {
        performanceChart.destroy();
        performanceChart = null;
    }
    if (subjectChart) {
        subjectChart.destroy();
        subjectChart = null;
    }
}

function verifyStudent() {
    const selectedClass = classSelect.value;
    const selectedStudent = studentSelect.value;
    const dob = dobInput.value;
    
    if (!selectedClass || !selectedStudent || !dob) {
        alert('Please fill all fields');
        return;
    }

    const student = studentsData[selectedClass].find(s => 
        s.name === selectedStudent && s.dob === dob
    );

    if (student) {
        showDashboard(student);
    } else {
        alert('Student not found. Please check the details and try again.');
    }
}

// Initialize application
async function loadStudentData() {
    try {
        const response = await fetch('students.json');
        if (!response.ok) {
            throw new Error('Failed to load student data');
        }
        const data = await response.json();
        
        // Convert array to class-based structure
        studentsData = data.reduce((acc, student) => {
            if (!acc[student.class]) {
                acc[student.class] = [];
            }
            acc[student.class].push(student);
            return acc;
        }, {});
        
        // Set up event listeners
        classSelect.addEventListener('change', function() {
            populateStudentDropdown(this.value);
        });

        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            verifyStudent();
        });

        changeStudentBtn.addEventListener('click', showLoginSection);
        
        // Populate initial class dropdown
        populateClassDropdown();
    } catch (error) {
        console.error('Error loading student data:', error);
        alert('Error loading student data. Please try again later.');
    }
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', loadStudentData);