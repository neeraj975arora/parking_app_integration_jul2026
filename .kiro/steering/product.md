# Smart Parking System

## Product Overview

A comprehensive smart parking management system that combines mobile apps, web dashboards, and AI-powered vehicle detection to optimize parking operations.

## Core Components

- **Vision-Parking**: Android mobile app for end users to find and book parking spots
- **Admin React App**: Web dashboard for parking lot administrators to manage operations, view analytics, and handle payments
- **Backend**: Flask-based REST API server with PostgreSQL database for core business logic
- **Parking-Server**: ML-powered service using YOLOv8 for real-time vehicle detection and parking spot occupancy analysis

## Key Features

- Real-time parking spot availability tracking
- Vehicle session management (check-in/check-out)
- Payment processing and daily closure reports
- Role-based access control (users, admins, super admins)
- Google Maps integration for location services
- AI-powered vehicle detection using computer vision
- Multi-platform support (Android mobile, web dashboard)

## Target Users

- **End Users**: Drivers looking for parking spots via mobile app
- **Parking Lot Admins**: Operators managing day-to-day parking operations
- **Super Admins**: System administrators with full access across multiple parking lots