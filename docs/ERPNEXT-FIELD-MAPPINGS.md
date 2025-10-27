# ERPNext Field Mappings - Direct from Source Code

This document maps ERPNext's actual field names (from their GitHub source) to our TypeORM entities.

**Source**: https://github.com/frappe/erpnext (develop branch)

---

## Purchase Order

**ERPNext DocType**: `erpnext/buying/doctype/purchase_order/purchase_order.json`

### Core Fields (Required)
| ERPNext Field | Our Field | Type | Notes |
|---------------|-----------|------|-------|
| `supplier` | `supplierId` | Link (uuid) | Required |
| `naming_series` | Auto-generated | String | PO-{year}-{sequence} |
| `transaction_date` | `orderDate` | Date | Required, default: Today |
| `company` | `organizationId` | Link (uuid) | Our multi-tenant field |
| `currency` | Not needed | - | Single currency for now |
| `items` | `items` | Table | PurchaseOrderItem[] |

### Status/Progress Fields
| ERPNext Field | Our Field | Type | Notes |
|---------------|-----------|------|-------|
| `status` | `status` | Enum | Draft, Ordered, Receiving, Completed, Cancelled |
| `per_received` | `percentReceived` | Decimal(5,2) | Read-only, calculated |
| `per_billed` | `percentBilled` | Decimal(5,2) | Read-only, calculated |

### Financial Fields
| ERPNext Field | Our Field | Type | Notes |
|---------------|-----------|------|-------|
| `total` | `totalAmount` | Decimal(15,2) | Sum of items |
| `grand_total` | `totalAmount` | Decimal(15,2) | Final total (we combine these) |
| `taxes_and_charges` | `taxAmount` | Decimal(15,2) | Tax total |
| `discount_amount` | `discountAmount` | Decimal(15,2) | Total discount |

---

## Purchase Order Item

**ERPNext DocType**: `erpnext/buying/doctype/purchase_order_item/purchase_order_item.json`

### Quantity Fields
| ERPNext Field | Our Field | Type | Notes |
|---------------|-----------|------|-------|
| `item_code` | `drugId` | Link (number) | Required, links to Drug |
| `qty` | `orderedQuantity` | Decimal(15,3) | Required |
| `received_qty` | `receivedQuantity` | Decimal(15,3) | Tracks receipt progress |
| `returned_qty` | `returnedQuantity` | Decimal(15,3) | **Implementing returns!** |

### Pricing Fields
| ERPNext Field | Our Field | Type | Notes |
|---------------|-----------|------|-------|
| `rate` | `unitPrice` | Decimal(15,2) | Item rate |
| `amount` | `lineTotal` | Decimal(15,2) | qty × rate |
| `net_amount` | `netAmount` | Decimal(15,2) | After discounts |
| `discount_percentage` | `discountPercent` | Decimal(5,2) | Discount % |
| `discount_amount` | `discountAmount` | Decimal(15,2) | Absolute discount |

---

## Purchase Receipt

**ERPNext DocType**: `erpnext/stock/doctype/purchase_receipt/purchase_receipt.json`

### Core Fields
| ERPNext Field | Our Field | Type | Notes |
|---------------|-----------|------|-------|
| `supplier` | From PO | Link | Get from Purchase Order |
| `naming_series` | Auto-generated | String | PR-{year}-{sequence} |
| `posting_date` | `receivedDate` | Date | Required |
| `posting_time` | Include in datetime | Time | Combine into receivedDate |
| `company` | `organizationId` | Link (uuid) | From Purchase Order |
| `items` | `items` | Table | PurchaseReceiptItem[] |
| `purchase_order` | `purchaseOrderId` | Link (uuid) | **Critical reference** |

### Status Fields
| ERPNext Field | Our Field | Type | Notes |
|---------------|-----------|------|-------|
| `status` | `status` | Enum | Draft, Received, Cancelled, Return |
| `is_return` | `isReturn` | Boolean | **Implementing returns!** |
| `return_against` | `returnAgainst` | Link (uuid) | Original receipt if return |

### Warehouse Fields
| ERPNext Field | Our Field | Type | Notes |
|---------------|-----------|------|-------|
| `set_warehouse` | `pharmacyId` | Link (uuid) | Accepted warehouse |
| `rejected_warehouse` | Not implementing | - | Rejections = returns |

---

## Purchase Receipt Item

**ERPNext DocType**: `erpnext/stock/doctype/purchase_receipt_item/purchase_receipt_item.json`

### Batch Tracking Fields (**Critical for Pharmacy**)
| ERPNext Field | Our Field | Type | Notes |
|---------------|-----------|------|-------|
| `item_code` | `drugId` | Link (number) | Required |
| `batch_no` | `batchNumber` | String(100) | **Required** for pharmacy |
| `expiry_date` | **expiryDate** | Date | **We add this - critical for pharma!** |

### Quantity Fields
| ERPNext Field | Our Field | Type | Notes |
|---------------|-----------|------|-------|
| `qty` | `receivedQuantity` | Decimal(15,3) | Accepted qty (positive or negative if return) |
| `warehouse` | From PR level | - | Use PR.pharmacyId |

### Pricing Fields
| ERPNext Field | Our Field | Type | Notes |
|---------------|-----------|------|-------|
| `rate` | `costPrice` | Decimal(15,2) | What we paid |
| `price_list_rate` | `sellingPrice` | Decimal(15,2) | What we'll sell for |

