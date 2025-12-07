const mongoose = require('mongoose');
const User = require('../models/user.model');
const Doctor = require('../models/doctor.model');
const Service = require('../models/service.model');
const Booking = require('../models/booking.model');
const ServiceItem = require('../models/serviceItem.model');
const SubService = require('../models/subService.model');
const ChildService = require('../models/childService.model');

// Register 2dsphere index for geospatial queries (run this once on app startup or in a migration)
// User.collection.createIndex({ location: "2dsphere" }); 
// NOTE: Since our User schema uses 'latitude' and 'longitude' (Numbers), 
// we will simulate the distance calculation using aggregation for simplicity. 
// For production, consider storing location as a GeoJSON Point array: [longitude, latitude].


/**
 * @route GET /api/booking/services
 * @description Fetch list of all main services
 */
exports.getServices = async (req, res) => {
    try {
        const services = await Service.find({ is_active: true });
        res.status(200).json({ success: true, services });
    } catch (error) {
        console.error('Fetch services error:', error);
        res.status(500).json({ message: 'Server error fetching services.' });
    }
};

/**
 * @route GET /api/booking/services/:serviceId/sub-services
 * @description Fetch SubServices for a specific Service
 */
exports.getSubServices = async (req, res) => {
    const { serviceId } = req.params;
    try {
        const subServices = await SubService.find({ serviceId, is_active: true });
        res.status(200).json({ success: true, subServices });
    } catch (error) {
        console.error('Fetch sub-services error:', error);
        res.status(500).json({ message: 'Server error fetching sub-services.' });
    }
};

/**
 * @route GET /api/booking/sub-services/:subServiceId/child-services
 * @description Fetch ChildServices for a specific SubService
 */
exports.getChildServices = async (req, res) => {
    const { subServiceId } = req.params;
    try {
        const childServices = await ChildService.find({ subServiceId, is_active: true });
        res.status(200).json({ success: true, childServices });
    } catch (error) {
        console.error('Fetch child-services error:', error);
        res.status(500).json({ message: 'Server error fetching child-services.' });
    }
};

/**
 * @route GET /api/booking/services/:serviceId/items
 * @description Fetch sub-items for a specific service (Legacy / Flat)
 */
exports.getServiceItems = async (req, res) => {
    const { serviceId } = req.params;
    const { parentServiceItemId } = req.query; // Optional: for fetching Level 2 items

    try {
        const service = await Service.findById(serviceId);
        if (!service) {
            return res.status(404).json({ message: 'Service not found.' });
        }

        const query = {
            serviceId,
            is_active: true
        };

        if (parentServiceItemId) {
            // Fetch Child Services (Level 2)
            query.parent_service_item_id = parentServiceItemId;
        } else {
            // Fetch Sub Services (Level 1) - items that DO NOT have a parent
            // We consciously exclude items that are children of others to avoid duplication
            query.parent_service_item_id = { $eq: null };
        }

        const items = await ServiceItem.find(query);

        res.status(200).json({ success: true, items });
    } catch (error) {
        console.error('Fetch service items error:', error);
        res.status(500).json({ message: 'Server error fetching service items.' });
    }
};

/**
 * @route GET /api/booking/doctors/opd
 * @description Fetch available doctors
 */
