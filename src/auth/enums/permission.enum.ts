export enum Permission {
  // Special permissions
  Authenticated = 'Authenticated',
  Public = 'Public',
  Owner = 'Owner',
  SuperAdmin = 'SuperAdmin',
  PlatformSuperAdmin = 'PlatformSuperAdmin',

  // Drug Management
  ReadDrug = 'ReadDrug',
  CreateDrug = 'CreateDrug',
  UpdateDrug = 'UpdateDrug',
  DeleteDrug = 'DeleteDrug',

  // Prescription Management
  ReadPrescription = 'ReadPrescription',
  CreatePrescription = 'CreatePrescription',
  UpdatePrescription = 'UpdatePrescription',
  DeletePrescription = 'DeletePrescription',
  DispensePrescription = 'DispensePrescription',

  // Inventory Management
  ReadInventory = 'ReadInventory',
  UpdateInventory = 'UpdateInventory',

  // User Management
  CreateUser = 'CreateUser',
  ReadUser = 'ReadUser',
  UpdateUser = 'UpdateUser',
  DeleteUser = 'DeleteUser',
  ManageRoles = 'ManageRoles',

  // Reports
  ViewSalesReports = 'ViewSalesReports',
  ViewInventoryReports = 'ViewInventoryReports',
  ViewAuditLogs = 'ViewAuditLogs',

  // Orders
  ReadOrder = 'ReadOrder',
  CreateOrder = 'CreateOrder',
  UpdateOrder = 'UpdateOrder',

  // Suppliers
  CreateSupplier = 'CreateSupplier',
  ReadSupplier = 'ReadSupplier',
  UpdateSupplier = 'UpdateSupplier',
  DeleteSupplier = 'DeleteSupplier',

  // Customers
  CreateCustomer = 'CreateCustomer',
  ReadCustomer = 'ReadCustomer',
  UpdateCustomer = 'UpdateCustomer',
  DeleteCustomer = 'DeleteCustomer',

  // Purchase Orders
  CreatePurchaseOrder = 'CreatePurchaseOrder',
  ReadPurchaseOrder = 'ReadPurchaseOrder',
  UpdatePurchaseOrder = 'UpdatePurchaseOrder',
  DeletePurchaseOrder = 'DeletePurchaseOrder',
  ApprovePurchaseOrder = 'ApprovePurchaseOrder',

  // Purchase Receipts
  CreatePurchaseReceipt = 'CreatePurchaseReceipt',
  ReadPurchaseReceipt = 'ReadPurchaseReceipt',
  UpdatePurchaseReceipt = 'UpdatePurchaseReceipt',
  DeletePurchaseReceipt = 'DeletePurchaseReceipt',

  // Purchase Invoices
  CreatePurchaseInvoice = 'CreatePurchaseInvoice',
  ReadPurchaseInvoice = 'ReadPurchaseInvoice',
  UpdatePurchaseInvoice = 'UpdatePurchaseInvoice',
  DeletePurchaseInvoice = 'DeletePurchaseInvoice',

  // Sales Invoices
  CreateSalesInvoice = 'CreateSalesInvoice',
  ReadSalesInvoice = 'ReadSalesInvoice',
  UpdateSalesInvoice = 'UpdateSalesInvoice',
  DeleteSalesInvoice = 'DeleteSalesInvoice',
  CompleteSalesInvoice = 'CompleteSalesInvoice',
}
