import Image from 'next/image';

export default function Hero() {
    return (
        <section className="relative h-[60vh] md:h-[80vh] w-full overflow-hidden bg-stone-900">
            {/* Placeholder for Hero Image - In a real app, use next/image with a real source */}
            {/* Since we don't have a real image, we will use a color placeholder or a generate_image result if requested, but for now a styled div */}
            <div className="absolute inset-0 bg-stone-300">
                {/* Ideally an image here. Accessing public folder or external URL which I can't guarantee now. */}
                <div className="flex h-full w-full items-center justify-center bg-stone-200 text-stone-400">
                    [メインビジュアル画像: 中華料理のイメージ]
                </div>
            </div>

            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40" />

            {/* Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white">
                <h1 className="mb-4 text-4xl font-bold tracking-wide md:text-6xl lg:text-7xl drop-shadow-lg">
                    和風中華 佐分利
                </h1>
                <p className="max-w-md px-4 text-lg font-light tracking-wider md:text-2xl drop-shadow-md">
                    美山の四季と共に味わう、<br className="md:hidden" />心づくしの中華。
                </p>
            </div>
        </section>
    );
}
