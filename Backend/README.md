# Smart Parking System - Backend

Complete backend for a smart parking management system with REST API, PostgreSQL database, and Nginx reverse proxy, fully containerized with Docker.

## Features

- **User Authentication**: JWT-based secure registration and login with role-based access control (user, admin, super_admin)
- **Vehicle Management**: Users can register and manage multiple vehicles
- **Parking Structure**: Complete CRUD API for Parking Lots, Floors, Rows, and Slots
- **Session Management**: Vehicle check-in/check-out with automated billing
- **Admin Management**: Admin-to-parking-lot assignments and payment ledger tracking
- **Real-time Updates**: IoT-ready endpoints for slot status updates
- **API Documentation**: Interactive Swagger UI at `/apidocs`
- **Containerized**: Docker and Docker Compose for easy deployment
- **Automated Testing**: Comprehensive pytest suite with coverage reports

## Tech Stack

- **Framework**: Flask 3.0.3 with Gunicorn 22.0.0
- **Database**: PostgreSQL 17 with SQLAlchemy 2.0.30
- **Authentication**: JWT with Flask-JWT-Extended 4.5.3
- **Migrations**: Flask-Migrate 4.0.7 (Alembic)
- **API Docs**: Flasgger (Swagger UI)
- **Testing**: Pytest with coverage and HTML reports
- **Containerization**: Docker with docker-compose

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (version 20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (version 2.0+)

## Quick Start

### 1. Clone and Navigate

```bash
cd Backend
```

### 2. Environment Setup

Create a `.env` file (optional - defaults are configured in docker-compose.yml):

```bash
FLASK_CONFIG=development
DATABASE_URL=postgresql://parking_user:parking_password@db:5432/parking_db
SECRET_KEY=your-secret-key-here
```

### 3. Build and Start Services

```bash
docker-compose up --build -d
```

This command will:
- Build the Flask application container
- Start PostgreSQL database with health checks
- Start Nginx reverse proxy
- Start pgAdmin for database management

### 4. Initialize Database (ONE COMMAND!)

```bash
# Complete setup with ONE SQL file - includes everything!
docker cp COMPLETE_DATABASE_SETUP_FIXED.sql postgres_db:/setup.sql
docker exec -it postgres_db psql -U parking_user -d parking_db -f /setup.sql
```

This single file includes:
- Database schema (all tables)
- 87 parking lots across New Delhi
- 21 users (1 super admin, 10 admins, 10 regular users)
- 22 user vehicles
- 10,440 parking slots
- 100 sample parking sessions
- Admin assignments and payment ledger


### ⚠️ Expected Database Setup Notices (Not Errors)

During execution of `COMPLETE_DATABASE_SETUP_FIXED.sql`, you may see messages like:


✅ These messages are **expected and harmless**.

**Reason:**  
The script uses `DROP TABLE IF EXISTS` to make it safe to run multiple times.  
If tables don’t exist (e.g., first run), PostgreSQL prints a NOTICE.

**No action required** — as long as there are **no `ERROR:` messages**, the database setup completed successfully.


**For detailed information about database setup and seeding, see [Database Seeding Information](./DataBaseSeedingInformation.md)**

**Option B: Using Flask-Migrate (For development with migrations)**

```bash
# Initialize migrations (only first time)
docker-compose exec app flask db init

# Create migration
docker-compose exec app flask db migrate -m "Initial migration"

# Apply migration
docker-compose exec app flask db upgrade
```

### 5. Verify Installation

Check if all services are running:

```bash
docker-compose ps
```

You should see:
- `flask_app` - Running on port 5000
- `postgres_db` - Running on port 5432
- `nginx_server` - Running on port 80
- `pgadmin` - Running on port 5050

## Accessing the Application

### Main Application
- **API Base URL**: `http://localhost`
- **Swagger UI**: `http://localhost/apidocs`
- **Health Check**: `http://localhost/` (returns welcome message)

### Database Management
- **pgAdmin**: `http://localhost:5050`
  - Email: `admin@admin.com`
  - Password: `admin`

### Direct Database Access

```bash
docker-compose exec db psql -U parking_user -d parking_db
```

Common psql commands:
```sql
\dt              -- List all tables
\d table_name    -- Describe table structure
\q               -- Quit
```

## Sample Data

The database includes comprehensive sample data:

### Users (Password for all: `password123`)
- **Super Admin**: `superadmin@parking.com`
- **Admins**: `admin10@parking.com` through `admin19@parking.com` (10 admins)
- **Regular Users**: `user20@parking.com` through `user29@parking.com` (10 users)

### Parking Lots (87 locations across New Delhi)
- **87 parking lots** covering major areas including:
  - Jahangirpuri, Azadpur, Kashmere Gate
  - Pitampura, Netaji Subhash Place, Kohat Enclave
  - Connaught Place (multiple locations)
  - Nizamuddin, Lodhi Colony
  - Karol Bagh, Paharganj, Jhandewalan
  - Shalimar Bagh, Malviya Nagar
  - And many more...

### Infrastructure
Each parking lot has:
- 3 Floors (Ground, First, Second)
- 4 Rows per floor (Row-A, Row-B, Row-C, Row-D)
- 10 Slots per row (S1-S10)
- **Total: 120 slots per parking lot**
- **Grand Total: 10,440 parking slots across all 87 lots**

### Admin Assignments
- 10 admins managing 87 parking lots
- Each admin manages approximately 9 parking lots

### User Vehicles
- 22 registered vehicles across 10 users
- Mix of cars and motorcycles
- Realistic vehicle details (make, model, year, color)

### Sample Sessions
- 100 parking sessions with realistic data
- Distributed across different parking lots
- Mix of completed and active sessions
- Various vehicle types (Car, Two-Wheeler, Three-Wheeler)
- Different payment methods (cash, card, UPI)

## Documentation

### 📚 Complete Documentation References

- **[Database Seeding Information](./DataBaseSeedingInformation.md)** - Complete guide to database setup, schema, and sample data
- **[Database ERD](./DB_ERD.md)** - Entity Relationship Diagram and database schema documentation
- **[User App REST API Specs](./USER_APP_REST_API_SPECS.md)** - Complete API specifications for the mobile user app
- **[New APIs Documentation](./NEW_APIS_DOCUMENTATION.md)** - Latest API endpoints and features
- **[Postman API Testing Guide](./POSTMAN_API_TESTING_GUIDE.md)** - Step-by-step guide for testing APIs with Postman


## API Endpoints Overview

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get JWT token

### User Endpoints
- `GET /user/profile` - Get user profile
- `GET /user/vehicles` - List user vehicles
- `POST /user/vehicles` - Add new vehicle
- `PUT /user/vehicles/<id>` - Update vehicle
- `DELETE /user/vehicles/<id>` - Delete vehicle

### Parking Discovery
- `GET /parking/lots` - List all parking lots
- `GET /parking/lots/<id>` - Get parking lot details
- `GET /parking/lots/<id>/availability` - Check slot availability

### Session Management
- `POST /session/checkin` - Check-in vehicle
- `POST /session/checkout` - Check-out vehicle
- `GET /session/active` - Get active sessions
- `GET /session/history` - Get session history

### Admin Endpoints (Requires admin role)
- `GET /admin/lots/<admin_id>` - Get admin's parking lots
- `POST /admin/session/checkin` - Admin check-in vehicle
- `POST /admin/session/checkout` - Admin check-out vehicle
- `POST /admin/closure` - Daily closure and payment
- `GET /admin/stats` - Get parking statistics

For complete API documentation, visit: `http://localhost/apidocs`

## Testing

### Run All Tests

```bash
docker-compose exec app pytest
```

### Run with Coverage Report

```bash
docker-compose exec app pytest --cov=app --cov-report=html
```

### Run Specific Test File

```bash
docker-compose exec app pytest tests/test_auth.py -v
```

### Run Specific Test Function

```bash
docker-compose exec app pytest tests/test_admin_api.py::test_vehicle_checkin -v
```

### View Test Coverage

After running tests with coverage, open `htmlcov/index.html` in your browser.

## Database Management

### View Logs

```bash
# Application logs
docker-compose logs -f app

# Database logs
docker-compose logs -f db

# All services
docker-compose logs -f
```

### Database Backup

```bash
docker-compose exec db pg_dump -U parking_user parking_db > backup_$(date +%Y%m%d).sql
```

### Database Restore

```bash
docker cp backup_20250110.sql postgres_db:/backup.sql
docker exec -it postgres_db psql -U parking_user -d parking_db -f /backup.sql
```

### Reset Database

```bash
# Stop services
docker-compose down

# Remove volumes (WARNING: This deletes all data)
docker volume rm backend_postgres_data

# Restart and reinitialize
docker-compose up -d
# Then run initialization steps again
```

## Database Migrations

### Create New Migration

```bash
docker-compose exec app flask db migrate -m "Description of changes"
```

### Apply Migrations

```bash
docker-compose exec app flask db upgrade
```

### Rollback Migration

```bash
docker-compose exec app flask db downgrade
```

### View Migration History

```bash
docker-compose exec app flask db history
```

## Troubleshooting

### Container Issues

**Check container status:**
```bash
docker-compose ps
```

**Restart specific service:**
```bash
docker-compose restart app
```

**Rebuild after code changes:**
```bash
docker-compose up --build -d
```

### Database Connection Issues

**Verify database is healthy:**
```bash
docker-compose exec db pg_isready -U parking_user
```

**Check database exists:**
```bash
docker-compose exec db psql -U parking_user -l
```

### Port Conflicts

If ports 80, 5000, 5432, or 5050 are already in use:

1. Stop conflicting services
2. Or modify ports in `docker-compose.yml`:
```yaml
ports:
  - "8080:80"  # Change 80 to 8080
```

### Schema Mismatch Errors

If you see "Unknown field" errors:
1. Ensure your models match the database schema
2. Run migrations: `docker-compose exec app flask db upgrade`
3. Or reinitialize with `init_db.sql`

### Permission Errors

```bash
# Fix file permissions
sudo chown -R $USER:$USER .

# Or run with sudo
sudo docker-compose up -d
```

## Development Workflow

### Making Code Changes

1. Edit files in `app/` directory
2. Changes are reflected immediately (volume mounted)
3. For dependency changes, rebuild:
```bash
docker-compose up --build -d
```

### Adding New Dependencies

1. Add to `app/requirements.txt`
2. Rebuild container:
```bash
docker-compose up --build -d
```

### Database Schema Changes

1. Modify models in `app/models.py`
2. Create migration:
```bash
docker-compose exec app flask db migrate -m "Add new field"
```
3. Review migration in `app/migrations/versions/`
4. Apply migration:
```bash
docker-compose exec app flask db upgrade
```

## Production Deployment

### Environment Variables

Set these in production:

```bash
FLASK_CONFIG=production
SECRET_KEY=<strong-random-key>
DATABASE_URL=<production-db-url>
JWT_SECRET_KEY=<another-strong-key>
```

### Security Checklist

- [ ] Change default passwords
- [ ] Use strong SECRET_KEY
- [ ] Enable HTTPS with SSL certificates
- [ ] Configure CORS properly
- [ ] Set up database backups
- [ ] Enable logging and monitoring
- [ ] Use environment-specific configs
- [ ] Restrict database access
- [ ] Set up firewall rules

### Performance Optimization

- Increase Gunicorn workers: `--workers 4`
- Enable connection pooling
- Add Redis for caching
- Set up CDN for static files
- Configure database indexes
- Enable gzip compression in Nginx

## Stopping the Application

### Stop all services

```bash
docker-compose down
```

### Stop and remove volumes (deletes data)

```bash
docker-compose down -v
```

### Stop specific service

```bash
docker-compose stop app
```

## Project Structure

```
Backend/
├── app/
│   ├── __init__.py                      # Flask app factory
│   ├── models.py                        # SQLAlchemy models
│   ├── auth.py                          # Authentication routes
│   ├── parking.py                       # Parking management routes
│   ├── sessions.py                      # Session management routes
│   ├── vehicles.py                      # Vehicle management routes
│   ├── admin.py                         # Admin routes
│   ├── config.py                        # Configuration classes
│   ├── requirements.txt                 # Python dependencies
│   └── migrations/                      # Database migrations
├── tests/                               # Pytest test files
├── nginx/
│   └── nginx.conf                       # Nginx configuration
├── docker-compose.yml                   # Docker services definition
├── Dockerfile                           # Flask app container
├── COMPLETE_DATABASE_SETUP_FIXED.sql    # Complete database setup
├── DataBaseSeedingInformation.md        # Database seeding guide
├── DB_ERD.md                            # Database ERD documentation
├── USER_APP_REST_API_SPECS.md           # User app API specs
├── ADMIN_APP_REST_API_SPECS.md          # Admin app API specs
├── NEW_APIS_DOCUMENTATION.md            # Latest API documentation
├── POSTMAN_API_TESTING_GUIDE.md         # Postman testing guide
├── TESTING.md                           # Testing documentation
├── CODEBASE_OVERVIEW.md                 # Codebase overview
└── README.md                            # This file
```

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review API documentation at `/apidocs`
3. Check container logs: `docker-compose logs -f`
4. Verify database connection and schema

## License

[Your License Here]
