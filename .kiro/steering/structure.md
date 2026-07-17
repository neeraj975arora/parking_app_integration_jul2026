# Project Organization & Structure

## Monorepo Architecture

This project follows a **monorepo strategy** where all components are organized in a single repository with clear separation of concerns.

## Root Level Structure

```
parking_app_integration/
├── admin_react_app/           # React admin dashboard
├── Backend/                   # Flask API server
├── Vision-Parking/            # Android user app
├── Parking-Server/            # ML detection service
├── REST_API_Specs/           # API documentation
├── .github/workflows/        # CI/CD pipelines
└── .kiro/                    # Kiro configuration
```

## Component Details

### Admin React App (`admin_react_app/`)
```
admin_react_app/
├── src/                      # React source code
├── public/                   # Static assets
├── tests/                    # Playwright E2E tests
├── dist/                     # Build output
├── package.json              # Dependencies and scripts
├── vite.config.js           # Vite configuration
└── playwright.config.ci.js   # Test configuration
```

### Backend (`Backend/`)
```
Backend/
├── app/                      # Flask application code
│   ├── models/              # SQLAlchemy models
│   ├── routes/              # API endpoints
│   ├── schemas/             # Marshmallow schemas
│   └── requirements.txt     # Python dependencies
├── tests/                   # Pytest test files
├── migrations/              # Database migrations
├── nginx/                   # Nginx configuration
├── docker-compose.yml       # Container orchestration
├── Dockerfile              # Container definition
└── init_db.sql             # Database initialization
```

### Android App (`Vision-Parking/`)
```
Vision-Parking/
├── app/
│   ├── src/main/java/       # Java/Kotlin source
│   ├── src/main/res/        # Android resources
│   └── build.gradle.kts     # App-level build config
├── tests/                   # Appium E2E tests
├── build.gradle.kts         # Project-level build config
├── local.properties         # API keys and local config
└── gradle/                  # Gradle wrapper
```

### ML Service (`Parking-Server/`)
```
Parking-Server/
├── app.py                   # Main Flask application
├── detect_parking_occupancy.py  # YOLO detection logic
├── get_parking_spot.py      # OpenCV spot detection
├── best.pt                  # Trained YOLO model
├── parking_spots.json       # Parking spot coordinates
├── static/                  # Output images
└── templates/               # HTML templates
```

## Naming Conventions

### Branch Naming
- Prefix with component: `backend/feature-name`, `android_user_app/fix-bug`
- Use kebab-case for feature names
- Examples: `react_admin_app/add-payment-dashboard`, `ml/improve-detection-model`

### Commit Messages
- Start with component prefix: `backend: add parking endpoint`
- Use imperative mood: "add", "fix", "update"
- Keep under 50 characters for the subject line

### File Organization
- **Models**: Database models in `Backend/app/models/`
- **API Routes**: Grouped by feature in `Backend/app/routes/`
- **Tests**: Mirror source structure in respective `tests/` directories
- **Documentation**: Component-specific READMEs in each folder
- **Shared Specs**: Centralized in `REST_API_Specs/`

## Configuration Management

### Environment Files
- **Backend**: `.env` files for database and API configuration
- **Android**: `local.properties` for API keys and build variants
- **React**: Vite environment variables with `VITE_` prefix

### Build Configurations
- **Docker**: `docker-compose.yml` for backend services
- **Android**: Gradle build variants for debug/release
- **React**: Vite config for development/production builds

## CI/CD Structure

### GitHub Actions (`/.github/workflows/`)
- **Conditional triggers**: Only run workflows when relevant paths change
- **Component-specific**: `backend-ci.yml`, `android-e2e.yml`, `admin-app-ci.yml`
- **Integration tests**: Full E2E tests when multiple components change

### Path-based Triggers
- `Backend/**` → Backend CI
- `Vision-Parking/**` → Android E2E tests
- `admin_react_app/**` → React app CI
- Multiple paths → Full integration tests

## Development Workflow

1. **Work from monorepo root** for all git operations
2. **Create feature branches** with component prefixes
3. **Stage changes carefully** using `git add <specific-paths>`
4. **Run component-specific tests** before pushing
5. **Use component READMEs** for setup and development instructions