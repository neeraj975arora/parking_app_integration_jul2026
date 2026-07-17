# Integration Examples

## Overview

This document provides practical examples of integrating with the Parking Admin Mock Server API using various technologies and frameworks.

## React Integration Examples

### 1. Authentication Service

```javascript
// services/authService.js
class AuthService {
  static baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  
  static async login(email, password, role) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_email: email,
        user_password: password,
        role: role
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }
    
    const data = await response.json();
    localStorage.setItem('jwt_token', data.access_token);
    localStorage.setItem('user_data', JSON.stringify(data.user));
    
    return data;
  }
  
  static getToken() {
    return localStorage.getItem('jwt_token');
  }
  
  static getUser() {
    const userData = localStorage.getItem('user_data');
    return userData ? JSON.parse(userData) : null;
  }
  
  static logout() {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_data');
  }
  
  static isAuthenticated() {
    const token = this.getToken();
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp > Date.now() / 1000;
    } catch {
      return false;
    }
  }
}
```

### 2. API Service with Error Handling

```javascript
// services/apiService.js
class ApiService {
  static baseURL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
  
  static async request(endpoint, options = {}) {
    const token = AuthService.getToken();
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      }
    };
    
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      if (response.status === 401) {
        AuthService.logout();
        window.location.href = '/login';
        return;
      }
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new ApiError(data, response.status);
      }
      
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new Error('Network error occurred');
    }
  }
  
  // Admin Management
  static async getAllAdmins(page = 1, limit = 20) {
    return this.request(`/admins/admin_lots/all?page=${page}&limit=${limit}`);
  }
  
  static async createAdmin(adminData) {
    return this.request('/admin/assign_lot', {
      method: 'POST',
      body: JSON.stringify(adminData)
    });
  }
  
  // Session Management
  static async getAllSessions(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/admin/sessions/details/all?${params}`);
  }
  
  static async checkinVehicle(checkinData) {
    return this.request('/admin/session/checkin', {
      method: 'POST',
      body: JSON.stringify(checkinData)
    });
  }
  
  static async checkoutVehicle(checkoutData) {
    return this.request('/admin/session/checkout', {
      method: 'POST',
      body: JSON.stringify(checkoutData)
    });
  }
}

class ApiError extends Error {
  constructor(errorData, statusCode) {
    super(errorData.error || 'API Error');
    this.name = 'ApiError';
    this.errorCode = errorData.errorCode;
    this.statusCode = statusCode;
    this.details = errorData.details;
  }
}
```