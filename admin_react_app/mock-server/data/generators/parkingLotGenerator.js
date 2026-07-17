const logger = require('../../utils/logger');

// Realistic data pools for parking lot generation
const PARKING_LOT_NAMES = [
  'Central Plaza Parking', 'Metro Station Parking', 'Shopping Mall Complex', 'Business District Hub',
  'City Center Parking', 'Commercial Tower Parking', 'Hospital Parking Complex', 'Airport Terminal Parking',
  'Railway Station Parking', 'University Campus Parking', 'Sports Complex Parking', 'Convention Center Parking',
  'Tech Park Parking', 'Financial District Parking', 'Residential Complex Parking', 'Market Square Parking',
  'Government Office Parking', 'Hotel Parking Plaza', 'Entertainment District Parking', 'Industrial Area Parking',
  'Multiplex Cinema Parking', 'Corporate Office Parking', 'Medical Center Parking', 'Educational Hub Parking',
  'Tourist Attraction Parking'
];

const AREA_NAMES = [
  'Connaught Place', 'Bandra West', 'Koramangala', 'Hitech City', 'Anna Nagar', 'Salt Lake',
  'Sector 18', 'Vastrapur', 'MI Road', 'Adyar', 'Powai', 'Whitefield', 'Gachibowli',
  'Park Street', 'Cyber City', 'Indiranagar', 'Jubilee Hills', 'Nungambakkam', 'Andheri East',
  'Electronic City', 'Banjara Hills', 'T Nagar', 'Malviya Nagar', 'Sector 62', 'Satellite'
];

const LANDMARKS = [
  'Near Metro Station', 'Opposite Shopping Mall', 'Behind Hospital', 'Next to Bank',
  'Adjacent to Restaurant', 'Close to ATM', 'Near Bus Stop', 'Opposite Office Complex',
  'Behind Hotel', 'Next to Petrol Pump', 'Near Police Station', 'Close to School',
  'Adjacent to Park', 'Opposite Cinema Hall', 'Near Market', 'Close to Temple'
];

const FACILITIES = [
  'CCTV Surveillance', '24/7 Security', 'Covered Parking', 'Valet Service', 'Car Wash',
  'EV Charging Station', 'Disabled Access', 'Restrooms', 'Waiting Area', 'ATM',
  'Food Court', 'Wi-Fi', 'Mobile Charging', 'First Aid', 'Fire Safety', 'Lift Access'
];

const PRICING_MODELS = [
  { type: 'hourly', base_rate: 20, increment: 10 },
  { type: 'hourly', base_rate: 30, increment: 15 },
  { type: 'hourly', base_rate: 25, increment: 12 },
  { type: 'flat', rate: 50, duration: 4 },
  { type: 'flat', rate: 100, duration: 8 },
  { type: 'flat', rate: 150, duration: 12 }
];

class ParkingLotGenerator {
  constructor() {
    this.lotIdCounter = 1;
    this.generatedNames = new Set();
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

  // Generate unique parking lot name
  generateUniqueName() {
    let name;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      name = this.randomChoice(PARKING_LOT_NAMES);
      if (attempts > 0) {
        name += ` ${this.randomChoice(['A', 'B', 'C', 'North', 'South', 'East', 'West'])}`;
      }
      attempts++;
    } while (this.generatedNames.has(name) && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      name = `Parking Lot ${this.lotIdCounter}`;
    }

    this.generatedNames.add(name);
    return name;
  }

  // Generate realistic coordinates for Indian cities
  generateCoordinates(city) {
    const cityCoordinates = {
      'Mumbai': { lat: 19.0760, lng: 72.8777, radius: 0.5 },
      'Delhi': { lat: 28.7041, lng: 77.1025, radius: 0.6 },
      'Bangalore': { lat: 12.9716, lng: 77.5946, radius: 0.4 },
      'Hyderabad': { lat: 17.3850, lng: 78.4867, radius: 0.4 },
      'Chennai': { lat: 13.0827, lng: 80.2707, radius: 0.4 },
      'Kolkata': { lat: 22.5726, lng: 88.3639, radius: 0.3 },
      'Pune': { lat: 18.5204, lng: 73.8567, radius: 0.3 },
      'Ahmedabad': { lat: 23.0225, lng: 72.5714, radius: 0.3 },
      'Jaipur': { lat: 26.9124, lng: 75.7873, radius: 0.3 },
      'Surat': { lat: 21.1702, lng: 72.8311, radius: 0.2 }
    };

    const baseCoords = cityCoordinates[city] || cityCoordinates['Mumbai'];
    
    return {
      latitude: this.randomFloat(
        baseCoords.lat - baseCoords.radius,
        baseCoords.lat + baseCoords.radius,
        6
      ),
      longitude: this.randomFloat(
        baseCoords.lng - baseCoords.radius,
        baseCoords.lng + baseCoords.radius,
        6
      )
    };
  }

