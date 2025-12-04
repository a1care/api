import { ArrowUp, ArrowDown } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, trend, color = 'medical-primary' }) => {
    const colorStyles = {
        'medical-primary': 'bg-teal-50 text-medical-primary',
        'medical-secondary': 'bg-slate-50 text-medical-secondary',
        'medical-accent': 'bg-cyan-50 text-medical-accent',
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-emerald-50 text-emerald-600',
        purple: 'bg-violet-50 text-violet-600',
        orange: 'bg-amber-50 text-amber-600',
    };

    return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100 hover:shadow-medical transition-all duration-200 group">
            <div className="flex justify-between items-start">
                <div>
                    <p className="text-xs font-semibold text-medical-muted uppercase tracking-wider">{title}</p>
                    <h3 className="text-2xl font-bold text-medical-text mt-2 group-hover:text-medical-primary transition-colors">{value}</h3>
                </div>
                <div className={`p-3 rounded-lg ${colorStyles[color]} transition-colors`}>
                    <Icon className="h-6 w-6" />
                </div>
            </div>

            {trend && (
                <div className="mt-4 flex items-center text-sm">
                    <span
                        className={`flex items-center font-medium ${trend.isPositive ? 'text-emerald-600' : 'text-red-600'
                            }`}
                    >
                        {trend.isPositive ? (
                            <ArrowUp className="h-4 w-4 mr-1" />
                        ) : (
                            <ArrowDown className="h-4 w-4 mr-1" />
                        )}
                        {Math.abs(trend.value)}%
                    </span>
                    <span className="text-slate-400 ml-2 text-xs">vs last month</span>
                </div>
            )}
        </div>
    );
};

export default StatCard;
