
export default function MenuSection() {
    return (
        <section id="menu" className="bg-stone-50 py-16 md:py-24">
            <div className="container mx-auto px-4">
                <div className="mb-12 text-center">
                    <h2 className="mb-4 text-3xl font-bold text-stone-900 md:text-4xl">お料理</h2>
                    <p className="text-stone-600">四季折々の食材を使用した、和風中華をお楽しみください。</p>
                </div>

                {/* Lunch */}
                <div className="mb-16">
                    <h3 className="mb-8 border-l-4 border-red-700 pl-4 text-2xl font-bold text-stone-800">ランチ</h3>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {/* Menu Item Card */}
                        <div className="bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                            <h4 className="mb-2 text-xl font-bold text-stone-900">和風中華ランチコース</h4>
                            <p className="mb-2 text-sm text-stone-500">海鮮 ¥3,500 / 肉 ¥3,800</p>
                            <p className="text-stone-700">その日の新鮮な食材を使った贅沢なコース。</p>
                        </div>
                        <div className="bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                            <h4 className="mb-2 text-xl font-bold text-stone-900">和風中華御前</h4>
                            <p className="mb-2 text-sm text-stone-500">¥2,800</p>
                            <p className="text-stone-700">ご飯付き、日替わり九種盛り（デザート含む）。</p>
                        </div>
                        <div className="bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                            <h4 className="mb-2 text-xl font-bold text-stone-900">麺流 麺ランチ</h4>
                            <p className="mb-2 text-sm text-stone-500">¥2,000</p>
                            <p className="text-stone-700">季節の麺、点心、春巻き、デザートのセット。</p>
                        </div>
                        <div className="bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                            <h4 className="mb-2 text-xl font-bold text-stone-900">ラーメン各種セット</h4>
                            <p className="mb-2 text-sm text-stone-500">¥2,000</p>
                            <p className="text-stone-700">お好きなラーメンにミニ炒飯が付いたセット。</p>
                        </div>
                        <div className="bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                            <h4 className="mb-2 text-xl font-bold text-stone-900">ラーメン単品</h4>
                            <p className="mb-2 text-sm text-stone-500">¥1,500</p>
                            <p className="text-stone-700">昔ながらの味わい。</p>
                        </div>
                    </div>
                </div>

                {/* Dinner */}
                <div className="mb-16">
                    <h3 className="mb-8 border-l-4 border-red-700 pl-4 text-2xl font-bold text-stone-800">ディナー</h3>
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                            <h4 className="mb-2 text-xl font-bold text-stone-900">佐分利コース（2名様〜）</h4>
                            <p className="mb-2 text-sm text-stone-500">¥6,000</p>
                            <p className="text-stone-700">前菜・スープ・点心・揚げ物・海鮮・肉・麺飯・デザート・中国茶など充実のフルコース。</p>
                        </div>
                        <div className="bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                            <h4 className="mb-2 text-xl font-bold text-stone-900">北京ダックコース（2名様〜）</h4>
                            <p className="mb-2 text-sm text-stone-500">¥6,000</p>
                            <p className="text-stone-700"><span className="font-bold text-red-600">※前日までの連絡推奨</span><br />特別な日のための北京ダックコース。</p>
                        </div>
                    </div>
                    <p className="mt-4 text-center text-stone-600">その他、アラカルトメニューも多数ご用意しております。</p>
                </div>

                {/* Takeout */}
                <div>
                    <h3 className="mb-8 border-l-4 border-red-700 pl-4 text-2xl font-bold text-stone-800">テイクアウト</h3>
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                            <h4 className="mb-2 text-xl font-bold text-stone-900">Takeout限定オードブル</h4>
                            <p className="mb-2 text-sm text-stone-500">4〜5人前 ¥6,000 / 6〜7人前 ¥8,000</p>
                            <p className="text-stone-700"><span className="font-bold text-red-600">※前日までの連絡推奨</span></p>
                        </div>
                        <div className="bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                            <h4 className="mb-2 text-xl font-bold text-stone-900">佐分利弁当</h4>
                            <p className="mb-2 text-sm text-stone-500">¥3,000</p>
                            <p className="text-stone-700">内容は日替わりの場合がございます。</p>
                        </div>
                    </div>
                </div>

                <div className="mt-12 rounded-lg bg-stone-100 p-6 text-sm text-stone-600">
                    <ul className="list-inside list-disc space-y-1">
                        <li>仕入れ状況により内容・価格が変更になる場合があります。</li>
                        <li>コース／テイクアウトは前日までのご連絡をおすすめします。</li>
                        <li>アレルギーをお持ちの方はご注文時にお知らせください。</li>
                    </ul>
                </div>

            </div>
        </section>
    );
}
