# Navadia Dental Clinic Management System
## Data Classification & Specification Documentation (ડેટા વર્ગીકરણ અને સ્પેસિફિકેશન દસ્તાવેજ)

આ દસ્તાવેજમાં Navadia ERP સિસ્ટમમાં કયા **Static Data (સ્થિર / માસ્ટર ડેટા)** અને **Dynamic Data (ડાયનેમિક / રોજિંદો ડેટા)** ઉમેરી શકાય છે તેનો સંપૂર્ણ અને વિગતવાર યાદી (List) આપેલ છે.

---

## 📌 Executive Summary (સારાંશ)

| Data Category | Definition (વ્યાખ્યા) | Frequency of Change (બદલાવની આવૃત્તિ) | Primary Managed By |
| :--- | :--- | :--- | :--- |
| **Static Data (સ્થિર ડેટા)** | સિસ્ટમ કન્ફિગરેશન, માસ્ટર લિસ્ટ, કેટેગરી અને ઓપ્શન્સ | ખૂબ જ ઓછી (સિસ્ટમ સેટઅપ વખતે અથવા એડમિન દ્વારા જરૂર પડે ત્યારે) | Admin / System Developer |
| **Dynamic Data (ડાયનેમિક ડેટા)** | રોજિંદા ક્લિનિક કામકાજ, પેશન્ટ રેકોર્ડ્સ, એપોઇન્ટમેન્ટ્સ અને એટેન્ડન્સ | રોજિંદા ધોરણે / રિયલ-ટાઇમ (મિનિટો કે કલાકોમાં) | Admin, Dentist, Receptionist, Staff |

---

## 1. ⚙️ Static Data (સ્થિર / માસ્ટર ડેટા)

Static Data એ સિસ્ટમના ફાઉન્ડેશન સેટિંગ્સ છે જે ડ્રોપડાઉન વિકલ્પો, પ્રક્રિયાઓની યાદી અને ક્લિનિક કન્ફિગરેશન તરીકે કામ કરે છે.

### 1.1 Clinic General Settings & Profile
* **Clinic Name**: ક્લિનિકનું સત્તાવાર નામ (ડિફોલ્ટ: `Navadia Dental Clinic`).
* **Contact Information**: ઈમેલ (`contact@navadia.com`), પ્રાથમિક અને સેકન્ડરી ફોન નંબર.
* **Clinic Address**: ભૌતિક સરનામું (Katargam, Surat, Gujarat - 395004).
* **Working Hours**: ક્લિનિક ખોલવા અને બંધ થવાનો સમય (જેમ કે: `09:00 AM - 06:00 PM`).
* **Geofencing & GPS Parameters**:
  * Latitude & Longitude (જેમ કે: `21.2301438, 72.8213966`).
  * Allowed Geofence Radius (મીટરમાં, ડિફોલ્ટ: `100m`).
  * Location & GPS Verification Status (`Enabled` / `Disabled`).
* **Weekend Days**: રજાના દિવસો (જેમ કે: `[0]` - Sunday).
* **Official Holidays List**: વર્ષ દરમિયાન જાહેર રજાઓનું લિસ્ટ (નામ અને તારીખ YYYY-MM-DD).

### 1.2 System Roles & Permissions Matrix
* **User Roles (એનમ વિકલ્પો)**:
  1. `Admin` / `Superadmin` (સિસ્ટમ કંટ્રોલ અને એચઆર ઓવરવ્યૂ)
  2. `Dentist` (તબીબી સારવાર અને એપોઇન્ટમેન્ટ સંચાલન)
  3. `Staff` / `Receptionist` (એપોઇન્ટમેન્ટ બુકિંગ, પેશન્ટ ચેક-ઇન, રિસ્પોન્સ)

### 1.3 Dental Procedures & Service Catalog (દાંતની સારવારનું લિસ્ટ)
* **Procedures Master**:
  * Teeth Cleaning & Polishing (સફાઈ)
  * Root Canal Treatment (RCT)
  * Tooth Extraction (દાંત કાઢવો)
  * Dental Crowns & Bridges (કેપ અને બ્રિજ)
  * Orthodontic Braces Alignment
  * Dental Implants & Fillings (ફિલિંગ)
  * General Teeth Checkup & X-Ray

