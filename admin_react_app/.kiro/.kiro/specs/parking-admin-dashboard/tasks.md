# Implementation Plan

- [x] 1. Set up project foundation and development environment

  - Initialize React 19 project with Vite build tool
  - Configure TailwindCSS 4.x with custom theme and responsive breakpoints
  - Install and configure required dependencies (React Router, Axios, Recharts)
  - Set up project folder structure according to design specifications
  - Configure ESLint, Prettier, and development scripts
  - _Requirements: 9.1, 9.4, 9.5_

- [x] 2. Implement core authentication system

  - [x] 2.1 Create authentication context and provider

    - Implement AuthContext with user state, token management, and auth methods
    - Create custom useAuth hook for consuming authentication state
    - Add JWT token storage and retrieval utilities
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 2.2 Build authentication service layer

    - Create authService.js with login API integration
    - Implement POST /auth/login with role-based authentication
    - Add error handling for authentication failures
    - Create token refresh and logout functionality
    - _Requirements: 1.2, 1.6_

  - [x] 2.3 Develop login page component
    - Create responsive login form with email, password
    - Implement form validation and error display
    - Add demo credentials section as per design specifications
    - Style login page according to design mockup with TailwindCSS
    - _Requirements: 1.1, 1.2, 1.6_

- [x] 3. Create routing system with protection guards

  - [x] 3.1 Set up React Router configuration

    - Configure React Router DOM with route definitions
    - Create public and protected route structures
    - Implement lazy loading for page components
    - _Requirements: 9.1, 9.2_

  - [x] 3.2 Implement route protection components
    - Create ProtectedRoute component for authenticated access
    - Build RoleBasedRoute component for role-specific access control
    - Add redirect logic for unauthorized access attempts
    - _Requirements: 1.1, 2.5, 9.2_

- [x] 4. Build core layout and navigation system

  - [x] 4.1 Create admin layout wrapper

    - Implement AdminLayout component with sidebar and main content areas
    - Add responsive design with mobile hamburger menu
    - Create header component with user info and logout functionality
    - _Requirements: 8.1, 8.2_

  - [x] 4.2 Develop sidebar navigation component
    - Build sidebar with grouped navigation sections (MAIN, ADMINISTRATION, OPERATIONS, ACCOUNT)
    - Implement role-based navigation item visibility
    - Add active state highlighting and navigation icons
    - Create logout confirmation dialog with "Do you want to Sign Out this admin account?" message
    - _Requirements: 1.4, 1.5, 2.5, 8.1_

- [x] 5. Implement dashboard page with KPI cards and charts

  - [x] 5.1 Create reusable KPI card component with calculation logic

    - Build KPICard component with value, subtitle, and trend indicators
    - Implement KPI calculation utilities for dashboard metrics:
      - Total Income: Sum of all completed session payments (amount field from session data)
      - Total Sessions: Count of all parking sessions (both active and completed)
      - Revenue per Slot: Total Income divided by total number of parking slots across all lots
      - Active Participants: Count of sessions where end_time is null (ongoing sessions)
      - Average Session Time: Mean duration of completed sessions (duration_hrs field)
      - Occupancy Rate: (Active Participants / Total Parking Slots) \* 100
    - Add percentage trend calculations comparing current period vs previous period
    - Add loading and error states for data fetching
    - Implement responsive card layout with TailwindCSS
    - Create utility functions for formatting currency, percentages, and time durations
    - _Requirements: 3.1, 3.4, 8.4_

  - [x] 5.2 Build revenue chart component

    - Create RevenueChart component using Recharts library
    - Implement area/bar chart toggle functionality
    - Add chart data processing and formatting utilities
    - _Requirements: 3.1, 3.4_

  - [x] 5.3 Develop dashboard page with API integration
    - Create Dashboard page component with summary cards layout
    - Implement role-based data fetching (Super Admin vs Admin)
    - Add quick actions section with navigation buttons
    - Integrate GET /admin/all_session/details/ and GET /admin/session/details/<user_id> APIs
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 6. Build admin management functionality (Super Admin only)

  - [x] 6.1 Create admin management page structure

    - Build two-panel layout with create form and existing admins table
    - Add summary cards for admin statistics:
      - Total Admins Card: Display count of all admin accounts
      - Super Admins Card: Display count of super admin accounts
      - Regular Admins Card: Display count of regular admin accounts
      - Total Lots Card: Display total number of parking lots
    - Implement role-based access control for Super Admin only
    - _Requirements: 2.1, 2.2, 2.5_

  - [x] 6.2 Implement create admin form

    - Create form with name, email, password, and assigned lots fields
    - Add form validation and error handling
    - Integrate POST /admin/assign_lot API with hardcoded role: 'admin'
    - _Requirements: 2.2, 2.5_

  - [x] 6.3 Build existing admins table
    - Create data table with admin information and actions
    - Implement search functionality for admin records
    - Add edit and delete actions with confirmation dialogs
    - Integrate GET /all_admin/admin_lots/ and DELETE /admin/remove_assignment APIs
    - _Requirements: 2.3, 2.4, 2.5_

