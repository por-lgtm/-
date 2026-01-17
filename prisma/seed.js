const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const items = [
        { name: 'ボックスシーツ', unit: '枚', formulaType: 'SIMPLE', id: 'box-sheet' },
        { name: 'デュベカバー', unit: '枚', formulaType: 'SIMPLE', id: 'duvet-cover' },
        { name: '枕カバー', unit: '枚', formulaType: 'SIMPLE', id: 'pillow-cover' },
        { name: 'バスタオル', unit: '枚', formulaType: 'TOWEL_B', id: 'bath-towel' },
        { name: 'フェイスタオル', unit: '枚', formulaType: 'TOWEL_F', id: 'face-towel' },
    ];

    for (const item of items) {
        await prisma.item.upsert({
            where: { id: item.id },
            update: {},
            create: item,
        });

        // Initialize stock snapshot if not exists
        const stock = await prisma.stockSnapshot.findUnique({
            where: { itemId: item.id }
        });

        if (!stock) {
            await prisma.stockSnapshot.create({
                data: {
                    itemId: item.id,
                    shelfCount: 0
                }
            });
        }
    }

    console.log('Seeding completed.');
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
