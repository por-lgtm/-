export default function AccessSection() {
    return (
        <section id="access" className="bg-white py-16 md:py-24">
            <div className="container mx-auto px-4">
                <div className="mb-12 text-center">
                    <h2 className="mb-4 text-3xl font-bold text-stone-900 md:text-4xl">アクセス</h2>
                    <p className="text-stone-600">京都府南丹市美山町上平屋盆徳5−2</p>
                </div>

                <div className="grid gap-8 lg:grid-cols-2">
                    {/* Map Area */}
                    <div className="h-[400px] w-full overflow-hidden rounded-lg bg-stone-200">
                        {/* Google Maps Embed */}
                        <iframe
                            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d13038.567891234!2d135.456789!3d35.123456!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMzXCsDIwJzM0LjUiTiAxMzXCsDMwJzM1LjMiRQ!5e0!3m2!1sja!2sjp!4v1600000000000!5m2!1sja!2sjp"
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            allowFullScreen={true}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                            title="Google Maps"
                        ></iframe>
                        {/* Note: I used a placeholder embed code. In a real scenario, use the actual coordinates for "京都府南丹市美山町上平屋盆徳5−2" or the embed link provided (though link provided was a share link, not embed code, using standard generic map loc for safety or need valid embed parameters) */}
                        {/* Actually, user gave a link: https://maps.app.goo.gl/Ji47U8bjkoWaSpNc7?g_st=ic */}
                        {/* For production, we'd fetch the specific embed code for that location. For now, putting a button below as requested is most important. */}
                    </div>

                    {/* Info Area */}
                    <div className="flex flex-col justify-center">
                        <div className="mb-6 rounded-lg border border-red-100 bg-red-50 p-6">
                            <h3 className="mb-2 text-lg font-bold text-red-800">駐車場について</h3>
                            <p className="text-stone-700">
                                お店は見つかりますが、駐車場が分かりにくいので、下の図をご確認ください。<br />
                                <span className="font-bold">駐車場：4台</span>
                            </p>
                        </div>

                        <div className="mb-6 rounded-lg bg-stone-100 p-4 text-center">
                            <span className="text-stone-400">[アクセス図画像 access-map.png 表示予定]</span>
                        </div>

                        <div className="text-center">
                            <a
                                href="https://maps.app.goo.gl/Ji47U8bjkoWaSpNc7?g_st=ic"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-block rounded-full bg-red-700 px-8 py-3 text-white shadow-lg transition-transform hover:scale-105 hover:bg-red-800"
                            >
                                Googleマップで開く
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
