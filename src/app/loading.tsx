export default function Loading() {
  return (
    <div
      className="min-h-screen bg-[#F0E9E3] flex items-center justify-center"
      aria-label="Loading"
      role="status"
    >
      <div className="flex flex-col items-center gap-4">
        {/* Brand-colored spinner */}
        <div className="relative w-12 h-12">
          <div
            className={
              "absolute inset-0 rounded-full border-4 border-[#CDBBAD]/40"
            }
            aria-hidden="true"
          />
          <div
            className={
              "absolute inset-0 rounded-full border-4 border-transparent " +
              "border-t-[#5D1C34] animate-spin"
            }
            aria-hidden="true"
          />
        </div>
        <p className="text-sm text-[#899581] font-medium">Loading…</p>
      </div>
    </div>
  );
}
