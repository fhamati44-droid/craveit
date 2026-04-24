export function RestaurantSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white shadow-card">
      <div className="h-32 skeleton" />
      <div className="p-3 space-y-2">
        <div className="h-4 w-3/4 skeleton rounded-lg ml-auto" />
        <div className="h-3 w-1/2 skeleton rounded-lg ml-auto" />
        <div className="h-3 w-2/3 skeleton rounded-lg ml-auto" />
      </div>
    </div>
  );
}

export function DealSkeleton() {
  return (
    <div className="h-40 skeleton rounded-2xl" />
  );
}

export function MenuItemSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 bg-white border-b border-gray-100 animate-pulse">
      <div className="w-24 h-20 skeleton rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 skeleton rounded-lg ml-auto" />
        <div className="h-3 w-full skeleton rounded-lg" />
        <div className="h-4 w-1/4 skeleton rounded-lg ml-auto" />
      </div>
    </div>
  );
}