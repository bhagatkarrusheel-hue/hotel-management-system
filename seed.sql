-- ==============================================================
-- Hotel Management System - Sample Seed Data DML Script
-- ==============================================================

USE `hotel_management_db`;

-- 1. Insert Default Administrative & Staff Users
-- Password for admin: admin123 (bcrypt hash below)
-- Password for staff: staff123 (bcrypt hash below)
INSERT INTO `users` (`username`, `password`, `role`) VALUES
('admin', '$2a$10$Wp0/8r1QpP5zP3oV4L6O1e3oB2u8W8a9e0r1t2y3u4i5o6p7a8b9c', 'admin'),
('staff', '$2a$10$Xq1/9s2RqQ6aQ4pW5M7P2f4pC3v9X9b0f1s2u3v4w5x6y7z8a9b0c', 'staff');

-- 2. Insert Initial Rooms
INSERT INTO `rooms` (`room_number`, `room_type`, `price`, `status`, `capacity`) VALUES
('101', 'Single Standard', 1500.00, 'available', 1),
('102', 'Double Deluxe', 2500.00, 'occupied', 2),
('103', 'Double Deluxe', 2500.00, 'available', 2),
('201', 'Executive Suite', 4500.00, 'available', 3),
('202', 'Executive Suite', 4500.00, 'maintenance', 3),
('301', 'Presidential Suite', 8000.00, 'available', 4);

-- 3. Insert Sample Customers
INSERT INTO `customers` (`name`, `phone`, `email`, `id_proof`) VALUES
('John Doe', '+1-555-0192', 'john.doe@example.com', 'Passport - A1234567'),
('Jane Smith', '+1-555-0843', 'jane.smith@example.com', 'Driver License - DL-98765'),
('Robert Brown', '+1-555-0411', 'robert.b@example.com', 'National ID - 45091823');

-- 4. Insert Initial Staff Members
INSERT INTO `staff` (`name`, `role`, `contact`, `email`, `salary`) VALUES
('Alice Johnson', 'Hotel Manager', '+1-555-8811', 'alice.manager@hotel.com', 65000.00),
('David Miller', 'Front Desk Receptionist', '+1-555-8822', 'david.reception@hotel.com', 35000.00),
('Sarah Connor', 'Head of Housekeeping', '+1-555-8833', 'sarah.housekeeping@hotel.com', 30000.00);

-- 5. Insert Sample Booking & Payment
INSERT INTO `bookings` (`customer_id`, `room_id`, `check_in`, `check_out`, `booking_status`, `total_price`) VALUES
(2, 2, '2026-10-05', '2026-10-08', 'checked_in', 7500.00);

INSERT INTO `payments` (`booking_id`, `amount`, `additional_services_cost`, `payment_method`, `payment_status`) VALUES
(1, 7500.00, 500.00, 'Credit Card', 'Paid');
