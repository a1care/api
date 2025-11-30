const LabTest = require('../models/labTest.model');

// --- Public ---

exports.getAllLabTests = async (req, res) => {
    try {
        const { sort, filter } = req.query;
        let query = { is_active: true };
        let sortOption = {};

        if (filter === 'popular') {
            // Logic for popular (e.g., based on booking count - placeholder for now)
        }

        if (sort === 'price_low_high') {
            sortOption.price = 1;
        } else if (sort === 'price_high_low') {
            sortOption.price = -1;
        }

        const tests = await LabTest.find(query).sort(sortOption);
        res.status(200).json({ success: true, tests });
    } catch (error) {
        console.error('Get all lab tests error:', error);
        res.status(500).json({ message: 'Server error fetching lab tests.' });
    }
};

exports.getLabTestById = async (req, res) => {
    try {
        const test = await LabTest.findById(req.params.id);
        if (!test) return res.status(404).json({ message: 'Lab test not found.' });
        res.status(200).json({ success: true, test });
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching lab test details.' });
    }
};

// --- Admin ---

exports.createLabTest = async (req, res) => {
    try {
        const { name, description, price } = req.body;
        const image_url = req.file ? req.file.location : '';

        const newTest = await LabTest.create({
            name,
            description,
            price,
            image_url
        });

        res.status(201).json({ success: true, message: 'Lab test created.', test: newTest });
    } catch (error) {
        console.error('Create lab test error:', error);
        res.status(500).json({ message: 'Server error creating lab test.' });
    }
};
