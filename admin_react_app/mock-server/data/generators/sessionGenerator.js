const logger = require('../../utils/logger');

class SessionGenerator {
  constructor() {
    this.sessionIdCounter = 1;
    this.ticketIdCounter = 1;
    this.generatedSessions = [];
    this.activeSessions = [];
  }

  // Generate a random element from array
  randomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  // Generate random number between min and max (inclusive)
  randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Generate random float between min and max
  randomFloat(min, max, decimals = 2) {
    return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
  }

  // Generate ticket ID
  generateTicketId() {
    return `TKT-${String(this.ticketIdCounter++).padStart(6, '0')}`;
  }

  // Generate session duration based on realistic patterns
  generateSessionDuration() {
    // Realistic distribution: 30 minutes to 8 hours, average 2.5 hours
    const patterns = [
      { weight: 0.15, min: 0.5, max: 1.0 },    // 15% short stays (30min-1hr)
      { weight: 0.35, min: 1.0, max: 2.5 },    // 35% medium stays (1-2.5hrs)
      { weight: 0.30, min: 2.5, max: 4.0 },    // 30% long stays (2.5-4hrs)
      { weight: 0.15, min: 4.0, max: 6.0 },    // 15% extended stays (4-6hrs)
      { weight: 0.05, min: 6.0, max: 8.0 }     // 5% very long stays (6-8hrs)
    ];

    const random = Math.random();
    let cumulativeWeight = 0;

    for (const pattern of patterns) {
      cumulativeWeight += pattern.weight;
      if (random <= cumulativeWeight) {
        return this.randomFloat(pattern.min, pattern.max, 2);
      }
    }

    // Fallback
    return this.randomFloat(1.0, 4.0, 2);
  }

  // Generate realistic start time based on business hours and patterns
  generateStartTime(date, isWeekend = false) {
    // Business hours: 6 AM - 11 PM with peak activity patterns
    const peakHours = isWeekend ? 
      [10, 11, 12, 13, 14, 15, 16, 17, 18, 19] : // Weekend: 10 AM - 7 PM
      [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]; // Weekday: 8 AM - 6 PM

    let hour;
    if (Math.random() < 0.7) { // 70% during peak hours
      hour = this.randomChoice(peakHours);
    } else { // 30% during off-peak hours
      const offPeakHours = [6, 7, 19, 20, 21, 22, 23];
      hour = this.randomChoice(offPeakHours);
    }

    const minute = this.randomChoice([0, 15, 30, 45]); // Quarter-hour intervals
    const second = 0;

    const startTime = new Date(date);
    startTime.setHours(hour, minute, second, 0);
    
    return startTime;
  }

  // Calculate pricing based on parking lot pricing structure and duration
  calculateSessionPrice(parkingLot, vehicleType, durationHours) {
    const pricing = parkingLot.pricing_structure;
    const vehiclePricing = vehicleType === 'car' ? pricing.car_pricing : pricing.motorcycle_pricing;
    
    let totalAmount = 0;

    if (pricing.model_type === 'hourly') {
      // First hour + additional hours
      totalAmount = vehiclePricing.first_hour;
      
      if (durationHours > 1) {
        const additionalHours = Math.ceil(durationHours - 1);
        totalAmount += additionalHours * vehiclePricing.additional_hour;
      }
      
      // Apply daily maximum if applicable
      if (totalAmount > vehiclePricing.daily_max) {
        totalAmount = vehiclePricing.daily_max;
      }
    } else {
      // Flat rate pricing
      const slots = Math.ceil(durationHours / vehiclePricing.duration_hours);
      totalAmount = slots * vehiclePricing.flat_rate;
      
      // Apply daily maximum if applicable
      if (totalAmount > vehiclePricing.daily_max) {
        totalAmount = vehiclePricing.daily_max;
      }
    }

    // Apply special rates
    const startTime = new Date();
    const isWeekend = startTime.getDay() === 0 || startTime.getDay() === 6;
    const isPeakHour = startTime.getHours() >= 8 && startTime.getHours() <= 18;

    if (isWeekend) {
      totalAmount *= pricing.special_rates.weekend_multiplier;
    }

    if (isPeakHour && !isWeekend) {
      totalAmount *= pricing.special_rates.peak_hour_multiplier;
    }

    return Math.round(totalAmount * 100) / 100; // Round to 2 decimal places
  }

