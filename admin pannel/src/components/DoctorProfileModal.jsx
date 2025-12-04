import { useState } from 'react';
import { X, FileText, CheckCircle, XCircle, Download, Eye, Calendar, Mail, Phone, MapPin, Award, Briefcase, Star } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const DoctorProfileModal = ({ doctor, onClose, onUpdate }) => {
    const [loading, setLoading] = useState(false);
    const [profileData, setProfileData] = useState(null);
    const [selectedDocument, setSelectedDocument] = useState(null);

    // Fetch complete profile when modal opens
    useState(() => {
        fetchDoctorProfile();
    }, []);

    const fetchDoctorProfile = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_URL}/admin/doctors/${doctor._id}/profile`);
            if (response.data.success) {
                setProfileData(response.data.doctor);
            }
        } catch (error) {
            console.error('Error fetching doctor profile:', error);
            toast.error('Failed to load doctor profile');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyDocument = async (documentId, status, reason = '') => {
        try {
            await axios.put(`${API_URL}/admin/doctors/${doctor._id}/verify-document`, {
                documentId,
                status,
                reason
            });
            toast.success(`Document ${status === 'verified' ? 'verified' : 'rejected'} successfully`);
            fetchDoctorProfile(); // Refresh data
            if (onUpdate) onUpdate();
        } catch (error) {
            console.error('Error verifying document:', error);
            toast.error('Failed to update document status');
        }
    };

    if (loading || !profileData) {
        return (
            <div className="fixed inset-0 bg-dark/50 flex items-center justify-center z-50 backdrop-blur-sm">
                <div className="bg-white rounded-xl p-8 shadow-2xl">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="text-center mt-4 text-gray-600">Loading profile...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-dark/50 flex items-center justify-center z-50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-xl max-w-5xl w-full my-8 shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-primary to-primary-hover p-6 flex justify-between items-center z-10">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-2xl border-2 border-white/30">
                            {profileData.userId?.name?.charAt(0) || 'D'}
                        </div>
                        <div className="text-white">
                            <h2 className="text-2xl font-bold">Dr. {profileData.userId?.name}</h2>
                            <p className="text-white/80 text-sm">{profileData.specializations?.join(', ') || 'General Physician'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoCard icon={Mail} label="Email" value={profileData.userId?.email || 'Not provided'} />
                        <InfoCard icon={Phone} label="Phone" value={profileData.userId?.mobile_number} />
                        <InfoCard icon={Briefcase} label="Experience" value={`${profileData.experience || 0} years`} />
                        <InfoCard icon={Star} label="Rating" value={`${profileData.satisfaction_rating || 0}/5.0`} />
                        <InfoCard icon={Award} label="Patients Treated" value={profileData.patients_treated || 0} />
                        <InfoCard icon={Calendar} label="Consultation Fee" value={`₹${profileData.consultation_fee || 0}`} />
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-gray-600">Status:</span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${profileData.status === 'Active' ? 'bg-success-light text-success' :
                                profileData.status === 'Pending' ? 'bg-warning-light text-warning' :
                                    'bg-danger-light text-danger'
                            }`}>
                            {profileData.status}
                        </span>
                    </div>

                    {/* About */}
                    {profileData.about && (
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="text-sm font-bold text-dark-header mb-2">About</h3>
                            <p className="text-sm text-gray-600">{profileData.about}</p>
                        </div>
                    )}

                    {/* Documents Section */}
                    <div>
                        <h3 className="text-lg font-bold text-dark-header mb-4 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Uploaded Documents
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {profileData.documents?.map((doc) => (
                                <DocumentCard
                                    key={doc.id}
                                    document={doc}
                                    onVerify={() => handleVerifyDocument(doc.id, 'verified')}
                                    onReject={() => handleVerifyDocument(doc.id, 'rejected')}
                                    onView={() => setSelectedDocument(doc)}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="sticky bottom-0 bg-gray-50 p-4 flex justify-end gap-3 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-gray-200 text-dark-body rounded-lg hover:bg-gray-300 font-semibold transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* Document Viewer Modal */}
            {selectedDocument && (
                <DocumentViewer document={selectedDocument} onClose={() => setSelectedDocument(null)} />
            )}
        </div>
    );
};

const InfoCard = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <div className="p-2 bg-primary-light rounded-lg text-primary">
            <Icon className="h-5 w-5" />
        </div>
        <div>
            <p className="text-xs text-gray-500 font-medium">{label}</p>
            <p className="text-sm font-bold text-dark-header">{value}</p>
        </div>
    </div>
);

const DocumentCard = ({ document, onVerify, onReject, onView }) => (
    <div className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
        <div className="relative h-40 bg-gray-100 cursor-pointer" onClick={onView}>
            <img src={document.url} alt={document.type} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-dark/0 hover:bg-dark/10 transition-colors flex items-center justify-center">
                <Eye className="h-8 w-8 text-white opacity-0 hover:opacity-100 transition-opacity" />
            </div>
        </div>
        <div className="p-3">
            <div className="flex justify-between items-start mb-2">
                <h4 className="text-sm font-bold text-dark-header">{document.type}</h4>
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${document.status === 'verified' ? 'bg-success-light text-success' :
                        document.status === 'rejected' ? 'bg-danger-light text-danger' :
                            'bg-warning-light text-warning'
                    }`}>
                    {document.status}
                </span>
            </div>
            {document.status === 'pending' && (
                <div className="flex gap-2 mt-3">
                    <button
                        onClick={onVerify}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-success text-white rounded-lg hover:bg-success/90 transition-colors text-xs font-semibold"
                    >
                        <CheckCircle className="h-3 w-3" />
                        Verify
                    </button>
                    <button
                        onClick={onReject}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-danger text-white rounded-lg hover:bg-danger/90 transition-colors text-xs font-semibold"
                    >
                        <XCircle className="h-3 w-3" />
                        Reject
                    </button>
                </div>
            )}
        </div>
    </div>
);

const DocumentViewer = ({ document, onClose }) => (
    <div className="fixed inset-0 bg-dark/80 flex items-center justify-center z-[60] backdrop-blur-sm p-4" onClick={onClose}>
        <div className="bg-white rounded-xl max-w-4xl w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-dark-header">{document.type}</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-dark transition-colors">
                    <X className="h-6 w-6" />
                </button>
            </div>
            <div className="bg-gray-100 rounded-lg overflow-hidden">
                <img src={document.url} alt={document.type} className="w-full h-auto max-h-[70vh] object-contain" />
            </div>
            <div className="flex justify-end gap-3 mt-4">
                <a
                    href={document.url}
                    download
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-semibold"
                >
                    <Download className="h-4 w-4" />
                    Download
                </a>
            </div>
        </div>
    </div>
);

export default DoctorProfileModal;
