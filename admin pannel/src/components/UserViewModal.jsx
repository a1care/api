import { X, User, Mail, Phone, Calendar, MapPin } from 'lucide-react';

const UserViewModal = ({ user, onClose }) => {
    if (!user) return null;

    return (
        <div className="fixed inset-0 bg-dark/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-primary-light text-primary flex items-center justify-center font-bold text-2xl">
                            {user.name?.charAt(0) || <User className="h-8 w-8" />}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-dark-header">{user.name || 'Unknown User'}</h2>
                            <p className="text-sm text-gray-500">@{user.name?.toLowerCase().replace(/\s/g, '') || 'user'}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-dark transition-colors"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                {/* User Details */}
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                            <Mail className="h-5 w-5 text-primary" />
                            <div>
                                <p className="text-xs text-gray-500 font-semibold">Email</p>
                                <p className="text-sm text-dark-body">{user.email || 'Not provided'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                            <Phone className="h-5 w-5 text-primary" />
                            <div>
                                <p className="text-xs text-gray-500 font-semibold">Mobile</p>
                                <p className="text-sm text-dark-body">{user.mobile_number || 'Not provided'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                            <User className="h-5 w-5 text-primary" />
                            <div>
                                <p className="text-xs text-gray-500 font-semibold">Role</p>
                                <p className="text-sm text-dark-body font-semibold">{user.role || 'User'}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                            <Calendar className="h-5 w-5 text-primary" />
                            <div>
                                <p className="text-xs text-gray-500 font-semibold">Joined</p>
                                <p className="text-sm text-dark-body">
                                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {user.address && (
                        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                            <MapPin className="h-5 w-5 text-primary mt-0.5" />
                            <div>
                                <p className="text-xs text-gray-500 font-semibold">Address</p>
                                <p className="text-sm text-dark-body">{user.address}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Close Button */}
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-gray-100 text-dark-body rounded-lg hover:bg-gray-200 font-semibold"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UserViewModal;
