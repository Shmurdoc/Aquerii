# Employee Daily Tools

**Status:** DRAFT  
**Date:** 2026-05-25  
**Domain:** HR / Team Management

---

## 1. Problem Statement

Aquerii is used by teams, yet has no HR or workforce management layer. Growing businesses using Aquerii as their primary operations tool need: employee attendance tracking, leave management, expense claims, and a simple employee directory. Without this, HR processes stay in spreadsheets alongside the business operations in Aquerii — defeating the purpose of centralisation.

---

## 2. Feature Scope

### Phase 1 (Core daily tools)
- Employee directory (extends `workspace_members` with HR fields)
- Attendance: daily clock-in / clock-out
- Leave requests: apply, approve/reject, balance tracking
- Expense claims: submit receipt + amount, approve, export for payroll

### Phase 2
- Payroll export (CSV compatible with payroll systems)
- Performance reviews (self + manager ratings)
- Onboarding checklist
- Contract/document storage per employee

---

## 3. Database Schema

### 3.1 Employee Profiles (extends `workspace_members`)

```php
Schema::table('workspace_members', function (Blueprint $table) {
    // Already has: workspace_id, user_id, role, joined_at
    $table->string('employee_id', 50)->nullable(); // e.g. EMP-001
    $table->string('job_title')->nullable();
    $table->string('department')->nullable();
    $table->date('start_date')->nullable();
    $table->date('end_date')->nullable(); // null = still employed
    $table->string('employment_type', 50)->default('full_time'); // full_time|part_time|contractor
    $table->string('phone')->nullable();
    $table->string('emergency_contact_name')->nullable();
    $table->string('emergency_contact_phone')->nullable();
    $table->string('bank_account')->nullable(); // encrypted
    $table->string('tax_number')->nullable();
    $table->decimal('salary', 15, 2)->nullable(); // encrypted
    $table->string('salary_currency', 10)->default('USD');
    $table->string('salary_frequency', 20)->default('monthly'); // monthly|biweekly|weekly
    $table->integer('leave_balance_days')->default(0);
    $table->index(['workspace_id', 'department']);
});
```

Sensitive fields (`bank_account`, `salary`) encrypted using Laravel's `Encryptable` cast.

### 3.2 Attendance

```php
Schema::create('attendance_logs', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('workspace_id');
    $table->uuid('user_id');
    $table->date('work_date');
    $table->timestampTz('clocked_in_at')->nullable();
    $table->timestampTz('clocked_out_at')->nullable();
    $table->integer('break_minutes')->default(0);
    $table->decimal('hours_worked', 5, 2)->nullable(); // computed on clock-out
    $table->string('status', 50)->default('present'); // present|late|absent|half_day|on_leave
    $table->text('notes')->nullable();
    $table->uuid('recorded_by')->nullable(); // null = self; set if manager clocked in for employee
    $table->timestampsTz();
    $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
    $table->unique(['user_id', 'work_date']); // one record per employee per day
    $table->index(['workspace_id', 'work_date']);
});
```

### 3.3 Leave

```php
Schema::create('leave_types', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('workspace_id');
    $table->string('name'); // Annual Leave, Sick Leave, Family Responsibility, Study Leave
    $table->integer('days_per_year')->default(0); // 0 = unlimited
    $table->boolean('requires_approval')->default(true);
    $table->boolean('carries_over')->default(false);
    $table->integer('max_carry_over_days')->nullable();
    $table->string('color', 20)->default('#3b82f6');
    $table->timestampsTz();
});

Schema::create('leave_requests', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('workspace_id');
    $table->uuid('user_id');
    $table->uuid('leave_type_id');
    $table->date('start_date');
    $table->date('end_date');
    $table->integer('days_taken'); // computed (excludes weekends and public holidays)
    $table->string('status', 50)->default('pending'); // pending|approved|rejected|cancelled
    $table->text('reason')->nullable();
    $table->uuid('reviewed_by')->nullable();
    $table->timestampTz('reviewed_at')->nullable();
    $table->text('review_notes')->nullable();
    $table->timestampsTz();
    $table->foreign('workspace_id')->references('id')->on('workspaces')->cascadeOnDelete();
    $table->index(['workspace_id', 'user_id', 'status']);
});
```

### 3.4 Expense Claims

```php
Schema::create('expense_claims', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('workspace_id');
    $table->uuid('user_id'); // claimant
    $table->string('title');
    $table->string('category', 100); // travel|meals|software|equipment|other
    $table->decimal('amount', 15, 2);
    $table->string('currency', 10)->default('USD');
    $table->date('expense_date');
    $table->text('description')->nullable();
    $table->string('receipt_path')->nullable(); // S3 path to uploaded receipt
    $table->string('status', 50)->default('pending'); // pending|approved|rejected|paid
    $table->uuid('reviewed_by')->nullable();
    $table->timestampTz('reviewed_at')->nullable();
    $table->text('review_notes')->nullable();
    $table->timestampTz('paid_at')->nullable();
    $table->timestampsTz();
    $table->index(['workspace_id', 'user_id', 'status']);
});
```

---

## 4. API Endpoints

