# Mock Server Requirements Document

## Introduction

The Mock Server is a standalone Node.js application designed to provide comprehensive REST API endpoints for testing the Parking Admin Dashboard React application. It operates independently from the React application, serving realistic mock data with comprehensive logging and tracing capabilities. The server generates 3 months of historical data to enable thorough testing of all application screens and functionalities.

## Requirements

### Requirement 1

**User Story:** As a developer, I want a standalone mock server that provides all necessary REST API endpoints, so that I can test the React application without depending on a real backend.

#### Acceptance Criteria

1. WHEN the mock server is started THEN it SHALL run on a separate port (3001) from the React application
2. WHEN the React app makes API calls THEN the mock server SHALL respond with realistic data and proper HTTP status codes
3. WHEN the server starts THEN it SHALL initialize with comprehensive 3-month mock data
4. WHEN API endpoints are called THEN the server SHALL maintain data consistency and relationships
5. IF the server encounters errors THEN it SHALL provide meaningful error responses and logging

### Requirement 2

**User Story:** As a developer, I want comprehensive logging and tracing capabilities, so that I can monitor API interactions and debug issues effectively.

#### Acceptance Criteria

1. WHEN API requests are made THEN the server SHALL log all requests with method, URL, headers, and timestamps
2. WHEN API responses are sent THEN the server SHALL log response status, duration, and payload size
3. WHEN payload logging is enabled THEN the server SHALL log request/response bodies (configurable via ENABLE_PAYLOAD_LOGGING)
4. WHEN logs are generated THEN the server SHALL write to both console and rotating log files
5. WHEN errors occur THEN the server SHALL log detailed error information with stack traces

### Requirement 3

**User Story:** As a QA tester, I want realistic 3-month mock data, so that I can test all application scenarios with comprehensive datasets.

#### Acceptance Criteria

1. WHEN the server initializes THEN it SHALL generate ~15,000 parking sessions over 90 days
2. WHEN generating sessions THEN it SHALL create realistic patterns (150-200 sessions/day, business hours 6 AM - 11 PM)
3. WHEN creating user data THEN it SHALL generate 2 Super Admins, 15 Admins, and 500+ regular users
4. WHEN generating parking infrastructure THEN it SHALL create 25 parking lots with varied capacities (20-100 slots)
5. WHEN creating payment data THEN it SHALL maintain 95% success, 4% pending, 1% failed rates

### Requirement 4

**User Story:** As a developer, I want secure JWT-based authentication, so that I can test role-based access control and security features.

#### Acceptance Criteria

1. WHEN users attempt to login THEN the server SHALL validate credentials and return JWT tokens
2. WHEN protected endpoints are accessed THEN the server SHALL validate JWT tokens and user roles
3. WHEN authentication fails THEN the server SHALL return appropriate 401/403 error responses
4. WHEN tokens expire THEN the server SHALL provide token refresh capabilities
5. WHEN logout is requested THEN the server SHALL invalidate tokens and clear sessions

### Requirement 5

**User Story:** As a Super Admin tester, I want admin management endpoints, so that I can test admin creation, modification, and deletion workflows.

#### Acceptance Criteria

1. WHEN creating admins THEN the server SHALL validate input data and prevent duplicate emails
2. WHEN retrieving admin lists THEN the server SHALL return all admin-lot assignments for Super Admins
3. WHEN deleting admins THEN the server SHALL remove assignments and update related data
4. WHEN modifying assignments THEN the server SHALL validate lot existence and prevent conflicts
5. IF non-Super Admin tries admin management THEN the server SHALL return 403 Forbidden

### Requirement 6

**User Story:** As an Admin tester, I want session management endpoints, so that I can test vehicle check-in/check-out and session monitoring features.

#### Acceptance Criteria

