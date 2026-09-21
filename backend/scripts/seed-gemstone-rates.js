const prisma = require('../src/lib/prisma');

const RATES = [
  // Diamonds — VVS
  { type: 'Diamond', clarity: 'VVS',    color: 'D',    ratePerCarat: 45000 },
  { type: 'Diamond', clarity: 'VVS',    color: 'E',    ratePerCarat: 42000 },
  { type: 'Diamond', clarity: 'VVS',    color: 'E-F',  ratePerCarat: 40000 },
  { type: 'Diamond', clarity: 'VVS',    color: 'F-G',  ratePerCarat: 35000 },

  // Diamonds — VVS-VS
  { type: 'Diamond', clarity: 'VVS-VS', color: 'D',    ratePerCarat: 38000 },
  { type: 'Diamond', clarity: 'VVS-VS', color: 'E',    ratePerCarat: 36000 },
  { type: 'Diamond', clarity: 'VVS-VS', color: 'E-F',  ratePerCarat: 34000 },
  { type: 'Diamond', clarity: 'VVS-VS', color: 'EF',   ratePerCarat: 33000 },
  { type: 'Diamond', clarity: 'VVS-VS', color: 'F-G',  ratePerCarat: 30000 },

  // Diamonds — VS1
  { type: 'Diamond', clarity: 'VS1',    color: 'D',    ratePerCarat: 50000 },
  { type: 'Diamond', clarity: 'VS1',    color: 'E',    ratePerCarat: 42000 },
  { type: 'Diamond', clarity: 'VS1',    color: 'E-F',  ratePerCarat: 38000 },

  // Emeralds
  { type: 'Emerald', clarity: 'VVS-VS', color: 'E-F',          ratePerCarat: 32000 },
  { type: 'Emerald', clarity: 'VS',     color: 'G-H',          ratePerCarat: 25000 },

  // Rubies
  { type: 'Ruby',    clarity: 'VVS-VS', color: 'Pigeon Blood', ratePerCarat: 40000 },
  { type: 'Ruby',    clarity: 'VS',     color: 'Red',          ratePerCarat: 28000 },

  // Sapphires
  { type: 'Sapphire', clarity: 'VVS-VS', color: 'Blue',        ratePerCarat: 35000 },
  { type: 'Sapphire', clarity: 'VS',     color: 'Cornflower',  ratePerCarat: 30000 },

  // Pearls
  { type: 'Pearl',    clarity: 'AAA',    color: 'White',       ratePerCarat: 8000 },
  { type: 'Pearl',    clarity: 'AA',     color: 'Cream',       ratePerCarat: 5000 },
];

(async () => {
  let created = 0;
  let skipped = 0;

  for (const r of RATES) {
    const existing = await prisma.gemstoneRate.findFirst({
      where: { type: r.type, clarity: r.clarity, color: r.color, currency: 'INR' },
    });
    if (existing) {
      skipped++;
      continue;
    }
    await prisma.gemstoneRate.create({
      data: { ...r, currency: 'INR', isActive: true },
    });
    created++;
  }

  console.log(`Created ${created}, skipped (already exist) ${skipped}`);
  await prisma.$disconnect();
})();