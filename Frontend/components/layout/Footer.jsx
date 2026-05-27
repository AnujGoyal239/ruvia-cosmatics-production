import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-brand-olive text-white py-5 md:py-10 border-t border-white/10">
      <div className="container px-6 md:px-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 md:gap-20">
        <div className="sm:col-span-2 lg:col-span-2">
          <Link href="/" className="font-serif text-6xl font-bold tracking-tighter block mb-10">
            RUVIA<span className="text-brand-pink">.</span>
          </Link>
          <p className="text-white/60 max-w-sm mb-12 leading-relaxed text-xs md:text-sm font-medium tracking-wide uppercase">
            Pharmacological precision meets the luxury of self-care. Formulated by dermatologists, designed for your most glowing results.
          </p>
          <div className="flex gap-6 mb-2">
            <a href="#" aria-label="Instagram" className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-brand-pink hover:text-brand-dark transition-all duration-500 border border-white/5">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
            </a>
            <a href="#" aria-label="Facebook" className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center hover:bg-brand-pink hover:text-brand-dark transition-all duration-500 border border-white/5">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            </a>
          </div>
        </div>

        <div>
          <h4 className="text-[10px] uppercase tracking-[0.5em] font-black text-brand-pink mb-8">Exploration</h4>
          <ul className="flex flex-col gap-4">
            {["Shop Rituals", "The Science", "Support", "FAQ"].map((item) => (
              <li key={item}>
                <Link href={item === "Support" ? "/support" : "#"} className="text-white/50 hover:text-white transition-colors text-[10px] font-bold tracking-widest uppercase">
                  {item}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-[10px] uppercase tracking-[0.5em] font-black text-brand-pink mb-8">Contact</h4>
          <ul className="flex flex-col gap-4 text-white/50 text-[10px] font-bold tracking-widest uppercase">
            <li className="hover:text-white transition-colors cursor-pointer break-all">
              <a href="mailto:info@ruviacosmetics.com">info@ruviacosmetics.com</a>
            </li>
            <li className="hover:text-white transition-colors cursor-pointer">
              <a href="https://wa.me/919610006695" target="_blank" rel="noopener noreferrer">
                WhatsApp +91 96100 06695
              </a>
            </li>
            <li className="opacity-100">New York • Paris • London</li>
          </ul>
        </div>
      </div>
      <div className="container mx-auto px-6 md:px-12 pt-5 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[7px] md:text-[8px] font-black tracking-[0.4em] uppercase text-white/50">
        <span suppressHydrationWarning>&copy; {new Date().getFullYear()} Ruvia Cosmetics Laboratory. All rights reserved.</span>
        <div className="flex gap-8">
           <Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link>
           <Link href="#" className="hover:text-white transition-colors">Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}