  // Generate parking slot configuration
  generateSlotConfiguration(totalSlots) {
    // 70% cars, 30% motorcycles as per requirements
    const carSlots = Math.floor(totalSlots * 0.7);
    const motorcycleSlots = totalSlots - carSlots;
    
    // Further breakdown of car slots
    const regularCarSlots = Math.floor(carSlots * 0.85);
    const compactCarSlots = Math.floor(carSlots * 0.10);
    const disabledCarSlots = Math.floor(carSlots * 0.03);
    const evChargingSlots = carSlots - regularCarSlots - compactCarSlots - disabledCarSlots;
    
    return {
      total_slots: totalSlots,
      car_slots: {
        total: carSlots,
        regular: regularCarSlots,
        compact: compactCarSlots,
        disabled: disabledCarSlots,
        ev_charging: evChargingSlots
      },
      motorcycle_slots: {
        total: motorcycleSlots,
        regular: Math.floor(motorcycleSlots * 0.95),
        disabled: motorcycleSlots - Math.floor(motorcycleSlots * 0.95)
      },
      slot_distribution: {
        ground_floor: Math.floor(totalSlots * 0.4),
        basement_1: Math.floor(totalSlots * 0.3),
        basement_2: Math.floor(totalSlots * 0.2),
        upper_floors: totalSlots - Math.floor(totalSlots * 0.9)
      }
    };
  }

  // Generate operational hours
  generateOperationalHours() {
    const operationTypes = [
      { type: '24/7', hours: { open: '00:00', close: '23:59', is_24_7: true } },
      { type: 'business', hours: { open: '06:00', close: '22:00', is_24_7: false } },
      { type: 'extended', hours: { open: '05:00', close: '23:30', is_24_7: false } },
      { type: 'mall', hours: { open: '09:00', close: '22:30', is_24_7: false } },
      { type: 'office', hours: { open: '07:00', close: '20:00', is_24_7: false } }
    ];

    const operation = this.randomChoice(operationTypes);
    
    return {
      operation_type: operation.type,
      ...operation.hours,
      special_hours: {
        weekend: operation.type === 'office' ? 
          { open: '09:00', close: '18:00' } : 
          operation.hours,
        holiday: operation.type === 'office' ? 
          { open: '10:00', close: '16:00' } : 
          operation.hours
      },
      maintenance_hours: {
        daily: '02:00-04:00',
        weekly: 'Sunday 01:00-05:00'
      }
    };
  }

  // Generate pricing structure
  generatePricingStructure() {
    const model = this.randomChoice(PRICING_MODELS);
    
    const pricing = {
      model_type: model.type,
      currency: 'INR',
      car_pricing: {},
      motorcycle_pricing: {},
      special_rates: {},
      penalties: {
        overstay_per_hour: this.randomInt(50, 100),
        lost_ticket: this.randomInt(200, 500),
        damage_deposit: this.randomInt(1000, 5000)
      }
    };

    if (model.type === 'hourly') {
      pricing.car_pricing = {
        first_hour: model.base_rate,
        additional_hour: model.increment,
        daily_max: model.base_rate + (model.increment * 10),
        monthly_pass: (model.base_rate + model.increment * 5) * 30 * 0.7 // 30% discount
      };
      
      pricing.motorcycle_pricing = {
        first_hour: Math.floor(model.base_rate * 0.6),
        additional_hour: Math.floor(model.increment * 0.6),
        daily_max: Math.floor((model.base_rate + (model.increment * 10)) * 0.6),
        monthly_pass: Math.floor(pricing.car_pricing.monthly_pass * 0.6)
      };
    } else {
      pricing.car_pricing = {
        flat_rate: model.rate,
        duration_hours: model.duration,
        daily_max: model.rate * 2,
        monthly_pass: model.rate * 25 // Assuming 25 working days
      };
      
      pricing.motorcycle_pricing = {
        flat_rate: Math.floor(model.rate * 0.6),
        duration_hours: model.duration,
        daily_max: Math.floor(model.rate * 2 * 0.6),
        monthly_pass: Math.floor(pricing.car_pricing.monthly_pass * 0.6)
      };
    }

    // Special rates
    pricing.special_rates = {
      weekend_multiplier: this.randomFloat(1.0, 1.5),
      peak_hour_multiplier: this.randomFloat(1.2, 1.8),
      off_peak_discount: this.randomFloat(0.7, 0.9),
      senior_citizen_discount: 0.8,
      student_discount: 0.85,
      employee_discount: 0.7
    };

    return pricing;
  }

