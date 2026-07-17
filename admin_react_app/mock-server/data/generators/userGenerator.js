const bcrypt = require("bcryptjs");
const logger = require("../../utils/logger");

// Realistic data pools for generating user profiles
const FIRST_NAMES = [
  "Aarav",
  "Vivaan",
  "Aditya",
  "Vihaan",
  "Arjun",
  "Sai",
  "Reyansh",
  "Ayaan",
  "Krishna",
  "Ishaan",
  "Shaurya",
  "Atharv",
  "Advik",
  "Pranav",
  "Rishabh",
  "Aryan",
  "Kabir",
  "Ansh",
  "Kian",
  "Rudra",
  "Aadhya",
  "Saanvi",
  "Aanya",
  "Diya",
  "Ananya",
  "Fatima",
  "Ira",
  "Prisha",
  "Anaya",
  "Riya",
  "Navya",
  "Kavya",
  "Arya",
  "Myra",
  "Sara",
  "Zara",
  "Jiya",
  "Khushi",
  "Shanaya",
  "Kiara",
  "Rajesh",
  "Suresh",
  "Mahesh",
  "Ramesh",
  "Dinesh",
  "Mukesh",
  "Naresh",
  "Hitesh",
  "Yogesh",
  "Ganesh",
  "Priya",
  "Pooja",
  "Neha",
  "Ritu",
  "Sita",
  "Gita",
  "Meera",
  "Seema",
  "Reema",
  "Deepa",
];

const LAST_NAMES = [
  "Sharma",
  "Verma",
  "Singh",
  "Kumar",
  "Gupta",
  "Agarwal",
  "Jain",
  "Bansal",
  "Mittal",
  "Goel",
  "Chopra",
  "Malhotra",
  "Arora",
  "Kapoor",
  "Bhatia",
  "Sethi",
  "Khanna",
  "Sood",
  "Ahuja",
  "Tandon",
  "Patel",
  "Shah",
  "Mehta",
  "Desai",
  "Modi",
  "Joshi",
  "Trivedi",
  "Pandya",
  "Vyas",
  "Shukla",
  "Reddy",
  "Rao",
  "Nair",
  "Menon",
  "Pillai",
  "Kumar",
  "Prasad",
  "Murthy",
  "Sastry",
  "Iyer",
  "Khan",
  "Ali",
  "Ahmed",
  "Hassan",
  "Hussain",
  "Rahman",
  "Malik",
  "Sheikh",
  "Ansari",
  "Qureshi",
];

const CITIES = [
  "Mumbai",
  "Delhi",
  "Bangalore",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
  "Jaipur",
  "Surat",
  "Lucknow",
  "Kanpur",
  "Nagpur",
  "Indore",
  "Thane",
  "Bhopal",
  "Visakhapatnam",
  "Pimpri",
  "Patna",
  "Vadodara",
  "Ghaziabad",
  "Ludhiana",
  "Agra",
  "Nashik",
];

const STREET_TYPES = [
  "Street",
  "Road",
  "Avenue",
  "Lane",
  "Colony",
  "Nagar",
  "Park",
  "Plaza",
];
const AREA_PREFIXES = ["Sector", "Block", "Phase", "Plot", "House"];

// Email domains for realistic email generation
const EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "rediffmail.com",
  "company.com",
  "tech.in",
  "business.co.in",
  "work.org",
  "personal.net",
];

// Phone number prefixes (Indian mobile numbers)
const PHONE_PREFIXES = ["9", "8", "7", "6"];

class UserGenerator {
  constructor() {
    this.generatedEmails = new Set();
    this.generatedPhones = new Set();
    this.userIdCounter = 1;
  }

  // Generate a random element from array
  randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  // Generate random number between min and max (inclusive)
  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Generate unique email address
  generateUniqueEmail(firstName, lastName) {
    let email;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      const domain = this.randomChoice(EMAIL_DOMAINS);
      const separator = this.randomChoice([".", "_", ""]);
      const number = attempts > 0 ? this.randomInt(1, 999) : "";

      email = `${firstName.toLowerCase()}${separator}${lastName.toLowerCase()}${number}@${domain}`;
      attempts++;
    } while (this.generatedEmails.has(email) && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      // Fallback with timestamp
      email = `user${Date.now()}${this.randomInt(1, 999)}@${this.randomChoice(
        EMAIL_DOMAINS
      )}`;
    }

