import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { 
  Star, 
  MessageSquare, 
  User, 
  CheckCircle, 
  XSquare, 
  Filter,
  Search,
  MoreVertical,
  ShieldCheck,
  Eye,
  EyeOff
} from "lucide-react";
import { toast } from "sonner";

export default function ReviewsPage() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const res = await api.get("/admin/reviews");
      return res.data.data;
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      return await api.put(`/admin/reviews/${id}/status`, { status });
    },
    onSuccess: () => {
      toast.success("Review status updated");
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to update review");
    }
  });

  const filteredReviews = reviews?.filter((r: any) => {
    const matchesStatus = filterStatus === "All" || r.status === filterStatus;
    const matchesSearch = 
      r.comment?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.userId?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            User Feedback
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          </h1>
          <p className="text-slate-500 font-medium">Moderate and monitor platform reviews across all services.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative group w-full md:w-80">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                <Search className="text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
            </div>
            <input 
              type="text" 
              placeholder="Filter by comment or user..."
              className="w-full pl-12 pr-4 h-12 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-100/50 focus:border-blue-300 transition-all shadow-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <select 
              className="appearance-none bg-white border border-slate-200 rounded-2xl pl-5 pr-12 h-12 text-[10px] font-black uppercase tracking-widest text-slate-700 outline-none focus:ring-4 focus:ring-blue-100/50 transition-all shadow-sm cursor-pointer"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Feedback</option>
              <option value="Active">Published Only</option>
              <option value="Hidden">Hidden Only</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <Filter size={14} />
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReviews?.map((review: any) => (
          <div key={review._id} className="bg-white rounded-[24px] border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group">
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                    <User size={20} className="text-slate-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{review.userId?.name || "Unknown User"}</h4>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  review.status === "Active" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                }`}>
                  {review.status}
                </div>
              </div>

              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    size={16} 
                    className={star <= review.rating ? "text-amber-400 fill-amber-400" : "text-slate-200"} 
                  />
                ))}
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 min-h-[100px]">
                <p className="text-sm text-slate-600 leading-relaxed italic">
                  "{review.comment || "No comment provided."}"
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {review.bookingType === "Doctor" ? "🩺 Doctor Consult" : "⚕️ Home Service"}
                </div>
                <div className="flex gap-2">
                  {review.status === "Active" ? (
                    <button 
                      onClick={() => updateStatusMutation.mutate({ id: review._id, status: "Hidden" })}
                      className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors"
                      title="Hide Review"
                    >
                      <EyeOff size={18} />
                    </button>
                  ) : (
                    <button 
                      onClick={() => updateStatusMutation.mutate({ id: review._id, status: "Active" })}
                      className="p-2 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors"
                      title="Show Review"
                    >
                      <Eye size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!filteredReviews?.length && (
        <div className="py-20 text-center bg-white rounded-[40px] border border-dashed border-slate-200">
          <MessageSquare size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-500 font-bold">No reviews match your filter.</p>
        </div>
      )}
    </div>
  );
}
