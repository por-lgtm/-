import { Metadata } from 'next';
import Navbar from '../../components/restaurant/Navbar';
import Hero from '../../components/restaurant/Hero';
import MenuSection from '../../components/restaurant/MenuSection';
import AccessSection from '../../components/restaurant/AccessSection';
import Footer from '../../components/restaurant/Footer';

export const metadata: Metadata = {
    title: '和風中華 佐分利 | 京都・美山の美味しい中華',
    description: '京都府南丹市美山町にある和風中華佐分利（さぶり）。地元の食材を使った美味しい中華料理をご提供します。ランチ・ディナー・テイクアウトも承っております。',
};

export default function RestaurantPage() {
    return (
        <div className="flex min-h-screen flex-col bg-white font-sans text-stone-900">
            <Navbar />
            <main className="flex-1">
                <Hero />
                <MenuSection />
                <AccessSection />
            </main>
            <Footer />
        </div>
    );
}
