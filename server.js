const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Body Parsers & Static Files
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session Setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'hotel_secret_key_college_project_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        secure: false // Set to true if running over HTTPS in production
    }
}));

// Authorization Middlewares
function requireAuth(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    return res.status(401).json({ success: false, error: 'Unauthorized. Please login.' });
}

function requireAdmin(req, res, next) {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    return res.status(403).json({ success: false, error: 'Forbidden. Admin privileges required.' });
}

// -------------------------------------------------------------
// 1. AUTHENTICATION ENDPOINTS
// -------------------------------------------------------------

// Login
app.post('/api/auth/login', (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Username and password are required.' });
        }

        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username.trim());
        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid username or password.' });
        }

        const match = bcrypt.compareSync(password, user.password);
        if (!match) {
            return res.status(401).json({ success: false, error: 'Invalid username or password.' });
        }

        req.session.user = {
            user_id: user.user_id,
            username: user.username,
            role: user.role
        };

        return res.json({
            success: true,
            user: req.session.user,
            message: 'Login successful'
        });
    } catch (err) {
        console.error("Login Error:", err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ success: false, error: 'Logout failed.' });
        }
        res.clearCookie('connect.sid');
        return res.json({ success: true, message: 'Logged out successfully.' });
    });
});

// Get Current Logged-in User
app.get('/api/auth/me', (req, res) => {
    if (req.session && req.session.user) {
        return res.json({ success: true, user: req.session.user });
    }
    return res.json({ success: false, user: null });
});

// Register New User (Admin Only)
app.post('/api/auth/register', requireAuth, requireAdmin, (req, res) => {
    try {
        const { username, password, role } = req.body;
        if (!username || !password || !role) {
            return res.status(400).json({ success: false, error: 'All fields are required.' });
        }

        const existing = db.prepare('SELECT user_id FROM users WHERE username = ?').get(username.trim());
        if (existing) {
            return res.status(400).json({ success: false, error: 'Username already exists.' });
        }

        const hash = bcrypt.hashSync(password, 10);
        db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username.trim(), hash, role);

        return res.json({ success: true, message: 'User registered successfully.' });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});


