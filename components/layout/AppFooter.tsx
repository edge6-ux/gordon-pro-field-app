import Link from 'next/link'

export default function AppFooter() {
  return (
    <footer className="bg-green-dark py-5">
      <div className="max-w-5xl mx-auto px-4 text-center">
        <p className="font-body text-sm text-white/60">
          Gordon Pro Tree Service &middot; (770) 271-6072
        </p>
        <div className="border-t border-white/10 mt-4 pt-3">
          <Link
            href="/operator"
            className="font-body text-[11px] text-white/30 hover:text-white/60 transition-colors duration-150"
          >
            Crew access
          </Link>
        </div>
      </div>
    </footer>
  )
}