### 1.4 Enum Master Lists (સ્થિર ડ્રોપડાઉન ઓપ્શન્સ)
* **Appointment Status Options**: `scheduled`, `confirmed`, `inChair`, `completed`, `cancelled`.
* **Task Priorities**: `low`, `medium`, `high`, `urgent`.
* **Task Status Options**: `pending`, `in-progress`, `completed`, `cancelled`.
* **Leave Types**: `Paid Leave`, `Sick Leave`, `Casual Leave`, `Emergency Leave`.
* **Leave Status Options**: `Pending`, `Approved`, `Rejected`.
* **Attendance Status Options**: `Present`, `Absent`, `Late`, `On Leave`, `Tour`, `Holiday`, `Weekend`, `On Break`.
* **Patient Status Options**: `Active`, `Inactive`.
* **Blood Group Master**: `A+`, `A-`, `B+`, `B-`, `O+`, `O-`, `AB+`, `AB-`.
* **Gender Options**: `Male`, `Female`, `Other`.
* **Dental Chairs Setup**: Chair Numbers (જેમ કે: `Chair 1`, `Chair 2`, `Chair 3`).

---

## 2. 🔄 Dynamic Data (ડાયનેમિક / રોજિંદો ડેટા)

Dynamic Data એ એવો ડેટા છે જે વપરાશકર્તાઓની ક્રિયાઓ (User Actions), પેશન્ટ એન્ટ્રીઓ અને દૈનિક ઓપરેશન્સ દ્વારા સતત ઉમેરાય છે અને અપડેટ થાય છે.

### 2.1 Patient Management Data (`Patient`)
* **Medical Record Number (MRN)**: અનન્ય પેશન્ટ આઈડી (યુનિક).
* **Patient Demographics**: દર્દીનું નામ, ફોન નંબર, ઈમેલ, જન્મ તારીખ (DOB), જાતિ (Gender), બ્લડ ગ્રુપ.
* **Visit History**: છેલ્લી મુલાકાતની તારીખ (`lastVisit`).
* **Account Balance**: બાકી રહેલી ફી રકમ (`balance`).
* **Status**: ખાતાની સ્થિતિ (`Active` અથવા `Inactive`).

### 2.2 User & Employee Profiles (`User`)
* **Login Credentials**: ઈમેલ, હેશ્ડ પાસવર્ડ (Bcrypt).
* **Personal & Contact Details**: નામ, ફોન નંબર, અલ્ટરનેટ ફોન, એડ્રેસ, શહેર, રાજ્ય, પિનકોડ.
* **Identity Documents**: આધાર કાર્ડ નંબર (`aadhaarNo`), પાન કાર્ડ નંબર (`panNo`).
* **Emergency Contacts**: ઈમરજન્સી કોન્ટેક્ટ પર્સનનું નામ અને નંબર.
* **Professional Info (For Dentists)**: સ્પેશિયલાઇઝેશન, મેડિકલ લાયસન્સ નંબર (`licenseNo`), જોડાવાની તારીખ (`joiningDate`).

### 2.3 Appointments & Calendar Schedule (`Appointment`)
* **Schedule Time & Date**: તારીખ (`date`: YYYY-MM-DD), સમય (`time`: HH:MM) અને ડ્યુરેશન (કલાકોમાં).
* **Patient Link**: પેશન્ટનું નામ અને સંબંધિત `patientId` (Patient Ref).
* **Assigned Dentist**: ડેન્ટિસ્ટનું નામ અને `dentistId` (User Ref).
* **Procedure Selected**: હાથ ધરવાની સારવાર.
* **Chair Allocation**: ફાળવેલ ડેન્ટલ ચેર નંબર (`chair`).
* **Live Status**: વર્તમાન સ્થિતિ (`scheduled`, `confirmed`, `inChair`, `completed`, `cancelled`).

### 2.4 Staff Attendance & Geofence Logs (`Attendance`)
* **Daily Log Record**: સ્ટાફ મેમ્બર આઈડી (`userId`), સ્ટાફ નામ (`userName`), તારીખ (`date`).
* **Check-In / Check-Out**: ચેક-ઇન સમય, ચેક-આઉટ સમય.
* **GPS Geofence Data**: ચેક-ઈન અને ચેક-આઉટ સમયના Latitude, Longitude & Location Verification Status.
* **System Metadata**: સ્ટાફનું ઉપકરણ માહિતી (`deviceInfo`), બ્રાઉઝર અને IP સરનામું (`ipAddress`).
* **Work & Break Metrics**: કુલ કામ કરેલા કલાકો (`workingHours`), ઓવરટાઇમ (`overtime`), બ્રેક ટાઇમ અને બ્રેકના કારણો.

