# VFSTR Class Roster Attendance Portal
### B.Tech, CSE, 4th Year - Section 17 Attendance Management System

A premium, secure, mobile-friendly daily attendance management system designed for **Vignan's Foundation for Science, Technology & Research (Deemed to be University)**.

---

## 🌟 Key Features Implemented

### 1. Modern Login & Secure Authentication
- **Secure Google OAuth**: Entirely removed traditional password authentication. Users now sign in securely using their Google accounts (`Continue with Google`).
- **Access Control List**: Implemented an environment-controlled list (`ALLOWED_CR_EMAIL` comma-separated values) protecting access on the server-side.
- **Custom Institutional Branding**: Styled the login view with a high-resolution photo of the VFSTR University building in the background, overlaid with a premium semi-transparent dark backdrop blur.

### 2. Streamlined Dashboard & Live Metrics
- **Ticking Clock**: Displays the current day, date, and time with live counting seconds in the header banner.
- **Visual Analytics Trend**: Renders a custom-engineered, responsive **SVG Area/Line Trend Graph** showcasing attendance percentages across the last 10 sessions with interactive hover tooltips.
- **Clean KPIs**: Focuses on core metrics—*Total Roster Students* (72) and *Overall Attendance Rate* (%). Removed redundant logging counters.

### 3. Student Roster Roll Call
- **Default-Absent Flow**: On loading any attendance sheet (even when logging multiple periods on the same date), the portal starts with all students marked as `Absent` by default. This makes it quick to toggle only the present students.
- **Mobile Viewport Optimization**: Removed side-scrolling. Swapped student cards to display the **Registration Number** as the main title and the student's name as the sub-label for fast mobile navigation.
- **Overlay Modals**: Submissions and confirmation popups are positioned in the absolute center of the mobile screen with blurred backdrops to guarantee visibility on touch devices.

### 4. Grouped Reports & Custom Excel Export
- **Expandable Sessions Accordion**: The reports tab displays dates. Clicking a date opens a vertical accordion listing each period recorded on that date, showing the subject, time logged, statistics, and individual download buttons.
- **Custom Excel Exports**: Downloads a formatted `.xlsx` spreadsheet matching Vignan's formatting, complete with:
  - Subject Name rows formatted in **Title Case** (e.g. `Cloud Computing`, `Networks`).
  - Columns detailing Registration Numbers, Student Names, and their attendance status.
  - Styled headers in high-contrast university blue.

---

## 🛠️ Technology Stack
- **Frontend**: React.js, TypeScript, Vite, TailwindCSS (Vanilla CSS theme overlays), Lucide Icons
- **Backend**: Node.js, Express.js, TypeScript, SQLite3 (`sqlite3` driver)
- **Authentication**: Google Identity Services, `google-auth-library` JWT token verification
- **Exporting**: `exceljs` library for styling spreadsheets

---

## 🚀 Setup & Launch Instructions

### 1. Environment Configurations
Create `.env` files in both the frontend and backend root directories to load Google OAuth credentials.

#### **Frontend** (`/frontend/.env`):
```env
VITE_GOOGLE_CLIENT_ID=487926035288-1ski519qepmknmquff9bu8ees6mqf29h.apps.googleusercontent.com
```

#### **Backend** (`/backend/.env`):
```env
PORT=5000
JWT_SECRET=super-secret-cr-key-2026
VITE_API_URL=http://localhost:5000/api
GOOGLE_CLIENT_ID=487926035288-1ski519qepmknmquff9bu8ees6mqf29h.apps.googleusercontent.com
ALLOWED_CR_EMAIL=rishitha07888@gmail.com,231fa04394@gmail.com
```

### 2. Start the Development Server
Install dependencies and launch both servers simultaneously:
```bash
# In the project root directory:
npm run dev
```

The application will launch on clean local ports:
- **Frontend**: `http://localhost:5173/`
- **Backend API**: `http://localhost:5000/`

---

## 📦 Build for Production
To typecheck and bundle both modules for production deployment:
```bash
npm run build:all
```
