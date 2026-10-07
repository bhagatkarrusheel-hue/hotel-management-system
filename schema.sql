-- ==============================================================
-- Hotel Management System - Production MySQL / MariaDB Database Schema
-- ==============================================================

CREATE DATABASE IF NOT EXISTS `hotel_management_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `hotel_management_db`;

-- 1. Users Table
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
    `user_id` INT AUTO_INCREMENT PRIMARY KEY,
    `username` VARCHAR(50) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('admin', 'staff') NOT NULL DEFAULT 'staff',
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Customers Table
DROP TABLE IF EXISTS `customers`;
CREATE TABLE `customers` (
    `customer_id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(20) NOT NULL,
    `email` VARCHAR(100) DEFAULT NULL,
    `id_proof` VARCHAR(100) NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Rooms Table
DROP TABLE IF EXISTS `rooms`;
CREATE TABLE `rooms` (
    `room_id` INT AUTO_INCREMENT PRIMARY KEY,
    `room_number` VARCHAR(10) NOT NULL UNIQUE,
    `room_type` VARCHAR(50) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('available', 'occupied', 'maintenance') NOT NULL DEFAULT 'available',
    `capacity` INT DEFAULT 2
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Bookings Table
DROP TABLE IF EXISTS `bookings`;
CREATE TABLE `bookings` (
    `booking_id` INT AUTO_INCREMENT PRIMARY KEY,
    `customer_id` INT NOT NULL,
    `room_id` INT NOT NULL,
    `check_in` DATE NOT NULL,
    `check_out` DATE NOT NULL,
    `booking_status` ENUM('confirmed', 'checked_in', 'checked_out', 'cancelled') NOT NULL DEFAULT 'confirmed',
    `total_price` DECIMAL(10, 2) NOT NULL,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_booking_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`customer_id`) ON DELETE CASCADE,
    CONSTRAINT `fk_booking_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Payments Table
DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
    `payment_id` INT AUTO_INCREMENT PRIMARY KEY,
    `booking_id` INT NOT NULL UNIQUE,
    `amount` DECIMAL(10, 2) NOT NULL,
    `additional_services_cost` DECIMAL(10, 2) DEFAULT 0.00,
    `payment_method` VARCHAR(50) NOT NULL,
    `payment_status` ENUM('Paid', 'Pending', 'Refunded') NOT NULL DEFAULT 'Paid',
    `payment_date` DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_payment_booking` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`booking_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Staff Table
DROP TABLE IF EXISTS `staff`;
CREATE TABLE `staff` (
    `staff_id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL,
    `role` VARCHAR(50) NOT NULL,
    `contact` VARCHAR(20) NOT NULL,
    `email` VARCHAR(100) DEFAULT NULL,
    `salary` DECIMAL(10, 2) DEFAULT 0.00,
    `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
