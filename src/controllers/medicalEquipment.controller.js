const MedicalEquipment = require('../models/medicalEquipment.model');

// --- Public ---

exports.getAllEquipment = async (req, res) => {
    try {
        const { sort, filter } = req.query;
        let query = { is_active: true };
        let sortOption = {};

        if (filter === 'popular') {
            // Logic for popular (e.g., based on booking count - placeholder for now)
        }

        if (sort === 'price_low_high') {
            sortOption.rental_price = 1;
        } else if (sort === 'price_high_low') {
            sortOption.rental_price = -1;
        }

        const equipment = await MedicalEquipment.find(query).sort(sortOption);
        res.status(200).json({ success: true, equipment });
    } catch (error) {
        console.error('Get all equipment error:', error);
        res.status(500).json({ message: 'Server error fetching equipment.' });
    }
};

exports.getEquipmentById = async (req, res) => {
    try {
        const item = await MedicalEquipment.findById(req.params.id);
        if (!item) return res.status(404).json({ message: 'Equipment not found.' });
        res.status(200).json({ success: true, item });
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching equipment details.' });
    }
};

// --- Admin ---

exports.createEquipment = async (req, res) => {
    try {
        const { name, description, rental_price } = req.body;
        const image_url = req.file ? req.file.location : '';

        const newItem = await MedicalEquipment.create({
            name,
            description,
            rental_price,
            image_url
        });

        res.status(201).json({ success: true, message: 'Equipment created.', item: newItem });
    } catch (error) {
        console.error('Create equipment error:', error);
        res.status(500).json({ message: 'Server error creating equipment.' });
    }
};