  // Generate payment status based on realistic distribution
  generatePaymentStatus() {
    const random = Math.random();
    
    if (random < 0.95) return 'success';    // 95% success
    if (random < 0.99) return 'pending';    // 4% pending
    return 'failed';                        // 1% failed
  }

  // Generate a single parking session
  generateSession(date, parkingLots, users, isActive = false) {
    const parkingLot = this.randomChoice(parkingLots);
    const user = this.randomChoice(users);
    
    // Select vehicle type based on 70% cars, 30% motorcycles
    const vehicleType = Math.random() < 0.7 ? 'car' : 'motorcycle';
    
    // Get user's vehicle of the selected type
    const userVehicles = user.vehicle_info.filter(v => v.type === vehicleType);
    const vehicle = userVehicles.length > 0 ? 
      this.randomChoice(userVehicles) : 
      user.vehicle_info[0]; // Fallback to first vehicle

    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const startTime = this.generateStartTime(date, isWeekend);
    
    let endTime = null;
    let durationHours = null;
    let sessionStatus = 'active';

    if (!isActive) {
      // Completed session
      durationHours = this.generateSessionDuration();
      endTime = new Date(startTime.getTime() + (durationHours * 60 * 60 * 1000));
      sessionStatus = 'completed';
    }

    // Calculate pricing
    const calculatedDuration = durationHours || this.randomFloat(0.5, 2.0); // Estimate for active sessions
    const totalAmount = this.calculateSessionPrice(parkingLot, vehicleType, calculatedDuration);
    
    // Generate payment information
    const paymentStatus = isActive ? 'pending' : this.generatePaymentStatus();
    const paymentMethod = this.randomChoice(['upi', 'card', 'wallet', 'cash']);

    const session = {
      session_id: this.sessionIdCounter++,
      ticket_id: this.generateTicketId(),
      parkinglot_id: parkingLot.parkinglot_id,
      parkinglot_name: parkingLot.parkinglot_name,
      user_id: user.user_id,
      user_name: user.user_name,
      user_email: user.user_email,
      user_phone: user.user_phone,
      vehicle_reg_no: vehicle.registration_number,
      vehicle_type: vehicleType,
      vehicle_brand: vehicle.brand,
      vehicle_model: vehicle.model,
      slot_id: this.randomInt(1, parkingLot.total_slots),
      slot_type: vehicleType === 'car' ? 'car_regular' : 'motorcycle_regular',
      start_time: startTime.toISOString(),
      end_time: endTime ? endTime.toISOString() : null,
      duration_hrs: durationHours,
      session_status: sessionStatus,
      
      // Pricing and payment information
      pricing_model: parkingLot.pricing_structure.model_type,
      base_rate: vehicleType === 'car' ? 
        parkingLot.pricing_structure.car_pricing.first_hour || parkingLot.pricing_structure.car_pricing.flat_rate :
        parkingLot.pricing_structure.motorcycle_pricing.first_hour || parkingLot.pricing_structure.motorcycle_pricing.flat_rate,
      total_amount: totalAmount,
      payment_status: paymentStatus,
      payment_method: paymentMethod,
      payment_timestamp: endTime ? endTime.toISOString() : null,
      
      // Location and administrative information
      location: {
        city: parkingLot.location.city,
        area: parkingLot.location.address,
        coordinates: parkingLot.location.coordinates
      },
      
      // Session metadata
      created_at: startTime.toISOString(),
      updated_at: endTime ? endTime.toISOString() : new Date().toISOString(),
      
      // Additional tracking information
      entry_method: this.randomChoice(['manual', 'qr_code', 'rfid', 'license_plate']),
      exit_method: endTime ? this.randomChoice(['manual', 'qr_code', 'rfid', 'license_plate']) : null,
      admin_notes: Math.random() > 0.9 ? this.generateAdminNote() : null,
      
      // Business metrics
      is_peak_hour: this.isPeakHour(startTime, isWeekend),
      is_weekend: isWeekend,
      weather_condition: this.randomChoice(['clear', 'cloudy', 'rainy', 'sunny']),
      occupancy_at_entry: this.randomFloat(0.3, 0.9)
    };

    return session;
  }

