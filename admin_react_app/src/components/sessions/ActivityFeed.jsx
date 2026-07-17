import React, { useState, useEffect } from 'react';
import { USER_ROLES } from '../../utils/constants';

const ActivityFeed = ({ user, activities = [], onActivityUpdate }) => {
  const [realtimeActivities, setRealtimeActivities] = useState(activities);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate new activity every 30 seconds
      if (Math.random() > 0.7) {
        const newActivity = generateRandomActivity(user);
        setRealtimeActivities(prev => [newActivity, ...prev.slice(0, 9)]); // Keep only 10 most recent
        if (onActivityUpdate) {
          onActivityUpdate(newActivity);
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [user, onActivityUpdate]);

  // Update activities when prop changes
  useEffect(() => {
    setRealtimeActivities(activities);
  }, [activities]);

  // Generate random activity for simulation
  const generateRandomActivity = (user) => {
    const activityTypes = [
      {
        type: 'join',
        messages: [
          'New participant joined (Vehicle: ABC-789)',
          'Vehicle DEF-456 entered parking lot',
          'New session started (Vehicle: GHI-123)'
        ]
      },
      {
        type: 'payment',
        messages: [
          'Payment received from JKL-890 (₹15.00)',
          'Payment processed for MNO-567 (₹22.50)',
          'Revenue collected from PQR-234 (₹8.75)'
        ]
      },
      {
        type: 'leave',
        messages: [
          'Participant left (Vehicle: STU-901)',
          'Session completed for VWX-678',
          'Vehicle YZA-345 checked out'
        ]
      }
    ];

    // Filter activities based on user role
    let availableTypes = activityTypes;
    if (user?.role === USER_ROLES.ADMIN) {
      // Admin sees only activities from their assigned lots
      availableTypes = activityTypes.map(type => ({
        ...type,
        messages: type.messages.map(msg => `[Lot P${Math.floor(Math.random() * 3) + 1}] ${msg}`)
      }));
    }

    const randomType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
    const randomMessage = randomType.messages[Math.floor(Math.random() * randomType.messages.length)];

    return {
      type: randomType.type,
      message: randomMessage,
      time: 'Just now',
      timestamp: new Date().toISOString()
    };
  };

  // Get activity icon based on type
  const getActivityIcon = (type) => {
    switch (type) {
      case 'join':
        return (
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
        );
      case 'leave':
        return (
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </div>
        );
      case 'payment':
        return (
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          </div>
        );
    }
  };

  // Format timestamp for display
  const formatTimestamp = (time, timestamp) => {
    if (time === 'Just now') return time;
    
    if (timestamp) {
      const now = new Date();
      const activityTime = new Date(timestamp);
      const diffMinutes = Math.floor((now - activityTime) / (1000 * 60));
      
      if (diffMinutes < 1) return 'Just now';
      if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
      
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      
      return activityTime.toLocaleDateString();
    }
    
    return time;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-green-600">Live</span>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        {realtimeActivities.length > 0 ? (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {realtimeActivities.map((activity, index) => (
              <div key={`${activity.timestamp || 'no-timestamp'}-${index}`} className="flex items-start space-x-3">
                {getActivityIcon(activity.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 break-words">{activity.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTimestamp(activity.time, activity.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">No recent activity</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;