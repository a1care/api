const Ambulance = require('../models/ambulance.model');

// --- Public ---

exports.getAllAmbulances = async (req, res) => {
    try {
        const { sort, filter } = req.query;
        let query = { is_active: true };
        let sortOption = {};

        if (filter === 'popular') {
            // Logic for popular
        }

        if (sort === 'price_low_high') {
            sortOption.base_fare = 1;
        } else if (sort === 'price_high_low') {
            sortOption.base_fare = -1;
        }

        const ambulances = await Ambulance.find(query).sort(sortOption);
        res.status(200).json({ success: true, ambulances });
    } catch (error) {
        console.error('Get all ambulances error:', error);
        res.status(500).json({ message: 'Server error fetching ambulances.' });
    }
};

exports.getAmbulanceById = async (req, res) => {
    try {
        const ambulance = await Ambulance.findById(req.params.id);
        if (!ambulance) return res.status(404).json({ message: 'Ambulance not found.' });
        res.status(200).json({ success: true, ambulance });
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching ambulance details.' });
    }
};

// --- Admin ---

exports.createAmbulance = async (req, res) => {
    try {
        const { vehicle_number, type, price_per_km, base_fare, driver_name, driver_phone } = req.body;

        const newAmbulance = await Ambulance.create({
            vehicle_number,
            type,
            price_per_km,
            base_fare,
            driver_name,
            driver_phone
        });

        res.status(201).json({ success: true, message: 'Ambulance added.', ambulance: newAmbulance });
    } catch (error) {
        console.error('Create ambulance error:', error);
        res.status(500).json({ message: 'Server error creating ambulance.' });
    }
};
