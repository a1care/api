const mongoose = require('mongoose');
const Doctor = require('../models/doctor.model');
const DoctorDocument = require('../models/doctorDocument.model');

// List of MANDATORY document field names
const MANDATORY_DOC_FIELDS = [
    'registration_cert',
    'highest_degree',
    'identity_proof',
    'profile_photo'
];

/**
 * Helper function to map field names to Document model enum values
 */
const DOCUMENT_TYPE_MAP = {
    registration_cert: 'Registration_Certificate',
    highest_degree: 'Highest_Degree',
    identity_proof: 'Identity_Proof',
    profile_photo: 'Profile_Photo',
    experience_proof: 'Experience_Proof',
};

/**
 * @route POST /api/doctor/documents/upload
 * @description Handles S3 upload of multiple documents and updates Doctor status to 'Pending'.
 * @access Private (Doctor Role)
 * @payload Form Data: multiple files named as defined in DOCUMENT_FIELDS
 */
exports.uploadDocument = async (req, res) => {
    const doctorId = req.userId.id;
    const uploadedFiles = req.files; // Object of file arrays: { 'registration_cert': [file], ... }

    if (!uploadedFiles || Object.keys(uploadedFiles).length === 0) {
        return res.status(400).json({ message: 'No image files were processed or uploaded.' });
    }

    const uploadedDocumentNames = Object.keys(uploadedFiles);
    const uploadedDocs = [];
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        for (const fieldName of uploadedDocumentNames) {
            const fileArray = uploadedFiles[fieldName];

            if (fileArray && fileArray.length > 0) {
                const file = fileArray[0];
                const documentType = DOCUMENT_TYPE_MAP[fieldName];

                if (!documentType) continue; // Skip unexpected fields

                // 1. Upsert (Insert or Update) the document record
                const doc = await DoctorDocument.findOneAndUpdate(
                    { doctorId: doctorId, document_type: documentType },
                    {
                        $set: {
                            s3_url: file.location, // S3 URL provided by Multer-S3
                            is_verified: false,
                            uploaded_at: new Date()
                        }
                    },
                    { new: true, upsert: true, runValidators: true, session }
                );
                uploadedDocs.push(doc);
            }
        }

        // 2. Check if all mandatory documents are present
        const mandatoryUploaded = uploadedDocumentNames.filter(name => MANDATORY_DOC_FIELDS.includes(name));
        const allMandatoryUploaded = mandatoryUploaded.length === MANDATORY_DOC_FIELDS.length;

        let finalStatus = 'Inactive';
        if (allMandatoryUploaded) {
            // 3. Update Doctor Status to 'Pending'
            await Doctor.updateOne({ userId: doctorId }, { $set: { status: 'Pending' } }, { session });
            finalStatus = 'Pending';
        }

        await session.commitTransaction();
        session.endSession();

        res.status(201).json({
            success: true,
            message: `Documents processed. Doctor status set to: ${finalStatus}`,
            documents_uploaded: uploadedDocs.map(d => d.document_type),
            doctor_status: finalStatus
        });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();

        console.error('Document upload transaction error:', error);
        // Note: Clean up S3 files on abort is complex and usually handled by a separate process.
        res.status(500).json({ message: 'Transaction failed during document processing.' });
    }
};

/**
 * @route GET /api/doctor/appointments
 * @description Fetch all bookings for the logged-in doctor
 * @access Private (Doctor Role)
 */