  // Generate contact information
  generateContactInfo(city) {
    const phonePrefix = this.randomChoice(['9', '8', '7']);
    const phoneNumber = phonePrefix + Array.from({ length: 9 }, () => this.randomInt(0, 9)).join('');
    
    return {
      phone: phoneNumber,
      email: `parking.${this.lotIdCounter}@parkingmanagement.com`,
      emergency_contact: {
        phone: '9' + Array.from({ length: 9 }, () => this.randomInt(0, 9)).join(''),
        available_24_7: true
      },
      manager: {
        name: `Manager ${this.lotIdCounter}`,
        phone: '9' + Array.from({ length: 9 }, () => this.randomInt(0, 9)).join(''),
        email: `manager.${this.lotIdCounter}@parkingmanagement.com`
      },
      customer_service: {
        phone: '1800-PARKING',
        email: 'support@parkingmanagement.com',
        hours: '09:00-18:00'
      }
    };
  }

  // Generate facilities and amenities
  generateFacilities() {
    const numFacilities = this.randomInt(4, 8);
    const selectedFacilities = [];
    const availableFacilities = [...FACILITIES];
    
    // Ensure essential facilities
    const essentialFacilities = ['CCTV Surveillance', '24/7 Security'];
    essentialFacilities.forEach(facility => {
      selectedFacilities.push(facility);
      const index = availableFacilities.indexOf(facility);
      if (index > -1) availableFacilities.splice(index, 1);
    });
    
    // Add random facilities
    for (let i = selectedFacilities.length; i < numFacilities; i++) {
      if (availableFacilities.length === 0) break;
      const facility = this.randomChoice(availableFacilities);
      selectedFacilities.push(facility);
      const index = availableFacilities.indexOf(facility);
      availableFacilities.splice(index, 1);
    }
    
    return {
      available_facilities: selectedFacilities,
      accessibility: {
        wheelchair_accessible: Math.random() > 0.2, // 80% accessible
        elevator_access: Math.random() > 0.3, // 70% have elevators
        disabled_parking: true, // All have disabled parking
        ramp_access: Math.random() > 0.1 // 90% have ramps
      },
      security: {
        cctv_cameras: this.randomInt(8, 24),
        security_guards: this.randomInt(1, 4),
        emergency_buttons: this.randomInt(2, 6),
        lighting_quality: this.randomChoice(['excellent', 'good', 'average'])
      },
      technology: {
        automated_entry: Math.random() > 0.4, // 60% automated
        mobile_app_support: Math.random() > 0.3, // 70% app support
        online_booking: Math.random() > 0.5, // 50% online booking
        digital_payment: Math.random() > 0.1 // 90% digital payment
      }
    };
  }

  // Generate parking lot statistics
  generateStatistics() {
    const avgOccupancy = this.randomFloat(0.6, 0.9); // 60-90% average occupancy
    
    return {
      average_occupancy: avgOccupancy,
      peak_occupancy: Math.min(avgOccupancy + this.randomFloat(0.1, 0.2), 1.0),
      off_peak_occupancy: Math.max(avgOccupancy - this.randomFloat(0.2, 0.4), 0.1),
      daily_turnover: this.randomFloat(2.5, 5.0), // Average times a slot is used per day
      average_duration: this.randomFloat(1.5, 4.0), // Average parking duration in hours
      monthly_revenue: this.randomInt(50000, 500000),
      customer_satisfaction: this.randomFloat(3.5, 4.8),
      incidents_per_month: this.randomInt(0, 5),
      maintenance_score: this.randomFloat(7.0, 9.5)
    };
  }

