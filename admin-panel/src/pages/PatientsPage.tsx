import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
    Users,
    Search,
    Filter,
    Plus,
    MoreVertical,
    ChevronLeft,
    ChevronRight,
    Phone,
    Mail,
    Calendar,
    MapPin
} from "lucide-react";

interface Patient {
    _id: string;
    name: string;
    email?: string;
    mobileNumber: string;
    gender: string;
    dateOfBirth?: string;
    createdAt: string;
}

export function PatientsPage() {
    const { data: patients, isLoading } = useQuery({
        queryKey: ["admin_patients"],
        queryFn: async () => {
            const res = await api.get("/admin/patients");
            return res.data.data as Patient[];
        }
    });

    if (isLoading) return <div className="p-4 py-20 text-center text-[var(--text-muted)] font-bold">Accessing Patient Registry...</div>;

    return (
        <div className="flex-col gap-4">
            <header className="flex justify-between items-center" style={{ marginBottom: '24px' }}>
                <div>
                    <h1 className="brand-name" style={{ fontSize: '1.75rem' }}>Patients</h1>
                    <p className="text-xs muted font-bold uppercase tracking-wider mt-1">Manage user accounts and health profiles</p>
                </div>
                <button className="button primary shadow-lg">
                    <Plus size={18} />
                    <span>Invite Patient</span>
                </button>
            </header>

            <div className="card p-0 overflow-hidden" style={{ border: 'none' }}>
                <div className="p-4 border-b flex justify-between items-center bg-[var(--card-bg)]">
                    <div className="relative" style={{ width: '320px' }}>
                        <Search className="absolute text-[var(--text-muted)]" size={16} style={{ left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                        <input
                            placeholder="Search patients..."
                            className="w-full bg-[var(--bg-main)] border-none px-4 text-sm"
                            style={{ paddingLeft: '40px', height: '44px', borderRadius: '12px' }}
                        />
                    </div>
                    <button className="button secondary h-10 px-4 text-xs font-bold gap-2">
                        <Filter size={16} />
                        <span>Filter</span>
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="management-table">
                        <thead>
                            <tr>
                                <th style={{ paddingLeft: '24px' }}>PATIENT</th>
                                <th>CONTACT</th>
                                <th>GENDER</th>
                                <th>JOINED</th>
                                <th className="text-center">STATUS</th>
                                <th className="text-center">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Array.isArray(patients) && patients.length > 0 ? (
                                patients.map((patient) => (
                                    <tr key={patient._id}>
                                        <td style={{ paddingLeft: '24px' }}>
                                            <div className="font-bold text-[var(--text-main)]" style={{ fontSize: '0.9rem' }}>{patient.name || "Anonymous User"}</div>
                                            <div className="text-xs muted flex items-center gap-1 mt-1">ID: {patient._id.slice(-6).toUpperCase()}</div>
                                        </td>
                                        <td>
                                            <div className="flex-col">
                                                <div className="text-sm font-medium text-[var(--text-main)] flex items-center gap-1"><Phone size={12} className="text-[var(--text-muted)]" /> {patient.mobileNumber}</div>
                                                {patient.email && <div className="text-xs muted flex items-center gap-1"><Mail size={12} /> {patient.email}</div>}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="badge secondary text-xs uppercase">{patient.gender || 'Not Specified'}</span>
                                        </td>
                                        <td>
                                            <div className="text-sm text-[var(--text-muted)] font-medium">
                                                {new Date(patient.createdAt).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex justify-center">
                                                <span className="badge success text-xs">Active</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="justify-center flex">
                                                <button className="icon-button"><MoreVertical size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <div className="flex-col items-center gap-2">
                                            <div className="icon-box" style={{ width: '64px', height: '64px', margin: '0 auto 12px' }}>
                                                <Users size={32} />
                                            </div>
                                            <p className="font-bold text-[var(--text-main)]">No patients registered</p>
                                            <p className="text-xs muted">User accounts will appear here once they register on the app</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t flex justify-between items-center bg-[var(--card-bg)] text-xs muted font-bold uppercase tracking-wider">
                    <p>Total Registered: <strong>{patients?.length || 0}</strong></p>
                    <div className="flex gap-2">
                        <button className="icon-button" style={{ border: '1px solid #f1f5f9', borderRadius: '8px' }}><ChevronLeft size={16} /></button>
                        <button className="icon-button" style={{ border: '1px solid #f1f5f9', borderRadius: '8px', color: '#1e293b' }}><ChevronRight size={16} /></button>
                    </div>
                </div>
            </div>
        </div>
    );
}
