# Smile Flow Backend

This is the backend for the Smile Flow Dental Clinic Management System, built with Node.js, Express, MongoDB, and JWT.

## Setup

1. **Install Dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Configuration**:
   - Update `.env` file with your MongoDB URI and JWT Secret.

3. **Run Server**:
   ```bash
   node index.js
   ```

## API Endpoints

### Authentication
- `POST /api/auth/signup`: Register a new user
- `POST /api/auth/login`: Login and receive JWT

### Patients
- `GET /api/patients`: Get all patients (Auth Required)
- `POST /api/patients`: Create new patient (Admin/Receptionist)
- `PUT /api/patients/:id`: Update patient (Admin/Receptionist)
- `DELETE /api/patients/:id`: Remove patient (Admin)

### Appointments
- `GET /api/appointments?date=YYYY-MM-DD`: Get appointments for date
- `POST /api/appointments`: Create appointment
- `PATCH /api/appointments/:id/status`: Update appointment status

### Tasks
- `GET /api/tasks`: Get all tasks
- `POST /api/tasks`: Create task
- `PUT /api/tasks/:id`: Update task
- `DELETE /api/tasks/:id`: Delete task

### Staff & Attendance
- `GET /api/staff`: List all staff (Admin)
- `POST /api/attendance/check-in`: Mark attendance
- `POST /api/attendance/check-out`: Mark check-out
- `GET /api/leave`: Get leave requests
- `POST /api/leave`: Request leave

### Voicemail
- `GET /api/voicemails`: List voicemails
- `PATCH /api/voicemails/:id/status`: Update voicemail status

## Role Based Access Control (RBAC)
The system supports the following roles:
- `admin`: Full access to all modules and user management.
- `dentist`: Access to patients, appointments, and personal tasks.
- `receptionist`: Access to appointments, patient registration, and voicemails.
- `staff`: Basic access to tasks and attendance.