  // Check if time is during peak hours
  isPeakHour(dateTime, isWeekend) {
    const hour = dateTime.getHours();
    
    if (isWeekend) {
      return hour >= 10 && hour <= 19; // Weekend peak: 10 AM - 7 PM
    } else {
      return hour >= 8 && hour <= 18;  // Weekday peak: 8 AM - 6 PM
    }
  }

  // Generate admin notes for special cases
  generateAdminNote() {
    const notes = [
      'Vehicle parked in disabled slot',
      'Payment processed manually',
      'Customer requested assistance',
      'Slot changed due to maintenance',
      'Extended stay approved',
      'VIP customer service',
      'Damage reported on exit',
      'Lost ticket - manual verification'
    ];
    
    return this.randomChoice(notes);
  }

  // Generate sessions for a specific date
  generateSessionsForDate(date, parkingLots, users, targetSessions) {
    const sessions = [];
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    
    // Adjust session count based on day type
    const sessionMultiplier = isWeekend ? 0.7 : 1.0; // 30% fewer sessions on weekends
    const actualTargetSessions = Math.round(targetSessions * sessionMultiplier);
    
    for (let i = 0; i < actualTargetSessions; i++) {
      const session = this.generateSession(date, parkingLots, users, false);
      sessions.push(session);
    }
    
    return sessions;
  }

  // Generate 3-month comprehensive session data
  generate3MonthSessions(parkingLots, users) {
    logger.data('Starting 3-month session data generation');
    
    const sessions = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90); // 90 days ago
    
    const endDate = new Date();
    const totalDays = 90;
    const targetTotalSessions = 15000; // ~15,000 sessions over 90 days
    const avgSessionsPerDay = Math.round(targetTotalSessions / totalDays); // ~167 sessions/day
    
    logger.data('Session generation parameters', {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      totalDays,
      targetTotalSessions,
      avgSessionsPerDay,
      parkingLots: parkingLots.length,
      users: users.length
    });
    
    // Generate sessions for each day
    for (let day = 0; day < totalDays; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);
      
      // Vary daily session count (150-200 sessions/day as per requirements)
      const dailyVariation = this.randomFloat(0.8, 1.2); // ±20% variation
      const dailySessions = Math.round(avgSessionsPerDay * dailyVariation);
      const actualDailySessions = Math.max(150, Math.min(200, dailySessions));
      
      const daySessions = this.generateSessionsForDate(
        currentDate, 
        parkingLots, 
        users, 
        actualDailySessions
      );
      
      sessions.push(...daySessions);
      