exports.getAppointments = async (req, res) => {
    const doctorId = req.userId.id;

    try {
        const appointments = await mongoose.model('Booking').find({
            itemType: 'User',
            itemId: doctorId
        })
            .populate('userId', 'name mobile_number')
            .sort({ booking_date: -1, 'slot.start_time': 1 });

        // Grouping logic
        const grouped = {
            new: [],       // New requests
            upcoming: [],  // Confirmed/Accepted/Assigned
            completed: [], // Completed
            cancelled: []  // Cancelled/Rejected
        };

        appointments.forEach(app => {
            const status = app.status; // status is Case Sensitive as per model enum, but let's be safe

            // Map statuses to groups
            if (['New', 'Pending Payment', 'Upcoming'].includes(status)) {
                // 'Upcoming' is default for COD, 'New' might be default for others.
                // Assuming 'New' means explicitly waiting for doctor action if that flow exists.
                // If 'Upcoming' implies confirmed, it goes to upcoming.
                // Re-reading user request: "New booking, appointment confirmed booking"
                // Let's treat 'New' and 'Pending Payment' as "New Bookings" needing attention/payment.
                // 'Upcoming' usually means scheduled. 

                // Refined logic based on standard flows:
                if (status === 'New' || status === 'Pending Payment') {
                    grouped.new.push(app);
                } else if (['Confirmed', 'Accepted', 'Assigned', 'Upcoming', 'Approved'].includes(status)) {
                    grouped.upcoming.push(app);
                } else if (status === 'Completed') {
                    grouped.completed.push(app);
                } else if (['Cancelled', 'Rejected', 'Refunded', 'Failed'].includes(status)) {
                    grouped.cancelled.push(app);
                } else {
                    // Fallback
                    grouped.upcoming.push(app);
                }
            } else if (['Confirmed', 'Accepted', 'Assigned', 'Approved'].includes(status)) {
                grouped.upcoming.push(app);
            } else if (status === 'Completed') {
                grouped.completed.push(app);
            } else if (['Cancelled', 'Rejected', 'Refunded', 'Failed'].includes(status)) {
                grouped.cancelled.push(app);
            }
        });

        res.status(200).json({ success: true, appointments: grouped });
    } catch (error) {
        console.error('Get appointments error:', error);
        res.status(500).json({ message: 'Server error fetching appointments.' });
    }
};

/**
 * @route POST /api/doctor/slots
 * @description Update doctor's working hours (which drives slot generation)
 * @access Private (Doctor Role)
 * @payload { working_hours: [{ day: 'Monday', start: '09:00', end: '17:00' }] }
 */
exports.manageSlots = async (req, res) => {
    const doctorId = req.userId.id;
    const { working_hours } = req.body;

    if (!working_hours || !Array.isArray(working_hours)) {
        return res.status(400).json({ message: 'Invalid working_hours format.' });
    }

    try {
        const doctor = await Doctor.findOne({ userId: doctorId });
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor profile not found.' });
        }

        doctor.working_hours = working_hours;
        await doctor.save();

        res.status(200).json({ success: true, message: 'Working hours updated.', working_hours: doctor.working_hours });
    } catch (error) {
        console.error('Manage slots error:', error);
        res.status(500).json({ message: 'Server error updating slots.', error: error.message });
    }
};

/**
 * @route PUT /api/doctor/profile
 * @description Update doctor's professional details
 * @access Private (Doctor Role)
 * @payload { consultation_fee, experience, about, specializations }
 */
exports.updateProfile = async (req, res) => {
    const doctorId = req.userId.id;
    const { consultation_fee, experience, about, specializations } = req.body;

    try {
        const doctor = await Doctor.findOne({ userId: doctorId });
        if (!doctor) {
            return res.status(404).json({ message: 'Doctor profile not found.' });
        }

        if (consultation_fee !== undefined) doctor.consultation_fee = consultation_fee;
        if (experience !== undefined) doctor.experience = experience;
        if (about !== undefined) doctor.about = about;
        if (specializations !== undefined) doctor.specializations = specializations;

        await doctor.save();

        res.status(200).json({ success: true, message: 'Profile updated.', doctor });
    } catch (error) {
        console.error('Update doctor profile error:', error);
        res.status(500).json({ message: 'Server error updating profile.' });
    }
};

/**
 * @route PUT /api/doctor/appointments/:bookingId/status
 * @description Update status of a specific booking (e.g. to 'Completed', 'Cancelled')
 * @access Private (Doctor Role)
 */
exports.updateBookingStatus = async (req, res) => {
    const doctorId = req.userId.id;
    const { bookingId } = req.params;
    const { status } = req.body;

    const VALID_STATUSES = ['Completed', 'Cancelled', 'Confirmed', 'Accepted'];

    if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ message: 'Invalid status update.' });
    }

    try {
        // Find booking that belongs to this doctor
        const booking = await mongoose.model('Booking').findOne({ _id: bookingId, itemId: doctorId });

        if (!booking) {
            return res.status(404).json({ message: 'Booking not found or does not belong to you.' });
        }

        booking.status = status;
        await booking.save();

        res.status(200).json({ success: true, message: `Booking marked as ${status}`, booking });
    } catch (error) {
        console.error('Update booking status error:', error);
        res.status(500).json({ message: 'Server error updating booking status.' });
    }
};