### Purchase Order Reference (**Critical for Tracking**)
| ERPNext Field | Our Field | Type | Notes |
|---------------|-----------|------|-------|
| `purchase_order` | `purchaseOrderId` | Link (uuid) | From PR parent |
| `purchase_order_item` | `purchaseOrderItemId` | Link (uuid) | **Links to specific PO line** |

### Stock Movement Reference (**Our Addition**)
| ERPNext Field | Our Field | Type | Notes |
|---------------|-----------|------|-------|
| N/A | `stockMovementId` | Link (uuid) | **Links to our StockMovement ledger** |

---

## Purchase Invoice

**ERPNext DocType**: `erpnext/accounts/doctype/purchase_invoice/purchase_invoice.json`

### Core Fields
| ERPNext Field | Our Field | Type | Notes |
|---------------|-----------|------|-------|
| `supplier` | `supplierId` | Link (uuid) | Required |
| `naming_series` | Auto-generated | String | PI-{year}-{sequence} |
| `posting_date` | `invoiceDate` | Date | Required |
| `bill_no` | `supplierInvoiceNumber` | String(100) | Supplier's invoice # |
| `bill_date` | Not needed | - | Use posting_date |
| `due_date` | `dueDate` | Date | Payment due date |
| `purchase_order` | `purchaseOrderId` | Link (uuid) | Reference to PO |

### Financial Fields
| ERPNext Field | Our Field | Type | Notes |
|---------------|-----------|------|-------|
| `total` | `totalAmount` | Decimal(15,2) | Sum of items |
| `grand_total` | `totalAmount` | Decimal(15,2) | (combine with total) |
| `taxes_and_charges` | `taxAmount` | Decimal(15,2) | Tax total |
| `discount_amount` | `discountAmount` | Decimal(15,2) | Total discount |
| `outstanding_amount` | `balanceAmount` | Decimal(15,2) | Remaining to pay |

### Payment Status
| ERPNext Field | Our Field | Type | Notes |
|---------------|-----------|------|-------|
| `status` | `paymentStatus` | Enum | Unpaid, Partial, Paid |
| N/A | `paidAmount` | Decimal(15,2) | **We track this explicitly** |

---

## Purchase Payment (Payment Entry)

**ERPNext DocType**: `erpnext/accounts/doctype/payment_entry/payment_entry.json`

### Core Fields
| ERPNext Field | Our Field | Type | Notes |
|---------------|-----------|------|-------|
| `naming_series` | Auto-generated | String | PP-{year}-{sequence} |
| `payment_type` | Fixed: "Pay" | - | Always paying supplier |
| `posting_date` | `paymentDate` | Date | Required |
| `party_type` | Fixed: "Supplier" | - | Always supplier |
| `party` | From Invoice | Link | Get from PurchaseInvoice |
| `paid_amount` | `amount` | Decimal(15,2) | Payment amount |
| `mode_of_payment` | `paymentMethod` | Enum | Cash, Bank, Cheque, etc. |
| `reference_no` | `referenceNumber` | String(100) | Cheque/transfer ref |

### Reference Fields
| ERPNext Field | Our Field | Type | Notes |
|---------------|-----------|------|-------|
| `references` | `purchaseInvoiceId` | Link (uuid) | Which invoice we're paying |

---

## Sales Invoice (For Comparison)

**ERPNext DocType**: `erpnext/accounts/doctype/sales_invoice/sales_invoice.json`

**Note**: ERPNext also uses 3-step for sales (Order → Delivery → Invoice). We're using Vendure's 1-step pattern instead.

### Status Fields (ERPNext Sales)
| ERPNext Field | Our Field (Vendure pattern) | Notes |
|---------------|----------------------------|-------|
| `status` | `state` | We use state machine: Draft → Completed → Cancelled |
| `is_return` | `isReturn` | **We're implementing returns** |
| `return_against` | `returnAgainst` | Original invoice if return |

---

## Key Implementation Decisions

### ✅ What We're Implementing (Following ERPNext)
1. **Purchase Order → Purchase Receipt → Purchase Invoice** (3-step workflow)
2. **Returns support** (`isReturn`, `returnAgainst` fields)
3. **Progress tracking** (`percentReceived`, `percentBilled`)
4. **Batch tracking** with our pharmacy-specific `expiryDate`
5. **Payment tracking** with Payment Entry pattern
6. **Status management** (Draft, Ordered, Receiving, Completed, Cancelled)

### ✅ Pharmacy-Specific Additions
1. **expiryDate** at batch level (ERPNext doesn't have this!)
2. **sellingPrice** explicitly tracked
3. **stockMovementId** link to our valuation ledger
4. **pharmacyId** instead of warehouse (our multi-location model)

### ❌ What We're NOT Implementing (ERPNext features we don't need)
1. Price lists and pricing rules
2. Multi-currency
3. Subcontracting
4. Tax withholding (TDS)
5. Material requests
6. Project tracking
7. Landed costs
8. Quality inspection

---

## Return Workflow

### Purchase Return (Return to Supplier)
```
1. Create Purchase Receipt with isReturn=true
2. Select original Purchase Receipt in returnAgainst
3. Items have negative quantities
4. Creates negative StockMovement (removes from stock)
5. Updates PO.returnedQuantity
```

### Sales Return (Customer Returns)
```
1. Create Sales Invoice with isReturn=true
2. Select original Sales Invoice in returnAgainst
3. Items have negative quantities (refund)
4. Creates positive StockMovement (adds back to stock)
5. Updates customer balance
```

---

This mapping ensures we follow ERPNext's proven patterns while adding pharmacy-critical features (expiry tracking) and implementing returns from day one.
