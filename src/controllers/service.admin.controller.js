const Service = require('../models/service.model'); // Your service model

exports.createService = async (req, res) => {
    // Check if the upload middleware successfully processed the file
    if (!req.file) {
        return res.status(400).json({ message: 'No image file uploaded.' });
    }

    const { name, title } = req.body;
    
    // The image URL is provided by multer-s3 in req.file.location
    const image_url = req.file.location; 

    try {
        const newService = await Service.create({
            name,
            title,
            image_url // Store the S3 URL in your MongoDB Service document
        });

        res.status(201).json({ 
            success: true, 
            message: 'Service created and image uploaded.', 
            service: newService 
        });

    } catch (error) {
        console.error('Service creation error:', error);
        // Important: If service creation fails, you should ideally delete the S3 object
        // to prevent orphaned files.
        res.status(500).json({ message: 'Server error creating service.' });
    }
};