import { useState } from 'react';
import { ChevronLeft, ChevronRight, Search, ArrowUpDown, Filter } from 'lucide-react';

const DataTable = ({ columns, data, isLoading, onRowClick, actions }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const itemsPerPage = 10;

    // Filter data
    const filteredData = data.filter((item) =>
        Object.values(item).some(
            (value) =>
                value &&
                value.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    // Sort data
    const sortedData = [...filteredData].sort((a, b) => {
        if (!sortConfig.key) return 0;
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });

    // Pagination
    const totalPages = Math.ceil(sortedData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = sortedData.slice(startIndex, startIndex + itemsPerPage);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    if (isLoading) {
        return (
            <div className="w-full h-64 flex items-center justify-center bg-white rounded-xl shadow-card">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-card overflow-hidden border border-gray-100">
            {/* Header Actions */}
            <div className="p-5 flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative w-full sm:w-72">
                    <input
                        type="text"
                        placeholder="Search records..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border-none rounded-lg focus:ring-2 focus:ring-primary/50 transition-all text-sm text-dark-body"
                    />
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 text-dark-body rounded-lg hover:bg-gray-100 transition-colors text-sm font-medium">
                        <Filter className="h-4 w-4" />
                        Filter
                    </button>
                    {actions && <div className="flex gap-2">{actions}</div>}
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50/50 border-y border-gray-100">
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    onClick={() => column.sortable && handleSort(column.key)}
                                    className={`px-6 py-4 text-left text-xs font-bold text-dark-body uppercase tracking-wider ${column.sortable ? 'cursor-pointer hover:bg-gray-50 transition-colors' : ''
                                        }`}
                                >
                                    <div className="flex items-center gap-2">
                                        {column.label}
                                        {column.sortable && (
                                            <ArrowUpDown className={`h-3 w-3 ${sortConfig.key === column.key ? 'text-primary' : 'text-gray-400'}`} />
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {paginatedData.length > 0 ? (
                            paginatedData.map((item, index) => (
                                <tr
                                    key={item._id || index}
                                    onClick={() => onRowClick && onRowClick(item)}
                                    className={`hover:bg-primary-light/10 transition-colors ${onRowClick ? 'cursor-pointer' : ''
                                        }`}
                                >
                                    {columns.map((column) => (
                                        <td
                                            key={column.key}
                                            className="px-6 py-4 text-sm text-dark-body whitespace-nowrap"
                                        >
                                            {column.render
                                                ? column.render(item[column.key], item)
                                                : item[column.key] || '-'}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td
                                    colSpan={columns.length}
                                    className="px-6 py-16 text-center text-gray-500 text-sm"
                                >
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <div className="p-4 bg-gray-50 rounded-full">
                                            <Search className="h-8 w-8 text-gray-300" />
                                        </div>
                                        <p className="font-medium">No records found</p>
                                        <p className="text-xs text-gray-400">Try adjusting your search or filters</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/30">
                <span className="text-sm text-gray-500">
                    Showing <span className="font-bold text-dark-header">{startIndex + 1}</span> to{' '}
                    <span className="font-bold text-dark-header">{Math.min(startIndex + itemsPerPage, sortedData.length)}</span> of{' '}
                    <span className="font-bold text-dark-header">{sortedData.length}</span> entries
                </span>
                <div className="flex gap-2">
                    <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg bg-gray-100 hover:bg-primary hover:text-white disabled:opacity-50 disabled:hover:bg-gray-100 disabled:hover:text-gray-500 transition-all"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg bg-gray-100 hover:bg-primary hover:text-white disabled:opacity-50 disabled:hover:bg-gray-100 disabled:hover:text-gray-500 transition-all"
                    >
                        <ChevronRight className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DataTable;