1. WHEN retrieving sessions THEN Super Admins SHALL see all sessions, Admins SHALL see only assigned lot sessions
2. WHEN checking in vehicles THEN the server SHALL validate lot capacity and create new sessions
3. WHEN checking out vehicles THEN the server SHALL calculate payments and update session status
4. WHEN monitoring active sessions THEN the server SHALL return real-time session data
5. WHEN searching sessions THEN the server SHALL support filtering by vehicle, lot, and date range

### Requirement 7

**User Story:** As a financial tester, I want payment and closure endpoints, so that I can test financial workflows and calculations.

#### Acceptance Criteria

1. WHEN retrieving payments THEN the server SHALL return payment records with proper status filtering
2. WHEN processing payments THEN the server SHALL update payment status and maintain financial integrity
3. WHEN accessing daily closure THEN the server SHALL return accurate financial calculations
4. WHEN finalizing closure THEN the server SHALL update outstanding amounts and create closure records
5. WHEN generating reports THEN the server SHALL provide accurate revenue and occupancy analytics

### Requirement 8

**User Story:** As a developer, I want comprehensive input validation and error handling, so that the server behaves predictably and provides helpful debugging information.

#### Acceptance Criteria

1. WHEN invalid data is submitted THEN the server SHALL return detailed validation error messages
2. WHEN business rules are violated THEN the server SHALL prevent operations and explain constraints
3. WHEN system errors occur THEN the server SHALL log errors and return user-friendly messages
4. WHEN monitoring server health THEN health check endpoints SHALL report system status
5. WHEN performance issues arise THEN metrics endpoints SHALL provide diagnostic information

### Requirement 9

**User Story:** As a developer, I want performance optimization and production features, so that the server can handle realistic load and deployment scenarios.

#### Acceptance Criteria

1. WHEN handling multiple requests THEN the server SHALL implement rate limiting and request compression
2. WHEN serving large datasets THEN the server SHALL provide pagination and efficient data serialization
3. WHEN caching is enabled THEN the server SHALL cache frequently accessed data for better performance
4. WHEN deploying to production THEN the server SHALL support SSL/TLS and environment-specific configuration
5. WHEN scaling is needed THEN the server SHALL support clustering and graceful shutdown

### Requirement 10

**User Story:** As a QA engineer, I want comprehensive testing capabilities, so that I can validate all React application features and user workflows.

#### Acceptance Criteria

1. WHEN running API tests THEN the server SHALL pass all endpoint unit and integration tests
2. WHEN testing React app integration THEN all screens SHALL function correctly with mock server data
3. WHEN conducting load testing THEN the server SHALL handle concurrent users and high-volume operations
4. WHEN testing error scenarios THEN the server SHALL simulate network failures and error conditions
5. WHEN validating performance THEN the server SHALL meet response time and throughput benchmarks

### Requirement 11

**User Story:** As a developer, I want comprehensive documentation, so that I can understand, deploy, and maintain the mock server effectively.

#### Acceptance Criteria

1. WHEN accessing API documentation THEN OpenAPI/Swagger specs SHALL be available with examples
2. WHEN deploying the server THEN setup and configuration guides SHALL be comprehensive and accurate
3. WHEN troubleshooting issues THEN error codes and debugging guides SHALL be available
4. WHEN contributing code THEN development guidelines and testing procedures SHALL be documented
5. WHEN operating in production THEN operational runbooks and monitoring guides SHALL be provided

### Requirement 12

**User Story:** As a project stakeholder, I want production-ready deployment and maintenance procedures, so that the mock server can be reliably operated and maintained.

#### Acceptance Criteria

1. WHEN conducting final testing THEN all React app workflows SHALL be validated with the mock server
2. WHEN optimizing performance THEN bottlenecks SHALL be identified and resolved
3. WHEN preparing for deployment THEN security hardening and configuration SHALL be completed
4. WHEN monitoring in production THEN alerting and log monitoring systems SHALL be operational
5. WHEN maintaining the system THEN backup, recovery, and update procedures SHALL be established