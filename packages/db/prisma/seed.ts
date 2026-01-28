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

  // Personal Finance tables
  await prisma.spendingAlert.deleteMany();
  await prisma.llmAnalysisCache.deleteMany();
  await prisma.importBatch.deleteMany();
  await prisma.personalTransaction.deleteMany();
  await prisma.accountBalanceHistory.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.expenseCategory.deleteMany();

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

  // 4. Create Default Expense Categories
  const defaultCategories = [
    // Income Categories
    { name: 'salary', nameIt: 'Stipendio', icon: 'Briefcase', color: '#22C55E', sortOrder: 1 },
    { name: 'freelance', nameIt: 'Freelance', icon: 'Laptop', color: '#10B981', sortOrder: 2 },
    { name: 'investments_income', nameIt: 'Rendite Investimenti', icon: 'TrendingUp', color: '#059669', sortOrder: 3 },
    { name: 'other_income', nameIt: 'Altre Entrate', icon: 'Plus', color: '#047857', sortOrder: 4 },

    // Expense Categories
    { name: 'groceries', nameIt: 'Alimentari', icon: 'ShoppingCart', color: '#F97316', sortOrder: 10 },
    { name: 'restaurants', nameIt: 'Ristoranti', icon: 'Utensils', color: '#FB923C', sortOrder: 11 },
    { name: 'transport', nameIt: 'Trasporti', icon: 'Car', color: '#3B82F6', sortOrder: 12 },
    { name: 'fuel', nameIt: 'Carburante', icon: 'Fuel', color: '#60A5FA', sortOrder: 13 },
    { name: 'utilities', nameIt: 'Utenze', icon: 'Zap', color: '#EAB308', sortOrder: 14 },
    { name: 'rent', nameIt: 'Affitto', icon: 'Home', color: '#A855F7', sortOrder: 15 },
    { name: 'mortgage', nameIt: 'Mutuo', icon: 'Building', color: '#9333EA', sortOrder: 16 },
    { name: 'healthcare', nameIt: 'Salute', icon: 'Heart', color: '#EC4899', sortOrder: 17 },
    { name: 'entertainment', nameIt: 'Svago', icon: 'Gamepad2', color: '#8B5CF6', sortOrder: 18 },
    { name: 'shopping', nameIt: 'Shopping', icon: 'ShoppingBag', color: '#F43F5E', sortOrder: 19 },
    { name: 'clothing', nameIt: 'Abbigliamento', icon: 'Shirt', color: '#E11D48', sortOrder: 20 },
    { name: 'subscriptions', nameIt: 'Abbonamenti', icon: 'CreditCard', color: '#6366F1', sortOrder: 21 },
    { name: 'education', nameIt: 'Formazione', icon: 'GraduationCap', color: '#0EA5E9', sortOrder: 22 },
    { name: 'travel', nameIt: 'Viaggi', icon: 'Plane', color: '#14B8A6', sortOrder: 23 },
    { name: 'insurance', nameIt: 'Assicurazioni', icon: 'Shield', color: '#64748B', sortOrder: 24 },
    { name: 'taxes', nameIt: 'Tasse', icon: 'Receipt', color: '#78716C', sortOrder: 25 },
    { name: 'gifts', nameIt: 'Regali', icon: 'Gift', color: '#DB2777', sortOrder: 26 },
    { name: 'pets', nameIt: 'Animali', icon: 'PawPrint', color: '#A78BFA', sortOrder: 27 },
    { name: 'personal_care', nameIt: 'Cura Personale', icon: 'Sparkles', color: '#F472B6', sortOrder: 28 },
    { name: 'phone_internet', nameIt: 'Telefono/Internet', icon: 'Smartphone', color: '#38BDF8', sortOrder: 29 },
    { name: 'bank_fees', nameIt: 'Commissioni Bancarie', icon: 'Landmark', color: '#94A3B8', sortOrder: 30 },
    { name: 'other_expense', nameIt: 'Altre Spese', icon: 'MoreHorizontal', color: '#9CA3AF', sortOrder: 99 },
  ];

  for (const category of defaultCategories) {
    await prisma.expenseCategory.create({
      data: {
        userId: null, // System category
        name: category.name,
        nameIt: category.nameIt,
        icon: category.icon,
        color: category.color,
        isSystem: true,
        isActive: true,
        sortOrder: category.sortOrder,
      },
    });
  }

  console.log(`✅ Created ${defaultCategories.length} default expense categories`);

  // 5. Create Sample Bank Account for demo
  const bankAccount = await prisma.bankAccount.create({
    data: {
      userId: 'user_default',
      name: 'Conto Principale',
      type: 'CHECKING',
      currency: 'EUR',
      initialBalance: 5000,
      currentBalance: 5000,
      isActive: true,
      color: '#3B82F6',
      icon: 'Landmark',
    },
  });

  console.log('✅ Created sample bank account:', bankAccount.id);

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
