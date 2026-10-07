// Hotel Management System Frontend JavaScript Logic
let currentUser = null;
let allRooms = [];
let allCustomers = [];
let allBookings = [];

document.addEventListener('DOMContentLoaded', async () => {
    await checkAuth();
    loadDashboard();
    
    // Set default check-in date to today, check-out to tomorrow
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    document.getElementById('bookCheckIn').value = today;
    document.getElementById('bookCheckOut').value = tomorrow;
});

// Authentication & Session Guard
async function checkAuth() {
    try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (!data.success || !data.user) {
            window.location.href = 'login.html';
            return;
        }
        currentUser = data.user;
        document.getElementById('currentUserDisplay').innerHTML = `<i class="fa-solid fa-user-circle me-1"></i> ${currentUser.username}`;
        document.getElementById('currentUserRole').textContent = currentUser.role.toUpperCase();

        if (currentUser.role !== 'admin') {
            document.querySelectorAll('.admin-only').forEach(el => el.classList.add('d-none'));
        }
    } catch (err) {
        console.error('Auth check error:', err);
        window.location.href = 'login.html';
    }
}

async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = 'login.html';
}

// UI Alert Helper
function showAlert(message, type = 'success') {
    const alertBox = document.getElementById('globalAlert');
    const alertText = document.getElementById('globalAlertText');
    alertBox.className = `alert alert-${type} alert-dismissible fade show`;
    alertText.textContent = message;
    alertBox.classList.remove('d-none');
    setTimeout(() => alertBox.classList.add('d-none'), 5000);
}

function hideAlert() {
    document.getElementById('globalAlert').classList.add('d-none');
}

// Tab Switching
function showTab(tabId, element) {
    document.querySelectorAll('.tab-content-item').forEach(el => el.classList.add('d-none'));
    document.querySelectorAll('#sidebar-wrapper .list-group-item').forEach(el => el.classList.remove('active'));

    document.getElementById(tabId).classList.remove('d-none');
    if (element) element.classList.add('active');

    // Title update
    const titleMap = {
        'dashboardTab': 'Dashboard Overview',
        'roomsTab': 'Room Directory & Management',
        'customersTab': 'Customer Database',
        'bookingsTab': 'Reservations & Bookings',
        'paymentsTab': 'Billing & Invoices',
        'staffTab': 'Staff Directory',
        'reportsTab': 'Reports & Business Analytics'
    };
    document.getElementById('pageTitle').textContent = titleMap[tabId] || 'Dashboard';

    // Load data for specific tab
    if (tabId === 'dashboardTab') loadDashboard();
    if (tabId === 'roomsTab') loadRooms();
    if (tabId === 'customersTab') loadCustomers();
    if (tabId === 'bookingsTab') loadBookings();
    if (tabId === 'paymentsTab') loadInvoices();
    if (tabId === 'staffTab') loadStaff();
    if (tabId === 'reportsTab') loadReports();
}


// =========================================================================
// 1. DASHBOARD OVERVIEW
// =========================================================================
async function loadDashboard() {
    try {
        const res = await fetch('/api/dashboard/stats');
        const data = await res.json();
        if (!data.success) return;

        const s = data.stats;
        document.getElementById('kpiTotalRooms').textContent = s.totalRooms;
        document.getElementById('kpiAvailableRooms').textContent = s.availableRooms;
        document.getElementById('kpiOccupiedRooms').textContent = s.occupiedRooms;
        document.getElementById('kpiTotalRevenue').textContent = `$${s.totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}`;

        // Render Room Availability Grid
        const grid = document.getElementById('roomGridContainer');
        grid.innerHTML = '';
        data.roomGrid.forEach(room => {
            const statusClass = room.status;
            grid.innerHTML += `
                <div class="col-4 col-md-3 col-lg-2">
                    <div class="room-card ${statusClass} p-3 text-center shadow-sm">
                        <div class="fw-bold h5 mb-1">Room ${room.room_number}</div>
                        <div class="small text-muted mb-2">${room.room_type}</div>
                        <span class="badge badge-${statusClass} text-uppercase">${room.status}</span>
                    </div>
                </div>
            `;
        });

        // Render Recent Bookings
        const recentTbody = document.getElementById('recentBookingsTbody');
        recentTbody.innerHTML = '';
        data.recentBookings.forEach(b => {
            recentTbody.innerHTML += `
                <tr>
                    <td class="fw-bold">${b.customer_name}</td>
                    <td>#${b.room_number} <small class="text-muted">(${b.room_type})</small></td>
                    <td>${b.check_in}</td>
                    <td><span class="badge badge-${b.booking_status}">${b.booking_status.replace('_', ' ').toUpperCase()}</span></td>
                </tr>
            `;
        });
    } catch (err) {
        console.error('Error loading dashboard:', err);
    }
}