- [x] 7. Develop live sessions monitoring page

  - [x] 7.1 Create live sessions page layout

    - Build two-panel layout with participants list and activity feed
    - Add summary cards for live session statistics:
      - Active Participants Card: Display count of currently active sessions with trend from last hour
      - Total Revenue Card: Display current session revenue with percentage trend
      - Avg. Session Time Card: Display average session duration with time-based trend
      - Occupancy Rate Card: Display current occupancy percentage with trend indicator
    - Add session status indicator and duration display
    - Implement responsive design for mobile devices
    - _Requirements: 4.1, 4.2, 8.1, 8.2_

  - [x] 7.2 Implement participant management features

    - Create participant list with search functionality
    - Add check-out vehicle functionality
    - Integrate POST /admin/session/checkout APIs
    - _Requirements: 4.3, 4.4, 4.5_

  - [x] 7.3 Build recent activity feed
    - Create activity timeline with real-time updates
    - Add activity icons and timestamp formatting
    - Implement role-based data filtering for Admin vs Super Admin
    - _Requirements: 4.1, 4.2_

- [x] 8. Create payment collection management system

  - [x] 8.1 Build payment collection page structure

    - Add summary cards for payment statistics:
      - Total Payments Card: Display total count of all payment records with blue icon
      - Completed Payments Card: Display count of completed payments with green icon
      - Pending Payments Card: Display count of pending payments with orange icon
      - Failed Payments Card: Display count of failed payments with red icon
    - Add filter section with search, status, and date range filters
    - Implement responsive table layout for payment records
    - _Requirements: 5.1, 5.2, 8.1, 8.2_

  - [x] 8.2 Implement payment records table with role-based API integration

    - Create data table with payment information and status badges
    - Integrate GET /admin/all_session/details/ API for Super Admin to show all parking lot sessions
    - Integrate GET /admin/session/details/<user_id> API for Admin to show only their assigned lot sessions
    - Add pagination and sorting functionality
    - Implement context-specific action buttons (View, Collect, Retry)
    - Calculate payment amounts from session data using duration_hrs and vehicle_type
    - _Requirements: 5.3, 5.5, 5.6_

  - [x] 8.3 Add export and filtering functionality
    - Implement CSV export functionality for session-based payment data
    - Add advanced filtering with date range and status options
    - Create refresh functionality for real-time data updates
    - Filter completed sessions (end_time !== null) for payment collection display
    - _Requirements: 5.4_

- [x] 9. Implement daily closure management

  - [x] 9.1 Create daily closure page

    - Build centered layout with financial metrics cards arranged in two rows:
      - Top Row: Outstanding Amount Card, Today's Collection Card, Total Due Card
      - Bottom Row: Amount Paid Card, New Outstanding Card
    - Each card displays monetary values with Indian Rupee symbol (₹) and appropriate labels
    - Add status indicator for closure state ("Pending Closure" with light brown/gold background)
    - Add "Finalize Closure" action button with purple background
    - Implement responsive design for mobile devices
    - _Requirements: 6.1, 6.2, 8.1, 8.2_

  - [x] 9.2 Integrate closure APIs
    - Connect GET /admin/closure API for financial data
    - Implement POST /admin/closure for closure finalization
    - Add error handling and success confirmation
    - _Requirements: 6.3, 6.4, 6.5_

- [x] 10. Build settings and configuration page

  - [x] 10.1 Create settings page layout

    - Build card-based layout for different setting categories
    - Add notification, account, and system settings sections
    - Implement form controls with toggle switches and input fields
    - _Requirements: 7.1, 7.2, 8.1_

  - [x] 10.2 Implement settings functionality
    - Add toggle switches for notification and system settings
    - Create account settings form with email and password fields
    - Implement save functionality with confirmation feedback
    - _Requirements: 7.3, 7.4, 7.5_

- [x] 11. Add comprehensive error handling and loading states

  - [x] 11.1 Implement global error handling

    - Create error boundary components for React error catching
    - Add Axios interceptors for API error handling
    - Implement authentication error handling with automatic logout
    - _Requirements: 1.6, 8.5_

  - [x] 11.2 Add loading and error states to all components
    - Create loading spinners and skeleton screens
    - Add error messages with retry functionality
    - Implement graceful degradation for API failures
    - _Requirements: 3.5, 8.5_

- [x] 12. Implement responsive design and accessibility

  - [x] 12.1 Ensure mobile responsiveness

    - Test and optimize all pages for mobile and tablet devices
    - Implement hamburger menu for mobile navigation
    - Add responsive breakpoints for all components
    - _Requirements: 8.1, 8.2, 8.4_

  - [x] 12.2 Add accessibility features
    - Implement keyboard navigation support
    - Add ARIA labels and semantic HTML elements
    - Ensure proper focus management and screen reader compatibility
    - _Requirements: 8.3_

- [x] 13. Create reusable UI components library

  - [x] 13.1 Build common UI components

    - Create Button, Input, Select, Modal, and Card components
    - Add consistent styling with TailwindCSS utility classes
    - Implement component variants and props interfaces
    - _Requirements: 9.4, 9.5_

  - [x] 13.2 Create data display components
    - Build DataTable component with sorting and pagination
    - Create StatusBadge component for payment and session statuses
    - Add Chart wrapper components for consistent styling
    - _Requirements: 9.4, 9.5_

- [x] 14. Add final polish and optimization

  - [x] 14.1 Optimize application performance

    - Implement code splitting for route-based lazy loading
    - Add React.memo and useMemo optimizations
    - Optimize bundle size and implement caching strategies
    - _Requirements: 9.3_

  - [x] 14.2 Final testing and bug fixes
    - Test all user flows for both Admin and Super Admin roles
    - Verify API integrations and error handling
    - Ensure responsive design works across all devices
    - Fix any remaining bugs and polish UI details
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1_