// -------------------------------------------------------------
// 2. DASHBOARD KPI & STATS ENDPOINT
// -------------------------------------------------------------
app.get('/api/dashboard/stats', requireAuth, (req, res) => {
    try {
        const totalRooms = db.prepare('SELECT COUNT(*) as count FROM rooms').get().count;
        const availableRooms = db.prepare("SELECT COUNT(*) as count FROM rooms WHERE status = 'available'").get().count;
        const occupiedRooms = db.prepare("SELECT COUNT(*) as count FROM rooms WHERE status = 'occupied'").get().count;
        const maintenanceRooms = db.prepare("SELECT COUNT(*) as count FROM rooms WHERE status = 'maintenance'").get().count;

        const totalCustomers = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
        const activeBookings = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE booking_status IN ('confirmed', 'checked_in')").get().count;
        
        const totalRevenueObj = db.prepare("SELECT SUM(amount + additional_services_cost) as total FROM payments WHERE payment_status = 'Paid'").get();
        const totalRevenue = totalRevenueObj.total || 0;

        const recentBookings = db.prepare(`
            SELECT b.booking_id, c.name as customer_name, r.room_number, r.room_type, b.check_in, b.check_out, b.booking_status, b.total_price
            FROM bookings b
            JOIN customers c ON b.customer_id = c.customer_id
            JOIN rooms r ON b.room_id = r.room_id
            ORDER BY b.booking_id DESC
            LIMIT 5
        `).all();

        const roomGrid = db.prepare('SELECT room_id, room_number, room_type, price, status, capacity FROM rooms ORDER BY room_number ASC').all();

        return res.json({
            success: true,
            stats: {
                totalRooms,
                availableRooms,
                occupiedRooms,
                maintenanceRooms,
                totalCustomers,
                activeBookings,
                totalRevenue,
                occupancyRate: totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : 0
            },
            recentBookings,
            roomGrid
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});


// -------------------------------------------------------------
// 3. ROOM MANAGEMENT ENDPOINTS
// -------------------------------------------------------------
app.get('/api/rooms', requireAuth, (req, res) => {
    try {
        const rooms = db.prepare('SELECT * FROM rooms ORDER BY room_number ASC').all();
        return res.json({ success: true, rooms });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/rooms', requireAuth, (req, res) => {
    try {
        const { room_number, room_type, price, status, capacity } = req.body;
        if (!room_number || !room_type || !price) {
            return res.status(400).json({ success: false, error: 'Room number, type, and price are required.' });
        }

        const existing = db.prepare('SELECT room_id FROM rooms WHERE room_number = ?').get(room_number.trim());
        if (existing) {
            return res.status(400).json({ success: false, error: 'Room number already exists.' });
        }

        const stmt = db.prepare('INSERT INTO rooms (room_number, room_type, price, status, capacity) VALUES (?, ?, ?, ?, ?)');
        const info = stmt.run(room_number.trim(), room_type, parseFloat(price), status || 'available', capacity || 2);

        return res.json({ success: true, room_id: info.lastInsertRowid, message: 'Room added successfully.' });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.put('/api/rooms/:id', requireAuth, (req, res) => {
    try {
        const { room_number, room_type, price, status, capacity } = req.body;
        const roomId = req.params.id;

        const stmt = db.prepare('UPDATE rooms SET room_number = ?, room_type = ?, price = ?, status = ?, capacity = ? WHERE room_id = ?');
        stmt.run(room_number, room_type, parseFloat(price), status, parseInt(capacity), roomId);

        return res.json({ success: true, message: 'Room updated successfully.' });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/rooms/:id', requireAuth, requireAdmin, (req, res) => {
    try {
        const roomId = req.params.id;

        // Check if room has active bookings
        const active = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE room_id = ? AND booking_status IN ('confirmed', 'checked_in')").get(roomId).count;
        if (active > 0) {
            return res.status(400).json({ success: false, error: 'Cannot delete room with active or confirmed bookings.' });
        }

        db.prepare('DELETE FROM rooms WHERE room_id = ?').run(roomId);
        return res.json({ success: true, message: 'Room deleted successfully.' });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});


// -------------------------------------------------------------
// 4. CUSTOMER MANAGEMENT ENDPOINTS
// -------------------------------------------------------------
app.get('/api/customers', requireAuth, (req, res) => {
    try {
        const customers = db.prepare('SELECT * FROM customers ORDER BY customer_id DESC').all();
        return res.json({ success: true, customers });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/customers', requireAuth, (req, res) => {
    try {
        const { name, phone, email, id_proof } = req.body;
        if (!name || !phone || !id_proof) {
            return res.status(400).json({ success: false, error: 'Name, phone, and ID proof are required.' });
        }

        const stmt = db.prepare('INSERT INTO customers (name, phone, email, id_proof) VALUES (?, ?, ?, ?)');
        const info = stmt.run(name.trim(), phone.trim(), email ? email.trim() : '', id_proof.trim());

        return res.json({ success: true, customer_id: info.lastInsertRowid, message: 'Customer added successfully.' });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.put('/api/customers/:id', requireAuth, (req, res) => {
    try {
        const { name, phone, email, id_proof } = req.body;
        const customerId = req.params.id;

        const stmt = db.prepare('UPDATE customers SET name = ?, phone = ?, email = ?, id_proof = ? WHERE customer_id = ?');
        stmt.run(name.trim(), phone.trim(), email ? email.trim() : '', id_proof.trim(), customerId);

        return res.json({ success: true, message: 'Customer details updated successfully.' });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/customers/:id', requireAuth, requireAdmin, (req, res) => {
    try {
        const customerId = req.params.id;
        db.prepare('DELETE FROM customers WHERE customer_id = ?').run(customerId);
        return res.json({ success: true, message: 'Customer deleted successfully.' });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});


// -------------------------------------------------------------
// 5. BOOKING MANAGEMENT ENDPOINTS
// -------------------------------------------------------------
app.get('/api/bookings', requireAuth, (req, res) => {
    try {
        const bookings = db.prepare(`
            SELECT b.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email,
                   r.room_number, r.room_type, r.price as room_price, p.payment_status, p.amount as paid_amount
            FROM bookings b
            JOIN customers c ON b.customer_id = c.customer_id
            JOIN rooms r ON b.room_id = r.room_id
            LEFT JOIN payments p ON b.booking_id = p.booking_id
            ORDER BY b.booking_id DESC
        `).all();
        return res.json({ success: true, bookings });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// Check room availability for specific dates
app.get('/api/bookings/available-rooms', requireAuth, (req, res) => {
    try {
        const { check_in, check_out } = req.query;
        if (!check_in || !check_out) {
            return res.status(400).json({ success: false, error: 'Check-in and Check-out dates are required.' });
        }

        // Find room_ids that have conflicting active bookings
        const occupiedRoomIds = db.prepare(`
            SELECT room_id FROM bookings
            WHERE booking_status IN ('confirmed', 'checked_in')
            AND (
                (check_in < ? AND check_out > ?) OR
                (check_in >= ? AND check_in < ?)
            )
        `).all(check_out, check_in, check_in, check_out).map(row => row.room_id);

        let availableRooms;
        if (occupiedRoomIds.length > 0) {
            const placeholders = occupiedRoomIds.map(() => '?').join(',');
            availableRooms = db.prepare(`SELECT * FROM rooms WHERE status != 'maintenance' AND room_id NOT IN (${placeholders}) ORDER BY room_number ASC`).all(...occupiedRoomIds);
        } else {
            availableRooms = db.prepare("SELECT * FROM rooms WHERE status != 'maintenance' ORDER BY room_number ASC").all();
        }

        return res.json({ success: true, availableRooms });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// Create new booking
app.post('/api/bookings', requireAuth, (req, res) => {
    try {
        const { customer_id, room_id, check_in, check_out, payment_method } = req.body;
        if (!customer_id || !room_id || !check_in || !check_out) {
            return res.status(400).json({ success: false, error: 'All booking fields are required.' });
        }

        const d1 = new Date(check_in);
        const d2 = new Date(check_out);
        const timeDiff = d2.getTime() - d1.getTime();
        const nights = Math.ceil(timeDiff / (1000 * 3600 * 24));

        if (nights <= 0) {
            return res.status(400).json({ success: false, error: 'Check-out date must be after Check-in date.' });
        }

        const room = db.prepare('SELECT price, status FROM rooms WHERE room_id = ?').get(room_id);
        if (!room) {
            return res.status(404).json({ success: false, error: 'Room not found.' });
        }

        const totalPrice = room.price * nights;

        const insertBooking = db.prepare('INSERT INTO bookings (customer_id, room_id, check_in, check_out, booking_status, total_price) VALUES (?, ?, ?, ?, ?, ?)');
        const bookingInfo = insertBooking.run(customer_id, room_id, check_in, check_out, 'confirmed', totalPrice);
        const bookingId = bookingInfo.lastInsertRowid;

        // Record initial payment record
        const insertPayment = db.prepare('INSERT INTO payments (booking_id, amount, additional_services_cost, payment_method, payment_status) VALUES (?, ?, 0, ?, ?)');
        insertPayment.run(bookingId, totalPrice, payment_method || 'Cash', 'Pending');

        return res.json({
            success: true,
            booking_id: bookingId,
            total_price: totalPrice,
            nights,
            message: 'Booking created successfully.'
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// Record Check-in
app.post('/api/bookings/:id/checkin', requireAuth, (req, res) => {
    try {
        const bookingId = req.params.id;
        const booking = db.prepare('SELECT room_id, booking_status FROM bookings WHERE booking_id = ?').get(bookingId);
        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found.' });
        }

        db.prepare("UPDATE bookings SET booking_status = 'checked_in' WHERE booking_id = ?").run(bookingId);
        db.prepare("UPDATE rooms SET status = 'occupied' WHERE room_id = ?").run(booking.room_id);

        return res.json({ success: true, message: 'Check-in recorded. Room status set to Occupied.' });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// Record Check-out & Process Invoice Payment
app.post('/api/bookings/:id/checkout', requireAuth, (req, res) => {
    try {
        const bookingId = req.params.id;
        const { additional_services_cost, payment_method } = req.body;

        const booking = db.prepare('SELECT * FROM bookings WHERE booking_id = ?').get(bookingId);
        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found.' });
        }

        const extraCost = parseFloat(additional_services_cost || 0);

        // Update booking status
        db.prepare("UPDATE bookings SET booking_status = 'checked_out' WHERE booking_id = ?").run(bookingId);

        // Update room status back to available
        db.prepare("UPDATE rooms SET status = 'available' WHERE room_id = ?").run(booking.room_id);

        // Update payment record
        const payment = db.prepare('SELECT payment_id FROM payments WHERE booking_id = ?').get(bookingId);
        if (payment) {
            db.prepare("UPDATE payments SET additional_services_cost = ?, payment_method = ?, payment_status = 'Paid', payment_date = CURRENT_TIMESTAMP WHERE booking_id = ?")
                .run(extraCost, payment_method || 'Cash', bookingId);
        } else {
            db.prepare("INSERT INTO payments (booking_id, amount, additional_services_cost, payment_method, payment_status) VALUES (?, ?, ?, ?, 'Paid')")
                .run(bookingId, booking.total_price, extraCost, payment_method || 'Cash');
        }

        return res.json({ success: true, message: 'Check-out completed and Payment finalized. Room is now Available.' });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// Cancel Booking
app.post('/api/bookings/:id/cancel', requireAuth, (req, res) => {
    try {
        const bookingId = req.params.id;
        const booking = db.prepare('SELECT room_id FROM bookings WHERE booking_id = ?').get(bookingId);
        if (!booking) {
            return res.status(404).json({ success: false, error: 'Booking not found.' });
        }

        db.prepare("UPDATE bookings SET booking_status = 'cancelled' WHERE booking_id = ?").run(bookingId);
        db.prepare("UPDATE rooms SET status = 'available' WHERE room_id = ?").run(booking.room_id);
        db.prepare("UPDATE payments SET payment_status = 'Refunded' WHERE booking_id = ?").run(bookingId);

        return res.json({ success: true, message: 'Booking cancelled.' });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});


// -------------------------------------------------------------
// 6. INVOICE & PAYMENTS ENDPOINTS
// -------------------------------------------------------------
app.get('/api/payments/invoice/:booking_id', requireAuth, (req, res) => {
    try {
        const bookingId = req.params.booking_id;
        const invoice = db.prepare(`
            SELECT b.booking_id, b.check_in, b.check_out, b.booking_status, b.total_price as room_total,
                   c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.id_proof,
                   r.room_number, r.room_type, r.price as nightly_rate,
                   p.payment_id, p.amount, p.additional_services_cost, p.payment_method, p.payment_status, p.payment_date
            FROM bookings b
            JOIN customers c ON b.customer_id = c.customer_id
            JOIN rooms r ON b.room_id = r.room_id
            LEFT JOIN payments p ON b.booking_id = p.booking_id
            WHERE b.booking_id = ?
        `).get(bookingId);

        if (!invoice) {
            return res.status(404).json({ success: false, error: 'Invoice not found for this booking.' });
        }

        const d1 = new Date(invoice.check_in);
        const d2 = new Date(invoice.check_out);
        const nights = Math.max(1, Math.ceil((d2 - d1) / (1000 * 3600 * 24)));
        invoice.nights = nights;
        invoice.grand_total = (invoice.room_total || 0) + (invoice.additional_services_cost || 0);

        return res.json({ success: true, invoice });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});


// -------------------------------------------------------------
// 7. STAFF MANAGEMENT ENDPOINTS (Admin Only)
// -------------------------------------------------------------
app.get('/api/staff', requireAuth, requireAdmin, (req, res) => {
    try {
        const staffList = db.prepare('SELECT * FROM staff ORDER BY staff_id DESC').all();
        return res.json({ success: true, staff: staffList });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/staff', requireAuth, requireAdmin, (req, res) => {
    try {
        const { name, role, contact, email, salary } = req.body;
        if (!name || !role || !contact) {
            return res.status(400).json({ success: false, error: 'Name, role, and contact are required.' });
        }

        const stmt = db.prepare('INSERT INTO staff (name, role, contact, email, salary) VALUES (?, ?, ?, ?, ?)');
        const info = stmt.run(name.trim(), role.trim(), contact.trim(), email ? email.trim() : '', parseFloat(salary || 0));

        return res.json({ success: true, staff_id: info.lastInsertRowid, message: 'Staff added successfully.' });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.put('/api/staff/:id', requireAuth, requireAdmin, (req, res) => {
    try {
        const { name, role, contact, email, salary } = req.body;
        const staffId = req.params.id;

        const stmt = db.prepare('UPDATE staff SET name = ?, role = ?, contact = ?, email = ?, salary = ? WHERE staff_id = ?');
        stmt.run(name.trim(), role.trim(), contact.trim(), email ? email.trim() : '', parseFloat(salary || 0), staffId);

        return res.json({ success: true, message: 'Staff details updated.' });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/staff/:id', requireAuth, requireAdmin, (req, res) => {
    try {
        const staffId = req.params.id;
        db.prepare('DELETE FROM staff WHERE staff_id = ?').run(staffId);
        return res.json({ success: true, message: 'Staff deleted successfully.' });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});


// -------------------------------------------------------------
// 8. REPORTS & ANALYTICS ENDPOINT
// -------------------------------------------------------------
app.get('/api/reports', requireAuth, (req, res) => {
    try {
        const revenueByMonth = db.prepare(`
            SELECT strftime('%Y-%m', payment_date) as month, SUM(amount + additional_services_cost) as revenue
            FROM payments
            WHERE payment_status = 'Paid' AND payment_date IS NOT NULL
            GROUP BY month
            ORDER BY month DESC
        `).all();

        const roomTypeOccupancy = db.prepare(`
            SELECT room_type, COUNT(*) as total_rooms,
                   SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) as occupied_rooms
            FROM rooms
            GROUP BY room_type
        `).all();

        const topCustomers = db.prepare(`
            SELECT c.name, c.email, c.phone, COUNT(b.booking_id) as total_bookings, SUM(b.total_price) as total_spent
            FROM customers c
            JOIN bookings b ON c.customer_id = b.customer_id
            GROUP BY c.customer_id
            ORDER BY total_spent DESC
            LIMIT 5
        `).all();

        return res.json({
            success: true,
            revenueByMonth,
            roomTypeOccupancy,
            topCustomers
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});


// Fallback route for SPA
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Server
app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(` Hotel Management System Server Running`);
    console.log(` URL: http://localhost:${PORT}`);
    console.log(` Default Admin Login: admin / admin123`);
    console.log(` Default Staff Login: staff / staff123`);
    console.log(`===================================================`);
});
