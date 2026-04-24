export function RestaurantSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white/5 animate-pulse">
      <div className="h-44 skeleton" />
      <div className="p-4 space-y-2">
        <div className="h-5 w-2/3 skeleton rounded-lg" />
        <div className="h-4 w-1/2 skeleton rounded-lg" />
        <div className="h-4 w-1/3 skeleton rounded-lg" />
      </div>
    </div>
  );
}

export function DealSkeleton() {
  return (
    <div className="w-64 h-36 rounded-2xl skeleton flex-shrink-0" />
  );
}

export function MenuItemSkeleton() {
  return (
    <div className="flex gap-4 p-4 bg-white/5 rounded-2xl animate-pulse">
      <div className="flex-1 space-y-2">
        <div className="h-5 w-3/4 skeleton rounded-lg" />
        <div className="h-4 w-full skeleton rounded-lg" />
        <div className="h-4 w-1/3 skeleton rounded-lg" />
      </div>
      <div className="w-20 h-20 skeleton rounded-xl flex-shrink-0" />
    </div>
  );
}