// =========================================================================
// 2. ROOM MANAGEMENT
// =========================================================================
async function loadRooms() {
    try {
        const res = await fetch('/api/rooms');
        const data = await res.json();
        if (data.success) {
            allRooms = data.rooms;
            renderRoomsTable(allRooms);
        }
    } catch (err) {
        console.error('Error loading rooms:', err);
    }
}

function renderRoomsTable(rooms) {
    const tbody = document.getElementById('roomsTbody');
    tbody.innerHTML = '';
    rooms.forEach(r => {
        const adminButtons = (currentUser && currentUser.role === 'admin') ? `
            <button class="btn btn-sm btn-outline-danger" onclick="deleteRoom(${r.room_id})">
                <i class="fa-solid fa-trash"></i>
            </button>
        ` : '';

        tbody.innerHTML += `
            <tr>
                <td class="fw-bold">#${r.room_number}</td>
                <td>${r.room_type}</td>
                <td class="fw-bold text-success">$${r.price.toFixed(2)}</td>
                <td>${r.capacity} Guests</td>
                <td><span class="badge badge-${r.status}">${r.status.toUpperCase()}</span></td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="openEditRoomModal(${r.room_id})">
                        <i class="fa-solid fa-pen"></i> Edit
                    </button>
                    ${adminButtons}
                </td>
            </tr>
        `;
    });
}

function filterRoomsTable() {
    const query = document.getElementById('roomSearchInput').value.toLowerCase();
    const status = document.getElementById('roomStatusFilter').value;

    const filtered = allRooms.filter(r => {
        const matchesQuery = r.room_number.toLowerCase().includes(query) || r.room_type.toLowerCase().includes(query);
        const matchesStatus = status === '' || r.status === status;
        return matchesQuery && matchesStatus;
    });
    renderRoomsTable(filtered);
}

function openAddRoomModal() {
    document.getElementById('roomModalTitle').textContent = 'Add New Room';
    document.getElementById('roomForm').reset();
    document.getElementById('roomFormId').value = '';
    const modal = new bootstrap.Modal(document.getElementById('roomModal'));
    modal.show();
}

function openEditRoomModal(id) {
    const room = allRooms.find(r => r.room_id === id);
    if (!room) return;

    document.getElementById('roomModalTitle').textContent = 'Edit Room details';
    document.getElementById('roomFormId').value = room.room_id;
    document.getElementById('roomNumberInput').value = room.room_number;
    document.getElementById('roomTypeInput').value = room.room_type;
    document.getElementById('roomPriceInput').value = room.price;
    document.getElementById('roomCapacityInput').value = room.capacity;
    document.getElementById('roomStatusInput').value = room.status;

    const modal = new bootstrap.Modal(document.getElementById('roomModal'));
    modal.show();
}

document.getElementById('roomForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('roomFormId').value;
    const body = {
        room_number: document.getElementById('roomNumberInput').value,
        room_type: document.getElementById('roomTypeInput').value,
        price: document.getElementById('roomPriceInput').value,
        capacity: document.getElementById('roomCapacityInput').value,
        status: document.getElementById('roomStatusInput').value
    };

    const url = id ? `/api/rooms/${id}` : '/api/rooms';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
        bootstrap.Modal.getInstance(document.getElementById('roomModal')).hide();
        showAlert(data.message || 'Room saved successfully.');
        loadRooms();
    } else {
        alert(data.error);
    }
});

