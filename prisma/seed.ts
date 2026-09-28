import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting nnichna POS database seeding...');

  // 1. Initialize or update StoreSetting
  const setting = await prisma.storeSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      storeName: 'nnichna',
      storeLogo: '/logo.png',
      address: '123 ซอยสุขุมวิท 39 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพฯ 10110',
      phone: '089-123-4567',
      promptPayId: process.env.PROMPTPAY_ID || '0891234567',
      currency: 'THB',
      taxRate: 0,
      receiptFooter: 'ขอบคุณที่อุดหนุน nnichna! เกี๊ยวซ่าแป้งบางกรอบ ไส้แน่น ทำสดใหม่ทุกวัน ทานให้อร่อยนะคะ 🥟',
      lowStockThreshold: 5,
      orderPrefix: 'NN',
      maxCashierDiscountPct: 15,
    },
  });
  console.log('✅ Store settings initialized:', setting.storeName);

  // 2. Initialize Users with password hashing
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPassword123!';
  const adminHash = await bcrypt.hash(adminPassword, 10);
  const managerHash = await bcrypt.hash('ManagerPassword123!', 10);
  const cashierHash = await bcrypt.hash('CashierPassword123!', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@nnichna.com' },
    update: {},
    create: {
      name: 'ผู้จัดการทั่วไป (Admin)',
      username: 'admin',
      email: process.env.ADMIN_EMAIL || 'admin@nnichna.com',
      passwordHash: adminHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      mustChangePassword: false,
    },
  });

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@nnichna.com' },
    update: {},
    create: {
      name: 'หัวหน้ากะ สมชาย',
      username: 'manager',
      email: 'manager@nnichna.com',
      passwordHash: managerHash,
      role: 'MANAGER',
      status: 'ACTIVE',
    },
  });

  const cashierUser = await prisma.user.upsert({
    where: { email: 'cashier@nnichna.com' },
    update: {},
    create: {
      name: 'แคชเชียร์ สมหญิง',
      username: 'cashier',
      email: 'cashier@nnichna.com',
      passwordHash: cashierHash,
      role: 'CASHIER',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Users seeded: Admin, Manager, Cashier');

  // 3. Categories
  const categoriesData = [
    {
      name: 'เกี๊ยวซ่า',
      slug: 'gyoza',
      icon: '🥟',
      description: 'เกี๊ยวซ่าสูตรเด็ด nnichna ทอดกรอบนอกนุ่มใน แป้งบาง ไส้ฉ่ำ',
      sortOrder: 1,
    },
    {
      name: 'เซ็ตสุดคุ้ม',
      slug: 'sets',
      icon: '🍱',
      description: 'ชุดเซ็ตสุดคุ้มพร้อมเครื่องดื่มและของทานเล่น',
      sortOrder: 2,
    },
    {
      name: 'ของทานเล่น',
      slug: 'snacks',
      icon: '🍟',
      description: 'ของว่างสไตล์ญี่ปุ่นทานคู่กับเกี๊ยวซ่า',
      sortOrder: 3,
    },
    {
      name: 'เครื่องดื่ม',
      slug: 'drinks',
      icon: '🥤',
      description: 'เครื่องดื่มเย็นสดชื่น ดับกระหาย',
      sortOrder: 4,
    },
  ];

  const categories: Record<string, string> = {};
  for (const cat of categoriesData) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon, description: cat.description },
      create: cat,
    });
    categories[cat.slug] = created.id;
  }
  console.log('✅ Categories seeded');

  // 4. Products with Variants and Inventory
  // Product 1: Original Gyoza
  const gyozaOriginal = await prisma.product.upsert({
    where: { sku: 'GYZ-ORIG' },
    update: {},
    create: {
      name: 'เกี๊ยวซ่าต้นตำรับ nnichna',
      description: 'เกี๊ยวซ่าหมูสับต้นตำรับสูตรลับ แป้งบางกรอบ ไส้หมูเน้นๆ พร้อมน้ำจิ้มงาโชยุ',
      image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=500&auto=format&fit=crop&q=80',
      categoryId: categories['gyoza'],
      sku: 'GYZ-ORIG',
      barcode: '885000100011',
      costPrice: 35,
      sellingPrice: 79,
      stock: 45,
      lowStockThreshold: 10,
      status: 'ACTIVE',
      variants: {
        create: [
          { name: '5 ชิ้น', sku: 'GYZ-ORIG-5', price: 79, costPrice: 35, stock: 25 },
          { name: '10 ชิ้น', sku: 'GYZ-ORIG-10', price: 149, costPrice: 65, stock: 15 },
          { name: '20 ชิ้น (ถาดใหญ่)', sku: 'GYZ-ORIG-20', price: 279, costPrice: 120, stock: 5 },
        ],
      },
    },
  });

  // Product 2: Cheese Gyoza
  const gyozaCheese = await prisma.product.upsert({
    where: { sku: 'GYZ-CHS' },
    update: {},
    create: {
      name: 'เกี๊ยวซ่าชีสลาวาเบิร์นไฟ',
      description: 'ท็อปปิ้งชีสมอสซาเรลล่าแน่นๆ พ่นไฟหอมเยิ้ม เข้มข้นสะใจคอชีส',
      image: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=500&auto=format&fit=crop&q=80',
      categoryId: categories['gyoza'],
      sku: 'GYZ-CHS',
      barcode: '885000100012',
      costPrice: 48,
      sellingPrice: 99,
      stock: 18,
      lowStockThreshold: 8,
      status: 'ACTIVE',
      variants: {
        create: [
          { name: '5 ชิ้น', sku: 'GYZ-CHS-5', price: 99, costPrice: 48, stock: 10 },
          { name: '10 ชิ้น', sku: 'GYZ-CHS-10', price: 189, costPrice: 90, stock: 8 },
        ],
      },
    },
  });

  // Product 3: Spicy Tom Yum Gyoza
  const gyozaSpicy = await prisma.product.upsert({
    where: { sku: 'GYZ-SPCY' },
    update: {},
    create: {
      name: 'เกี๊ยวซ่าสไปซี่ซอสหม่าล่า',
      description: 'คลุกเคล้าซอสสไปซี่เผ็ดชาหอมเครื่องเทศ เสิร์ฟพร้อมพริกคั่วกรอบ',
      image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=500&auto=format&fit=crop&q=80',
      categoryId: categories['gyoza'],
      sku: 'GYZ-SPCY',
      barcode: '885000100013',
      costPrice: 42,
      sellingPrice: 89,
      stock: 22,
      lowStockThreshold: 5,
      status: 'ACTIVE',
      variants: {
        create: [
          { name: '5 ชิ้น', sku: 'GYZ-SPCY-5', price: 89, costPrice: 42, stock: 14 },
          { name: '10 ชิ้น', sku: 'GYZ-SPCY-10', price: 169, costPrice: 80, stock: 8 },
        ],
      },
    },
  });

  // Product 4: Teriyaki Gyoza
  await prisma.product.upsert({
    where: { sku: 'GYZ-TERI' },
    update: {},
    create: {
      name: 'เกี๊ยวซ่าซอสเทอริยากิ มาโย',
      description: 'ราดซอสเทอริยากิญี่ปุ่นรสหวานกลมกล่อม ซอสมะนาวมาโย และปลาแห้งคัตสึโอะ',
      image: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=500&auto=format&fit=crop&q=80',
      categoryId: categories['gyoza'],
      sku: 'GYZ-TERI',
      barcode: '885000100014',
      costPrice: 42,
      sellingPrice: 89,
      stock: 30,
      lowStockThreshold: 5,
      status: 'ACTIVE',
      variants: {
        create: [
          { name: '5 ชิ้น', sku: 'GYZ-TERI-5', price: 89, costPrice: 42, stock: 18 },
          { name: '10 ชิ้น', sku: 'GYZ-TERI-10', price: 169, costPrice: 80, stock: 12 },
        ],
      },
    },
  });

  // Product 5: Shrimp Gyoza (Low stock example)
  await prisma.product.upsert({
    where: { sku: 'GYZ-SHRMP' },
    update: {},
    create: {
      name: 'เกี๊ยวซ่ากุ้งจักรพรรดิคำโต',
      description: 'กุ้งสดเนื้อเด้งเต็มคำ คลุกเคล้าน้ำมันงาหอมพิเศษ ชุ่มฉ่ำทุกลูก',
      image: 'https://images.unsplash.com/photo-1541696432-82c6da8ce7bf?w=500&auto=format&fit=crop&q=80',
      categoryId: categories['gyoza'],
      sku: 'GYZ-SHRMP',
      barcode: '885000100015',
      costPrice: 58,
      sellingPrice: 119,
      stock: 4, // Intentionally low stock to test alerts!
      lowStockThreshold: 8,
      status: 'ACTIVE',
    },
  });

  // Product 6: Combo Set A
  await prisma.product.upsert({
    where: { sku: 'SET-A' },
    update: {},
    create: {
      name: 'nnichna Solo Set (เกี๊ยวซ่า 5 ชิ้น + โค้ก)',
      description: 'เกี๊ยวซ่าต้นตำรับ 5 ชิ้น คู่กับโค้กเย็น 1 กระป๋อง อิ่มกำลังดี',
      image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=500&auto=format&fit=crop&q=80',
      categoryId: categories['sets'],
      sku: 'SET-A',
      barcode: '885000200001',
      costPrice: 45,
      sellingPrice: 95,
      stock: 20,
      lowStockThreshold: 5,
      status: 'ACTIVE',
    },
  });

  // Product 7: Party Set B
  await prisma.product.upsert({
    where: { sku: 'SET-PARTY' },
    update: {},
    create: {
      name: 'nnichna Party Box (เกี๊ยวซ่า 20 ชิ้น รวม 4 รส)',
      description: 'รวมเกี๊ยวซ่า 4 รสชาติ ต้นตำรับ, ชีส, สไปซี่, เทอริยากิ รสละ 5 ชิ้น จุใจสำหรับปาร์ตี้',
      image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=500&auto=format&fit=crop&q=80',
      categoryId: categories['sets'],
      sku: 'SET-PARTY',
      barcode: '885000200002',
      costPrice: 160,
      sellingPrice: 349,
      stock: 12,
      lowStockThreshold: 3,
      status: 'ACTIVE',
    },
  });

  // Product 8: Karaage Chicken
  await prisma.product.upsert({
    where: { sku: 'SNK-KARA' },
    update: {},
    create: {
      name: 'ไก่ทอดคาราเกะกรอบสไตล์โตเกียว',
      description: 'สะโพกไก่หมักซอสขิงกระเทียม ทอดร้อนๆ บีบเลมอนสดฉ่ำ',
      image: 'https://images.unsplash.com/photo-1562967914-608f82629710?w=500&auto=format&fit=crop&q=80',
      categoryId: categories['snacks'],
      sku: 'SNK-KARA',
      barcode: '885000300001',
      costPrice: 38,
      sellingPrice: 79,
      stock: 25,
      lowStockThreshold: 5,
      status: 'ACTIVE',
    },
  });

  // Product 9: Wakame Salad
  await prisma.product.upsert({
    where: { sku: 'SNK-WAKA' },
    update: {},
    create: {
      name: 'ยำสาหร่ายวากาเมะเย็น',
      description: 'สาหร่ายวากาเมะญี่ปุ่นคลุกน้ำมันงาและงาขาวคั่ว หอมสดชื่นแก้เลี่ยน',
      image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=500&auto=format&fit=crop&q=80',
      categoryId: categories['snacks'],
      sku: 'SNK-WAKA',
      barcode: '885000300002',
      costPrice: 20,
      sellingPrice: 49,
      stock: 35,
      lowStockThreshold: 5,
      status: 'ACTIVE',
    },
  });

  // Product 10: French Fries
  await prisma.product.upsert({
    where: { sku: 'SNK-FRIES' },
    update: {},
    create: {
      name: 'เฟรนช์ฟรายส์โรยผงโนริสาหร่าย',
      description: 'มันฝรั่งทอดกรอบ โรยผงสาหร่ายนำเข้าจากญี่ปุ่น เคี้ยวเพลิน',
      image: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=500&auto=format&fit=crop&q=80',
      categoryId: categories['snacks'],
      sku: 'SNK-FRIES',
      barcode: '885000300003',
      costPrice: 24,
      sellingPrice: 59,
      stock: 30,
      lowStockThreshold: 5,
      status: 'ACTIVE',
    },
  });

  // Product 11: Green Tea
  await prisma.product.upsert({
    where: { sku: 'DRK-GTEA' },
    update: {},
    create: {
      name: 'ชาเขียวมัทฉะเย็น ไม่หวาน (ขวด 500ml)',
      description: 'ใบชาเขียวแท้จากชิซึโอกะ ต้มสดกลิ่นหอมละมุน ชื่นใจ',
      image: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=500&auto=format&fit=crop&q=80',
      categoryId: categories['drinks'],
      sku: 'DRK-GTEA',
      barcode: '885000400001',
      costPrice: 15,
      sellingPrice: 35,
      stock: 40,
      lowStockThreshold: 8,
      status: 'ACTIVE',
    },
  });

  // Product 12: Coca Cola
  await prisma.product.upsert({
    where: { sku: 'DRK-COKE' },
    update: {},
    create: {
      name: 'โค้ก ออริจินัล (กระป๋อง 325ml)',
      description: 'โคคา-โคล่า แช่เย็นฉ่ำ สดชื่นซ่าสะใจ',
      image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=80',
      categoryId: categories['drinks'],
      sku: 'DRK-COKE',
      barcode: '885000400002',
      costPrice: 14,
      sellingPrice: 25,
      stock: 50,
      lowStockThreshold: 10,
      status: 'ACTIVE',
    },
  });

  // Product 13: Mineral Water
  await prisma.product.upsert({
    where: { sku: 'DRK-WATR' },
    update: {},
    create: {
      name: 'น้ำแร่ธรรมชาติ (ขวด 600ml)',
      description: 'น้ำแร่ธรรมชาติบริสุทธิ์ 100%',
      image: 'https://images.unsplash.com/photo-1559839914-ba2ac5e783ea?w=500&auto=format&fit=crop&q=80',
      categoryId: categories['drinks'],
      sku: 'DRK-WATR',
      barcode: '885000400003',
      costPrice: 9,
      sellingPrice: 20,
      stock: 60,
      lowStockThreshold: 10,
      status: 'ACTIVE',
    },
  });

  console.log('✅ Products and variants seeded');

  // 5. Seed some initial sample orders for dashboard stats & charts!
  const today = new Date();
  const pastOrdersCount = await prisma.order.count();
  if (pastOrdersCount === 0) {
    console.log('📦 Creating sample past sales orders for Dashboard & Reports...');

    // Generate orders over the past 7 days
    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
      const orderDate = new Date();
      orderDate.setDate(today.getDate() - dayOffset);
      orderDate.setHours(12 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 59));

      const ordersOnThisDay = dayOffset === 0 ? 5 : 3 + Math.floor(Math.random() * 4);

      for (let i = 1; i <= ordersOnThisDay; i++) {
        const orderNum = `NN-${orderDate.toISOString().slice(0, 10).replace(/-/g, '')}-${String(i).padStart(4, '0')}`;
        const isCash = Math.random() > 0.4;
        const total = 120 + Math.floor(Math.random() * 4) * 50;
        const discount = Math.random() > 0.7 ? 20 : 0;
        const finalTotal = total - discount;

        await prisma.order.create({
          data: {
            orderNumber: orderNum,
            customerName: `ลูกค้าโต๊ะ ${Math.floor(Math.random() * 8) + 1}`,
            subtotal: total,
            discountType: discount > 0 ? 'FIXED' : 'NONE',
            discountValue: discount,
            discountAmount: discount,
            total: finalTotal,
            paymentMethod: isCash ? 'CASH' : 'QR_PROMPTPAY',
            paymentStatus: 'PAID',
            orderStatus: 'COMPLETED',
            cashierId: cashierUser.id,
            createdAt: orderDate,
            items: {
              create: [
                {
                  productId: gyozaOriginal.id,
                  productNameSnapshot: 'เกี๊ยวซ่าต้นตำรับ nnichna',
                  priceSnapshot: 79,
                  costSnapshot: 35,
                  quantity: 1,
                  subtotal: 79,
                },
                {
                  productNameSnapshot: 'โค้ก ออริจินัล (กระป๋อง 325ml)',
                  priceSnapshot: 25,
                  costSnapshot: 14,
                  quantity: 1,
                  subtotal: 25,
                },
              ],
            },
            payments: {
              create: {
                method: isCash ? 'CASH' : 'QR_PROMPTPAY',
                status: 'PAID',
                amount: finalTotal,
                amountTendered: isCash ? Math.ceil(finalTotal / 50) * 50 : finalTotal,
                changeGiven: isCash ? Math.ceil(finalTotal / 50) * 50 - finalTotal : 0,
                provider: isCash ? 'CASH' : 'PROMPTPAY_STANDARD',
                createdAt: orderDate,
              },
            },
          },
        });
      }
    }
    console.log('✅ Sample orders seeded for charts and analytics');
  }

  // 6. Log seed audit
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      userName: adminUser.name,
      action: 'SYSTEM_SEED',
      entityType: 'DATABASE',
      details: 'System seeded with default products, categories, users and store settings',
    },
  });

  console.log('✨ All nnichna POS seed data successfully loaded!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