    this.generatedEmails.add(email);
    return email;
  }

  // Generate unique phone number
  generateUniquePhone() {
    let phone;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      const prefix = this.randomChoice(PHONE_PREFIXES);
      const remaining = Array.from({ length: 9 }, () =>
        this.randomInt(0, 9)
      ).join("");
      phone = `${prefix}${remaining}`;
      attempts++;
    } while (this.generatedPhones.has(phone) && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      // Fallback with timestamp
      phone = `9${Date.now().toString().slice(-9)}`;
    }

    this.generatedPhones.add(phone);
    return phone;
  }

  // Generate realistic address
  generateAddress() {
    const houseNumber = this.randomInt(1, 999);
    const streetName = `${this.randomChoice(FIRST_NAMES)} ${this.randomChoice(
      STREET_TYPES
    )}`;
    const area = `${this.randomChoice(AREA_PREFIXES)} ${this.randomInt(1, 50)}`;
    const city = this.randomChoice(CITIES);
    const pincode = this.randomInt(100000, 999999);

    return {
      house_number: houseNumber.toString(),
      street: streetName,
      area: area,
      city: city,
      state: this.getStateForCity(city),
      pincode: pincode.toString(),
      full_address: `${houseNumber}, ${streetName}, ${area}, ${city} - ${pincode}`,
    };
  }

  // Get state for city (simplified mapping)
  getStateForCity(city) {
    const cityStateMap = {
      Mumbai: "Maharashtra",
      Pune: "Maharashtra",
      Nagpur: "Maharashtra",
      Thane: "Maharashtra",
      Nashik: "Maharashtra",
      Delhi: "Delhi",
      Ghaziabad: "Uttar Pradesh",
      Bangalore: "Karnataka",
      Hyderabad: "Telangana",
      Chennai: "Tamil Nadu",
      Kolkata: "West Bengal",
      Ahmedabad: "Gujarat",
      Surat: "Gujarat",
      Vadodara: "Gujarat",
      Jaipur: "Rajasthan",
      Lucknow: "Uttar Pradesh",
      Kanpur: "Uttar Pradesh",
      Agra: "Uttar Pradesh",
      Bhopal: "Madhya Pradesh",
      Indore: "Madhya Pradesh",
      Visakhapatnam: "Andhra Pradesh",
      Pimpri: "Maharashtra",
      Patna: "Bihar",
      Ludhiana: "Punjab",
    };
    return cityStateMap[city] || "Maharashtra";
  }

  // Generate password hash
  async generatePasswordHash(password = "password123") {
    return await bcrypt.hash(password, 10);
  }

  // Generate regular user
  async generateRegularUser() {
    const firstName = this.randomChoice(FIRST_NAMES);
    const lastName = this.randomChoice(LAST_NAMES);
    const email = this.generateUniqueEmail(firstName, lastName);
    const phone = this.generateUniquePhone();
    const address = this.generateAddress();
    const passwordHash = await this.generatePasswordHash();

    const user = {
      user_id: this.userIdCounter++,
      user_name: `${firstName} ${lastName}`,
      user_email: email,
      user_phone: phone,
      user_address: address.full_address,
      address_details: address,
      role: "user",
      status: "active",
      created_at: this.generateRandomDate(90), // Within last 90 days
      updated_at: new Date().toISOString(),
      last_login: this.generateRandomDate(30), // Within last 30 days
      password_hash: passwordHash,
      profile: {
        first_name: firstName,
        last_name: lastName,
        date_of_birth: this.generateDateOfBirth(),
        gender: this.randomChoice(["male", "female", "other"]),
        occupation: this.generateOccupation(),
        emergency_contact: {
          name: `${this.randomChoice(FIRST_NAMES)} ${this.randomChoice(
            LAST_NAMES
          )}`,
          phone: this.generateUniquePhone(),
          relationship: this.randomChoice([
            "spouse",
            "parent",
            "sibling",
            "friend",
          ]),
        },
      },
      preferences: {
        notifications: {
          email: Math.random() > 0.3, // 70% enable email notifications
          sms: Math.random() > 0.5, // 50% enable SMS notifications
          push: Math.random() > 0.2, // 80% enable push notifications
        },
        language: this.randomChoice(["en", "hi", "mr", "gu", "ta"]),
        theme: this.randomChoice(["light", "dark", "auto"]),
      },
      vehicle_info: this.generateVehicleInfo(),
      payment_methods: this.generatePaymentMethods(),
      statistics: {
        total_sessions: 0,
        total_amount_paid: 0,
        average_session_duration: 0,
        favorite_parking_lots: [],
      },
    };

    return user;
  }

  // Generate admin user
  async generateAdmin(assignedLots = []) {
    const firstName = this.randomChoice(FIRST_NAMES);
    const lastName = this.randomChoice(LAST_NAMES);
    const email = this.generateUniqueEmail(firstName, lastName);
    const phone = this.generateUniquePhone();
    const address = this.generateAddress();
    const passwordHash = await this.generatePasswordHash("admin123");

    const admin = {
      user_id: this.userIdCounter++,
      user_name: `${firstName} ${lastName}`,
      user_email: email,
      user_phone: phone,
      user_address: address.full_address,
      address_details: address,
      role: "admin",
      status: "active",
      created_at: this.generateRandomDate(180), // Within last 6 months
      updated_at: new Date().toISOString(),
      last_login: this.generateRandomDate(7), // Within last week (admins login frequently)
      password_hash: passwordHash,
      profile: {
        first_name: firstName,
        last_name: lastName,
        date_of_birth: this.generateDateOfBirth(25, 55), // Admins typically 25-55 years old
        gender: this.randomChoice(["male", "female"]),
        employee_id: `ADM${String(this.userIdCounter).padStart(4, "0")}`,
        department: "Parking Operations",
        designation: this.randomChoice([
          "Parking Manager",
          "Operations Supervisor",
          "Area Coordinator",
        ]),
        joining_date: this.generateRandomDate(365), // Within last year
        reporting_manager: null, // Will be set later if needed
        work_location: address.city,
      },
      admin_details: {
        assigned_lots: assignedLots,
        permissions: [
          "view_sessions",
          "manage_sessions",
          "view_payments",
          "process_payments",
          "view_reports",
          "manage_users",
        ],
        shift_timings: {
          start_time: this.randomChoice(["06:00", "08:00", "09:00"]),
          end_time: this.randomChoice(["18:00", "20:00", "22:00"]),
          days: [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
          ],
        },
        contact_hours: {
          primary: "09:00-18:00",
          emergency: "24/7",
        },
      },
      statistics: {
        sessions_managed: 0,
        payments_processed: 0,
        total_revenue_handled: 0,
        average_response_time: 0,
        customer_satisfaction_rating: this.randomInt(40, 50) / 10, // 4.0-5.0 rating
      },
    };

    return admin;
  }

  // Generate super admin user
  async generateSuperAdmin(userIndex = 0) {
    const firstName = this.randomChoice([
      "Rajesh",
      "Suresh",
      "Mahesh",
      "Priya",
      "Neha",
    ]);
    const lastName = this.randomChoice([
      "Sharma",
      "Gupta",
      "Singh",
      "Patel",
      "Kumar",
    ]);
    const email = this.generateUniqueEmail(firstName, lastName);
    const phone = this.generateUniquePhone();
    const address = this.generateAddress();

    // Use different passwords based on user index
    const password = userIndex === 0 ? "password123" : "superadmin123";
    const passwordHash = await this.generatePasswordHash(password);

    const superAdmin = {
      user_id: this.userIdCounter++,
      user_name: `${firstName} ${lastName}`,
      user_email: email,
      user_phone: phone,
      user_address: address.full_address,
      address_details: address,
      role: "super_admin",
      status: "active",
      created_at: this.generateRandomDate(365), // Within last year
      updated_at: new Date().toISOString(),
      last_login: this.generateRandomDate(1), // Very recent login
      password_hash: passwordHash,
      profile: {
        first_name: firstName,
        last_name: lastName,
        date_of_birth: this.generateDateOfBirth(30, 60), // Senior management age
        gender: this.randomChoice(["male", "female"]),
        employee_id: `SA${String(this.userIdCounter).padStart(3, "0")}`,
        department: "IT & Operations",
        designation: this.randomChoice([
          "General Manager",
          "Operations Director",
          "System Administrator",
        ]),
        joining_date: this.generateRandomDate(1095), // Within last 3 years
        work_location: "Head Office",
      },
      super_admin_details: {
        access_level: "full",
        permissions: [
          "full_system_access",
          "manage_admins",
          "manage_parking_lots",
          "view_all_data",
          "system_configuration",
          "user_management",
          "financial_reports",
          "system_maintenance",
        ],
        security_clearance: "level_5",
        backup_contacts: [
          {
            name: `${this.randomChoice(FIRST_NAMES)} ${this.randomChoice(
              LAST_NAMES
            )}`,
            phone: this.generateUniquePhone(),
            email: this.generateUniqueEmail("backup", "admin"),
            relationship: "Deputy",
          },
        ],
      },
      statistics: {
        total_logins: this.randomInt(500, 2000),
        systems_managed: this.randomInt(10, 25),
        admins_supervised: 0, // Will be set based on generated admins
        total_revenue_oversight: 0,
        uptime_maintained: this.randomInt(95, 99) + Math.random(), // 95-99% uptime
      },
    };

    return superAdmin;
  }

  // Generate random date within specified days ago
  generateRandomDate(daysAgo) {
    const now = new Date();
    const pastDate = new Date(
      now.getTime() - Math.random() * daysAgo * 24 * 60 * 60 * 1000
    );
    return pastDate.toISOString();
  }

  // Generate date of birth
  generateDateOfBirth(minAge = 18, maxAge = 70) {
    const now = new Date();
    const age = this.randomInt(minAge, maxAge);
    const birthYear = now.getFullYear() - age;
    const birthMonth = this.randomInt(1, 12);
    const birthDay = this.randomInt(1, 28); // Safe day range

    return new Date(birthYear, birthMonth - 1, birthDay)
      .toISOString()
      .split("T")[0];
  }

  // Generate occupation
  generateOccupation() {
    const occupations = [
      "Software Engineer",
      "Business Analyst",
      "Project Manager",
      "Sales Executive",
      "Marketing Manager",
      "HR Specialist",
      "Accountant",
      "Teacher",
      "Doctor",
      "Lawyer",
      "Consultant",
      "Designer",
      "Architect",
      "Engineer",
      "Manager",
      "Executive",
      "Analyst",
      "Coordinator",
      "Specialist",
      "Administrator",
    ];
    return this.randomChoice(occupations);
  }

  // Generate vehicle information
  generateVehicleInfo() {
    const vehicleTypes = ["car", "motorcycle"];
    const carBrands = [
      "Maruti",
      "Hyundai",
      "Tata",
      "Honda",
      "Toyota",
      "Mahindra",
      "Ford",
      "Volkswagen",
    ];
    const bikeBrands = [
      "Hero",
      "Honda",
      "Bajaj",
      "TVS",
      "Yamaha",
      "Royal Enfield",
      "KTM",
    ];

    const vehicles = [];
    const numVehicles = Math.random() > 0.7 ? 2 : 1; // 30% have 2 vehicles

    for (let i = 0; i < numVehicles; i++) {
      const type = this.randomChoice(vehicleTypes);
      const brand =
        type === "car"
          ? this.randomChoice(carBrands)
          : this.randomChoice(bikeBrands);

      vehicles.push({
        vehicle_id: `V${this.userIdCounter}_${i + 1}`,
        type: type,
        brand: brand,
        model: `${brand} Model ${this.randomInt(1, 10)}`,
        registration_number: this.generateRegistrationNumber(),
        color: this.randomChoice([
          "White",
          "Black",
          "Silver",
          "Red",
          "Blue",
          "Grey",
        ]),
        year: this.randomInt(2015, 2024),
        is_primary: i === 0,
      });
    }

    return vehicles;
  }

  // Generate vehicle registration number
  generateRegistrationNumber() {
    const states = ["MH", "DL", "KA", "TN", "GJ", "RJ", "UP", "WB"];
    const state = this.randomChoice(states);
    const district = this.randomInt(1, 99).toString().padStart(2, "0");
    const series = this.randomChoice(["A", "B", "C", "D", "E"]);
    const number = this.randomInt(1000, 9999);

    return `${state}${district}${series}${number}`;
  }

  // Generate payment methods
  generatePaymentMethods() {
    const methods = [];

    // Most users have UPI
    if (Math.random() > 0.1) {
      // 90% have UPI
      methods.push({
        type: "upi",
        identifier: `${this.randomInt(6, 10)}${this.randomInt(
          100000000,
          999999999
        )}@${this.randomChoice(["paytm", "phonepe", "gpay", "bhim"])}`,
        is_primary: true,
        is_verified: true,
      });
    }

    // Some have cards
    if (Math.random() > 0.4) {
      // 60% have cards
      methods.push({
        type: "card",
        identifier: `****-****-****-${this.randomInt(1000, 9999)}`,
        card_type: this.randomChoice(["debit", "credit"]),
        bank: this.randomChoice(["SBI", "HDFC", "ICICI", "Axis", "Kotak"]),
        is_primary: methods.length === 0,
        is_verified: true,
      });
    }

    // Digital wallets
    if (Math.random() > 0.6) {
      // 40% have wallets
      methods.push({
        type: "wallet",
        identifier: this.randomChoice([
          "Paytm",
          "PhonePe",
          "Amazon Pay",
          "Mobikwik",
        ]),
        balance: this.randomInt(100, 5000),
        is_primary: methods.length === 0,
        is_verified: true,
      });
    }

    return methods;
  }

  // Reset generators (for testing)
  reset() {
    this.generatedEmails.clear();
    this.generatedPhones.clear();
    this.userIdCounter = 1;
  }
}

module.exports = UserGenerator;
