# Technology Stack & Build Systems

## Frontend Technologies

### Admin React App
- **Framework**: React 19.1.0 with Vite 7.0.4
- **Styling**: Tailwind CSS 4.1.11
- **Charts**: Recharts 3.1.2
- **HTTP Client**: Axios 1.11.0
- **Routing**: React Router DOM 7.7.1
- **Testing**: Playwright for E2E testing

### Android App (Vision-Parking)
- **Language**: Java/Kotlin
- **Build System**: Gradle with Kotlin DSL
- **Target SDK**: 35, Min SDK: 24
- **Maps**: Google Maps SDK, Google Places API
- **HTTP Client**: Retrofit 2.9.0 with Gson converter
- **Location Services**: Google Play Services Location 21.0.1

## Backend Technologies

### Main Backend (Flask)
- **Framework**: Flask 3.0.3 with Gunicorn 22.0.0
- **Database**: PostgreSQL 17 with SQLAlchemy 2.0.30
- **Authentication**: JWT with Flask-JWT-Extended 4.5.3
- **API Documentation**: Flasgger (Swagger UI)
- **Migrations**: Flask-Migrate 4.0.7
- **Testing**: Pytest with coverage and HTML reports
- **Containerization**: Docker with docker-compose

### ML Service (Parking-Server)
- **Framework**: Flask
- **ML/AI**: YOLOv8 (Ultralytics), OpenCV, PyTorch
- **Computer Vision**: Vehicle detection and parking spot analysis
- **Data Processing**: NumPy, Pandas

## Common Build Commands

### Admin React App
```bash
cd admin_react_app
npm install          # Install dependencies
npm run dev          # Development server
npm run build        # Production build
npm run test         # Run Playwright tests
npm run test:headed  # Run tests with browser UI
```

### Backend
```bash
cd Backend
docker-compose up --build -d    # Start all services
docker-compose exec app pytest  # Run tests
docker-compose logs -f app      # View logs
docker-compose down             # Stop services

# Database operations
docker-compose exec app flask db migrate -m "message"
docker-compose exec app flask db upgrade
```

### Android App
```bash
cd Vision-Parking
./gradlew assembleDebug    # Build debug APK
./gradlew test            # Run unit tests
./gradlew connectedAndroidTest  # Run instrumented tests

# Install to device/emulator
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### ML Service
```bash
cd Parking-Server
pip install ultralytics opencv-python torch numpy pandas
python app.py  # Start detection service
```

## Environment Configuration

- **Backend**: Uses `.env` files and docker-compose environment variables
- **Android**: API keys in `local.properties`, build variants for debug/release URLs
- **React**: Vite handles environment variables with `VITE_` prefix
- **ML Service**: Model files (`best.pt`) and parking spot coordinates (`parking_spots.json`)

## Testing Strategy

- **Unit Tests**: Pytest (Backend), JUnit (Android)
- **Integration Tests**: Docker-based E2E tests (Backend)
- **E2E Tests**: Playwright (React Admin), Appium (Android)
- **API Testing**: Swagger UI for manual testing, automated via pytest