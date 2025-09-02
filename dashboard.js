// Dashboard JavaScript - Driver Interface
class DriverDashboard {
    constructor() {
        this.map = null;
        this.currentLocation = null;
        this.speedThreshold = 60; // km/h
        this.currentSpeed = 0;
        this.isInDangerZone = false;
        this.emergencyReported = false;
        this.lastSpeedWarning = 0; // Track last warning time
        
        this.init();
    }

    init() {
        this.initMap();
        this.startLocationTracking();
        this.startSpeedMonitoring();
        this.updateLastUpdated();
        this.loadDriverData();
        
        // Update every 30 seconds
        setInterval(() => {
            this.updateDashboardData();
            this.updateLastUpdated();
        }, 30000);
        
        // Speed check every 5 seconds
        setInterval(() => {
            this.checkSpeed();
        }, 5000);
    }

    // Map Initialization
    initMap() {
        // Default to a central location (can be updated with real GPS)
        const defaultLat = 28.6139;
        const defaultLng = 77.2090;
        
        this.map = L.map('map').setView([defaultLat, defaultLng], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
        
        // Add driver marker
        this.driverMarker = L.marker([defaultLat, defaultLng])
            .addTo(this.map)
            .bindPopup('Your Current Location');
        
        // Add sample route
        this.addSampleRoute();
        
        // Add danger zones
        this.addDangerZones();
    }

    addSampleRoute() {
        const routeCoordinates = [
            [28.6139, 77.2090],
            [28.6169, 77.2100],
            [28.6199, 77.2120],
            [28.6229, 77.2140],
            [28.6259, 77.2160]
        ];
        
        const route = L.polyline(routeCoordinates, {
            color: '#667eea',
            weight: 4,
            opacity: 0.8
        }).addTo(this.map);
        
        // Add delivery points
        routeCoordinates.forEach((coord, index) => {
            if (index > 0) {
                L.marker(coord, {
                    icon: L.divIcon({
                        className: 'delivery-marker',
                        html: `<div style="background: #4CAF50; color: white; border-radius: 50%; width: 25px; height: 25px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">${index}</div>`,
                        iconSize: [25, 25]
                    })
                }).addTo(this.map).bindPopup(`Delivery Point ${index}`);
            }
        });
    }

    addDangerZones() {
        // School zone
        const schoolZone = L.circle([28.6180, 77.2110], {
            color: '#ff9800',
            fillColor: '#ff9800',
            fillOpacity: 0.2,
            radius: 200
        }).addTo(this.map).bindPopup('School Zone - Speed Limit: 25 km/h');
        
        // Construction zone
        const constructionZone = L.circle([28.6220, 77.2130], {
            color: '#f44336',
            fillColor: '#f44336',
            fillOpacity: 0.2,
            radius: 150
        }).addTo(this.map).bindPopup('Construction Zone - Speed Limit: 30 km/h');
    }

    // Location Tracking
    startLocationTracking() {
        if (navigator.geolocation) {
            navigator.geolocation.watchPosition(
                (position) => {
                    this.updateLocation(position.coords.latitude, position.coords.longitude);
                },
                (error) => {
                    console.error('Location tracking error:', error);
                    this.showNotification('Location tracking unavailable', 'warning');
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                }
            );
        } else {
            this.showNotification('Geolocation not supported', 'error');
        }
    }

    updateLocation(lat, lng) {
        this.currentLocation = { lat, lng };
        
        if (this.driverMarker) {
            this.driverMarker.setLatLng([lat, lng]);
        }
        
        this.checkDangerZones(lat, lng);
    }

    checkDangerZones(lat, lng) {
        // Check if in school zone
        const schoolZoneCenter = { lat: 28.6180, lng: 77.2110 };
        const schoolDistance = this.calculateDistance(lat, lng, schoolZoneCenter.lat, schoolZoneCenter.lng);
        
        if (schoolDistance < 0.2) { // Within 200m
            this.isInDangerZone = true;
            this.speedThreshold = 25;
            this.updateZoneAlert('School Zone', '25 km/h', 'school-zone');
        } else {
            const constructionZoneCenter = { lat: 28.6220, lng: 77.2130 };
            const constructionDistance = this.calculateDistance(lat, lng, constructionZoneCenter.lat, constructionZoneCenter.lng);
            
            if (constructionDistance < 0.15) { // Within 150m
                this.isInDangerZone = true;
                this.speedThreshold = 30;
                this.updateZoneAlert('Construction Zone', '30 km/h', 'construction-zone');
            } else {
                this.isInDangerZone = false;
                this.speedThreshold = 60;
                this.updateZoneAlert('Normal Zone', '60 km/h', '');
            }
        }
    }

    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    // Speed Monitoring
    startSpeedMonitoring() {
        // Simulate speed changes
        setInterval(() => {
            this.currentSpeed = Math.floor(Math.random() * 80) + 20; // 20-100 km/h
            this.updateSpeedDisplay();
        }, 3000);
    }

    updateSpeedDisplay() {
        document.getElementById('currentSpeed').textContent = this.currentSpeed;
        const speedStatus = document.getElementById('speedStatus');
        
        if (this.currentSpeed > this.speedThreshold) {
            speedStatus.textContent = 'Overspeed';
            speedStatus.className = 'speed-status danger';
            this.showSpeedWarning();
        } else if (this.currentSpeed > this.speedThreshold * 0.9) {
            speedStatus.textContent = 'Warning';
            speedStatus.className = 'speed-status warning';
        } else {
            speedStatus.textContent = 'Normal';
            speedStatus.className = 'speed-status normal';
        }
    }

    checkSpeed() {
        const now = Date.now();
        const warningCooldown = 30000; // 30 seconds between warnings
        
        if (this.currentSpeed > this.speedThreshold && 
            !document.getElementById('speedWarningModal').classList.contains('show') &&
            (now - this.lastSpeedWarning) > warningCooldown) {
            this.showSpeedWarning();
            this.lastSpeedWarning = now;
        }
    }

    showSpeedWarning() {
        const modal = document.getElementById('speedWarningModal');
        const message = document.getElementById('speedWarningMessage');
        
        if (this.isInDangerZone) {
            message.textContent = `DANGER: You are in a restricted zone! Current speed: ${this.currentSpeed} km/h. Speed limit: ${this.speedThreshold} km/h`;
        } else {
            message.textContent = `Speed Warning: Current speed ${this.currentSpeed} km/h exceeds limit of ${this.speedThreshold} km/h`;
        }
        
        modal.classList.add('show');
        
        // Auto-hide after 10 seconds if not acknowledged
        setTimeout(() => {
            if (modal.classList.contains('show')) {
                modal.classList.remove('show');
            }
        }, 10000);
    }

    updateZoneAlert(zoneType, speedLimit, zoneClass) {
        document.getElementById('zoneType').textContent = zoneType;
        document.getElementById('zoneLimit').textContent = `Speed Limit: ${speedLimit}`;
        
        const zoneCard = document.querySelector('.zone-alert');
        zoneCard.className = `status-card zone-alert ${zoneClass}`;
    }

    // Data Loading and Updates
    loadDriverData() {
        // Real driver and vehicle data from spreadsheets
        const driversData = [
            { vehicleNumber: 'MH12AB1234', name: 'Rajesh Yadav', license: 'MH14201900123', deliveries: 12, pending: 3, model: 'Tata 407', year: 2021 },
            { vehicleNumber: 'MH12AB2234', name: 'Sunil Shinde', license: 'MH14201700124', deliveries: 9, pending: 1, model: 'Ashok Leyland', year: 2022 },
            { vehicleNumber: 'MH12AB3234', name: 'Anand Pawar', license: 'MH14201600122', deliveries: 15, pending: 2, model: 'Mahindra Bolero', year: 2020 },
            { vehicleNumber: 'MH12AB4234', name: 'Suresh Gaikwad', license: 'MH14201300921', deliveries: 7, pending: 0, model: 'Eicher Pro', year: 2018 },
            { vehicleNumber: 'MH12AB5234', name: 'Dipak Patil', license: 'MH14201200856', deliveries: 4, pending: 2, model: 'Tata Ace', year: 2023 },
            { vehicleNumber: 'KA01CD1234', name: 'Ajay Kumar', license: 'KA19201500482', deliveries: 20, pending: 0, model: 'Force Traveller', year: 2021 },
            { vehicleNumber: 'KA01CD2234', name: 'Mohan Reddy', license: 'KA19201300746', deliveries: 6, pending: 1, model: 'Tata Sumo', year: 2019 },
            { vehicleNumber: 'KA01CD3234', name: 'Praveen Shetty', license: 'KA19201900614', deliveries: 13, pending: 4, model: 'Mahindra Pickup', year: 2022 }
        ];
        
        // Select first driver as current user (you can modify this logic)
        const currentDriver = driversData[0];
        
        const driverData = {
            name: currentDriver.name,
            id: currentDriver.vehicleNumber,
            license: currentDriver.license,
            phone: '+91-9876543210',
            experience: this.calculateExperience(currentDriver.year),
            vehicleId: currentDriver.vehicleNumber,
            licensePlate: currentDriver.vehicleNumber,
            vehicleModel: currentDriver.model + ' ' + currentDriver.year,
            mileage: this.calculateMileage(currentDriver.year),
            fuelType: this.getFuelType(currentDriver.model),
            fuelLevel: Math.floor(Math.random() * 40 + 60) + '%',
            leaveAvailable: Math.floor(Math.random() * 10 + 10) + ' days',
            leaveUsed: Math.floor(Math.random() * 8 + 5) + ' days',
            leaveThisMonth: Math.floor(Math.random() * 3 + 1) + ' days',
            todayDeliveries: currentDriver.deliveries,
            pendingDeliveries: currentDriver.pending
        };
        
        this.updateDriverInfo(driverData);
    }
    
    calculateExperience(vehicleYear) {
        const currentYear = new Date().getFullYear();
        const experience = currentYear - vehicleYear + Math.floor(Math.random() * 3 + 2);
        return experience + ' years';
    }
    
    calculateMileage(vehicleYear) {
        // Return fuel efficiency in km/l based on vehicle model
        return this.getFuelEfficiency();
    }
    
    getFuelEfficiency() {
        // Fuel efficiency based on vehicle type (km/l)
        const currentDriverData = this.getCurrentDriverData();
        const model = currentDriverData.model;
        
        const fuelEfficiencies = {
            'Tata 407': '8-10 km/l',
            'Ashok Leyland': '7-9 km/l', 
            'Mahindra Bolero': '12-14 km/l',
            'Eicher Pro': '9-11 km/l',
            'Tata Ace': '15-17 km/l',
            'Force Traveller': '8-10 km/l',
            'Tata Sumo': '10-12 km/l',
            'Mahindra Pickup': '11-13 km/l'
        };
        
        for (let vehicleModel in fuelEfficiencies) {
            if (model.includes(vehicleModel.split(' ')[0])) {
                return fuelEfficiencies[vehicleModel];
            }
        }
        return '8-10 km/l'; // Default for commercial vehicles
    }
    
    getFuelType(model) {
        const fuelTypes = {
            'Tata': 'Diesel',
            'Ashok': 'Diesel',
            'Mahindra': 'Diesel',
            'Eicher': 'Diesel',
            'Force': 'Diesel'
        };
        
        for (let brand in fuelTypes) {
            if (model.includes(brand)) {
                return fuelTypes[brand];
            }
        }
        return 'Diesel';
    }

    updateDriverInfo(data) {
        // Update profile section
        document.getElementById('driverName').textContent = data.name;
        document.getElementById('driverIdDisplay').textContent = data.id;
        document.getElementById('licenseNumber').textContent = data.license;
        document.getElementById('phoneNumber').textContent = data.phone;
        document.getElementById('experience').textContent = data.experience;
        
        // Update vehicle section
        document.getElementById('vehicleId').textContent = data.vehicleId;
        document.getElementById('licensePlate').textContent = data.licensePlate;
        document.getElementById('vehicleModel').textContent = data.vehicleModel;
        document.getElementById('vehicleMileage').textContent = data.mileage;
        document.getElementById('fuelType').textContent = data.fuelType;
        document.getElementById('fuelLevel').textContent = data.fuelLevel;
        
        // Update leave section
        document.getElementById('leaveAvailable').textContent = data.leaveAvailable;
        document.getElementById('leaveUsed').textContent = data.leaveUsed;
        document.getElementById('leaveThisMonth').textContent = data.leaveThisMonth;
        
        // Update header
        document.getElementById('headerDriverName').textContent = data.name;
        document.getElementById('headerVehiclePlate').textContent = data.licensePlate;
    }

    updateDashboardData() {
        // Get current driver data for real-time updates
        const currentDriverData = this.getCurrentDriverData();
        
        const metrics = {
            todayDeliveries: currentDriverData.deliveries,
            hoursWorked: (Math.random() * 2 + 6).toFixed(1) + 'h',
            distanceCovered: Math.floor(Math.random() * 50) + 200 + 'km',
            rating: (Math.random() * 0.5 + 4.3).toFixed(1)
        };
        
        document.getElementById('todayDeliveries').textContent = metrics.todayDeliveries;
        document.getElementById('hoursWorked').textContent = metrics.hoursWorked;
        document.getElementById('distanceCovered').textContent = metrics.distanceCovered;
        document.getElementById('rating').textContent = metrics.rating;
        
        // Update next delivery based on pending deliveries
        const deliveryAddresses = [
            'Pune Railway Station',
            'Mumbai Central Hub',
            'Nashik Distribution Center',
            'Aurangabad Warehouse',
            'Kolhapur Depot',
            'Bangalore Tech Park',
            'Mysore Industrial Area'
        ];
        
        if (currentDriverData.pending > 0) {
            const randomAddress = deliveryAddresses[Math.floor(Math.random() * deliveryAddresses.length)];
            const eta = Math.floor(Math.random() * 30 + 10);
            document.getElementById('nextDeliveryAddress').textContent = randomAddress;
            document.getElementById('deliveryETA').textContent = `ETA: ${eta} min`;
        } else {
            document.getElementById('nextDeliveryAddress').textContent = 'No pending deliveries';
            document.getElementById('deliveryETA').textContent = 'All deliveries completed';
        }
    }
    
    getCurrentDriverData() {
        // Return current driver from the real data
        const driversData = [
            { vehicleNumber: 'MH12AB1234', name: 'Rajesh Yadav', license: 'MH14201900123', deliveries: 12, pending: 3, model: 'Tata 407', year: 2021 },
            { vehicleNumber: 'MH12AB2234', name: 'Sunil Shinde', license: 'MH14201700124', deliveries: 9, pending: 1, model: 'Ashok Leyland', year: 2022 },
            { vehicleNumber: 'MH12AB3234', name: 'Anand Pawar', license: 'MH14201600122', deliveries: 15, pending: 2, model: 'Mahindra Bolero', year: 2020 },
            { vehicleNumber: 'MH12AB4234', name: 'Suresh Gaikwad', license: 'MH14201300921', deliveries: 7, pending: 0, model: 'Eicher Pro', year: 2018 },
            { vehicleNumber: 'MH12AB5234', name: 'Dipak Patil', license: 'MH14201200856', deliveries: 4, pending: 2, model: 'Tata Ace', year: 2023 }
        ];
        return driversData[0]; // Currently showing Rajesh Yadav
    }

    updateLastUpdated() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
        document.getElementById('lastUpdated').textContent = timeString;
    }

