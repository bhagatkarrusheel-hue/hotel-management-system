const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(__dirname, 'hotel.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

function initDatabase() {
    // 1. Users Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY AUTO_INCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'staff',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `.replace('AUTO_INCREMENT', 'AUTOINCREMENT'));

    // 2. Customers Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS customers (
            customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            phone TEXT NOT NULL,
            email TEXT,
            id_proof TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 3. Rooms Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS rooms (
            room_id INTEGER PRIMARY KEY AUTOINCREMENT,
            room_number TEXT UNIQUE NOT NULL,
            room_type TEXT NOT NULL,
            price REAL NOT NULL,
            status TEXT NOT NULL DEFAULT 'available',
            capacity INTEGER DEFAULT 2
        );
    `);

    // 4. Bookings Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS bookings (
            booking_id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_id INTEGER NOT NULL,
            room_id INTEGER NOT NULL,
            check_in DATE NOT NULL,
            check_out DATE NOT NULL,
            booking_status TEXT NOT NULL DEFAULT 'confirmed',
            total_price REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (customer_id) REFERENCES customers (customer_id) ON DELETE CASCADE,
            FOREIGN KEY (room_id) REFERENCES rooms (room_id) ON DELETE CASCADE
        );
    `);

    // 5. Payments Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS payments (
            payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
            booking_id INTEGER UNIQUE NOT NULL,
            amount REAL NOT NULL,
            additional_services_cost REAL DEFAULT 0,
            payment_method TEXT NOT NULL,
            payment_status TEXT NOT NULL DEFAULT 'Paid',
            payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (booking_id) REFERENCES bookings (booking_id) ON DELETE CASCADE
        );
    `);

    // 6. Staff Table
    db.exec(`
        CREATE TABLE IF NOT EXISTS staff (
            staff_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            contact TEXT NOT NULL,
            email TEXT,
            salary REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    seedInitialData();
}

function seedInitialData() {
    // Seed default admin and staff users if none exist
    const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
    if (userCount === 0) {
        const adminHash = bcrypt.hashSync('admin123', 10);
        const staffHash = bcrypt.hashSync('staff123', 10);

        const insertUser = db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");
        insertUser.run('admin', adminHash, 'admin');
        insertUser.run('staff', staffHash, 'staff');
        console.log("-> Initial Users Created: admin / admin123, staff / staff123");
    }

    // Seed default rooms if empty
    const roomCount = db.prepare("SELECT COUNT(*) as count FROM rooms").get().count;
    if (roomCount === 0) {
        const insertRoom = db.prepare("INSERT INTO rooms (room_number, room_type, price, status, capacity) VALUES (?, ?, ?, ?, ?)");
        const defaultRooms = [
            ['101', 'Single Standard', 1500, 'available', 1],
            ['102', 'Double Deluxe', 2500, 'occupied', 2],
            ['103', 'Double Deluxe', 2500, 'available', 2],
            ['201', 'Executive Suite', 4500, 'available', 3],
            ['202', 'Executive Suite', 4500, 'maintenance', 3],
            ['301', 'Presidential Suite', 8000, 'available', 4]
        ];
        for (const room of defaultRooms) {
            insertRoom.run(...room);
        }
        console.log("-> Initial Rooms Created.");
    }

    // Seed default customers if empty
    const customerCount = db.prepare("SELECT COUNT(*) as count FROM customers").get().count;
    if (customerCount === 0) {
        const insertCustomer = db.prepare("INSERT INTO customers (name, phone, email, id_proof) VALUES (?, ?, ?, ?)");
        const defaultCustomers = [
            ['John Doe', '+1-555-0192', 'john.doe@example.com', 'Passport - A1234567'],
            ['Jane Smith', '+1-555-0843', 'jane.smith@example.com', 'Driver License - DL-98765'],
            ['Robert Brown', '+1-555-0411', 'robert.b@example.com', 'National ID - 45091823']
        ];
        for (const customer of defaultCustomers) {
            insertCustomer.run(...customer);
        }
        console.log("-> Initial Customers Created.");
    }

    // Seed default staff if empty
    const staffCount = db.prepare("SELECT COUNT(*) as count FROM staff").get().count;
    if (staffCount === 0) {
        const insertStaff = db.prepare("INSERT INTO staff (name, role, contact, email, salary) VALUES (?, ?, ?, ?, ?)");
        const defaultStaff = [
            ['Alice Johnson', 'Hotel Manager', '+1-555-8811', 'alice.manager@hotel.com', 65000],
            ['David Miller', 'Front Desk Receptionist', '+1-555-8822', 'david.reception@hotel.com', 35000],
            ['Sarah Connor', 'Head of Housekeeping', '+1-555-8833', 'sarah.housekeeping@hotel.com', 30000]
        ];
        for (const s of defaultStaff) {
            insertStaff.run(...s);
        }
        console.log("-> Initial Staff Created.");
    }

    // Seed default sample booking & payment if empty
    const bookingCount = db.prepare("SELECT COUNT(*) as count FROM bookings").get().count;
    if (bookingCount === 0) {
        const insertBooking = db.prepare("INSERT INTO bookings (customer_id, room_id, check_in, check_out, booking_status, total_price) VALUES (?, ?, ?, ?, ?, ?)");
        const insertPayment = db.prepare("INSERT INTO payments (booking_id, amount, additional_services_cost, payment_method, payment_status) VALUES (?, ?, ?, ?, ?)");

        // Active checked-in booking for Room 102
        const res = insertBooking.run(2, 2, '2026-10-05', '2026-10-08', 'checked_in', 7500);
        insertPayment.run(res.lastInsertRowid, 7500, 500, 'Credit Card', 'Paid');

        console.log("-> Initial Booking & Payment Created.");
    }
}

initDatabase();

module.exports = db;
