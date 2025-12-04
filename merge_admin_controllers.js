const fs = require('fs');

const existingFile = 'src/controllers/admin.controller.js';
const newFile = 'src/controllers/admin.extended.controller.js';

let existingContent = fs.readFileSync(existingFile, 'utf8');
const newContent = fs.readFileSync(newFile, 'utf8');

// Extract only the new functions (skip the require statements at the top)
const newFunctions = newContent.substring(newContent.indexOf('// ===='));

// Remove the last line "module.exports = exports;" from new functions
const cleanedNewFunctions = newFunctions.replace('module.exports = exports;', '').trim();

// Add DoctorDocument require if not present
if (!existingContent.includes("require('../models/doctorDocument.model')")) {
    existingContent = existingContent.replace(
        "const mongoose = require('mongoose');",
        "const mongoose = require('mongoose');\nconst DoctorDocument = require('../models/doctorDocument.model');\nconst Service = require('../models/service.model');\nconst ServiceItem = require('../models/serviceItem.model');"
    );
}

// Append new functions before the last line
existingContent = existingContent.trimEnd() + '\n\n' + cleanedNewFunctions + '\n';

fs.writeFileSync(existingFile, existingContent, 'utf8');
console.log('✓ Merged admin.extended.controller.js into admin.controller.js');
console.log('✓ Added: Service CRUD, Service Item CRUD, Doctor listing APIs');