    // Notification System
    showNotification(message, type = 'info', duration = 5000) {
        const container = document.getElementById('notificationsContainer');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icon = this.getNotificationIcon(type);
        notification.innerHTML = `
            <i class="${icon}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease forwards';
            setTimeout(() => {
                container.removeChild(notification);
            }, 300);
        }, duration);
    }

    getNotificationIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            warning: 'fas fa-exclamation-triangle',
            error: 'fas fa-times-circle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    // Emergency System
    reportEmergency(type) {
        this.emergencyReported = true;
        
        const emergencyTypes = {
            accident: 'Vehicle Accident',
            breakdown: 'Vehicle Breakdown',
            medical: 'Medical Emergency',
            security: 'Security Issue',
            other: 'General Emergency'
        };
        
        const emergencyType = emergencyTypes[type] || 'Emergency';
        
        // Close modal
        this.closeEmergencyModal();
        
        // Show confirmation
        this.showNotification(`${emergencyType} reported successfully. Help is on the way!`, 'success', 8000);
        
        // Add to activities
        this.addActivity('emergency', `${emergencyType} Reported`, 'Emergency services contacted');
        
        // In a real app, this would send data to the server
        console.log('Emergency reported:', {
            type: type,
            location: this.currentLocation,
            timestamp: new Date(),
            driverId: document.getElementById('driverIdDisplay').textContent,
            vehicleId: document.getElementById('vehicleId').textContent
        });
    }

    addActivity(type, title, details) {
        const activitiesList = document.getElementById('activitiesList');
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
        });
        
        const activityItem = document.createElement('div');
        activityItem.className = 'activity-item';
        
        const iconClass = type === 'emergency' ? 'fas fa-exclamation-triangle' : 'fas fa-info-circle';
        const iconType = type === 'emergency' ? 'error' : 'delivered';
        
        activityItem.innerHTML = `
            <div class="activity-icon ${iconType}">
                <i class="${iconClass}"></i>
            </div>
            <div class="activity-content">
                <span class="activity-title">${title}</span>
                <span class="activity-details">${details}</span>
                <span class="activity-time">${timeString}</span>
            </div>
        `;
        
        activitiesList.insertBefore(activityItem, activitiesList.firstChild);
        
        // Keep only last 5 activities
        while (activitiesList.children.length > 5) {
            activitiesList.removeChild(activitiesList.lastChild);
        }
    }
}

// Global Functions
function openEmergencyModal() {
    document.getElementById('emergencyModal').classList.add('show');
}

function closeEmergencyModal() {
    document.getElementById('emergencyModal').classList.remove('show');
}

function reportEmergency(type) {
    if (window.dashboard) {
        window.dashboard.reportEmergency(type);
    }
}

function acknowledgeSpeedWarning() {
    document.getElementById('speedWarningModal').classList.remove('show');
}

function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    dropdown.classList.toggle('show');
}


function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear any session data
        sessionStorage.clear();
        // Reload the page to reset the dashboard
        window.location.reload();
    }
    toggleUserMenu();
}

// Map Controls
function centerMap() {
    if (window.dashboard && window.dashboard.currentLocation) {
        const { lat, lng } = window.dashboard.currentLocation;
        window.dashboard.map.setView([lat, lng], 15);
    } else {
        window.dashboard.showNotification('Location not available', 'warning');
    }
}

function toggleTraffic() {
    window.dashboard.showNotification('Traffic layer toggled', 'info');
}

function toggleSatellite() {
    window.dashboard.showNotification('Satellite view toggled', 'info');
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(event) {
    const userMenu = document.querySelector('.user-menu');
    const userDropdown = document.getElementById('userDropdown');
    
    if (!userMenu.contains(event.target)) {
        userDropdown.classList.remove('show');
    }
});

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    window.dashboard = new DriverDashboard();
    
    // Add some sample activities on load
    setTimeout(() => {
        window.dashboard.addActivity('delivered', 'Delivery Completed', 'Package delivered to 456 Oak Ave');
    }, 2000);
    
    setTimeout(() => {
        window.dashboard.addActivity('pickup', 'Package Picked Up', 'Collected from Warehouse B');
    }, 4000);
});

// Handle page visibility changes
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        console.log('Dashboard hidden - reducing update frequency');
    } else {
        console.log('Dashboard visible - resuming normal updates');
        if (window.dashboard) {
            window.dashboard.updateDashboardData();
        }
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // Emergency shortcut: Ctrl + E
    if (event.ctrlKey && event.key === 'e') {
        event.preventDefault();
        openEmergencyModal();
    }
    
    // Center map: Ctrl + M
    if (event.ctrlKey && event.key === 'm') {
        event.preventDefault();
        centerMap();
    }
});

// Add CSS for slideOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
