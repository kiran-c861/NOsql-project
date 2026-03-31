// API base URL
const API_BASE = 'http://localhost:3000/api';

// DOM elements
const employeeForm = document.getElementById('employeeForm');
const employeeId = document.getElementById('employeeId');
const nameInput = document.getElementById('name');
const departmentInput = document.getElementById('department');
const salaryInput = document.getElementById('salary');
const emailInput = document.getElementById('email');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const employeeGrid = document.getElementById('employeeGrid');
const employeeCount = document.getElementById('employeeCount');
const employeeStats = document.getElementById('employeeStats');
const totalEmployees = document.getElementById('totalEmployees');
const avgSalary = document.getElementById('avgSalary');
const totalDepartments = document.getElementById('totalDepartments');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const salaryFilter = document.getElementById('salaryFilter');
const filterBtn = document.getElementById('filterBtn');
const clearFilterBtn = document.getElementById('clearFilterBtn');
const toastContainer = document.getElementById('toastContainer');

// Global variables
let allEmployees = [];
let filteredEmployees = [];
let currentFilter = null;

// Load employees on page load
document.addEventListener('DOMContentLoaded', () => {
    loadEmployees();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    employeeForm.addEventListener('submit', handleFormSubmit);
    cancelBtn.addEventListener('click', resetForm);
    filterBtn.addEventListener('click', filterBySalary);
    clearFilterBtn.addEventListener('click', clearFilters);
    searchBtn.addEventListener('click', searchEmployees);
    searchInput.addEventListener('input', debounce(searchEmployees, 300));
}

// Debounce function for search
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Load all employees
async function loadEmployees() {
    try {
        showLoading();
        const response = await fetch(`${API_BASE}/employees`);
        const employees = await response.json();

        if (response.ok) {
            allEmployees = employees;
            filteredEmployees = [...allEmployees];
            displayEmployees(filteredEmployees);
            updateStats(filteredEmployees);
        } else {
            showToast('Failed to load employees', 'error');
        }
    } catch (error) {
        showToast('Network error: ' + error.message, 'error');
    }
}

// Search employees
function searchEmployees() {
    const searchTerm = searchInput.value.toLowerCase().trim();

    if (!searchTerm) {
        filteredEmployees = [...allEmployees];
    } else {
        filteredEmployees = allEmployees.filter(employee =>
            employee.name.toLowerCase().includes(searchTerm) ||
            employee.department.toLowerCase().includes(searchTerm) ||
            employee.email.toLowerCase().includes(searchTerm)
        );
    }

    currentFilter = searchTerm ? 'search' : null;
    displayEmployees(filteredEmployees);
    updateStats(filteredEmployees);
}

// Filter employees by salary
async function filterBySalary() {
    const minSalary = parseFloat(salaryFilter.value);

    if (isNaN(minSalary) || minSalary < 0) {
        showToast('Please enter a valid minimum salary', 'error');
        return;
    }

    try {
        showLoading();
        const response = await fetch(`${API_BASE}/employees/salary/above/${minSalary}`);
        const employees = await response.json();

        if (response.ok) {
            filteredEmployees = employees;
            currentFilter = 'salary';
            displayEmployees(filteredEmployees);
            updateStats(filteredEmployees);
            showToast(`Found ${employees.length} employees earning above $${minSalary.toLocaleString()}`, 'info');
        } else {
            showToast('Failed to filter employees', 'error');
        }
    } catch (error) {
        showToast('Network error: ' + error.message, 'error');
    }
}

// Clear all filters
function clearFilters() {
    searchInput.value = '';
    salaryFilter.value = '';
    filteredEmployees = [...allEmployees];
    currentFilter = null;
    displayEmployees(filteredEmployees);
    updateStats(filteredEmployees);
    showToast('Filters cleared', 'info');
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();

    const employeeData = {
        name: nameInput.value.trim(),
        department: departmentInput.value.trim(),
        salary: parseFloat(salaryInput.value),
        email: emailInput.value.trim()
    };

    // Basic validation
    if (!validateForm(employeeData)) {
        return;
    }

    const isEditing = employeeId.value;
    const method = isEditing ? 'PUT' : 'POST';
    const url = isEditing ? `${API_BASE}/employees/${employeeId.value}` : `${API_BASE}/employees`;

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(employeeData)
        });

        const result = await response.json();

        if (response.ok) {
            showToast(isEditing ? 'Employee updated successfully!' : 'Employee added successfully!', 'success');
            resetForm();
            await loadEmployees(); // Reload to get updated data
        } else {
            showToast(result.error || 'Failed to save employee', 'error');
        }
    } catch (error) {
        showToast('Network error: ' + error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = isEditing ?
            '<i class="fas fa-save"></i> Update Employee' :
            '<i class="fas fa-save"></i> Add Employee';
    }
}