async function deleteRoom(id) {
    if (!confirm('Are you sure you want to delete this room?')) return;
    const res = await fetch(`/api/rooms/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
        showAlert('Room deleted successfully.');
        loadRooms();
    } else {
        alert(data.error);
    }
}


// =========================================================================
// 3. CUSTOMER MANAGEMENT
// =========================================================================
async function loadCustomers() {
    try {
        const res = await fetch('/api/customers');
        const data = await res.json();
        if (data.success) {
            allCustomers = data.customers;
            renderCustomersTable(allCustomers);
        }
    } catch (err) {
        console.error('Error loading customers:', err);
    }
}

function renderCustomersTable(customers) {
    const tbody = document.getElementById('customersTbody');
    tbody.innerHTML = '';
    customers.forEach(c => {
        const adminButtons = (currentUser && currentUser.role === 'admin') ? `
            <button class="btn btn-sm btn-outline-danger" onclick="deleteCustomer(${c.customer_id})">
                <i class="fa-solid fa-trash"></i>
            </button>
        ` : '';

        tbody.innerHTML += `
            <tr>
                <td>#${c.customer_id}</td>
                <td class="fw-bold">${c.name}</td>
                <td><i class="fa-solid fa-phone me-1 text-muted"></i> ${c.phone}</td>
                <td>${c.email || '<span class="text-muted">N/A</span>'}</td>
                <td><span class="badge bg-light text-dark border">${c.id_proof}</span></td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="openEditCustomerModal(${c.customer_id})">
                        <i class="fa-solid fa-pen"></i> Edit
                    </button>
                    ${adminButtons}
                </td>
            </tr>
        `;
    });
}

function filterCustomersTable() {
    const q = document.getElementById('customerSearchInput').value.toLowerCase();
    const filtered = allCustomers.filter(c => 
        c.name.toLowerCase().includes(q) || 
        c.phone.toLowerCase().includes(q) || 
        (c.email && c.email.toLowerCase().includes(q))
    );
    renderCustomersTable(filtered);
}

function openAddCustomerModal() {
    document.getElementById('customerModalTitle').textContent = 'Register New Customer';
    document.getElementById('customerForm').reset();
    document.getElementById('customerFormId').value = '';
    new bootstrap.Modal(document.getElementById('customerModal')).show();
}

function openEditCustomerModal(id) {
    const c = allCustomers.find(item => item.customer_id === id);
    if (!c) return;

    document.getElementById('customerModalTitle').textContent = 'Edit Customer Details';
    document.getElementById('customerFormId').value = c.customer_id;
    document.getElementById('custNameInput').value = c.name;
    document.getElementById('custPhoneInput').value = c.phone;
    document.getElementById('custEmailInput').value = c.email || '';
    document.getElementById('custIdProofInput').value = c.id_proof;

    new bootstrap.Modal(document.getElementById('customerModal')).show();
}

document.getElementById('customerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('customerFormId').value;
    const body = {
        name: document.getElementById('custNameInput').value,
        phone: document.getElementById('custPhoneInput').value,
        email: document.getElementById('custEmailInput').value,
        id_proof: document.getElementById('custIdProofInput').value
    };

    const url = id ? `/api/customers/${id}` : '/api/customers';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
        bootstrap.Modal.getInstance(document.getElementById('customerModal')).hide();
        showAlert(data.message || 'Customer saved.');
        loadCustomers();
    } else {
        alert(data.error);
    }
});

async function deleteCustomer(id) {
    if (!confirm('Are you sure you want to delete this customer record?')) return;
    const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
        showAlert('Customer record deleted.');
        loadCustomers();
    } else {
        alert(data.error);
    }
}


// =========================================================================
// 4. BOOKING MANAGEMENT
// =========================================================================
async function loadBookings() {
    try {
        const res = await fetch('/api/bookings');
        const data = await res.json();
        if (data.success) {
            allBookings = data.bookings;
            renderBookingsTable(allBookings);
        }
    } catch (err) {
        console.error('Error loading bookings:', err);
    }
}

function renderBookingsTable(bookings) {
    const tbody = document.getElementById('bookingsTbody');
    tbody.innerHTML = '';
    bookings.forEach(b => {
        let actionButtons = '';
        if (b.booking_status === 'confirmed') {
            actionButtons = `
                <button class="btn btn-sm btn-success me-1" onclick="performCheckIn(${b.booking_id})">
                    <i class="fa-solid fa-right-to-bracket"></i> Check-in
                </button>
                <button class="btn btn-sm btn-outline-danger me-1" onclick="cancelBooking(${b.booking_id})">
                    Cancel
                </button>
            `;
        } else if (b.booking_status === 'checked_in') {
            actionButtons = `
                <button class="btn btn-sm btn-warning text-dark me-1" onclick="openCheckoutModal(${b.booking_id}, ${b.total_price})">
                    <i class="fa-solid fa-right-from-bracket"></i> Check-out
                </button>
            `;
        }

        actionButtons += `
            <button class="btn btn-sm btn-outline-secondary" onclick="viewInvoice(${b.booking_id})">
                <i class="fa-solid fa-receipt"></i> Invoice
            </button>
        `;

        tbody.innerHTML += `
            <tr>
                <td class="fw-bold">#BK-${b.booking_id}</td>
                <td>
                    <div class="fw-bold">${b.customer_name}</div>
                    <small class="text-muted">${b.customer_phone}</small>
                </td>
                <td>
                    <div class="fw-bold">Room #${b.room_number}</div>
                    <small class="text-muted">${b.room_type}</small>
                </td>
                <td>${b.check_in}</td>
                <td>${b.check_out}</td>
                <td class="fw-bold text-primary">$${b.total_price.toFixed(2)}</td>
                <td><span class="badge badge-${b.booking_status}">${b.booking_status.replace('_', ' ').toUpperCase()}</span></td>
                <td class="text-end">${actionButtons}</td>
            </tr>
        `;
    });
}

async function openNewBookingModal() {
    // Load customer dropdown
    const custRes = await fetch('/api/customers');
    const custData = await custRes.json();
    const custSelect = document.getElementById('bookCustomerSelect');
    custSelect.innerHTML = '<option value="">-- Select Customer --</option>';
    if (custData.success) {
        custData.customers.forEach(c => {
            custSelect.innerHTML += `<option value="${c.customer_id}">${c.name} (${c.phone})</option>`;
        });
    }

    await loadAvailableRooms();
    new bootstrap.Modal(document.getElementById('bookingModal')).show();
}

async function loadAvailableRooms() {
    const checkIn = document.getElementById('bookCheckIn').value;
    const checkOut = document.getElementById('bookCheckOut').value;
    const roomSelect = document.getElementById('bookRoomSelect');
    
    if (!checkIn || !checkOut) return;

    const res = await fetch(`/api/bookings/available-rooms?check_in=${checkIn}&check_out=${checkOut}`);
    const data = await res.json();
    
    roomSelect.innerHTML = '<option value="">-- Select Available Room --</option>';
    if (data.success && data.availableRooms.length > 0) {
        data.availableRooms.forEach(r => {
            roomSelect.innerHTML += `<option value="${r.room_id}" data-price="${r.price}">Room #${r.room_number} - ${r.room_type} ($${r.price}/night)</option>`;
        });
    } else {
        roomSelect.innerHTML = '<option value="">No rooms available for selected dates</option>';
    }
    calculateBookingCost();
}

