const mongoose = require('mongoose');
const User = require('../models/user.model');
const Doctor = require('../models/doctor.model');
const Service = require('../models/service.model');
const Booking = require('../models/booking.model');

// Register 2dsphere index for geospatial queries (run this once on app startup or in a migration)
// User.collection.createIndex({ location: "2dsphere" }); 
// NOTE: Since our User schema uses 'latitude' and 'longitude' (Numbers), 
// we will simulate the distance calculation using aggregation for simplicity. 
// For production, consider storing location as a GeoJSON Point array: [longitude, latitude].

/**
 * @route GET /api/booking/services
 * @description Fetch all available services for the home screen (image, name, title)
 * @access Public
 */
exports.getServices = async (req, res) => {
    try {
        const services = await Service.find({ is_active: true }).select('id name title image_url type');
        res.status(200).json({ success: true, services });
    } catch (error) {
        console.error('Fetch services error:', error);
        res.status(500).json({ message: 'Server error fetching services.' });
    }
};

/**
 * @route GET /api/booking/services/:serviceId/items
 * @description Fetch items (Lab Tests, Equipment, etc.) for a specific service.
 * @access Public
 */
exports.getServiceItems = async (req, res) => {
    const { serviceId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(serviceId)) {
        return res.status(400).json({ message: 'Invalid Service ID.' });
    }

    try {
        // 1. Find the Service to determine its type
        const service = await Service.findById(serviceId);
        if (!service) {
            return res.status(404).json({ message: 'Service not found.' });
        }

        let items = [];
        let itemType = '';

        // 2. Fetch items based on Service Type
        switch (service.type) {
            case 'LabTest':
                const LabTest = require('../models/labTest.model');
                items = await LabTest.find({ is_available: true });
                itemType = 'LabTest';
                break;

            case 'MedicalEquipment':
                const MedicalEquipment = require('../models/medicalEquipment.model');
                items = await MedicalEquipment.find({ is_available: true });
                itemType = 'MedicalEquipment';
                break;

            case 'Ambulance':
                const Ambulance = require('../models/ambulance.model');
                items = await Ambulance.find({ is_available: true });
                itemType = 'Ambulance';
                break;

            case 'OPD':
                // For OPD, items are Doctors. 
                itemType = 'User'; // Doctor
                items = []; // Frontend usually calls /doctors/opd for this
                break;

            default:
                items = [];
                break;
        }

        res.status(200).json({
            success: true,
            service: {
                id: service._id,
                name: service.name,
                type: service.type
            },
            items: items,
            itemType: itemType
        });

    } catch (error) {
        console.error('Fetch service items error:', error);
        res.status(500).json({ message: 'Server error fetching service items.' });
    }
};

/**
 * @route GET /api/booking/doctors/opd
 * @description Find available doctors near the user, ordered by distance and rating.
 * @access Private (Requires JWT to get user location)
 * @notes This utilizes a MongoDB aggregation pipeline for distance calculation.
 */
exports.getAvailableDoctors = async (req, res) => {
    // Coordinates pulled from the authenticated user's token/DB entry (req.userId)
    const { latitude, longitude } = req.userId;
    const serviceName = 'OPD Booking'; // Hardcoded for your flow

    if (!latitude || !longitude) {
        return res.status(400).json({ message: 'User location required to find nearby doctors. Please update coordinates.' });
    }

    try {
        // 1. Find the Service ID for OPD Booking
        const opdService = await Service.findOne({ name: serviceName });
        if (!opdService) {
            return res.status(404).json({ message: `${serviceName} service not found.` });
        }

        // 2. Aggregation Pipeline to find and sort doctors
        const pipeline = [
            // Stage 1: Filter users who are Doctors
            { $match: { role: 'Doctor' } },

            // Stage 2: Join with the Doctor profile to get details (fee, rating)
            {
                $lookup: {
                    from: 'doctors',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'doctorProfile'
                }
            },
            { $unwind: '$doctorProfile' }, // Flatten the doctorProfile array

            // Stage 3: Filter for Doctors who offer the OPD service and are available
            {
                $match: {
                    'doctorProfile.is_available': true,
                }
            },

            // Stage 4: Calculate distance using Haversine formula (approximation)
            {
                $addFields: {
                    distance_km: {
                        $multiply: [
                            6371, // Earth radius in km
                            {
                                $acos: {
                                    $add: [
                                        { $multiply: [{ $sin: { $degreesToRadians: '$latitude' } }, { $sin: { $degreesToRadians: latitude } }] },
                                        { $multiply: [{ $cos: { $degreesToRadians: '$latitude' } }, { $cos: { $degreesToRadians: latitude } }, { $cos: { $degreesToRadians: { $subtract: ['$longitude', longitude] } } }] }
                                    ]
                                }
                            }
                        ]
                    }
                }
            },

            // Stage 5: Sort by distance (nearest first) and then by rating
            { $sort: { distance_km: 1, 'doctorProfile.satisfaction_rating': -1 } },

            // Stage 6: Limit the results and project the required fields
            { $limit: 20 },
            {
                $project: {
                    _id: '$_id',
                    name: '$name',
                    consultation_fees: '$doctorProfile.consultation_fee',
                    doctor_service: opdService.title,
                    rating: '$doctorProfile.satisfaction_rating',
                    distance: { $round: ['$distance_km', 1] } // Round to 1 decimal place
                }
            }
        ];

        const doctors = await User.aggregate(pipeline);

        res.status(200).json({
            success: true,
            doctors: doctors.map(doc => ({
                id: doc._id,
                image: '',
                name: doc.name,
                doctor_service: doc.doctor_service,
                consultation_fees: doc.consultation_fees,
                status: 'available', // Already filtered
                distance: `${doc.distance} km`,
                rating: doc.rating
            }))
        });

    } catch (error) {
        console.error('Fetch doctors error:', error);
        res.status(500).json({ message: 'Server error during doctor search.' });
    }
};

