// App version for cache management
export const APP_VERSION = '2.5.2-TRIAL';

// Translation data for multi-language support
export const translations = {
    en: {
        subtitle: "Student Evaluation Portal",
        features_title: "Key Features",
        feature_1: "Comprehensive Performance Tracking",
        feature_2: "Detailed Subject-wise Analysis",
        feature_3: "Parent Dashboard for Siblings",
        feature_4: "House System and Discipline Points",
        feature_5: "Light & Dark Mode Support",
        instructions_title: "Instructions for Parents",
        instruction_1: "Click the 'Go to Login' button below.",
        instruction_2: "Enter your registered phone number.",
        instruction_3: "Enter one of your children's date of birth.",
        instruction_4: "You will see a dashboard with all your children listed.",
        instruction_5: "To view another child, click 'Switch' and verify.",
        login_button: "Go to Login"
    },
    ml: {
        subtitle: "വിദ്യാർത്ഥി മൂല്യനിർണ്ണയ പോർട്ടൽ",
        features_title: "പ്രധാന സവിശേഷതകൾ",
        feature_1: "സമഗ്രമായ പ്രകടന വിലയിരുത്തൽ",
        feature_2: "വിഷയം തിരിച്ചുള്ള വിശദമായ വിശകലനം",
        feature_3: "സഹോദരങ്ങൾക്കായി പാരന്റ് ഡാഷ്‌ബോർഡ്",
        feature_4: "ഹൗസ് സിസ്റ്റവും അച്ചടക്ക പോയിന്റുകളും",
        feature_5: "ലൈറ്റ് & ഡാർക്ക് മോഡ് പിന്തുണ",
        instructions_title: "രക്ഷിതാക്കൾക്കുള്ള നിർദ്ദേശങ്ങൾ",
        instruction_1: "താഴെയുള്ള 'ലോഗിൻ ചെയ്യുക' ബട്ടൺ ക്ലിക്ക് ചെയ്യുക.",
        instruction_2: "നിങ്ങളുടെ രജിസ്റ്റർ ചെയ്ത ഫോൺ നമ്പർ നൽകുക.",
        instruction_3: "ലോഗിൻ ചെയ്യുന്നതിന് നിങ്ങളുടെ ഒരു കുട്ടിയുടെ ജനനത്തീയതി നൽകുക.",
        instruction_4: "നിങ്ങളുടെ എല്ലാ കുട്ടികളെയും ഉൾപ്പെടുത്തിയ ഒരു ഡാഷ്‌ബോർഡ് നിങ്ങൾ കാണും.",
        instruction_5: "മറ്റൊരു കുട്ടിയുടെ പ്രൊഫൈൽ കാണുന്നതിന്, 'Switch' ക്ലിക്ക് ചെയ്ത് അവരുടെ ജനനത്തീയതി ഉപയോഗിച്ച് സ്ഥിരീകരിക്കുക.",
        login_button: "ലോഗിൻ ചെയ്യുക"
    }
};

// Rules for calculating discipline points
export const activityRules = {
    "Class Cleaning": 5, "Assembly Appearance": 5, "Response in Class Activities": 5,
    "Competitive Winner": 10, "Extra Curricular Activities": 10, "Helping Mind": 10,
    "Class Performance": 10, "Participation in common activities": 10,
    "Bad Words": -15, "Fighting": -20, "Misbehaviour in public place": -20,
    "Misbehaviour towards teachers": -15, "Without ID Card": -10, "Indiscipline": -10,
    "Misbehaviour in Assembly": -10, "Indisciplinary activity at anytime": -10,
    "Personal Hygiene": -10, "Incomplete Uniform": -5, "Missing Homework": -5,
    "Play during interval": -5, "Participation in Kalolsavam & Sports/ Science fair": 10, "First Prize in any Event": 50, "Second Prize in any Event": 30, "Third Prize in any Event": 20
};

export const gradeConfig = {
    defaultGrades: {
        90: 'A+', 80: 'A', 70: 'B+', 60: 'B', 50: 'C+', 40: 'C', 30: 'D+', 20: 'D', 0: 'E'
    },
    upHs8Grades: {
        80: 'A', 60: 'B', 40: 'C', 30: 'D', 0: 'E'
    },
    maxMarks: {
        'Monthly Exam 01': { default: 20 },
        'First Mid Term Exam': { default: 20 },
        'Second Mid Term Exam': { default: 20 },
        'First Term Exam': {
            LP: { default: 25 },
            UP: { default: 30 },
            HS: {
                // THE FIX: Subject names now use abbreviations to match your data
                8: { 'Phy.': 20, 'Chem.': 20, 'Bio.': 20, default: 40 },
                9: { 'English': 80, 'S.S.': 80, 'Maths': 80, default: 40 },
                10: { 'English': 80, 'S.S.': 80, 'Maths': 80, default: 40 }
            }
        },
        default: { default: 100 }
    }
};

