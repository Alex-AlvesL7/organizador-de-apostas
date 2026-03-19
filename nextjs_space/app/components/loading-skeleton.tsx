export default function LoadingSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-pulse"
        >
          <div className="bg-slate-200 h-12"></div>
          <div className="p-5 space-y-4">
            <div className="flex justify-between">
              <div className="h-4 bg-slate-200 rounded w-20"></div>
              <div className="h-4 bg-slate-200 rounded w-16"></div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
                <div className="h-4 bg-slate-200 rounded flex-1"></div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-slate-200 rounded-full"></div>
                <div className="h-4 bg-slate-200 rounded flex-1"></div>
              </div>
            </div>
            <div className="h-10 bg-slate-200 rounded-lg"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