/**
 * @route GET /api/booking/doctors/:doctorId
 * @description Fetch full doctor details
 * @access Public
 */
exports.getDoctorDetails = async (req, res) => {
    const { doctorId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
        return res.status(400).json({ message: 'Invalid Doctor ID.' });
    }

    try {
        const doctorDetails = await User.aggregate([
            { $match: { _id: new mongoose.Types.ObjectId(doctorId), role: 'Doctor' } },
            {
                $lookup: {
                    from: 'doctors',
                    localField: '_id',
                    foreignField: 'userId',
                    as: 'profile'
                }
            },
            { $unwind: '$profile' },
            {
                $project: {
                    name: '$name',
                    rating: '$profile.satisfaction_rating',
                    experience: '$profile.experience',
                    patients_treated: '$profile.patients_treated',
                    consultation_fees: '$profile.consultation_fee',
                    about: '$profile.about',
                    specializations: '$profile.specializations',
                    working_hours: '$profile.working_hours',
                    // Assuming "doctor service" is just 'OPD Booking' for now
                    doctor_service: 'General Consultation (OPD)'
                }
            }
        ]);

        if (doctorDetails.length === 0) {
            return res.status(404).json({ message: 'Doctor not found.' });
        }

        res.status(200).json({ success: true, details: doctorDetails[0] });

    } catch (error) {
        console.error('Fetch doctor details error:', error);
        res.status(500).json({ message: 'Server error fetching doctor details.' });
    }
};

/**
 * @route GET /api/booking/doctors/:doctorId/slots
 * @description Fetch available time slots for a specific doctor/date
 * @access Public
 * @query date YYYY-MM-DD
 */
exports.getAvailableSlots = async (req, res) => {
    // NOTE: In a real app, slots would be generated based on the working_hours and existing bookings.
    // For this flow, we will simulate a slot generation process.
    const { doctorId } = req.params;
    const { date } = req.query;

    // Validate date format if needed

    if (!mongoose.Types.ObjectId.isValid(doctorId) || !date) {
        return res.status(400).json({ message: 'Invalid Doctor ID or Date parameter missing.' });
    }

    // This is a simple mock generation. 
    // In production, this would be complex service logic comparing schedule vs existing bookings.
    try {
        const mockSlots = [
            { id: 'SLOT_001', time: '09:00 AM - 09:30 AM', is_booked: false },
            { id: 'SLOT_002', time: '09:30 AM - 10:00 AM', is_booked: false },
            { id: 'SLOT_003', time: '10:00 AM - 10:30 AM', is_booked: true },
            { id: 'SLOT_004', time: '02:00 PM - 02:30 PM', is_booked: false },
        ];

        const availableSlots = mockSlots.filter(slot => !slot.is_booked);

        res.status(200).json({
            success: true,
            date: date,
            slots: availableSlots
        });

    } catch (error) {
        console.error('Fetch slots error:', error);
        res.status(500).json({ message: 'Server error fetching slots.' });
    }
};

/**
 * @route POST /api/booking/create
 * @description Create a new booking (initial status: PENDING_PAYMENT)
 * @access Private
 * @payload { itemType, itemId, serviceId, slotId, slotStartTime, slotEndTime, booking_date, payment_method }
 */