### 2.5 Tasks & Operations Checklist (`Task`)
* **Task Details**: વિષય (`title`), વિગતવાર વર્ણન (`description`).
* **Assignment**: જે કર્મચારી કે રોલને કામ સોંપ્યું હોય તે (`assignedTo`, `role`).
* **Priority & Status**: તાકીદ (`priority`), વર્તમાન સ્થિતિ (`status`).
* **Dates & Recurrence**: ડ્યુ ડેટ (`dueDate`), રીકરિંગ ટાસ્ક ફ્લેગ (`isRecurring`), કમ્પ્લીશન લોગ.
* **Attachments**: ટાસ્ક સાથે જોડાયેલી ફાઇલો/દસ્તાવેજો (`attachments`).

### 2.6 Leave Requests (`LeaveRequest`)
* **Application Data**: સ્ટાફ આઈડી, રજાનો પ્રકાર (`type`), શરૂઆત અને અંતની તારીખ (`startDate`, `endDate`).
* **Reason & Approval**: રજાનું કારણ, એડમિન માન્યતા સ્થિતિ (`Pending`, `Approved`, `Rejected`).

### 2.7 Internal Employee Chat & Voice Notes (`Message`)
* **Message Log**: મોકલનાર (`sender`), મેળવનાર/રૂમ (`receiver`), મેસેજ ટેક્સ્ટ (`content`).
* **Voice Notes**: વોઇસ નોટ ઓડિયો ડેટા (Base64).
* **Status Flags**: મેસેજ વાંચ્યો કે નહીં (`isRead`), એડિટ થયો કે નહીં (`isEdited`), ટાઇમસ્ટેમ્પ.

### 2.8 Voicemail & Call Logs (`Voicemail`)
* **Voicemail Records**: રેકોર્ડ કરેલ ઓડિયો ફાઇલ Base64 / URL (`audioFile`), સોંપાયેલ સ્ટાફ (`assignedTo`), ટ્રાન્સક્રાઇબ કરેલ ટેક્સ્ટ મેસેજ (`message`).

### 2.9 System Audit Logs (`AuditLog`)
* **Audit Trail**: કર્મચારી આઈડી, કરેલ ક્રિયા (`action`), ક્રિયા કરનાર એડમિન આઈડી, જૂની અને નવી કિંમતો (`previousValue`, `newValue`), ટાઇમસ્ટેમ્પ.

---

## 3. 🚀 Recommended Future Data Additions (ભવિષ્યમાં ઉમેરી શકાય તેવો ડેટા)

સિસ્ટમને વધુ એડવાન્સ અને કમ્પ્લીટ ERP બનાવવા માટે નીચે મુજબનો ડેટા ઉમેરી શકાય છે:

1. **Medical Dental Charting Data (દાંતનો ડિજિટલ ચાર્ટ)**:
   * FDI Tooth Numbers (11 થી 48).
   * Tooth condition (Decayed, Missing, Filled, Crowned).
2. **Billing, Invoicing & Payments (બિલિંગ ડેટા)**:
   * Invoice Number, Total Amount, Discount, GST/Tax, Paid Amount, Payment Method (Cash, UPI, Card).
3. **Prescriptions Data (દવાનું પ્રિસ્ક્રિપ્શન)**:
   * Medicine Name, Dosage, Frequency (1-0-1), Duration in days, Special Instructions.
4. **Inventory & Stock Data (સ્ટોક મેનેજમેન્ટ)**:
   * Material Name, Quantity in stock, Reorder Level, Supplier contact, Expiry date.

---

## 📄 File Verification & Reference
This documentation reflects the exact database models located under `backend/models/`:
- [User.js](file:///e:/personal/smile/navadia/backend/models/User.js)
- [Patient.js](file:///e:/personal/smile/navadia/backend/models/Patient.js)
- [Appointment.js](file:///e:/personal/smile/navadia/backend/models/Appointment.js)
- [Attendance.js](file:///e:/personal/smile/navadia/backend/models/Attendance.js)
- [ClinicSetting.js](file:///e:/personal/smile/navadia/backend/models/ClinicSetting.js)
- [Task.js](file:///e:/personal/smile/navadia/backend/models/Task.js)
- [LeaveRequest.js](file:///e:/personal/smile/navadia/backend/models/LeaveRequest.js)
- [Voicemail.js](file:///e:/personal/smile/navadia/backend/models/Voicemail.js)
- [Message.js](file:///e:/personal/smile/navadia/backend/models/Message.js)
- [AuditLog.js](file:///e:/personal/smile/navadia/backend/models/AuditLog.js)
