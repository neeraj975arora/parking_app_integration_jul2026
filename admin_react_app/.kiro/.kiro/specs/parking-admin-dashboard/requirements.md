# Requirements Document

## Introduction

The Parking Admin Dashboard is a modern, responsive frontend-only web application designed for efficient parking lot management. It allows Super Admins and Admins to view, track, and analyze parking sessions, revenue, and lot operations through a React-based interface that integrates with existing backend REST APIs. The application implements role-based access control with JWT authentication and provides comprehensive dashboard functionality for parking management operations.

## Requirements

### Requirement 1

**User Story:** As a Super Admin or Admin, I want to securely authenticate into the system, so that I can access role-appropriate dashboard features and manage parking operations.

#### Acceptance Criteria

1. WHEN a user visits the application THEN the system SHALL redirect unauthenticated users to the login page
2. WHEN a user submits valid credentials THEN the system SHALL authenticate via POST /auth/login and store JWT token
3. WHEN authentication is successful THEN the system SHALL redirect to the dashboard page
4. WHEN a user clicks logout THEN the system SHALL display a confirmation dialog with "Do you want to Sign Out this admin account?" message
5. WHEN a user confirms logout THEN the system SHALL clear authentication state and redirect to login
6. IF authentication fails THEN the system SHALL display appropriate error messages

### Requirement 2

**User Story:** As a Super Admin, I want to manage admin accounts and parking lot assignments, so that I can control access and delegate parking lot management responsibilities.

#### Acceptance Criteria

1. WHEN a Super Admin accesses admin management THEN the system SHALL display existing admins and creation form
2. WHEN creating a new admin THEN the system SHALL call POST /admin/assign_lot with admin details and lot assignments
3. WHEN viewing existing admins THEN the system SHALL call GET /all_admin/admin_lots/ to populate the admin list
4. WHEN deleting an admin THEN the system SHALL call DELETE /admin/remove_assignment after confirmation
5. IF a non-Super Admin tries to access admin management THEN the system SHALL redirect to dashboard or show access denied

### Requirement 3

**User Story:** As a Super Admin or Admin, I want to view real-time dashboard metrics and KPIs, so that I can monitor parking operations performance and make informed decisions.

#### Acceptance Criteria

1. WHEN a user accesses the dashboard THEN the system SHALL display summary cards with key metrics
2. WHEN a Super Admin views dashboard THEN the system SHALL call GET /admin/all_session/details/ for comprehensive data
3. WHEN an Admin views dashboard THEN the system SHALL call GET /admin/session/details/<user_id> for their assigned lots
4. WHEN displaying metrics THEN the system SHALL show Total Income, Total Sessions, Revenue per Slot, Active Participants, Average Session Time, Occupancy Rate
5. WHEN loading data THEN the system SHALL display loading states and handle API errors gracefully

### Requirement 4

**User Story:** As a Super Admin or Admin, I want to monitor live parking sessions, so that I can track active participants and manage real-time parking operations.

#### Acceptance Criteria

1. WHEN accessing live sessions THEN the system SHALL display current participants and session duration
2. WHEN a Super Admin views live sessions THEN the system SHALL show data from all parking lots
3. WHEN an Admin views live sessions THEN the system SHALL show data only from their assigned lots
4. WHEN checking out a vehicle THEN the system SHALL call POST /admin/session/checkout
5. WHEN checking in a vehicle THEN the system SHALL call POST /admin/session/checkin with vehicle details

### Requirement 5

**User Story:** As a Super Admin or Admin, I want to manage payment collection and view payment records, so that I can track financial transactions and handle payment issues.

#### Acceptance Criteria

1. WHEN accessing payment collection THEN the system SHALL display payment summary cards and records table
2. WHEN filtering payments THEN the system SHALL provide search, status filter, and date range options
3. WHEN viewing payment records THEN the system SHALL display Payment ID, Vehicle, Amount, Date, Duration, Status, and Actions
4. WHEN exporting data THEN the system SHALL provide CSV export functionality
5. IF payment status is PENDING THEN the system SHALL show "Collect" action button
6. IF payment status is FAILED THEN the system SHALL show "Retry" action button

### Requirement 6

**User Story:** As an Admin, I want to perform daily closure operations, so that I can finalize daily financial records and manage outstanding amounts.

#### Acceptance Criteria

1. WHEN accessing daily closure THEN the system SHALL call GET /admin/closure to retrieve financial metrics
2. WHEN displaying closure data THEN the system SHALL show Outstanding Amount, Today's Collection, Total Due, Amount Paid, New Outstanding
3. WHEN finalizing closure THEN the system SHALL call POST /admin/closure with payment amount
4. WHEN closure is pending THEN the system SHALL display "Pending Closure" status indicator
5. WHEN closure is finalized THEN the system SHALL update the status and display confirmation

### Requirement 7

**User Story:** As a Super Admin or Admin, I want to configure application settings, so that I can customize notifications, account details, and system preferences.

#### Acceptance Criteria

1. WHEN accessing settings THEN the system SHALL display notification, account, and system settings cards
2. WHEN updating notification settings THEN the system SHALL provide toggle switches for email and push notifications
3. WHEN updating account settings THEN the system SHALL allow email and password changes
4. WHEN updating system settings THEN the system SHALL provide auto backup and maintenance mode toggles
5. WHEN saving settings THEN the system SHALL display confirmation and update timestamp

### Requirement 8

**User Story:** As a user of the application, I want a responsive and accessible interface, so that I can use the dashboard effectively on different devices and screen sizes.

#### Acceptance Criteria

1. WHEN viewing on desktop THEN the system SHALL display full sidebar navigation and content area
2. WHEN viewing on mobile/tablet THEN the system SHALL collapse sidebar to hamburger menu
3. WHEN using keyboard navigation THEN the system SHALL provide proper focus management and accessibility
4. WHEN displaying data tables THEN the system SHALL provide horizontal scrolling on small screens
5. WHEN loading content THEN the system SHALL display appropriate loading states and error boundaries

### Requirement 9

**User Story:** As a developer maintaining the application, I want a well-structured codebase with proper routing and state management, so that the application is maintainable and scalable.

#### Acceptance Criteria

1. WHEN implementing routing THEN the system SHALL use React Router with protected routes and role-based access
2. WHEN managing authentication state THEN the system SHALL use React Context for global auth state
3. WHEN making API calls THEN the system SHALL implement proper error handling and loading states
4. WHEN organizing code THEN the system SHALL follow the specified folder structure with reusable components
5. WHEN implementing UI THEN the system SHALL use TailwindCSS for consistent styling and responsive design