      // Log progress every 10 days
      if ((day + 1) % 10 === 0) {
        logger.data('Session generation progress', {
          daysCompleted: day + 1,
          totalDays,
          sessionsGenerated: sessions.length,
          percentage: Math.round(((day + 1) / totalDays) * 100)
        });
      }
    }
    
    // Generate 20-30 active sessions for live testing
    const activeSessions = this.generateActiveSessions(parkingLots, users);
    sessions.push(...activeSessions);
    
    this.generatedSessions = sessions;
    this.activeSessions = activeSessions;
    
    logger.data('3-month session generation completed', {
      totalSessions: sessions.length,
      activeSessions: activeSessions.length,
      completedSessions: sessions.length - activeSessions.length,
      dateRange: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      }
    });
    
    return sessions;
  }

  // Generate 20-30 active sessions for live testing
  generateActiveSessions(parkingLots, users) {
    const activeCount = this.randomInt(20, 30);
    const activeSessions = [];
    
    logger.data('Generating active sessions for live testing', { targetCount: activeCount });
    
    for (let i = 0; i < activeCount; i++) {
      // Generate active sessions with start times in the last 8 hours
      const now = new Date();
      const startTime = new Date(now.getTime() - (Math.random() * 8 * 60 * 60 * 1000));
      
      const session = this.generateSession(startTime, parkingLots, users, true);
      activeSessions.push(session);
    }
    
    return activeSessions;
  }

  // Get session statistics
  getSessionStatistics() {
    if (this.generatedSessions.length === 0) {
      return null;
    }

    const stats = {
      totalSessions: this.generatedSessions.length,
      activeSessions: this.activeSessions.length,
      completedSessions: this.generatedSessions.length - this.activeSessions.length,
      
      // Vehicle type distribution
      vehicleTypeDistribution: this.getVehicleTypeDistribution(),
      
      // Payment status distribution
      paymentStatusDistribution: this.getPaymentStatusDistribution(),
      
      // Duration statistics
      durationStats: this.getDurationStatistics(),
      
      // Revenue statistics
      revenueStats: this.getRevenueStatistics(),
      
      // Peak hour analysis
      peakHourAnalysis: this.getPeakHourAnalysis(),
      
      // Weekend vs weekday analysis
      dayTypeAnalysis: this.getDayTypeAnalysis()
    };

    return stats;
  }

  // Get vehicle type distribution
  getVehicleTypeDistribution() {
    const distribution = { car: 0, motorcycle: 0 };
    
    this.generatedSessions.forEach(session => {
      distribution[session.vehicle_type]++;
    });
    
    const total = distribution.car + distribution.motorcycle;
    return {
      car: { count: distribution.car, percentage: Math.round((distribution.car / total) * 100) },
      motorcycle: { count: distribution.motorcycle, percentage: Math.round((distribution.motorcycle / total) * 100) }
    };
  }

  // Get payment status distribution
  getPaymentStatusDistribution() {
    const distribution = { success: 0, pending: 0, failed: 0 };
    
    this.generatedSessions.forEach(session => {
      distribution[session.payment_status]++;
    });
    
    return distribution;
  }

  // Get duration statistics
  getDurationStatistics() {
    const completedSessions = this.generatedSessions.filter(s => s.duration_hrs !== null);
    
    if (completedSessions.length === 0) return null;
    
    const durations = completedSessions.map(s => s.duration_hrs);
    durations.sort((a, b) => a - b);
    
    return {
      min: Math.min(...durations),
      max: Math.max(...durations),
      average: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      median: durations[Math.floor(durations.length / 2)],
      totalSessions: completedSessions.length
    };
  }

  // Get revenue statistics
  getRevenueStatistics() {
    const paidSessions = this.generatedSessions.filter(s => s.payment_status === 'success');
    
    if (paidSessions.length === 0) return null;
    
    const totalRevenue = paidSessions.reduce((sum, s) => sum + s.total_amount, 0);
    const averageAmount = totalRevenue / paidSessions.length;
    
    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      averageAmount: Math.round(averageAmount * 100) / 100,
      paidSessions: paidSessions.length,
      pendingRevenue: this.generatedSessions
        .filter(s => s.payment_status === 'pending')
        .reduce((sum, s) => sum + s.total_amount, 0)
    };
  }

  // Get peak hour analysis
  getPeakHourAnalysis() {
    const peakHourSessions = this.generatedSessions.filter(s => s.is_peak_hour);
    const offPeakSessions = this.generatedSessions.filter(s => !s.is_peak_hour);
    
    return {
      peakHour: {
        count: peakHourSessions.length,
        percentage: Math.round((peakHourSessions.length / this.generatedSessions.length) * 100)
      },
      offPeak: {
        count: offPeakSessions.length,
        percentage: Math.round((offPeakSessions.length / this.generatedSessions.length) * 100)
      }
    };
  }

  // Get day type analysis
  getDayTypeAnalysis() {
    const weekendSessions = this.generatedSessions.filter(s => s.is_weekend);
    const weekdaySessions = this.generatedSessions.filter(s => !s.is_weekend);
    
    return {
      weekend: {
        count: weekendSessions.length,
        percentage: Math.round((weekendSessions.length / this.generatedSessions.length) * 100)
      },
      weekday: {
        count: weekdaySessions.length,
        percentage: Math.round((weekdaySessions.length / this.generatedSessions.length) * 100)
      }
    };
  }

  // Reset generator
  reset() {
    this.sessionIdCounter = 1;
    this.ticketIdCounter = 1;
    this.generatedSessions = [];
    this.activeSessions = [];
  }
}

module.exports = SessionGenerator;