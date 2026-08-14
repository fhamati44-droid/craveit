export default function MoodLabSkeleton() {
  return (
    <div className="px-4 space-y-4">
      <div className="h-7 w-56 skeleton-t rounded-lg" />
      <div className="h-4 w-72 skeleton-t rounded" />
      <div className="h-10 w-32 skeleton-t rounded-xl" />
      <div className="h-px bg-tamam-outline/20 my-3" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-tamam-surface-lowest rounded-2xl overflow-hidden border border-tamam-outline/20">
          <div className="h-44 skeleton-t" />
          <div className="p-4 space-y-2">
            <div className="h-4 w-3/4 skeleton-t rounded" />
            <div className="h-3 w-1/2 skeleton-t rounded" />
            <div className="h-3 w-2/3 skeleton-t rounded" />
            <div className="flex gap-2 mt-2">
              <div className="h-11 flex-1 skeleton-t rounded-xl" />
              <div className="h-11 flex-1 skeleton-t rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}