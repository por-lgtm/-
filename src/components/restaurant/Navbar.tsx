import Link from 'next/link';
import { Phone, Calendar } from 'lucide-react';

export default function Navbar() {
    return (
        <nav className="sticky top-0 z-50 w-full border-b border-stone-200 bg-white/95 backdrop-blur-sm">
            {/* Top Bar (Mobile/Desktop) - Main Actions */}
            <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
                {/* Logo / Brand */}
                <Link href="/中華屋" className="flex items-center gap-2">
                    <span className="text-xl font-bold tracking-tighter text-stone-900 md:text-2xl">
                        和風中華 佐分利
                    </span>
                </Link>

                {/* Right Side Actions */}
                <div className="flex items-center gap-4">
                    <a
                        href="tel:07017993780"
                        className="hidden items-center gap-2 text-sm font-medium text-stone-600 transition-colors hover:text-red-700 md:flex"
                    >
                        <Phone size={18} />
                        <span>070-1799-3780</span>
                    </a>
                    <div className="hidden md:block">
                        <Link
                            href="#contact"
                            className="rounded-full bg-red-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-800"
                        >
                            ご予約・お問い合わせ
                        </Link>
                    </div>
                    {/* Mobile Menu Button can go here if needed, for simplicity sticking to global nav below */}
                </div>
            </div>

            {/* Global Navigation - Desktop */}
            <div className="hidden border-t border-stone-100 bg-stone-50 md:block">
                <div className="container mx-auto px-4">
                    <ul className="flex justify-center gap-8 py-3 text-sm font-medium text-stone-700">
                        <li><Link href="/中華屋" className="hover:text-red-700">ホーム</Link></li>
                        <li><Link href="#menu" className="hover:text-red-700">メニュー</Link></li>
                        <li><Link href="#seats" className="hover:text-red-700">店内・お席</Link></li>
                        <li><Link href="#access" className="hover:text-red-700">アクセス</Link></li>
                        <li><Link href="#contact" className="hover:text-red-700">その他</Link></li>
                    </ul>
                </div>
            </div>
        </nav>
    );
}
