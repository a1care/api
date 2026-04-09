export const MOCK_ROLES = [
    { _id: 'role_doctor_id', name: 'Doctor', description: 'Medical Professional' },
    { _id: 'role_nurse_id', name: 'Nurse', description: 'Nursing Staff' },
];

export const MOCK_DOCTORS = [
    {
        _id: 'doc_1',
        name: 'Vamsi Krishna',
        specialization: ['Cardiologist', 'General Physician'],
        rating: 4.8,
        startExperience: '12',
        consultationFee: 650,
        about: 'Experienced cardiologist with over 12 years of practice in heart healthcare.',
        workingHours: '9:00 AM - 6:00 PM',
        roleId: 'role_doctor_id',
        isRegistered: true,
    },
    {
        _id: 'doc_2',
        name: 'Kiran Kumar',
        specialization: ['Neurologist'],
        rating: 4.9,
        startExperience: '8',
        consultationFee: 800,
        about: 'Specialist in neurological disorders and brain health.',
        workingHours: '10:00 AM - 4:00 PM',
        roleId: 'role_doctor_id',
        isRegistered: true,
        status: 'Active'
    },
    {
        _id: 'doc_pending',
        name: 'Anita Sharma',
        specialization: ['Pediatrician'],
        rating: 0,
        startExperience: '2020-05-15',
        consultationFee: 500,
        about: 'Pediatrician specialized in child nutrition and health.',
        workingHours: '11:00 AM - 5:00 PM',
        roleId: 'role_doctor_id',
        isRegistered: false,
        status: 'Pending',
        documents: [
            { type: 'Medical Degree', url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf' },
            { type: 'Identity Proof', url: 'https://via.placeholder.com/800x600?text=Aadhar+Card' }
        ],
        mobileNumber: '+91 9999988888'
    }
];

export const MOCK_SERVICES = [
    { _id: 'serv_1', name: 'Doctor Consult', title: 'Consultation', type: 'Health', imageUrl: 'https://via.placeholder.com/152' },
    { _id: 'serv_2', name: 'Home Nursing', title: 'Nursing', type: 'Care', imageUrl: 'https://via.placeholder.com/152' },
    { _id: 'serv_hospital_op', name: 'Hospital Visit', title: 'OP Booking', type: 'Hospital', imageUrl: 'https://via.placeholder.com/152' },
];

export const MOCK_SUBSERVICES = [
    { _id: 'sub_cardio', name: 'Cardiology', description: 'Heart and blood vessel health', serviceId: 'serv_1', imageUrl: 'https://via.placeholder.com/152' },
    { _id: 'sub_gp', name: 'General Physician', description: 'Common illnesses and health checkups', serviceId: 'serv_1', imageUrl: 'https://via.placeholder.com/152' },
    { _id: 'sub_pedia', name: 'Pediatrics', description: 'Child health and nutrition', serviceId: 'serv_1', imageUrl: 'https://via.placeholder.com/152' },
];

export const MOCK_CHILD_SERVICES = [
    // GP Sub-service children
    {
        _id: 'child_gp_home',
        name: 'GP Home Consultation',
        description: 'General checkup at your doorstep',
        price: 800,
        subServiceId: 'sub_gp',
        serviceId: 'serv_1',
        bookingType: 'SCHEDULED',
        selectionType: 'SELECT',
        fulfillmentMode: 'HOME_VISIT',
        allowedRoleIds: ['role_doctor_id']
    },
    {
        _id: 'child_gp_virtual',
        name: 'GP Video Consult',
        description: 'Quick consultation over video call',
        price: 400,
        subServiceId: 'sub_gp',
        serviceId: 'serv_1',
        bookingType: 'SCHEDULED',
        selectionType: 'SELECT',
        fulfillmentMode: 'VIRTUAL',
        allowedRoleIds: ['role_doctor_id']
    },
    // Hospital OP
    {
        _id: 'child_op_1',
        name: 'General OP Consult',
        description: 'Out-patient consultation at A1care Hospital',
        price: 200,
        subServiceId: 'sub_hospital_id',
        serviceId: 'serv_hospital_op',
        bookingType: 'SCHEDULED',
        selectionType: 'ASSIGN',
        fulfillmentMode: 'HOSPITAL_VISIT'
    }
];

export const MOCK_SLOTS = [
    { startingTime: '09:00 AM', endingTime: '09:30 AM' },
    { startingTime: '10:00 AM', endingTime: '10:30 AM' },
    { startingTime: '11:00 AM', endingTime: '11:30 AM' },
    { startingTime: '02:00 PM', endingTime: '02:30 PM' },
    { startingTime: '04:00 PM', endingTime: '04:30 PM' },
];
