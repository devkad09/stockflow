import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { subDays } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting StockFlow realistic database seed...");

  // Clean existing data
  await prisma.stocktakeItem.deleteMany().catch(() => {});
  await prisma.stocktake.deleteMany().catch(() => {});
  await prisma.cashMovement.deleteMany().catch(() => {});
  await prisma.registerShift.deleteMany().catch(() => {});
  await prisma.discountCoupon.deleteMany().catch(() => {});
  await prisma.auditLog.deleteMany().catch(() => {});
  await prisma.expense.deleteMany().catch(() => {});
  await prisma.refundItem.deleteMany().catch(() => {});
  await prisma.refund.deleteMany().catch(() => {});
  await prisma.payment.deleteMany().catch(() => {});
  await prisma.saleItem.deleteMany().catch(() => {});
  await prisma.sale.deleteMany().catch(() => {});
  await prisma.purchaseOrderItem.deleteMany().catch(() => {});
  await prisma.purchaseOrder.deleteMany().catch(() => {});
  await prisma.inventoryMovement.deleteMany().catch(() => {});
  await prisma.inventory.deleteMany().catch(() => {});
  await prisma.product.deleteMany().catch(() => {});
  await prisma.customer.deleteMany().catch(() => {});
  await prisma.supplier.deleteMany().catch(() => {});
  await prisma.category.deleteMany().catch(() => {});
  await prisma.location.deleteMany().catch(() => {});
  await prisma.subscription.deleteMany().catch(() => {});
  await prisma.businessMember.deleteMany().catch(() => {});
  await prisma.business.deleteMany().catch(() => {});
  await prisma.user.deleteMany().catch(() => {});

  const passwordHash = await bcrypt.hash("password123", 10);

  // 1. Create Users
  const owner = await prisma.user.create({
    data: {
      email: "owner@stockflow.dev",
      name: "Marcus Vance",
      passwordHash,
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: "admin@stockflow.dev",
      name: "Sarah Jenkins",
      passwordHash,
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: "manager@stockflow.dev",
      name: "Alex Rivera",
      passwordHash,
      avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    },
  });

  const cashier = await prisma.user.create({
    data: {
      email: "cashier@stockflow.dev",
      name: "Emma Watson",
      passwordHash,
      avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80",
    },
  });

  const inventoryStaff = await prisma.user.create({
    data: {
      email: "inventory@stockflow.dev",
      name: "David Chen",
      passwordHash,
    },
  });

  // 2. Create Business
  const business = await prisma.business.create({
    data: {
      name: "Apex Retail & Wholesale",
      slug: "apex-retail",
      type: "Electronics & Apparel",
      country: "United States",
      currency: "USD",
      currencySymbol: "$",
      phone: "+1 (555) 234-5678",
      email: "contact@apexretail.io",
      address: "742 Evergreen Terrace, Suite 100, Austin, TX 78701",
      taxRate: 8.25,
      taxNumber: "US-TX-98765432",
      receiptHeader: "Thank you for shopping at Apex Retail & Wholesale!",
      receiptFooter: "Returns accepted within 14 days with receipt. Questions? Call +1 (555) 234-5678",
      allowNegativeStock: false,
      plan: "PRO",
      subscriptionStatus: "ACTIVE",
    },
  });

  // 3. Create Business Memberships
  await prisma.businessMember.createMany({
    data: [
      { userId: owner.id, businessId: business.id, role: "OWNER" },
      { userId: admin.id, businessId: business.id, role: "ADMIN" },
      { userId: manager.id, businessId: business.id, role: "MANAGER" },
      { userId: cashier.id, businessId: business.id, role: "CASHIER" },
      { userId: inventoryStaff.id, businessId: business.id, role: "INVENTORY_STAFF" },
    ],
  });

  // 4. Create Locations
  const mainStore = await prisma.location.create({
    data: {
      businessId: business.id,
      name: "Downtown Flagship Store",
      code: "LOC-DT01",
      address: "742 Evergreen Terrace, Austin, TX",
      isDefault: true,
    },
  });

  const warehouse = await prisma.location.create({
    data: {
      businessId: business.id,
      name: "Central Logistics Warehouse",
      code: "LOC-WH01",
      address: "1200 Industrial Blvd, Austin, TX",
      isDefault: false,
    },
  });

  // 5. Create Categories
  const catPhones = await prisma.category.create({
    data: {
      businessId: business.id,
      name: "Phones & Tablets",
      slug: "phones-tablets",
      description: "Smartphones, tablets and cellular devices",
      color: "#3b82f6",
    },
  });

  const catAccessories = await prisma.category.create({
    data: {
      businessId: business.id,
      name: "Phone Accessories",
      slug: "phone-accessories",
      description: "Cases, screen protectors, chargers, and cables",
      color: "#8b5cf6",
    },
  });

  const catAudio = await prisma.category.create({
    data: {
      businessId: business.id,
      name: "Audio & Electronics",
      slug: "audio-electronics",
      description: "Headphones, wireless earbuds, smart speakers",
      color: "#06b6d4",
    },
  });

  const catApparel = await prisma.category.create({
    data: {
      businessId: business.id,
      name: "Apparel & Shoes",
      slug: "apparel-shoes",
      description: "Designer streetwear, hoodies, t-shirts, sneakers",
      color: "#10b981",
    },
  });

  const catCosmetics = await prisma.category.create({
    data: {
      businessId: business.id,
      name: "Cosmetics & Beauty",
      slug: "cosmetics-beauty",
      description: "Skincare serums, moisturizers, organic cosmetics",
      color: "#ec4899",
    },
  });

  // 6. Create Suppliers
  const supTech = await prisma.supplier.create({
    data: {
      businessId: business.id,
      name: "TechDistro Global Inc",
      contactPerson: "Robert Chang",
      phone: "+1 (415) 890-1234",
      email: "orders@techdistro.com",
      address: "500 Silicon Valley Way, San Jose, CA",
      notes: "Major supplier for smartphones, cables, and wireless audio gear. Net 30 terms.",
    },
  });

  const supApparel = await prisma.supplier.create({
    data: {
      businessId: business.id,
      name: "UrbanStyle Supply Co",
      contactPerson: "Elena Rossi",
      phone: "+1 (212) 555-7890",
      email: "wholesale@urbanstylesupply.com",
      address: "140 Fashion Ave, New York, NY",
      notes: "Premium organic cotton apparel and sneaker distributor.",
    },
  });

  const supBeauty = await prisma.supplier.create({
    data: {
      businessId: business.id,
      name: "LuxeBeauty Laboratories",
      contactPerson: "Claire Dupont",
      phone: "+1 (305) 777-4321",
      email: "accounts@luxebeauty.co",
      address: "800 Biscayne Blvd, Miami, FL",
      notes: "Clean beauty and skincare formulated in France.",
    },
  });

  // 7. Create Customers
  const customersData = [
    { name: "Johnathan Miller", phone: "+1 (512) 555-0192", email: "jmiller@gmail.com", address: "Austin, TX", notes: "VIP retail customer" },
    { name: "Sophia Chen", phone: "+1 (512) 555-0143", email: "sophia.chen@techcorp.io", address: "Round Rock, TX", notes: "Corporate phone accessories buyer" },
    { name: "Michael Rodriguez", phone: "+1 (512) 555-0188", email: "m.rodriguez@outlook.com", address: "Cedar Park, TX" },
    { name: "Olivia Taylor", phone: "+1 (512) 555-0122", email: "olivia.taylor@me.com", address: "Austin, TX" },
    { name: "William Davis", phone: "+1 (512) 555-0177", email: "wdavis@enterprise.com", address: "San Antonio, TX" },
    { name: "Emily Johnson", phone: "+1 (512) 555-0165", email: "emily.j@yahoo.com", address: "Austin, TX" },
  ];

  const customers: any[] = [];
  for (const c of customersData) {
    const cust = await prisma.customer.create({
      data: {
        businessId: business.id,
        ...c,
      },
    });
    customers.push(cust);
  }

  // 8. Create Products & Initial Inventories & Movements
  const productsRaw = [
    // Phones & Tablets
    { name: "iPhone 15 Pro Max 256GB - Titanium", sku: "PHN-IP15P-256", barcode: "890123450001", catId: catPhones.id, supId: supTech.id, cost: 890, price: 1199, stock: 14, min: 5, unit: "pcs" },
    { name: "Samsung Galaxy S24 Ultra 512GB", sku: "PHN-GS24U-512", barcode: "890123450002", catId: catPhones.id, supId: supTech.id, cost: 920, price: 1299, stock: 9, min: 4, unit: "pcs" },
    { name: "iPad Air 11-inch M2 128GB", sku: "TAB-IPAD-M2", barcode: "890123450003", catId: catPhones.id, supId: supTech.id, cost: 440, price: 599, stock: 18, min: 5, unit: "pcs" },
    { name: "Google Pixel 8 Pro 128GB Obsidian", sku: "PHN-PX8P-128", barcode: "890123450004", catId: catPhones.id, supId: supTech.id, cost: 650, price: 899, stock: 3, min: 5, unit: "pcs" }, // Low stock!

    // Accessories
    { name: "MagSafe Clear Case iPhone 15 Pro", sku: "ACC-IP15P-MC", barcode: "890123450005", catId: catAccessories.id, supId: supTech.id, cost: 12, price: 39.99, stock: 45, min: 10, unit: "pcs" },
    { name: "65W GaN Fast Charger USB-C Dual Port", sku: "ACC-CHG-65W", barcode: "890123450006", catId: catAccessories.id, supId: supTech.id, cost: 14, price: 45.0, stock: 32, min: 8, unit: "pcs" },
    { name: "Braided 2M USB-C to Lightning Cable", sku: "ACC-CBL-2ML", barcode: "890123450007", catId: catAccessories.id, supId: supTech.id, cost: 4.5, price: 19.99, stock: 80, min: 15, unit: "pcs" },
    { name: "Tempered Glass Screen Protector 9H 2-Pack", sku: "ACC-SP-TG2P", barcode: "890123450008", catId: catAccessories.id, supId: supTech.id, cost: 3.2, price: 16.5, stock: 65, min: 12, unit: "pack" },
    { name: "Magnetic Wireless Car Mount & Charger", sku: "ACC-MNT-CAR", barcode: "890123450009", catId: catAccessories.id, supId: supTech.id, cost: 18, price: 49.99, stock: 2, min: 6, unit: "pcs" }, // Low stock!

    // Audio & Electronics
    { name: "AirPods Pro 2nd Gen with USB-C MagSafe", sku: "AUD-APP2-USBC", barcode: "890123450010", catId: catAudio.id, supId: supTech.id, cost: 175, price: 249, stock: 22, min: 6, unit: "pcs" },
    { name: "Sony WH-1000XM5 Wireless Noise-Cancelling", sku: "AUD-SONY-XM5", barcode: "890123450011", catId: catAudio.id, supId: supTech.id, cost: 260, price: 399, stock: 12, min: 4, unit: "pcs" },
    { name: "JBL Flip 6 Waterproof Bluetooth Speaker", sku: "AUD-JBL-FLP6", barcode: "890123450012", catId: catAudio.id, supId: supTech.id, cost: 68, price: 119.95, stock: 28, min: 5, unit: "pcs" },
    { name: "Smart Fitness Watch Ultra Band", sku: "ELC-SMW-UBND", barcode: "890123450013", catId: catAudio.id, supId: supTech.id, cost: 45, price: 129.0, stock: 15, min: 4, unit: "pcs" },

    // Apparel & Footwear
    { name: "Heavyweight Cotton Oversized Hoodie - Black", sku: "APP-HDY-BLK-L", barcode: "890123450014", catId: catApparel.id, supId: supApparel.id, cost: 28, price: 78.0, stock: 35, min: 8, unit: "pcs" },
    { name: "Vintage Wash Relaxed Denim Jeans 32/32", sku: "APP-JNS-VIN-32", barcode: "890123450015", catId: catApparel.id, supId: supApparel.id, cost: 35, price: 95.0, stock: 20, min: 5, unit: "pcs" },
    { name: "Graphic Streetwear Tee 100% Organic Cotton", sku: "APP-TEE-STR-M", barcode: "890123450016", catId: catApparel.id, supId: supApparel.id, cost: 12, price: 38.0, stock: 50, min: 10, unit: "pcs" },
    { name: "Minimalist Leather Low-Top Sneakers (US 10)", sku: "APP-SNK-LTH-10", barcode: "890123450017", catId: catApparel.id, supId: supApparel.id, cost: 55, price: 145.0, stock: 0, min: 4, unit: "pair" }, // Out of stock!
    { name: "Merino Wool Thermal Beanie - Charcoal", sku: "APP-BNI-CHR-OS", barcode: "890123450018", catId: catApparel.id, supId: supApparel.id, cost: 9, price: 28.0, stock: 40, min: 6, unit: "pcs" },

    // Cosmetics & Beauty
    { name: "Hydrating Hyaluronic Acid Serum 50ml", sku: "BEA-HYA-SRM-50", barcode: "890123450019", catId: catCosmetics.id, supId: supBeauty.id, cost: 14, price: 42.0, stock: 60, min: 10, unit: "bottle" },
    { name: "Vitamin C Brightening Glow Moisturizer 100ml", sku: "BEA-VITC-MST-100", barcode: "890123450020", catId: catCosmetics.id, supId: supBeauty.id, cost: 16, price: 48.0, stock: 45, min: 8, unit: "jar" },
    { name: "Mineral UV Sunscreen SPF 50+ Invisible Finish", sku: "BEA-SPF-50-MIN", barcode: "890123450021", catId: catCosmetics.id, supId: supBeauty.id, cost: 11, price: 34.0, stock: 55, min: 10, unit: "tube" },
    { name: "Velvet Matte Long-Wear Lipstick - Crimson Rose", sku: "BEA-LPK-MAT-CR", barcode: "890123450022", catId: catCosmetics.id, supId: supBeauty.id, cost: 8.5, price: 26.0, stock: 4, min: 8, unit: "pcs" }, // Low stock!
    { name: "Revitalizing Botanical Night Repair Oil 30ml", sku: "BEA-OIL-BOT-30", barcode: "890123450023", catId: catCosmetics.id, supId: supBeauty.id, cost: 22, price: 68.0, stock: 19, min: 5, unit: "bottle" },
  ];

  const createdProducts: any[] = [];
  for (const pr of productsRaw) {
    const product = await prisma.product.create({
      data: {
        businessId: business.id,
        name: pr.name,
        sku: pr.sku,
        barcode: pr.barcode,
        categoryId: pr.catId,
        supplierId: pr.supId,
        costPrice: pr.cost,
        sellingPrice: pr.price,
        minStockLevel: pr.min,
        unit: pr.unit,
        taxRate: 8.25,
        isActive: true,
        isArchived: false,
      },
    });

    // Create main store inventory
    await prisma.inventory.create({
      data: {
        businessId: business.id,
        productId: product.id,
        locationId: mainStore.id,
        quantity: pr.stock,
      },
    });

    // Create opening stock movement
    await prisma.inventoryMovement.create({
      data: {
        businessId: business.id,
        productId: product.id,
        locationId: mainStore.id,
        quantityChange: pr.stock,
        previousQuantity: 0,
        newQuantity: pr.stock,
        type: "OPENING_STOCK",
        referenceType: "SYSTEM_INITIALIZATION",
        notes: "Initial inventory setup on onboarding",
        userId: owner.id,
      },
    });

    createdProducts.push(product);
  }

  // 9. Create Historical Sales (across past 14 days)
  console.log("💳 Creating realistic sales history and inventory movements...");

  const paymentMethods = ["CASH", "CARD", "CARD", "BANK_TRANSFER", "MOBILE_MONEY"];
  let saleSeq = 1001;

  for (let daysAgo = 13; daysAgo >= 0; daysAgo--) {
    const salesCountForDay = Math.floor(2 + Math.random() * 4); // 2-5 sales per day
    const saleDate = subDays(new Date(), daysAgo);

    for (let s = 0; s < salesCountForDay; s++) {
      const receiptNumber = `REC-${saleDate.getFullYear()}${String(saleDate.getMonth() + 1).padStart(2, "0")}-${saleSeq++}`;
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const cashierUser = Math.random() > 0.4 ? cashier : manager;
      const paymentMethod = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];

      // Pick 1 to 3 items
      const selectedProducts = [...createdProducts].sort(() => 0.5 - Math.random()).slice(0, Math.floor(1 + Math.random() * 3));
      
      let subtotal = 0;
      let totalCost = 0;
      const itemsToInsert: any[] = [];

      for (const sp of selectedProducts) {
        const qty = Math.floor(1 + Math.random() * 2);
        const itemSubtotal = qty * sp.sellingPrice;
        subtotal += itemSubtotal;
        totalCost += qty * sp.costPrice;

        itemsToInsert.push({
          productId: sp.id,
          quantity: qty,
          unitCost: sp.costPrice,
          unitPrice: sp.sellingPrice,
          discountAmount: 0,
          taxAmount: Math.round(itemSubtotal * 0.0825 * 100) / 100,
          subtotal: itemSubtotal,
          total: Math.round(itemSubtotal * 1.0825 * 100) / 100,
        });
      }

      const taxAmount = Math.round(subtotal * 0.0825 * 100) / 100;
      const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100;
      const paidAmount = paymentMethod === "CASH" ? Math.ceil(totalAmount / 10) * 10 : totalAmount;
      const changeAmount = Math.round((paidAmount - totalAmount) * 100) / 100;

      const sale = await prisma.sale.create({
        data: {
          businessId: business.id,
          locationId: mainStore.id,
          receiptNumber,
          customerId: customer.id,
          cashierId: cashierUser.id,
          subtotal,
          discountAmount: 0,
          discountPercent: 0,
          taxAmount,
          totalAmount,
          paidAmount,
          changeAmount,
          balanceAmount: 0,
          paymentMethod,
          status: "COMPLETED",
          createdAt: saleDate,
          updatedAt: saleDate,
          items: {
            create: itemsToInsert.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              unitPrice: item.unitPrice,
              discountAmount: item.discountAmount,
              taxAmount: item.taxAmount,
              subtotal: item.subtotal,
              total: item.total,
              createdAt: saleDate,
            })),
          },
        },
      });

      // Payment
      await prisma.payment.create({
        data: {
          businessId: business.id,
          saleId: sale.id,
          amount: paidAmount,
          method: paymentMethod,
          reference: receiptNumber,
          receivedBy: cashierUser.id,
          createdAt: saleDate,
        },
      });

      // Update customer total
      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          totalSpent: { increment: totalAmount },
          totalPurchases: { increment: 1 },
        },
      });
    }
  }

  // 10. Create Purchase Orders
  console.log("📦 Creating purchase orders...");
  const po1 = await prisma.purchaseOrder.create({
    data: {
      businessId: business.id,
      locationId: mainStore.id,
      supplierId: supTech.id,
      orderNumber: "PO-2026-0801",
      status: "RECEIVED",
      subtotal: 4450.0,
      totalAmount: 4450.0,
      notes: "Restock of fast-moving MagSafe chargers and AirPods Pro",
      createdBy: manager.id,
      createdAt: subDays(new Date(), 10),
      items: {
        create: [
          { productId: createdProducts[4].id, quantityOrdered: 50, quantityReceived: 50, unitCost: 12, subtotal: 600 },
          { productId: createdProducts[9].id, quantityOrdered: 20, quantityReceived: 20, unitCost: 175, subtotal: 3500 },
          { productId: createdProducts[6].id, quantityOrdered: 75, quantityReceived: 75, unitCost: 4.5, subtotal: 350 },
        ],
      },
    },
  });

  const po2 = await prisma.purchaseOrder.create({
    data: {
      businessId: business.id,
      locationId: mainStore.id,
      supplierId: supBeauty.id,
      orderNumber: "PO-2026-0802",
      status: "ORDERED",
      subtotal: 1280.0,
      totalAmount: 1280.0,
      expectedDeliveryDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      notes: "Autumn skincare batch order",
      createdBy: admin.id,
      createdAt: subDays(new Date(), 2),
      items: {
        create: [
          { productId: createdProducts[18].id, quantityOrdered: 40, quantityReceived: 0, unitCost: 14, subtotal: 560 },
          { productId: createdProducts[19].id, quantityOrdered: 45, quantityReceived: 0, unitCost: 16, subtotal: 720 },
        ],
      },
    },
  });

  // 11. Create Realistic Expenses
  console.log("💰 Creating business operational expenses...");
  const expensesData = [
    { category: "RENT", amount: 2850.0, desc: "Flagship Retail Store Monthly Rent", date: subDays(new Date(), 12) },
    { category: "SALARIES", amount: 4500.0, desc: "Bi-weekly retail & cashier staff payroll", date: subDays(new Date(), 7) },
    { category: "UTILITIES", amount: 340.0, desc: "Austin Commercial Electricity & AC", date: subDays(new Date(), 9) },
    { category: "MARKETING", amount: 450.0, desc: "Instagram & Google Local Search Ads campaign", date: subDays(new Date(), 5) },
    { category: "PACKAGING", amount: 185.0, desc: "Branded eco-friendly shopping bags & thermal receipt rolls", date: subDays(new Date(), 4) },
    { category: "TRANSPORT", amount: 120.0, desc: "Local courier & freight delivery from airport terminal", date: subDays(new Date(), 3) },
  ];

  for (const exp of expensesData) {
    await prisma.expense.create({
      data: {
        businessId: business.id,
        category: exp.category,
        amount: exp.amount,
        description: exp.desc,
        paymentMethod: "BANK_TRANSFER",
        date: exp.date,
        createdBy: admin.id,
      },
    });
  }

  // 12. Create Audit Logs
  console.log("📜 Creating audit log trail...");
  const auditEntries = [
    { action: "USER_LOGIN", entityType: "User", entityId: owner.id, details: "Owner login from Chrome on MacOS", user: owner.id },
    { action: "SETTINGS_UPDATE", entityType: "Business", entityId: business.id, details: "Updated tax rate to 8.25% and configured receipt footer", user: owner.id },
    { action: "PRODUCT_CREATE", entityType: "Product", entityId: createdProducts[0].id, details: "Created product iPhone 15 Pro Max", user: admin.id },
    { action: "PO_RECEIVE", entityType: "PurchaseOrder", entityId: po1.id, details: "Received complete shipment for PO-2026-0801", user: manager.id },
    { action: "STOCK_ADJUST", entityType: "Inventory", entityId: createdProducts[4].id, details: "Quick stock check verified +5 count", user: inventoryStaff.id },
  ];

  for (const a of auditEntries) {
    await prisma.auditLog.create({
      data: {
        businessId: business.id,
        userId: a.user,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        details: a.details,
      },
    });
  }

  console.log("✅ StockFlow database seeding finished successfully!");
  console.log(`
  Demo Credentials:
  - Owner:     owner@stockflow.dev     / password123
  - Admin:     admin@stockflow.dev     / password123
  - Manager:   manager@stockflow.dev   / password123
  - Cashier:   cashier@stockflow.dev   / password123
  - Inventory: inventory@stockflow.dev / password123
  `);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
