import { ArrowUp, ArrowDown } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, trend, trendValue, color = 'primary' }) => {
    const colorClasses = {
        primary: 'bg-primary-light text-primary',
        success: 'bg-success-light text-success',
        warning: 'bg-warning-light text-warning',
        danger: 'bg-danger-light text-danger',
        info: 'bg-info-light text-info'
    };

    return (
        <div className="bg-white rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 border border-transparent hover:border-primary/10 group">
            <div className="flex justify-between items-start">
                <div className="flex flex-col">
                    <span className="text-gray-500 font-medium text-sm mb-1">{title}</span>
                    <h3 className="text-2xl font-bold text-dark-header mb-2">{value}</h3>

                    {trend && (
                        <div className={`flex items-center text-xs font-semibold ${trend === 'up' ? 'text-success' : 'text-danger'}`}>
                            {trend === 'up' ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
                            <span>{trendValue}</span>
                            <span className="text-gray-400 ml-1 font-normal">vs last month</span>
                        </div>
                    )}
                </div>

                <div className={`p-3 rounded-lg ${colorClasses[color]} group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="h-6 w-6" />
                </div>
            </div>
        </div>
    );
};

export default StatCard;
