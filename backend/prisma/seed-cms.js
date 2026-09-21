// backend/prisma/seed-cms.js
// Run once: node prisma/seed-cms.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding homepage CMS…');

  // ---------- COLLECTIONS ----------
  const collections = [
    { name: 'Wedding',  slug: 'wedding',  color: '#B58B3A', displayOrder: 0 },
    { name: 'Bridal',   slug: 'bridal',   color: '#8B2E4A', displayOrder: 1 },
    { name: 'Festival', slug: 'festival', color: '#C1662F', displayOrder: 2 },
    { name: 'Daily',    slug: 'daily',    color: '#4A5D4E', displayOrder: 3 },
  ];

  for (const c of collections) {
    await prisma.collection.upsert({
      where: { slug: c.slug },
      update: { color: c.color, displayOrder: c.displayOrder, isActive: true },
      create: c,
    });
    console.log(`  ✓ Collection: ${c.name}`);
  }

  // ---------- TESTIMONIALS ----------
  const existingTestimonials = await prisma.testimonial.count();
  if (existingTestimonials === 0) {
    const testimonials = [
      {
        name: 'Ananya S.', city: 'Mumbai', rating: 5, displayOrder: 0,
        text: 'The craftsmanship is stunning. My bridal set arrived beautifully packaged and exactly as shown.',
      },
      {
        name: 'Priya M.', city: 'Bengaluru', rating: 5, displayOrder: 1,
        text: 'Bought a daily-wear chain — light, elegant, and the gold purity certificate was included.',
      },
      {
        name: 'Ritu K.', city: 'Delhi', rating: 5, displayOrder: 2,
        text: "Ordered for my mother's anniversary. The team helped with sizing over WhatsApp. Wonderful service.",
      },
    ];
    for (const t of testimonials) {
      await prisma.testimonial.create({ data: t });
      console.log(`  ✓ Testimonial: ${t.name}`);
    }
  } else {
    console.log(`  · Skipped testimonials (${existingTestimonials} already exist)`);
  }

  // ---------- EDITORIAL ----------
  const existingEditorial = await prisma.homepageEditorial.findFirst();
  if (!existingEditorial) {
    await prisma.homepageEditorial.create({
      data: {
        eyebrow: 'Our Story',
        heading: 'Heirlooms crafted with intention',
        body:
          'Every Kritya piece begins as a sketch and ends as a memory. Our karigars shape each design by hand, using responsibly sourced gold and stones — so what you wear today becomes what your daughter treasures tomorrow.',
        ctaText: 'Read Our Story',
        ctaLink: '/about',
        imageUrl: null,
        statValue: '25+',
        statLabel: 'Years of Trust',
        isActive: true,
      },
    });
    console.log('  ✓ Editorial banner created');
  } else {
    console.log('  · Skipped editorial (already exists)');
  }

  console.log('✅ Seeding complete.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });