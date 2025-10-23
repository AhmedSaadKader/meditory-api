export enum Permission {
  // Special permissions
  Authenticated = 'Authenticated',
  Public = 'Public',
  Owner = 'Owner',
  SuperAdmin = 'SuperAdmin',

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
}