  // Generate a complete parking lot
  generateParkingLot(city = null) {
    const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat'];
    const selectedCity = city || this.randomChoice(cities);
    const totalSlots = this.randomInt(20, 100); // 20-100 slots as per requirements
    const coordinates = this.generateCoordinates(selectedCity);
    const slotConfig = this.generateSlotConfiguration(totalSlots);
    const operationalHours = this.generateOperationalHours();
    const pricing = this.generatePricingStructure();
    const contactInfo = this.generateContactInfo(selectedCity);
    const facilities = this.generateFacilities();
    const statistics = this.generateStatistics();

    const parkingLot = {
      parkinglot_id: this.lotIdCounter++,
      parkinglot_name: this.generateUniqueName(),
      location: {
        address: `${this.randomChoice(AREA_NAMES)}, ${selectedCity}`,
        city: selectedCity,
        state: this.getStateForCity(selectedCity),
        pincode: this.randomInt(100000, 999999).toString(),
        landmark: this.randomChoice(LANDMARKS),
        coordinates: coordinates,
        area_type: this.randomChoice(['commercial', 'residential', 'mixed', 'industrial', 'institutional'])
      },
      
      // Slot configuration
      ...slotConfig,
      
      // Operational details
      operational_hours: operationalHours,
      pricing_structure: pricing,
      
      // Contact and management
      contact_info: contactInfo,
      
      // Facilities and amenities
      facilities: facilities,
      
      // Performance statistics
      statistics: statistics,
      
      // Status and metadata
      status: this.randomChoice(['active', 'active', 'active', 'maintenance']), // 75% active
      created_at: this.generateRandomDate(365), // Created within last year
      updated_at: new Date().toISOString(),
      last_inspection: this.generateRandomDate(30), // Inspected within last month
      next_maintenance: this.generateFutureDate(30, 90), // Maintenance in 30-90 days
      
      // Compliance and certifications
      compliance: {
        fire_safety_certified: true,
        environmental_clearance: Math.random() > 0.1, // 90% have clearance
        building_permit: true,
        tax_compliance: Math.random() > 0.05, // 95% tax compliant
        insurance_valid: Math.random() > 0.02 // 98% insured
      },
      
      // Integration details
      integration: {
        payment_gateway: this.randomChoice(['Razorpay', 'PayU', 'CCAvenue', 'Paytm']),
        pos_system: this.randomChoice(['Square', 'Clover', 'Toast', 'Custom']),
        access_control: this.randomChoice(['RFID', 'Barcode', 'QR Code', 'License Plate']),
        monitoring_system: 'Integrated CCTV & Sensors'
      }
    };

    return parkingLot;
  }

  // Get state for city
  getStateForCity(city) {
    const cityStateMap = {
      'Mumbai': 'Maharashtra', 'Pune': 'Maharashtra',
      'Delhi': 'Delhi',
      'Bangalore': 'Karnataka',
      'Hyderabad': 'Telangana',
      'Chennai': 'Tamil Nadu',
      'Kolkata': 'West Bengal',
      'Ahmedabad': 'Gujarat', 'Surat': 'Gujarat',
      'Jaipur': 'Rajasthan'
    };
    return cityStateMap[city] || 'Maharashtra';
  }

  // Generate random date within specified days ago
  generateRandomDate(daysAgo) {
    const now = new Date();
    const pastDate = new Date(now.getTime() - (Math.random() * daysAgo * 24 * 60 * 60 * 1000));
    return pastDate.toISOString();
  }

  // Generate future date
  generateFutureDate(minDays, maxDays) {
    const now = new Date();
    const futureDays = this.randomInt(minDays, maxDays);
    const futureDate = new Date(now.getTime() + (futureDays * 24 * 60 * 60 * 1000));
    return futureDate.toISOString();
  }

  // Generate multiple parking lots
  generateMultipleParkingLots(count = 25) {
    logger.data('Starting parking lot generation', { targetCount: count });
    
    const parkingLots = [];
    const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat'];
    
    // Distribute lots across cities
    const lotsPerCity = Math.floor(count / cities.length);
    const remainingLots = count % cities.length;
    
    cities.forEach((city, index) => {
      const cityLotCount = lotsPerCity + (index < remainingLots ? 1 : 0);
      
      for (let i = 0; i < cityLotCount; i++) {
        const lot = this.generateParkingLot(city);
        parkingLots.push(lot);
        
        if (parkingLots.length % 5 === 0) {
          logger.data('Parking lot generation progress', {
            completed: parkingLots.length,
            target: count,
            percentage: Math.round((parkingLots.length / count) * 100)
          });
        }
      }
    });
    
    logger.data('Parking lot generation completed', {
      totalGenerated: parkingLots.length,
      cityDistribution: this.getCityDistribution(parkingLots),
      capacityRange: this.getCapacityStats(parkingLots)
    });
    
    return parkingLots;
  }

  // Get city distribution statistics
  getCityDistribution(parkingLots) {
    const distribution = {};
    parkingLots.forEach(lot => {
      const city = lot.location.city;
      distribution[city] = (distribution[city] || 0) + 1;
    });
    return distribution;
  }

  // Get capacity statistics
  getCapacityStats(parkingLots) {
    const capacities = parkingLots.map(lot => lot.total_slots);
    return {
      min: Math.min(...capacities),
      max: Math.max(...capacities),
      average: Math.round(capacities.reduce((sum, cap) => sum + cap, 0) / capacities.length),
      total: capacities.reduce((sum, cap) => sum + cap, 0)
    };
  }

  // Reset generator
  reset() {
    this.lotIdCounter = 1;
    this.generatedNames.clear();
  }
}

module.exports = ParkingLotGenerator;