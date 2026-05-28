# Security Specification: Jassinta Atelier WMS

## Data Invariants
1. **Products**: Every product must have a unique SKU and a non-negative price. Images must be stored as URLs.
2. **Orders**: Orders must have a valid customer name, platform (Shopee, Tokopedia, etc.), and a non-empty items list.
3. **Inventory**: Stock movements must be immutable once recorded. Every movement must specify a type (Stock In, Stock Out, etc.).
4. **Transactions**: Financial records must have a type (Income/Expense) and an amount.
5. **Karyawan**: Pulse data for employees must be restricted to authenticated administrators.

## Access Control Matrix
| Collection | Authenticated User | Admin / Owner | Anonymous |
|------------|---------------------|---------------|-----------|
| products   | Read-Only           | Read/Write    | Read-Only |
| orders     | Read-Only           | Read/Write    | Read-Only |
| inventory  | Read-Only           | Read/Write    | Denied    |
| transactions| Denied             | Read/Write    | Denied    |
| karyawan   | Denied              | Read/Write    | Denied    |
| settings   | Read-Only           | Read/Write    | Read-Only |

## The "Dirty Dozen" (Boundary Testing Payloads)
1. **Payload 1 (Price Spoofing)**: Create a product with a negative price.
2. **Payload 2 (Inventory Bypass)**: Directly modify `physicalStock` without an `inventory_movement` record.
3. **Payload 3 (Role Escalation)**: Attempt to update own role to "Owner".
4. **Payload 4 (Orphaned Order Item)**: Add an item to an order that doesn't exist in the products collection.
5. **Payload 5 (Cross-Tenant Write)**: Attempt to delete a product using a non-admin account.
6. **Payload 6 (Invalid SKU)**: Create a product with a 2KB string as a SKU.
7. **Payload 7 (Status Shortcut)**: Change an order status from "Pending" directly to "Delivered" bypassing "Packed" and "Shipped".
8. **Payload 8 (State Lock Bypass)**: Try to edit an order after it has been marked as "Finished".
9. **Payload 9 (PII Leak)**: Attempt to read transactions without the 'Admin' role.
10. **Payload 10 (Inventory Poisoning)**: Write an inventory movement with an invalid type 'Hacked'.
11. **Payload 11 (Timestamp Faking)**: Set `updatedAt` to a future date instead of `request.time`.
12. **Payload 12 (Ghost Fields)**: Add a field `isHacker: true` to a product document.