function calculateBookingCost() {
    const checkIn = new Date(document.getElementById('bookCheckIn').value);
    const checkOut = new Date(document.getElementById('bookCheckOut').value);
    const roomSelect = document.getElementById('bookRoomSelect');
    const selectedOption = roomSelect.options[roomSelect.selectedIndex];

    if (!selectedOption || !selectedOption.dataset.price || checkOut <= checkIn) {
        document.getElementById('bookEstimatedCost').textContent = '$0.00';
        document.getElementById('bookNightsCount').textContent = '0 Nights';
        return;
    }

    const price = parseFloat(selectedOption.dataset.price);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 3600 * 24));
    const total = price * nights;

    document.getElementById('bookNightsCount').textContent = `${nights} Night${nights > 1 ? 's' : ''}`;
    document.getElementById('bookEstimatedCost').textContent = `$${total.toFixed(2)}`;
}

document.getElementById('bookingForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = {
        customer_id: document.getElementById('bookCustomerSelect').value,
        room_id: document.getElementById('bookRoomSelect').value,
        check_in: document.getElementById('bookCheckIn').value,
        check_out: document.getElementById('bookCheckOut').value,
        payment_method: document.getElementById('bookPaymentMethod').value
    };

    const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.success) {
        bootstrap.Modal.getInstance(document.getElementById('bookingModal')).hide();
        showAlert('Booking reservation created successfully!');
        loadBookings();
        loadDashboard();
    } else {
        alert(data.error);
    }
});