```
# Employee Directory
GET  /api/workspaces/{w}/employees               — list with search, department filter
GET  /api/workspaces/{w}/employees/{id}          — profile
PUT  /api/workspaces/{w}/employees/{id}          — update HR fields (manager+ only)

# Attendance
GET  /api/workspaces/{w}/attendance              — today's status for current user
GET  /api/workspaces/{w}/attendance/report       — summary table: ?from=&to=&user_id=
POST /api/workspaces/{w}/attendance/clock-in     — record clock-in for today
POST /api/workspaces/{w}/attendance/clock-out    — record clock-out, compute hours
POST /api/workspaces/{w}/attendance/{id}         — manager override

# Leave
GET  /api/workspaces/{w}/leave/types             — list leave types
GET  /api/workspaces/{w}/leave/requests          — list: own requests or all (manager+)
GET  /api/workspaces/{w}/leave/balance           — current user's balance per type
POST /api/workspaces/{w}/leave/requests          — submit leave request
PUT  /api/workspaces/{w}/leave/requests/{id}/approve
PUT  /api/workspaces/{w}/leave/requests/{id}/reject

# Expenses
GET  /api/workspaces/{w}/expenses                — list: own or all (manager+)
POST /api/workspaces/{w}/expenses                — submit claim
POST /api/workspaces/{w}/expenses/{id}/receipt   — upload receipt file
PUT  /api/workspaces/{w}/expenses/{id}/approve
PUT  /api/workspaces/{w}/expenses/{id}/reject
GET  /api/workspaces/{w}/expenses/export         — CSV for payroll period
```

---

## 5. Frontend: HR Section

### 5.1 New Route: `/hr`

Add HR section to sidebar (icon: `Users` or `Briefcase`). Sub-navigation:
- `/hr/directory` — employee directory
- `/hr/attendance` — attendance tracker
- `/hr/leave` — leave management
- `/hr/expenses` — expense claims

Visible to: all workspace members (own data); managers see full team data.

### 5.2 Attendance Widget (Dashboard)

A small widget shown when user is not yet clocked in today:

```
┌─────────────────────────────────────────┐
│  ⏱ You haven't clocked in today        │
│  [Clock In]                             │
└─────────────────────────────────────────┘
```

Once clocked in, shows elapsed time and a "Clock Out" button.

### 5.3 Employee Directory

Card grid or table view of all employees. Each card: avatar, name, job title, department, email, phone. Search + department filter. Click → Employee profile page.

### 5.4 Leave Calendar

Month calendar view showing approved leave per employee (colour-coded by leave type). Manager view: shows all employees' leave on one calendar for resource planning.

### 5.5 Expense Claim Flow

1. Employee clicks "New Expense Claim"
2. Fills: title, category, amount, date, description
3. Uploads receipt photo (drag-drop or file picker)
4. Submits → status: `pending`
5. Manager gets notification → reviews → approve/reject with notes
6. On approval: status = `approved`; payroll export includes it

---

## 6. Leave Balance Calculation

On leave request approval:
```php
// LeaveService::approve()
$request->update(['status' => 'approved', 'reviewed_by' => auth()->id(), 'reviewed_at' => now()]);

// Deduct from balance
DB::table('workspace_members')
    ->where('workspace_id', $request->workspace_id)
    ->where('user_id', $request->user_id)
    ->decrement('leave_balance_days', $request->days_taken);

// Mark attendance as 'on_leave' for each day in range
$this->markAttendanceOnLeave($request);
```

Leave days calculation excludes weekends. Public holidays: workspace can configure `workspace.settings.public_holidays = ["2026-12-25", "2026-12-26", ...]`.

---

## 7. Notifications

- Leave request submitted → notify all managers
- Leave approved/rejected → notify requesting employee
- Leave starting tomorrow → notify workspace owner / manager (schedule check)
- Expense claim submitted → notify managers
- Expense approved/rejected → notify claimant
- Employee hasn't clocked in by 10:00am → notify manager (optional, configurable)

---

## 8. Security & Privacy

- Salary and bank account fields encrypted with `AES-256` via Laravel's `Encryptable` cast
- Only workspace owners/managers can view salary fields
- Employees can view their own full profile (including salary)
- RBAC gate: `view-employee-sensitive-data` permission required to see salary/bank info

---

## 9. Open Questions

- Public holidays list: managed per workspace or per country (ISO standard)?
- Multi-currency expenses: does the employer need to convert to workspace base currency for payroll export?
- Should we track overtime (hours worked > 8h/day)?

---

## 10. Success Criteria

- [ ] `workspace_members` extended with HR fields migration
- [ ] `attendance_logs`, `leave_types`, `leave_requests`, `expense_claims` tables created
- [ ] Clock-in / clock-out works; hours_worked computed on clock-out
- [ ] Attendance report endpoint returns per-employee per-day summary for date range
- [ ] Leave request flow: submit → notify managers → approve/reject → balance deducted
- [ ] Expense claim flow: submit + receipt upload → notify managers → approve/reject
- [ ] Expense CSV export for payroll period
- [ ] `/hr` section in sidebar with directory, attendance, leave, expenses pages
- [ ] Dashboard attendance widget (clock-in/out) for logged-in user
- [ ] Sensitive fields (salary, bank account) encrypted; RBAC-gated
- [ ] Tests: clock-in uniqueness constraint; leave days calculation (excluding weekends); expense approval flow