exports.createBooking = async (req, res) => {
    const userId = req.userId.id;
    const {
        itemType, // 'User' (for Doctor), 'LabTest', 'MedicalEquipment', 'Ambulance'
        itemId,   // ID of the Doctor, LabTest, etc.
        serviceId, // Optional, mainly for Doctor/OPD
        slotId,
        slotStartTime,
        slotEndTime,
        booking_date,
        payment_method
    } = req.body;

    // --- Mock Fee Calculation ---
    // In a real app, fetch price from the DB based on itemId
    let itemPrice = 0;
    let consultationFee = 0;

    // Fetch item details to get price (Simplified for this flow)
    // You would typically query the specific model here.

    // For now, we assume frontend sends the price or we use a default for the mock
    const MOCK_PRICES = {
        'User': 600, // Doctor Consultation
        'LabTest': 500,
        'MedicalEquipment': 200, // Per day
        'Ambulance': 1000 // Base fare
    };

    const basePrice = MOCK_PRICES[itemType] || 0;

    if (itemType === 'User') {
        consultationFee = basePrice;
    } else {
        itemPrice = basePrice;
    }

    const PLATFORM_FEE_RATE = 0.10;
    const PLATFORM_FEE = parseFloat(((consultationFee + itemPrice) * PLATFORM_FEE_RATE).toFixed(2));
    const TOTAL_AMOUNT = consultationFee + itemPrice + PLATFORM_FEE;
    // ----------------------------

    try {
        // 1. Basic Validation
        if (!itemId || !itemType || !booking_date) {
            return res.status(400).json({ message: 'Missing booking details.' });
        }

        // 2. Create the new booking document
        const isCOD = payment_method === 'COD';
        const initialStatus = isCOD ? 'Upcoming' : 'Pending Payment';
        const initialPaymentStatus = isCOD ? 'INITIATED' : 'INITIATED';

        const newBooking = new Booking({
            userId,
            itemId,
            itemType,
            serviceId, // Can be null for non-doctor bookings
            slot: {
                start_time: slotStartTime,
                end_time: slotEndTime,
                slot_id: slotId
            },
            booking_date,
            consultation_fee: consultationFee,
            item_price: itemPrice,
            platform_fee: PLATFORM_FEE,
            total_amount: TOTAL_AMOUNT,
            status: initialStatus,
            payment_status: initialPaymentStatus,
            payment_details: {
                method: payment_method
            }
        });

        await newBooking.save();

        // 3. Return response
        if (isCOD) {
            return res.status(201).json({
                success: true,
                message: 'Booking confirmed with Cash on Delivery.',
                booking_details: {
                    booking_id: newBooking._id,
                    status: newBooking.status,
                    total_amount: newBooking.total_amount,
                    payment_method: 'COD'
                }
            });
        }

        // Return the full booking view for the payment screen (Online Payment)
        res.status(201).json({
            success: true,
            message: 'Booking initiated. Proceed to payment.',
            booking_details: {
                booking_id: newBooking._id,
                item_type: itemType,
                consultation_fees: newBooking.consultation_fee,
                item_price: newBooking.item_price,
                platform_fees: newBooking.platform_fee,
                total_amount: newBooking.total_amount,
                payment_gateway_process: 'Requires Payment Gateway Integration...'
            }
        });

    } catch (error) {
        console.error('Create booking error:', error);
        if (error.code === 11000) {
            return res.status(409).json({ message: 'This time slot is already taken.' });
        }
        res.status(500).json({ message: 'Server error during booking creation.' });
    }
};


/**
 * @route GET /api/booking/user
 * @description Fetch all bookings for the logged-in user, grouped by status.
 * @access Private
 */
exports.getUserBookings = async (req, res) => {
    const userId = req.userId.id;

    try {
        const bookings = await Booking.find({ userId })
            .populate('itemId') // Mongoose automatically populates based on refPath 'itemType'
            .populate('serviceId', 'title')
            .sort({ booking_date: -1, 'slot.start_time': -1 });

        // Grouping the results
        const groupedBookings = bookings.reduce((acc, booking) => {
            const statusKey = booking.status.toLowerCase().replace(/\s/g, '');

            let itemName = 'N/A';
            if (booking.itemId) {
                // Handle different item structures
                if (booking.itemType === 'User') itemName = booking.itemId.name; // Doctor
                else if (booking.itemType === 'Ambulance') itemName = booking.itemId.vehicle_number;
                else itemName = booking.itemId.name; // LabTest, Equipment
            }

            const bookingDetail = {
                id: booking._id,
                status: booking.status,
                total_amount: booking.total_amount,
                date: booking.booking_date,
                time: booking.slot && booking.slot.start_time ?
                    `${new Date(booking.slot.start_time).toLocaleTimeString()} - ${new Date(booking.slot.end_time).toLocaleTimeString()}` : 'N/A',
                item_name: itemName,
                item_type: booking.itemType,
                service_title: booking.serviceId ? booking.serviceId.title : booking.itemType,
            };

            if (acc[statusKey]) {
                acc[statusKey].push(bookingDetail);
            } else {
                acc[statusKey] = [bookingDetail];
            }
            return acc;
        }, { upcoming: [], completed: [], cancelled: [], pendingpayment: [] });


        res.status(200).json({ success: true, bookings: groupedBookings });
    } catch (error) {
        console.error('Fetch user bookings error:', error);
        res.status(500).json({ message: 'Server error fetching user bookings.' });
    }
};