async function performCheckIn(bookingId) {
    if (!confirm('Proceed with customer check-in for this booking?')) return;
    const res = await fetch(`/api/bookings/${bookingId}/checkin`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
        showAlert('Customer Checked-in successfully.');
        loadBookings();
        loadDashboard();
    } else {
        alert(data.error);
    }
}

function openCheckoutModal(bookingId, basePrice) {
    document.getElementById('checkoutBookingId').value = bookingId;
    document.getElementById('checkoutRoomCost').value = `$${basePrice.toFixed(2)}`;
    document.getElementById('checkoutExtraCost').value = '0.00';
    updateCheckoutGrandTotal();
    new bootstrap.Modal(document.getElementById('checkoutModal')).show();
}

function updateCheckoutGrandTotal() {
    const baseStr = document.getElementById('checkoutRoomCost').value.replace('$', '');
    const base = parseFloat(baseStr || 0);
    const extra = parseFloat(document.getElementById('checkoutExtraCost').value || 0);
    const grand = base + extra;
    document.getElementById('checkoutGrandTotal').textContent = `$${grand.toFixed(2)}`;
}

document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const bookingId = document.getElementById('checkoutBookingId').value;
    const body = {
        additional_services_cost: document.getElementById('checkoutExtraCost').value,
        payment_method: document.getElementById('checkoutPaymentMethod').value
    };

    const res = await fetch(`/api/bookings/${bookingId}/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const data = await res.json();
    if (data.success) {
        bootstrap.Modal.getInstance(document.getElementById('checkoutModal')).hide();
        showAlert('Check-out & Payment completed.');
        loadBookings();
        loadDashboard();
        viewInvoice(bookingId);
    } else {
        alert(data.error);
    }
});

async function cancelBooking(bookingId) {
    if (!confirm('Are you sure you want to cancel this booking reservation?')) return;
    const res = await fetch(`/api/bookings/${bookingId}/cancel`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
        showAlert('Booking cancelled.');
        loadBookings();
        loadDashboard();
    } else {
        alert(data.error);
    }
}


// =========================================================================
// 5. INVOICES & PAYMENTS
// =========================================================================
async function loadInvoices() {
    loadBookings(); // Uses bookings table with payments status
}

async function viewInvoice(bookingId) {
    try {
        const res = await fetch(`/api/payments/invoice/${bookingId}`);
        const data = await res.json();
        if (!data.success) {
            alert(data.error || 'Invoice not found.');
            return;
        }

        const inv = data.invoice;
        document.getElementById('invNumber').textContent = `INV-${String(inv.booking_id).padStart(5, '0')}`;
        document.getElementById('invStatusBadge').textContent = (inv.payment_status || 'PENDING').toUpperCase();
        document.getElementById('invStatusBadge').className = `badge bg-${inv.payment_status === 'Paid' ? 'success' : 'warning'}`;
        
        document.getElementById('invCustomerName').textContent = inv.customer_name;
        document.getElementById('invCustomerDetails').innerHTML = `
            Phone: ${inv.customer_phone}<br>
            Email: ${inv.customer_email || 'N/A'}<br>
            ID Proof: ${inv.id_proof}
        `;

        document.getElementById('invRoomNum').textContent = inv.room_number;
        document.getElementById('invRoomType').textContent = inv.room_type;
        document.getElementById('invCheckIn').textContent = inv.check_in;
        document.getElementById('invCheckOut').textContent = inv.check_out;
        document.getElementById('invNights').textContent = inv.nights;

        document.getElementById('invRoomTypeDetail').textContent = inv.room_type;
        document.getElementById('invNightlyRate').textContent = `$${inv.nightly_rate}`;
        document.getElementById('invNightsDetail').textContent = inv.nights;
        document.getElementById('invRoomTotal').textContent = `$${inv.room_total.toFixed(2)}`;
        document.getElementById('invExtraServices').textContent = `$${(inv.additional_services_cost || 0).toFixed(2)}`;
        document.getElementById('invGrandTotal').textContent = `$${inv.grand_total.toFixed(2)}`;
        document.getElementById('invPaymentMethod').textContent = inv.payment_method || 'Cash';

        new bootstrap.Modal(document.getElementById('invoiceModal')).show();
    } catch (err) {
        console.error('Error viewing invoice:', err);
    }
}


// =========================================================================
// 6. STAFF MANAGEMENT (Admin Only)
// =========================================================================
async function loadStaff() {
    try {
        const res = await fetch('/api/staff');
        const data = await res.json();
        if (data.success) {
            const tbody = document.getElementById('staffTbody');
            tbody.innerHTML = '';
            data.staff.forEach(s => {
                tbody.innerHTML += `
                    <tr>
                        <td>#${s.staff_id}</td>
                        <td class="fw-bold">${s.name}</td>
                        <td><span class="badge bg-secondary">${s.role}</span></td>
                        <td>${s.contact}</td>
                        <td>${s.email || 'N/A'}</td>
                        <td class="fw-bold text-success">$${s.salary.toFixed(2)}</td>
                        <td class="text-end">
                            <button class="btn btn-sm btn-outline-primary me-1" onclick="openEditStaffModal(${s.staff_id}, '${s.name}', '${s.role}', '${s.contact}', '${s.email}', ${s.salary})">
                                <i class="fa-solid fa-pen"></i> Edit
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteStaff(${s.staff_id})">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });
        }
    } catch (err) {
        console.error('Error loading staff:', err);
    }
}

