# Implementation Plan: Role Management & Enhanced Features

## ✅ Database Changes (COMPLETED)
- Added `approval_status` column to `warga` table
- Added `foto_bukti` column to `ronda_jadwal` table

## 📋 TODO: Feature Implementation

### 1. Role Management (Admin Only)
**File**: `views/warga/index.ejs`
- Add "Ubah Role" button in action column (visible only for admin)
- Create modal/dropdown to select role: warga, ketua, bendahara, admin
- Add route `/warga/update-role/:id` with POST method

**File**: `controllers/wargaController.js`
- Add `updateRole` function to handle role changes
- Validate: only admin can change roles

**File**: `models/Warga.js`
- Add `updateRole(id, role)` method

---

### 2. Role-Based Access Control
**File**: `middleware/auth.js`
- Create `isAdmin` middleware
- Create `isAdminOrKetua` middleware
- Create `isAdminOrBendahara` middleware

**File**: `views/warga/index.ejs` & `views/iuran/index.ejs`
- Hide action buttons for users with role='warga'
- Show buttons only for admin/ketua/bendahara

**File**: `routes/warga.js` & `routes/iuran.js`
- Protect routes with appropriate middleware

---

### 3. Family Member Management (Kepala Keluarga)
**File**: `views/profile/index.ejs`
- Add section "Anggota Keluarga Saya"
- Show list of family members
- Add "Tambah Anggota Keluarga" button (if user is Kepala Keluarga)

**File**: `controllers/profileController.js`
- Add `addFamilyMember` function
- Validate: only Kepala Keluarga can add members
- Auto-assign same blok & nomor_rumah

**File**: `routes/profile.js`
- Add POST `/profile/add-family-member`

---

### 4. Enhanced Registration
**File**: `views/register.ejs`
- Add dropdown to select Blok (F7, F8)
- Add dropdown to select Nomor Rumah (1-20)
- Add dropdown for Status Keluarga (Kepala Keluarga, Istri, Anak, etc)

**File**: `controllers/authController.js` - `register` function
- Set default role = 'warga'
- Set approval_status = 'pending'
- Auto login after registration
- Flash message: "Registrasi berhasil! Menunggu approval dari admin/ketua"

---

### 5. Approval System
**File**: `views/warga/index.ejs`
- Add badge showing approval status (pending/approved/rejected)
- Add "Approve" & "Reject" buttons for admin/ketua

**File**: `controllers/wargaController.js`
- Add `approveHouse(id)` function
- Add `rejectHouse(id)` function

**File**: `models/Warga.js`
- Add `updateApprovalStatus(id, status)` method

---

### 6. Upload Foto Bukti Ronda
**File**: `views/ronda/index.ejs`
- Add "Upload Foto Bukti" button in card for this week's schedule
- Only show for team members who are scheduled
- Create modal with multiple file upload input

**File**: `controllers/rondaController.js`
- Add `uploadPhotos` function
- Use multer for multiple file upload
- Store as JSON array in `foto_bukti` column

**File**: `routes/ronda.js`
- Add POST `/ronda/upload-photos/:jadwal_id`
- Configure multer for multiple files

**File**: `views/ronda/index.ejs` (display)
- Show uploaded photos in modal when clicking house card
- Display as gallery/carousel

---

## 🔧 Quick Start Commands

```bash
# 1. Update middleware
# Create file: middleware/roleCheck.js

# 2. Update routes with middleware
# Edit: routes/warga.js, routes/iuran.js

# 3. Update views
# Edit: views/warga/index.ejs, views/iuran/index.ejs, views/profile/index.ejs

# 4. Update controllers
# Edit: controllers/wargaController.js, controllers/authController.js, controllers/profileController.js

# 5. Restart app
docker-compose restart app
```

---

## 📝 Notes
- All existing data will have approval_status='approved' by default
- New registrations will have approval_status='pending'
- Only users with approved status can access full features
- Photos stored in /uploads/ronda/ directory
- Maximum 10 photos per ronda session
