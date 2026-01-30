# Hostel App - Project Study Roadmap

This roadmap is designed to help you understand the codebase, architecture, and features of the Hostel Food Ordering Application.

## Phase 1: High-Level Overview & Setup
**Goal:** Understand what the project does and how to run it.

1.  **Project Description**:
    *   Review `README.md` (and `LINKEDIN_UPDATE_DRAFT.md` for recent context).
    *   **Core functionality**: Food ordering system for hostel students with Admin dashboard.
2.  **Tech Stack Overview**:
    *   **Frontend**: React (Vite), React Router, Lucide Icons.
    *   **Backend**: Node.js, Express (for Payment integration).
    *   **Database & Auth**: Firebase.
    *   **Payment**: PhonePe.
3.  **Running the Project**:
    *   Frontend: `npm run dev` (Port 5173).
    *   Backend: `cd backend` -> `npm start` (Port 5000).

## Phase 2: React Frontend Architecture
**Goal:** Understand how the UI is built and managed.

1.  **Entry Point**:
    *   Study `src/main.jsx`: How React mounts to the DOM.
    *   Study `src/App.jsx`: Understanding the **Routing** (react-router-dom) and layout structure.
2.  **Component Structure**:
    *   **Pages** (`src/pages/`):
        *   `Login.jsx` & `CreateAccount.jsx`: Authentication screens.
        *   `UserMenu.jsx`: The main ordering interface for students.
        *   `UserOrders.jsx`: Order history view.
        *   `AdminDashboard.jsx`: Management interface for admins.
    *   **Components** (`src/components/`):
        *   `Navbar.jsx`: Navigation logic (handling User vs Admin views).
        *   `ThemeToggle.jsx` & `SnackBackground.jsx`: UI/UX enhancements.
3.  **Styling**:
    *   Review `src/index.css`: Global styles and CSS variables.

## Phase 3: Data Flow & State Management
**Goal:** Learn how data moves through the app.

1.  **Global State**:
    *   Study `src/context/`: Look for `ThemeContext` or `AuthContext` to manage global settings and user sessions.
2.  **Firebase Integration** (`src/lib/`):
    *   Understand how the app connects to Firebase.
    *   Study `Login.jsx` to see `signInWithEmailAndPassword`.
    *   Study `CreateAccount.jsx` to see `createUserWithEmailAndPassword`.

## Phase 4: Key Business Logic
**Goal:** detailed understanding of the specific features.

1.  **Ordering System** (`UserMenu.jsx`):
    *   How menu items are displayed.
    *   How the "Cart" works (adding/removing items).
    *   How the total price is calculated.
2.  **Payment Flow**:
    *   **Frontend**: How `UserMenu.jsx` initiates a payment request.
    *   **Backend**: Study `backend/server.js`.
        *   `/api/payment`: Initiating PhonePe transaction.
        *   `/api/status`: Checking payment status.
    *   **Post-Payment**: Study `PaymentSuccess.jsx`.
3.  **Admin Features** (`AdminDashboard.jsx`):
    *   How orders are fetched from Firebase.
    *   Order management (Accept/Reject/Mark as Done).
    *   History & Analytics logic.

## Phase 5: Backend & Security
**Goal:** Understand the server-side logic.

1.  **Express Server** (`backend/server.js`):
    *   Middleware configuration (CORS, JSON parsing).
    *   API Endpoints definition.
    *   Interaction with PhonePe API.
2.  **Security**:
    *   Environment Variables (`.env`): Protecting keys (PhonePe Merchant ID, Firebase Config).
    *   **Note**: Ensure `.env` is never committed to GitHub.

## Suggested Study Plan
- [ ] **Day 1**: Run the app, click through every screen, and read `App.jsx` and `main.jsx`.
- [ ] **Day 2**: Deep dive into `UserMenu.jsx` and trace how an order is placed.
- [ ] **Day 3**: Study `backend/server.js` and the Payment implementation.
- [ ] **Day 4**: Analyze `AdminDashboard.jsx` and how it manages data.
- [ ] **Day 5**: Review Styling (`App.css`, `index.css`) and Polish.