function openAddStaffModal() {
    document.getElementById('staffModalTitle').textContent = 'Add Staff Member';
    document.getElementById('staffForm').reset();
    document.getElementById('staffFormId').value = '';
    new bootstrap.Modal(document.getElementById('staffModal')).show();
}

function openEditStaffModal(id, name, role, contact, email, salary) {
    document.getElementById('staffModalTitle').textContent = 'Edit Staff Member';
    document.getElementById('staffFormId').value = id;
    document.getElementById('staffNameInput').value = name;
    document.getElementById('staffRoleInput').value = role;
    document.getElementById('staffContactInput').value = contact;
    document.getElementById('staffEmailInput').value = email || '';
    document.getElementById('staffSalaryInput').value = salary;

    new bootstrap.Modal(document.getElementById('staffModal')).show();
}

document.getElementById('staffForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('staffFormId').value;
    const body = {
        name: document.getElementById('staffNameInput').value,
        role: document.getElementById('staffRoleInput').value,
        contact: document.getElementById('staffContactInput').value,
        email: document.getElementById('staffEmailInput').value,
        salary: document.getElementById('staffSalaryInput').value
    };

    const url = id ? `/api/staff/${id}` : '/api/staff';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const data = await res.json();
    if (data.success) {
        bootstrap.Modal.getInstance(document.getElementById('staffModal')).hide();
        showAlert('Staff record saved.');
        loadStaff();
    } else {
        alert(data.error);
    }
});

async function deleteStaff(id) {
    if (!confirm('Are you sure you want to delete this staff record?')) return;
    const res = await fetch(`/api/staff/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
        showAlert('Staff record deleted.');
        loadStaff();
    } else {
        alert(data.error);
    }
}


// =========================================================================
// 7. REPORTS & ANALYTICS
// =========================================================================
async function loadReports() {
    try {
        const res = await fetch('/api/reports');
        const data = await res.json();
        if (data.success) {
            // Revenue by Month
            const revTbody = document.getElementById('revenueReportTbody');
            revTbody.innerHTML = '';
            if (data.revenueByMonth.length === 0) {
                revTbody.innerHTML = `<tr><td colspan="2" class="text-center text-muted">No revenue data yet.</td></tr>`;
            } else {
                data.revenueByMonth.forEach(r => {
                    revTbody.innerHTML += `
                        <tr>
                            <td class="fw-bold">${r.month || 'Current Period'}</td>
                            <td class="fw-bold text-success">$${r.revenue.toFixed(2)}</td>
                        </tr>
                    `;
                });
            }

            // Top Customers
            const topTbody = document.getElementById('topCustomersReportTbody');
            topTbody.innerHTML = '';
            if (data.topCustomers.length === 0) {
                topTbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">No customer spending history yet.</td></tr>`;
            } else {
                data.topCustomers.forEach(c => {
                    topTbody.innerHTML += `
                        <tr>
                            <td>
                                <div class="fw-bold">${c.name}</div>
                                <small class="text-muted">${c.phone}</small>
                            </td>
                            <td><span class="badge bg-primary">${c.total_bookings} Bookings</span></td>
                            <td class="fw-bold text-success">$${c.total_spent.toFixed(2)}</td>
                        </tr>
                    `;
                });
            }
        }
    } catch (err) {
        console.error('Error loading reports:', err);
    }
}
