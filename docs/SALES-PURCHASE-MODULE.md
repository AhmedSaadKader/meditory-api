# Sales & Purchase Module - Architecture & Implementation Plan

## Table of Contents
1. [Architecture Decision](#architecture-decision)
2. [Open Source Inspiration](#open-source-inspiration)
3. [Entity Design](#entity-design)
4. [Implementation Plan](#implementation-plan)

---

## Architecture Decision

### Hybrid Approach: ERPNext for Purchase + Vendure for Sales

After analyzing two mature open-source systems (Vendure and ERPNext), we've chosen a **hybrid approach** that takes the best patterns from each:

- **Purchase Module** → ERPNext 3-step pattern (for B2B procurement)
- **Sales Module** → Vendure-inspired 1-step pattern (for POS/walk-in customers)

---

## Open Source Inspiration

### 1. Vendure (E-commerce Platform)
**Source**: https://github.com/vendure-ecommerce/vendure
**License**: MIT

**What We're Taking**:
- **State Machine Pattern** for order management
- Single `Order` entity with state transitions (Draft → Completed → Cancelled)
- Simple, fast workflow for point-of-sale operations
- Clean separation: Order → OrderLine items → Payments

**Why It's Good for Sales**:
- ✅ Fast checkout process (critical for POS)
- ✅ State machine provides clear status tracking
- ✅ Simpler than multi-document workflow for walk-in customers
- ✅ Easy to understand and maintain

**Applied To**: Our `SalesInvoice` entity

---

### 2. ERPNext (Open Source ERP)
**Source**: https://github.com/frappe/erpnext
**License**: GPL v3

**What We're Taking**:
- **3-Document Workflow** for purchases (Order → Receipt → Invoice)
- **Perpetual Inventory** concepts (valuation tracking)
- **Ledger-based reconciliation** approach
- Partial fulfillment support (order 100, receive in batches)
- **Fiscal period tracking** for financial reports

**Why It's Good for Purchases**:
- ✅ Separates ordering from receiving from billing (better audit trail)
- ✅ Supports partial deliveries from suppliers
- ✅ Standard B2B procurement workflow
- ✅ Better for accounting integration

**Applied To**:
- Our `PurchaseOrder`, `PurchaseReceipt`, `PurchaseInvoice` entities
- Stock valuation tracking in `StockMovement`
- Ledger reconciliation methods

---

## Entity Design

### Common Entities (Both Modules)

#### Supplier
```
Source: ERPNext Supplier DocType
Fields: code, name, contact info, payment terms, current balance
Purpose: Track suppliers for purchase orders
```

#### Customer
```
Source: ERPNext Customer DocType + Vendure Customer
Fields: code, name, type (WALK_IN/REGISTERED/CREDIT), insurance info
Purpose: Track customers for sales (optional for walk-in)
```

---

### Purchase Module (ERPNext Pattern)

#### Workflow
```
PurchaseOrder (Intent/Contract)
    ↓
PurchaseReceipt (Physical Stock In) → Updates Stock via StockService
    ↓
PurchaseInvoice (Supplier Bill)
    ↓
PurchasePayment (Payment to Supplier)
```

#### Entities

**1. PurchaseOrder**
```
Source: ERPNext Purchase Order
Key Features:
- Status: DRAFT → ORDERED → RECEIVING → COMPLETED → CANCELLED
- Progress tracking: percentReceived, percentBilled
- Supports partial receiving
```

**2. PurchaseOrderItem**
```
Source: ERPNext Purchase Order Item
Key Features:
- orderedQuantity vs receivedQuantity
- Unit pricing and line totals
- Links to Drug entity
```

**3. PurchaseReceipt**
```
Source: ERPNext Purchase Receipt
Key Features:
- References PurchaseOrder
- Creates StockMovement when confirmed
- Tracks batch numbers and expiry dates
Integration: Calls StockService.receiveStock()
```

**4. PurchaseReceiptItem**
```
Source: ERPNext Purchase Receipt Item
Key Features:
- Links to PurchaseOrderItem
- Batch tracking (batchNumber, expiryDate)
- Cost and selling price
- Creates stockMovementId reference
```

**5. PurchaseInvoice**
```
Source: ERPNext Purchase Invoice
Key Features:
- References PurchaseOrder
- Supplier invoice details
- Payment status: UNPAID → PARTIAL → PAID
- Tracks paidAmount and balanceAmount
```

**6. PurchasePayment**
```
Source: ERPNext Payment Entry
Key Features:
- Multiple payment methods (CASH, BANK_TRANSFER, CHEQUE, etc.)
- Reference number for tracking
- Updates PurchaseInvoice payment status
```

---

### Sales Module (Vendure Pattern)

#### Workflow
```
SalesInvoice (Draft)
    ↓ Add Payments
SalesInvoice (Partial/Paid)
    ↓ Complete
SalesInvoice (Completed) → Dispenses Stock via StockService
```

#### Entities

**7. SalesInvoice**
```
Source: Vendure Order + ERPNext Sales Invoice (hybrid)
Key Features:
- State machine: DRAFT → COMPLETED → CANCELLED
- Single document for entire sale
- Payment status: UNPAID → PARTIAL → PAID
- Optional customer (nullable for walk-in)
Integration: Calls StockService.dispenseStock() on completion
```

**8. SalesInvoiceItem**
```
Source: Vendure OrderLine
Key Features:
- Quantity, unit price, line total
- Discount support
- Creates stockMovementId reference when completed
```

**9. SalesPayment**
```
Source: Vendure Payment + ERPNext Payment Entry
Key Features:
- Multiple payment methods (CASH, CARD, MOBILE_MONEY, INSURANCE)
- Updates SalesInvoice payment status
- Auto-generated payment numbers
```

---

## Why This Hybrid Approach?

### Purchase: ERPNext 3-Step (Complex but Necessary)

**Scenario**: Ordering from pharmaceutical suppliers
- Order 1000 units of Paracetamol
- Supplier delivers 500 units on Monday (create PurchaseReceipt #1)
- Supplier delivers 500 units on Friday (create PurchaseReceipt #2)
- Supplier sends invoice for all 1000 units (create PurchaseInvoice)
- Pay supplier in 30 days (create PurchasePayment)

**Benefits**:
- Separate stock receipt from billing (they happen at different times)
- Track partial deliveries independently
- Better audit trail for accounting
- Handle supplier credit terms (net 30, net 60)

### Sales: Vendure 1-Step (Simple and Fast)

**Scenario**: Walk-in customer buys medicines at pharmacy counter
- Customer selects items
- Create SalesInvoice (Draft)
- Add payment (cash/card)
- Complete invoice → stock dispensed immediately
- Print receipt

**Benefits**:
- Fast checkout (critical for POS)
- Single document lifecycle
- State machine is simple to understand
- Works for both cash sales and credit customers

---

## Integration with Stock Module

### Purchase Receipt → Stock
```typescript
// In PurchaseReceiptService.confirmReceipt()
for (const item of receipt.items) {
  await stockService.receiveStock({
    pharmacyId: receipt.pharmacyId,
    drugId: item.drugId,
    quantity: item.receivedQuantity,
    batchNumber: item.batchNumber,
    expiryDate: item.expiryDate,
    costPrice: item.costPrice,
    sellingPrice: item.sellingPrice,
    referenceType: 'PURCHASE_RECEIPT',
    referenceId: receipt.id,
  });
}
```

### Sales Invoice Complete → Stock
```typescript
// In SalesInvoiceService.complete()
for (const item of invoice.items) {
  await stockService.dispenseStock({
    pharmacyId: invoice.pharmacyId,
    drugId: item.drugId,
    quantity: item.quantity,
    referenceType: 'SALES_INVOICE',
    referenceId: invoice.id,
  });
}
```

---

## Implementation Plan

### Phase 1: Foundation (Common Entities)
- [ ] Create `Supplier` entity
- [ ] Create `Customer` entity
- [ ] Create `SupplierService` and `CustomerService`
- [ ] Create `SupplierController` and `CustomerController`
- [ ] Create DTOs for supplier/customer operations

### Phase 2: Purchase Module (ERPNext Pattern)
- [ ] Create `PurchaseOrder` and `PurchaseOrderItem` entities
- [ ] Create `PurchaseReceipt` and `PurchaseReceiptItem` entities
- [ ] Create `PurchaseInvoice` entity
- [ ] Create `PurchasePayment` entity
- [ ] Create `PurchaseOrderService` with workflow methods
- [ ] Create `PurchaseReceiptService` with stock integration
- [ ] Create `PurchaseInvoiceService` with payment tracking
- [ ] Create controllers and DTOs
- [ ] **Integration**: Wire PurchaseReceipt to `StockService.receiveStock()`

### Phase 3: Sales Module (Vendure Pattern)
- [ ] Create `SalesInvoice` and `SalesInvoiceItem` entities
- [ ] Create `SalesPayment` entity
- [ ] Create `SalesInvoiceService` with state machine
- [ ] Implement state transitions (draft → completed → cancelled)
- [ ] Implement payment tracking
- [ ] Create controllers and DTOs
- [ ] **Integration**: Wire SalesInvoice completion to `StockService.dispenseStock()`

### Phase 4: Database Migration
- [ ] Create migration for all new entities
- [ ] Apply migration to database

### Phase 5: Testing & Documentation
- [ ] Test purchase workflow end-to-end
- [ ] Test sales workflow end-to-end
- [ ] Test stock integration
- [ ] Update API documentation

---

## Multi-Tenancy (Organization Isolation)

All entities include:
```typescript
@Column({ name: 'organization_id' })
@Index()
organizationId: string;

@ManyToOne(() => Organization, { onDelete: 'CASCADE' })
organization: Organization;
```

All services verify organization access via `RequestContext`:
```typescript
if (!ctx.isPlatformSuperAdmin()) {
  // Filter by organizationId
  // Verify user has access
}
```

---

## Key Design Decisions Summary

| Decision | Source | Reason |
|----------|--------|--------|
| **3-step purchase workflow** | ERPNext | Handles complex B2B procurement with partial deliveries |
| **1-step sales workflow** | Vendure | Fast POS checkout for walk-in customers |
| **State machine for sales** | Vendure | Clear status tracking, simple transitions |
| **Progress tracking for purchases** | ERPNext | Track percentReceived, percentBilled |
| **Valuation tracking** | ERPNext | Enable COGS calculation and P&L reports |
| **Optional customer for sales** | Both | Support both walk-in (no customer) and registered customers |
| **Supplier payment terms** | ERPNext | Handle credit terms (net 30, early payment discounts) |

---

## Next Steps

Begin implementation with Phase 1 (Foundation entities: Supplier and Customer).

**Reference Codebases**:
- Vendure: `/src/entity/order/` and `/src/service/services/order.service.ts`
- ERPNext: `/erpnext/buying/doctype/purchase_order/` and `/erpnext/stock/doctype/purchase_receipt/`
