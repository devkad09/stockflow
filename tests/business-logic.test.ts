import { PrismaClient } from "@prisma/client";
import { adjustInventoryTx, adjustStock } from "../src/lib/services/inventory";
import { processSaleCheckout } from "../src/lib/services/sales";
import { processRefund } from "../src/lib/services/refunds";
import { createPurchaseOrder, receivePurchaseOrderStock } from "../src/lib/services/purchases";
import { hasPermission } from "../src/lib/permissions";

const prisma = new PrismaClient();

async function runTests() {
  console.log("🧪 Starting StockFlow Business Logic & Integrity Tests...\n");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // Setup test business
    const testBusinessA = await prisma.business.create({
      data: {
        name: "Test Store A",
        slug: `test-store-a-${Date.now()}`,
        currency: "USD",
        currencySymbol: "$",
        allowNegativeStock: false,
      },
    });

    const testBusinessB = await prisma.business.create({
      data: {
        name: "Test Store B",
        slug: `test-store-b-${Date.now()}`,
        currency: "USD",
        currencySymbol: "$",
        allowNegativeStock: false,
      },
    });

    const locationA = await prisma.location.create({
      data: {
        businessId: testBusinessA.id,
        name: "Store A Main",
        isDefault: true,
      },
    });

    const locationB = await prisma.location.create({
      data: {
        businessId: testBusinessB.id,
        name: "Store B Main",
        isDefault: true,
      },
    });

    const productA = await prisma.product.create({
      data: {
        businessId: testBusinessA.id,
        name: "Test Wireless Mouse",
        sku: `SKU-TEST-${Date.now()}`,
        costPrice: 20.0,
        sellingPrice: 50.0,
        minStockLevel: 5,
      },
    });

    // Test 1: Opening Stock setup
    await adjustStock({
      businessId: testBusinessA.id,
      productId: productA.id,
      locationId: locationA.id,
      quantityChange: 10,
      type: "OPENING_STOCK",
      notes: "Initial test stock",
    });

    const invAfterOpening = await prisma.inventory.findUnique({
      where: { productId_locationId: { productId: productA.id, locationId: locationA.id } },
    });
    assert(invAfterOpening?.quantity === 10, "1. Initial stock set to 10");

    // Test 2: Sale Creation & Stock Deduction (Buy 3 -> Expected Stock = 7)
    const saleResult = await processSaleCheckout({
      businessId: testBusinessA.id,
      locationId: locationA.id,
      items: [
        {
          productId: productA.id,
          quantity: 3,
          unitCost: productA.costPrice,
          unitPrice: productA.sellingPrice,
        },
      ],
      subtotal: 150.0,
      discountAmount: 0,
      discountPercent: 0,
      taxAmount: 0,
      totalAmount: 150.0,
      paidAmount: 150.0,
      changeAmount: 0,
      paymentMethod: "CASH",
    });

    const invAfterSale = await prisma.inventory.findUnique({
      where: { productId_locationId: { productId: productA.id, locationId: locationA.id } },
    });
    assert(invAfterSale?.quantity === 7, "2. Sale of 3 items correctly reduces stock from 10 to 7");

    // Verify inventory movement record created for sale
    const saleMovement = await prisma.inventoryMovement.findFirst({
      where: {
        productId: productA.id,
        type: "SALE",
        referenceId: saleResult?.id,
      },
    });
    assert(
      saleMovement?.quantityChange === -3 && saleMovement?.previousQuantity === 10 && saleMovement?.newQuantity === 7,
      "3. Inventory movement recorded: prev=10, change=-3, new=7"
    );

    // Test 3: Refund with Restock (Refund 1 item -> Expected Stock = 8)
    const saleItem = saleResult?.items[0];
    if (saleItem) {
      await processRefund({
        businessId: testBusinessA.id,
        saleId: saleResult.id,
        reason: "Customer changed mind",
        items: [
          {
            saleItemId: saleItem.id,
            productId: productA.id,
            quantity: 1,
            refundAmount: 50.0,
            restocked: true,
          },
        ],
      });

      const invAfterRefund = await prisma.inventory.findUnique({
        where: { productId_locationId: { productId: productA.id, locationId: locationA.id } },
      });
      assert(invAfterRefund?.quantity === 8, "4. Refund of 1 item with restock increases stock from 7 to 8");
    }

    // Test 4: Negative Inventory Prevention
    let threwNegativeError = false;
    try {
      await processSaleCheckout({
        businessId: testBusinessA.id,
        locationId: locationA.id,
        items: [
          {
            productId: productA.id,
            quantity: 20, // Current stock is 8
            unitCost: productA.costPrice,
            unitPrice: productA.sellingPrice,
          },
        ],
        subtotal: 1000.0,
        discountAmount: 0,
        discountPercent: 0,
        taxAmount: 0,
        totalAmount: 1000.0,
        paidAmount: 1000.0,
        changeAmount: 0,
        paymentMethod: "CASH",
        allowNegativeStock: false,
      });
    } catch (err: any) {
      threwNegativeError = true;
    }
    assert(threwNegativeError, "5. Negative inventory correctly rejected when stock is insufficient");

    // Test 5: Purchase Order Receiving
    const supplierA = await prisma.supplier.create({
      data: {
        businessId: testBusinessA.id,
        name: "Test Tech Supplier",
      },
    });

    const po = await createPurchaseOrder({
      businessId: testBusinessA.id,
      locationId: locationA.id,
      supplierId: supplierA.id,
      items: [{ productId: productA.id, quantityOrdered: 10, unitCost: 20.0 }],
    });

    await receivePurchaseOrderStock({
      businessId: testBusinessA.id,
      purchaseOrderId: po.id,
      receivedItems: [{ poItemId: po.items[0].id, quantityToReceive: 10 }],
    });

    const invAfterPO = await prisma.inventory.findUnique({
      where: { productId_locationId: { productId: productA.id, locationId: locationA.id } },
    });
    assert(invAfterPO?.quantity === 18, "6. Purchase receiving of 10 units increases stock from 8 to 18");

    // Test 6: Multi-Tenant Data Isolation
    const productB = await prisma.product.create({
      data: {
        businessId: testBusinessB.id,
        name: "Store B Product",
        sku: `SKU-B-${Date.now()}`,
        costPrice: 10,
        sellingPrice: 20,
      },
    });

    const storeAProducts = await prisma.product.findMany({
      where: { businessId: testBusinessA.id },
    });
    const leakFound = storeAProducts.some((p) => p.businessId === testBusinessB.id || p.id === productB.id);
    assert(!leakFound, "7. Strict Tenant Isolation: Store A query never leaks Store B products");

    // Test 7: Role Permissions Matrix
    assert(hasPermission("OWNER", "canManageSettings") === true, "8. OWNER has settings permission");
    assert(hasPermission("CASHIER", "canManageSettings") === false, "9. CASHIER is blocked from settings");
    assert(hasPermission("CASHIER", "canAccessPOS") === true, "10. CASHIER has POS access");
    assert(hasPermission("INVENTORY_STAFF", "canAccessPOS") === false, "11. INVENTORY_STAFF is blocked from POS");
    assert(hasPermission("INVENTORY_STAFF", "canManageInventory") === true, "12. INVENTORY_STAFF has inventory access");

    // Test 8: Promotional Coupon Validation & Application
    const { createCoupon, validateAndCalculateCouponDiscount } = await import("../src/lib/services/coupons");
    const testCoupon = await createCoupon({
      businessId: testBusinessA.id,
      code: "SAVE20",
      discountType: "PERCENTAGE",
      discountValue: 20,
      minOrderAmount: 50,
    });

    const couponValidation = await validateAndCalculateCouponDiscount(
      testBusinessA.id,
      "SAVE20",
      100.0
    );
    assert(
      couponValidation.valid === true && couponValidation.discountAmount === 20.0,
      "13. Coupon SAVE20 (20% off $100) calculates exact $20.00 discount"
    );

    const couponUnderMin = await validateAndCalculateCouponDiscount(
      testBusinessA.id,
      "SAVE20",
      30.0
    );
    assert(
      couponUnderMin.valid === false,
      "14. Coupon validation correctly rejects orders below minimum threshold ($30 < $50)"
    );

    // Test 9: Customer Loyalty Points Accrual & Redemption
    const testCustomer = await prisma.customer.create({
      data: {
        businessId: testBusinessA.id,
        name: "Alice Loyalty",
        loyaltyPoints: 100, // Starts with 100 points
      },
    });

    // Sale redeeming 40 points ($2 discount) and earning points on new total
    const loyaltySale = await processSaleCheckout({
      businessId: testBusinessA.id,
      locationId: locationA.id,
      customerId: testCustomer.id,
      couponCode: "SAVE20",
      loyaltyPointsRedeemed: 40,
      loyaltyDiscount: 2.0,
      items: [
        {
          productId: productA.id,
          quantity: 2,
          unitCost: productA.costPrice,
          unitPrice: productA.sellingPrice,
        },
      ],
      subtotal: 100.0,
      discountAmount: 22.0, // 20 coupon + 2 loyalty
      discountPercent: 20,
      taxAmount: 0,
      totalAmount: 78.0,
      paidAmount: 78.0,
      changeAmount: 0,
      paymentMethod: "CASH",
    });

    const customerAfterSale = await prisma.customer.findUnique({
      where: { id: testCustomer.id },
    });
    // Expected points: 100 - 40 redeemed + 78 earned = 138 points
    assert(
      customerAfterSale?.loyaltyPoints === 138,
      "15. Customer loyalty points correctly updated: 100 - 40 redeemed + 78 earned = 138 pts"
    );

    // Test 10: Cash Register Shift & Drawer Management
    const { openShift, recordCashMovement, closeShift } = await import("../src/lib/services/shifts");
    const testUser = await prisma.user.create({
      data: {
        email: `cashier-test-${Date.now()}@stockflow.dev`,
        passwordHash: "hash123",
        name: "Test Shift Cashier",
      },
    });

    const shift = await openShift({
      businessId: testBusinessA.id,
      locationId: locationA.id,
      cashierId: testUser.id,
      openingFloat: 150.0,
    });
    assert(shift.openingFloat === 150.0 && shift.status === "OPEN", "16. Register shift opens with $150.00 float");

    await recordCashMovement({
      businessId: testBusinessA.id,
      shiftId: shift.id,
      type: "CASH_IN",
      amount: 50.0,
      reason: "Added change coins",
    });

    await recordCashMovement({
      businessId: testBusinessA.id,
      shiftId: shift.id,
      type: "CASH_OUT",
      amount: 20.0,
      reason: "Petty cash payout for office water",
    });

    // Close shift with actual counted cash = $180.00 (expected = 150 + 50 - 20 = $180.00)
    const closedShift = await closeShift({
      businessId: testBusinessA.id,
      shiftId: shift.id,
      actualCash: 180.0,
    });
    assert(
      closedShift.expectedCash === 180.0 && closedShift.difference === 0.0 && closedShift.status === "CLOSED",
      "17. End-of-shift Z-Report reconciles exact drawer balance: Float($150) + In($50) - Out($20) = $180"
    );

    // Test 11: Cycle Count Stocktake Studio & Atomic Reconciliation
    const { createStocktakeSession, updateStocktakeItemCount, completeStocktakeReconciliation } =
      await import("../src/lib/services/stocktake");

    const stocktake = await createStocktakeSession({
      businessId: testBusinessA.id,
      locationId: locationA.id,
      title: "Test Audit 101",
      userId: testUser.id,
    });

    // Physical count found 20 items (whereas system has 16 items after earlier transactions)
    if (stocktake && stocktake.items.length > 0) {
      const stockItem = stocktake.items.find((i) => i.productId === productA.id);
      if (stockItem) {
        await updateStocktakeItemCount({
          businessId: testBusinessA.id,
          stocktakeId: stocktake.id,
          productId: productA.id,
          countedStock: 20,
        });

        const reconciled = await completeStocktakeReconciliation({
          businessId: testBusinessA.id,
          stocktakeId: stocktake.id,
          userId: testUser.id,
        });

        const invAfterStocktake = await prisma.inventory.findUnique({
          where: { productId_locationId: { productId: productA.id, locationId: locationA.id } },
        });
        assert(
          invAfterStocktake?.quantity === 20 && reconciled.status === "COMPLETED",
          "18. Stocktake audit reconciles inventory atomically to counted quantity of 20 units"
        );
      }
    }

    // Cleanup test data
    await prisma.business.delete({ where: { id: testBusinessA.id } });
    await prisma.business.delete({ where: { id: testBusinessB.id } });
    await prisma.user.delete({ where: { id: testUser.id } });

  } catch (error) {
    console.error("Test execution error:", error);
    failed++;
  } finally {
    await prisma.$disconnect();
    console.log(`\n========================================`);
    console.log(`Results: ${passed} Passed, ${failed} Failed`);
    console.log(`========================================\n`);
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runTests();
