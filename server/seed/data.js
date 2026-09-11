// Static reference data used by the seeder. Names and figures are chosen so
// the seeded database renders the same screens as the demo environment.

const USERS = [
    ["property_owner", "Venkat Prasad", "9700000001", "#2563eb"],
    ["marketing_manager", "Srinivas Naidu", "9700000002", "#0ea5e9"],
    ["marketing_manager", "Reyansh Chowdary", "9700000003", "#6366f1"],
    ["marketing", "Aadhya Shetty", "9700000004", "#ec4899"],
    ["marketing", "Arjun Gupta", "9700000005", "#f59e0b"],
    ["marketing", "Vamsi Gupta", "9700000006", "#10b981"],
    ["marketing", "Srinivas Goud", "9700000007", "#8b5cf6"],
    ["marketing", "Navya Chowdary", "9700000008", "#ef4444"],
    ["marketing", "Ramesh Chowdary", "9700000009", "#14b8a6"],
    ["marketing", "Anika Rao", "9700000010", "#f97316"],
    ["marketing", "Venkat Patel", "9700000011", "#22c55e"],
    ["marketing", "Arjun Bhat", "9700000012", "#3b82f6"],
    ["marketing", "Naresh Bhat", "9700000013", "#a855f7"],
    ["channel_partner", "Riya Sharma", "9700000014", "#db2777"],
    ["channel_partner", "Sunil Rao", "9700000015", "#0891b2"],
    ["channel_partner", "Sunil Chowdary", "9700000016", "#65a30d"],
    ["accountant", "Venkat Achary", "9700000017", "#7c3aed"],
    ["accountant", "Sai Mehta", "9700000018", "#0d9488"],
    ["receptionist", "Aditya Naidu", "9700000019", "#e11d48"],
    ["receptionist", "Reyansh Prasad", "9700000020", "#ca8a04"],
    ["system_operator", "Saanvi Gupta", "9700000021", "#475569"],
];

const PROJECTS = [
    { name: "Grand Court", code: "GC", city: "Hyderabad", towers: ["Tower A", "Tower B", "Tower C"], floors: 20, unitsPerFloor: 6, rate: 6200 },
    { name: "Urban Vista", code: "UV", city: "Hyderabad", towers: ["Tower A", "Tower B", "Tower C"], floors: 18, unitsPerFloor: 6, rate: 5800 },
    { name: "Green Vista", code: "GV", city: "Hyderabad", towers: ["Tower A", "Tower B"], floors: 16, unitsPerFloor: 5, rate: 5400 },
    { name: "Palm Springs", code: "PS", city: "Bengaluru", towers: ["Tower A", "Tower B", "Tower C"], floors: 18, unitsPerFloor: 6, rate: 7400 },
    { name: "Royal Gardens", code: "RG", city: "Bengaluru", towers: ["Tower A", "Tower B"], floors: 16, unitsPerFloor: 6, rate: 6800 },
    { name: "Pearl County", code: "PC", city: "Chennai", towers: ["Tower A", "Tower B"], floors: 15, unitsPerFloor: 5, rate: 5100 },
    { name: "Sky Square", code: "SS", city: "Hyderabad", towers: ["Tower A", "Tower B", "Tower C"], floors: 17, unitsPerFloor: 6, rate: 6600 },
    { name: "Serene Estate", code: "SE", city: "Pune", towers: ["Tower A", "Tower B"], floors: 15, unitsPerFloor: 5, rate: 5900 },
    { name: "Silver Gardens", code: "SG", city: "Pune", towers: ["Tower A", "Tower B", "Tower C"], floors: 20, unitsPerFloor: 6, rate: 5300 },
];

const FIRST_NAMES = [
    "Devansh", "Raj", "Kranthi", "Amitabh", "Phani", "Sanath", "Sachin", "Harini",
    "Kishore", "Tarun", "Swathi", "Imran", "Lakshmi", "Sandeep", "Pooja", "Manoj",
    "Suchi", "Anil", "Bhavana", "Chetan", "Divya", "Farhan", "Gayatri", "Hemant",
    "Ishita", "Jatin", "Kavya", "Lokesh", "Meera", "Nikhil", "Oviya", "Pranav",
    "Rashmi", "Sameer", "Tanvi", "Uday", "Varsha", "Yash", "Zoya", "Aakash",
];

const LAST_NAMES = [
    "Rao", "Reddy", "Khan", "Devi", "Goud", "Agarwal", "Pillai", "Naidu", "Shetty",
    "Gupta", "Sharma", "Bhat", "Chowdary", "Patel", "Mehta", "Verma", "Nair", "Iyer",
];

const UNIT_TYPES = [
    { label: "2BHK", carpet: 985, builtUp: 1240 },
    { label: "2.5BHK", carpet: 1120, builtUp: 1410 },
    { label: "3BHK", carpet: 1385, builtUp: 1720 },
    { label: "3BHK Premium", carpet: 1580, builtUp: 1980 },
    { label: "4BHK", carpet: 1960, builtUp: 2440 },
];

const SOURCES = [
    "website", "walk_in", "facebook", "instagram", "google_ads",
    "magicbricks", "99acres", "housing", "channel_partner", "referral",
];

const EXPENSE_CATEGORIES = [
    "marketing", "construction", "salary", "commission",
    "utilities", "legal", "office", "travel",
];

module.exports = {
    USERS,
    PROJECTS,
    FIRST_NAMES,
    LAST_NAMES,
    UNIT_TYPES,
    SOURCES,
    EXPENSE_CATEGORIES,
};
