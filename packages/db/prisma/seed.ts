import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data (dev only)
  await prisma.etfScoringResult.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.engineRun.deleteMany();
  await prisma.proposal.deleteMany();
  await prisma.positionSnapshot.deleteMany();
  await prisma.position.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.portfolio.deleteMany();
  await prisma.priceHistory.deleteMany();
  await prisma.etfMetrics.deleteMany();
  await prisma.isinMapping.deleteMany();
  await prisma.instrument.deleteMany();
  await prisma.ipsPolicyVersion.deleteMany();
  await prisma.ipsPolicy.deleteMany();

  console.log('✅ Cleared existing data');

  // 1. Create IPS Policy
  const ipsPolicy = await prisma.ipsPolicy.create({
    data: {
      userId: 'user_default',
      versions: {
        create: {
          version: '1.0.0',
          isActive: true,
          activatedAt: new Date(),
          config: {
            version: '1.0.0',
            profile: 'aggressivo',
            phase: 'ETF-only',
            horizon_years: 4,
            pac_monthly_eur: {
              min: 150,
              max: 200,
              default: 200,
            },
            targets: [
              {
                bucket: 'equity_global',
                weight: 1.0,
                description: 'Azionario globale diversificato',
              },
            ],
            rebalance: {
              mode: 'contributi-only',
              frequency: 'monthly',
              bands: {
                asset_class_abs: 0.05,
                instrument_abs: 0.03,
              },
              sell_threshold_multiplier: 2.0,
            },
            constraints: {
              min_instruments: 1,
              max_instruments: 3,
              max_single_instrument_weight: 1.0,
              allowed_domiciles: ['IE', 'LU', 'DE'],
              required_ucits: true,
            },
          },
        },
      },
    },
    include: {
      versions: true,
    },
  });

  console.log('✅ Created IPS Policy:', ipsPolicy.id);

  // 2. Create Top ETF Instruments
  const etfData = [
    {
      isin: 'IE00B4L5Y983',
      name: 'iShares Core MSCI World UCITS ETF USD (Acc)',
      ticker: 'IWDA',
      yahooTicker: 'IWDA.AS',
      exchange: 'AMS',
      category: 'equity_global',
      domicile: 'IE',
      provider: 'iShares',
      ter: 0.2,
      aum: 62_000_000_000,
      replicationMethod: 'Physical',
      distributionPolicy: 'Accumulating',
    },
    {
      isin: 'IE00BK5BQT80',
      name: 'Vanguard FTSE All-World UCITS ETF USD (Acc)',
      ticker: 'VWCE',
      yahooTicker: 'VWCE.DE',
      exchange: 'XETRA',
      category: 'equity_global',
      domicile: 'IE',
      provider: 'Vanguard',
      ter: 0.22,
      aum: 15_000_000_000,
      replicationMethod: 'Physical',
      distributionPolicy: 'Accumulating',
    },
    {
      isin: 'LU1781541179',
      name: 'Amundi MSCI World UCITS ETF EUR (C)',
      ticker: 'EUNL',
      yahooTicker: 'EUNL.DE',
      exchange: 'XETRA',
      category: 'equity_global',
      domicile: 'LU',
      provider: 'Amundi',
      ter: 0.38,
      aum: 3_500_000_000,
      replicationMethod: 'Physical',
      distributionPolicy: 'Accumulating',
    },
  ];

  for (const etf of etfData) {
    const instrument = await prisma.instrument.create({
      data: {
        isin: etf.isin,
        name: etf.name,
        ticker: etf.ticker,
        currency: 'EUR',
        type: 'ETF',
        category: etf.category,
        domicile: etf.domicile,
        provider: etf.provider,
        isUcits: true,
        isinMapping: {
          create: {
            yahooTicker: etf.yahooTicker,
            exchange: etf.exchange,
            verified: true,
            lastVerifiedAt: new Date(),
          },
        },
        etfMetrics: {
          create: {
            ter: etf.ter,
            aum: etf.aum,
            replicationMethod: etf.replicationMethod,
            distributionPolicy: etf.distributionPolicy,
            dataCompleteness: 0.9,
            lastUpdated: new Date(),
          },
        },
      },
    });

    console.log(`✅ Created ETF: ${etf.ticker} (${etf.isin})`);
  }

  // 3. Create Paper Portfolio
  const portfolio = await prisma.portfolio.create({
    data: {
      name: 'Portfolio Paper',
      type: 'paper',
      userId: 'user_default',
    },
  });

  console.log('✅ Created Paper Portfolio:', portfolio.id);

  console.log('\n🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
