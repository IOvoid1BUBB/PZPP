import { Skeleton } from '@/components/ui/skeleton'

export default function StudentLoading() {
  return (
    <section aria-label="Ładowanie kursów" className="flex-1">
      <Skeleton className="mb-5 h-12 w-64 max-w-full" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-border bg-card p-3">
            <Skeleton className="h-24 w-full rounded-lg sm:h-28" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-8 w-28" />
          </div>
        ))}
      </div>
    </section>
  )
}