// Validate form data
function validateForm(data) {
    if (!data.name || data.name.length < 2) {
        showToast('Name must be at least 2 characters long', 'error');
        return false;
    }

    if (!data.department) {
        showToast('Department is required', 'error');
        return false;
    }

    if (isNaN(data.salary) || data.salary < 0) {
        showToast('Please enter a valid salary', 'error');
        return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
        showToast('Please enter a valid email address', 'error');
        return false;
    }

    return true;
}

// Edit employee
function editEmployee(employee) {
    employeeId.value = employee._id;
    nameInput.value = employee.name;
    departmentInput.value = employee.department;
    salaryInput.value = employee.salary;
    emailInput.value = employee.email;

    submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Employee';
    cancelBtn.style.display = 'inline-block';

    // Scroll to form
    document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth' });

    showToast('Editing employee: ' + employee.name, 'info');
}

// Delete employee
async function deleteEmployee(id, name) {
    if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/employees/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast('Employee deleted successfully', 'success');
            await loadEmployees();
        } else {
            const result = await response.json();
            showToast(result.error || 'Failed to delete employee', 'error');
        }
    } catch (error) {
        showToast('Network error: ' + error.message, 'error');
    }
}

// Display employees
function displayEmployees(employees) {
    employeeCount.textContent = employees.length;

    if (employees.length === 0) {
        employeeGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <h3>No employees found</h3>
                <p>${currentFilter ? 'Try adjusting your search or filter criteria.' : 'Add your first employee to get started.'}</p>
            </div>
        `;
        return;
    }

    const html = employees.map(employee => `
        <div class="employee-card">
            <div class="employee-header">
                <div class="employee-avatar">
                    ${getInitials(employee.name)}
                </div>
                <div>
                    <h3 class="employee-name">${employee.name}</h3>
                    <p class="employee-department">${employee.department}</p>
                </div>
            </div>

            <div class="employee-details">
                <div class="employee-detail">
                    <span class="detail-label"><i class="fas fa-envelope"></i> Email</span>
                    <span class="detail-value">${employee.email}</span>
                </div>
                <div class="employee-detail">
                    <span class="detail-label"><i class="fas fa-dollar-sign"></i> Salary</span>
                    <span class="detail-value">$${employee.salary.toLocaleString()}</span>
                </div>
                <div class="employee-detail">
                    <span class="detail-label"><i class="fas fa-calendar"></i> Hire Date</span>
                    <span class="detail-value">${new Date(employee.hireDate).toLocaleDateString()}</span>
                </div>
            </div>

            <div class="employee-actions">
                <button class="btn btn-small btn-edit" onclick="editEmployee(${JSON.stringify(employee).replace(/"/g, '&quot;')})">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-small btn-delete" onclick="deleteEmployee('${employee._id}', '${employee.name.replace(/'/g, "\\'")}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');

    employeeGrid.innerHTML = html;
}

// Update statistics
function updateStats(employees) {
    if (employees.length === 0) {
        employeeStats.style.display = 'none';
        return;
    }

    employeeStats.style.display = 'flex';

    // Total employees
    totalEmployees.textContent = employees.length;

    // Average salary
    const avg = employees.reduce((sum, emp) => sum + emp.salary, 0) / employees.length;
    avgSalary.textContent = '$' + Math.round(avg).toLocaleString();

    // Unique departments
    const departments = new Set(employees.map(emp => emp.department));
    totalDepartments.textContent = departments.size;
}

// Get initials from name
function getInitials(name) {
    return name
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');
}

// Reset form
function resetForm() {
    employeeForm.reset();
    employeeId.value = '';
    submitBtn.innerHTML = '<i class="fas fa-save"></i> Add Employee';
    cancelBtn.style.display = 'none';
}

// Show loading spinner
function showLoading() {
    employeeGrid.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <p>Loading employees...</p>
        </div>
    `;
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `message message-${type}`;
    toast.innerHTML = `
        <i class="fas ${getToastIcon(type)}"></i>
        <span>${message}</span>
    `;

    toastContainer.appendChild(toast);

    // Animate in
    setTimeout(() => toast.style.transform = 'translateX(0)', 100);

    // Auto remove
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Get toast icon based on type
function getToastIcon(type) {
    switch (type) {
        case 'success': return 'fa-check-circle';
        case 'error': return 'fa-exclamation-circle';
        case 'info': return 'fa-info-circle';
        default: return 'fa-info-circle';
    }
}