exports.getAvailableDoctors = async (req, res) => {
    try {
        const doctors = await User.aggregate([
            { $match: { role: 'Doctor' } },
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
                    specializations: '$profile.specializations',
                    consultation_fees: '$profile.consultation_fee',
                    // image_url: '$profile.image_url' 
                }
            }
        ]);
        res.status(200).json({ success: true, doctors });
    } catch (error) {
        console.error('Fetch available doctors error:', error);
        res.status(500).json({ message: 'Server error fetching doctors.' });
    }
};

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
    const { doctorId } = req.params;
    const { date } = req.query; // YYYY-MM-DD

    if (!mongoose.Types.ObjectId.isValid(doctorId) || !date) {
        return res.status(400).json({ message: 'Invalid Doctor ID or Date parameter missing.' });
    }

    try {
        const doctor = await Doctor.findOne({ userId: doctorId });
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor not found.' });
        }

        // 1. Get Day of Week (e.g., 'Monday')
        const inputDate = new Date(date);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayName = days[inputDate.getDay()];

        // 2. Find working hours for this day
        const daySchedule = doctor.working_hours.find(d => d.day === dayName && d.enabled);

        if (!daySchedule) {
            return res.status(200).json({ success: true, date, slots: [] });
        }

        // 3. Generate Slots (30 mins interval)
        const slots = [];
        let currentTime = new Date(`${date}T${daySchedule.start}`);
        const endTime = new Date(`${date}T${daySchedule.end}`);

        // Fetch existing bookings for this doctor on this date
        // define start and end of the day for query
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const existingBookings = await Booking.find({
            itemId: doctorId,
            itemType: 'User',
            booking_date: {
                $gte: date, // String comparison might be risky, better to use Date objects if schema uses Date. 
                // Based on createBooking, booking_date is passed as body.
                // Let's rely on slot.start_time overlapping.
            },
            'slot.start_time': {
                $gte: startOfDay,
                $lte: endOfDay
            },
            status: { $nin: ['Cancelled', 'Rejected'] }
        });

        // Helper to formatting time
        const formatTime = (dateObj) => {
            return dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        };

        while (currentTime < endTime) {
            const slotStart = new Date(currentTime);
            const slotEnd = new Date(currentTime.getTime() + 30 * 60000); // +30 mins

            if (slotEnd > endTime) break;

            // Check if booked
            const isBooked = existingBookings.some(booking => {
                const bStart = new Date(booking.slot.start_time);
                // Simple collision check: if booking starts at same time
                return bStart.getTime() === slotStart.getTime();
            });

            slots.push({
                id: slotStart.toISOString(),
                start_time: slotStart.toISOString(), // For backend
                end_time: slotEnd.toISOString(),     // For backend
                label: `${formatTime(slotStart)} - ${formatTime(slotEnd)}`, // For display
                is_booked: isBooked
            });

            currentTime = slotEnd;
        }

        res.status(200).json({
            success: true,
            date: date,
            slots: slots
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
        itemType, // 'User' (for Doctor), 'ServiceItem' (for Lab, Equipment, Ambulance)
        itemId,   // ID of the Doctor or ServiceItem
        serviceId, // Optional, mainly for Doctor/OPD
        slotId,
        slotStartTime,
        slotEndTime,
        booking_date,
        payment_method
    } = req.body;

    let itemPrice = 0;
    let consultationFee = 0;

    try {
        // 1. Basic Validation
        if (!itemId || !itemType || !booking_date) {
            return res.status(400).json({ message: 'Missing booking details.' });
        }

        // 2. Fetch Price
        if (itemType === 'User') {
            // Fetch Doctor Consultation Fee (Mock or from DB)
            // const doctor = await Doctor.findOne({ userId: itemId });
            // consultationFee = doctor ? doctor.consultation_fee : 600;
            consultationFee = 600; // Mock default
        } else if (itemType === 'ServiceItem') {
            const serviceItem = await ServiceItem.findById(itemId);
            if (!serviceItem) {
                return res.status(404).json({ message: 'Service Item not found.' });
            }
            itemPrice = serviceItem.price;
        } else if (itemType === 'ChildService') {
            const childService = await ChildService.findById(itemId);
            if (!childService) {
                return res.status(404).json({ message: 'Child Service not found.' });
            }
            itemPrice = childService.price;
        } else if (itemType === 'SubService') {
            const subService = await SubService.findById(itemId);
            if (!subService) {
                return res.status(404).json({ message: 'Sub Service not found.' });
            }
            // SubServices might not have a price, assume 0 or check model
            itemPrice = 0;
        } else {
            return res.status(400).json({ message: 'Invalid item type.' });
        }

        const PLATFORM_FEE_RATE = 0.10;
        const PLATFORM_FEE = parseFloat(((consultationFee + itemPrice) * PLATFORM_FEE_RATE).toFixed(2));
        const TOTAL_AMOUNT = consultationFee + itemPrice + PLATFORM_FEE;

        // 3. Create the new booking document
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

        // 4. Return response
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
                if (booking.itemType === 'User') {
                    itemName = booking.itemId.name; // Doctor
                } else if (booking.itemType === 'ServiceItem') {
                    itemName = booking.itemId.name; // Generic Service Item
                    // If it's an ambulance and has vehicle number, maybe append it?
                    if (booking.itemId.vehicle_number) {
                        itemName += ` (${booking.itemId.vehicle_number})`;
                    }
                } else {
                    // Fallback for old data if any
                    itemName = booking.itemId.name || booking.itemId.vehicle_number || 'Unknown Item';
                }
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