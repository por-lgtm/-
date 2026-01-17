
import { Phone, MapPin, Clock, Instagram } from 'lucide-react';

export default function Footer() {
    return (
        <footer id="contact" className="bg-stone-900 py-12 text-stone-300">
            <div className="container mx-auto px-4">
                <div className="flex flex-col gap-8 md:flex-row md:justify-between">
                    {/* Brand & Info */}
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-white">和風中華 佐分利</h2>
                        <div className="flex flex-col gap-2">
                            <div className="flex items-start gap-3">
                                <MapPin size={20} className="mt-1 text-red-500" />
                                <p>〒601-0721<br />京都府南丹市美山町上平屋盆徳5−2</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Phone size={20} className="text-red-500" />
                                <a href="tel:07017993780" className="hover:text-white">070-1799-3780</a>
                            </div>
                        </div>
                    </div>

                    {/* Hours */}
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <Clock size={20} className="mt-1 text-red-500" />
                            <div>
                                <p className="font-bold text-white">営業時間</p>
                                <p>11:00〜22:00<br /><span className="text-sm opacity-80">（ラストオーダー 21:00）</span></p>
                            </div>
                        </div>
                        <div>
                            <p className="font-bold text-white">定休日</p>
                            <p>火曜</p>
                        </div>
                        <div>
                            <p className="font-bold text-white">席数</p>
                            <p>テーブル6席</p>
                        </div>
                    </div>

                    {/* Fixed CTA for Mobile (Simulated here as standard links for Desktop) */}
                    <div className="flex flex-col items-start gap-4">
                        <p className="font-bold text-white">公式SNS</p>
                        <a href="#" className="flex items-center gap-2 rounded-lg bg-stone-800 px-4 py-2 hover:bg-stone-700">
                            <Instagram size={20} />
                            <span>Instagram</span>
                        </a>
                    </div>
                </div>

                <div className="mt-12 border-t border-stone-800 pt-8 text-center text-sm text-stone-500">
                    <p>&copy; {new Date().getFullYear()} Restaurant Saburi. All Rights Reserved.</p>
                </div>
            </div>

            {/* Mobile Sticky CTA */}
            <div className="fixed bottom-0 left-0 right-0 z-50 grid grid-cols-3 border-t border-stone-200 bg-white p-2 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] md:hidden">
                <a href="https://maps.app.goo.gl/Ji47U8bjkoWaSpNc7?g_st=ic" target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center gap-1 text-xs font-bold text-stone-600">
                    <MapPin size={24} className="text-red-600" />
                    地図
                </a>
                <a href="tel:07017993780" className="flex flex-col items-center justify-center gap-1 text-xs font-bold text-stone-600">
                    <Phone size={24} className="text-red-600" />
                    電話
                </a>
                <a href="#" className="flex flex-col items-center justify-center gap-1 text-xs font-bold text-stone-600">
                    <Instagram size={24} className="text-pink-600" />
                    Instagram
                </a>
            </div>
        </footer>
    );
}
