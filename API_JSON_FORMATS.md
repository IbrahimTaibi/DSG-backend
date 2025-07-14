# API JSON Formats: What to Send from the Frontend

This document describes the JSON request bodies your backend expects for each endpoint. All formats are based on the actual validation and controller logic in the codebase.

---

## Auth

### Register (POST /api/auth/register)

```json
{
  "name": "string (required)",
  "mobile": "string (required)",
  "password": "string (required)",
  "email": "string (optional)",
  "address": "string (optional)",
  "role": "string (optional, defaults to 'store'; allowed: admin|store|delivery)"
}
```

### Login (POST /api/auth/login)

```json
{
  "mobile": "string (required)",
  "password": "string (required)"
}
```

### Forgot Password (POST /api/auth/forgot-password)

```json
{
  "email": "string (optional)",
  "mobile": "string (optional)"
}
```

### Reset Password (POST /api/auth/reset-password)

```json
{
  "id": "userId (required)",
  "token": "string (required, from reset email)",
  "password": "string (required, new password)"
}
```

---

## Products

### Create/Update Product (POST/PUT /api/products, /api/products/:id)

```json
{
  "name": "string (required)",
  "description": "string (optional)",
  "price": "number (required)",
  "stock": "number (optional, default 0)",
  "category": "categoryId (required)",
  "additionalCategories": ["categoryId", ...],
  "image": "string (optional, URL or path)"
}
```

---

## Categories

### Create/Update Category (POST/PUT /api/categories, /api/categories/:id)

```json
{
  "name": "string (required)",
  "parent": "categoryId (optional)"
}
```

---

## Orders

### Place Order (POST /api/orders)

```json
{
  "products": [
    {
      "product": "productId (required)",
      "quantity": "number (required)",
      "price": "number (required, price at time of order)"
    }
    // ... more products
  ]
}
```

### Assign Delivery (PUT /api/orders/:id/assign)

```json
{
  "deliveryGuyId": "userId (required)"
}
```

### Update Order Status (PUT /api/orders/:id/status)

```json
{
  "status": "string (required, e.g. assigned|delivering|delivered|cancelled)"
}
```

### Update Delivery Status (PUT /api/orders/:id/deliverystatus)

```json
{
  "status": "string (required, e.g. delivering|delivered)"
}
```

### Cancel Order (PUT /api/orders/:id/cancel)

```json
{
  "reason": "string (optional)"
}
```

**Note:** When you place or cancel an order, you will receive an email notification with a summary of your order and its status. The email includes product details, quantities, total, and (for cancellations) the reason for cancellation.

---

## Messages (Chat)

### Store to Delivery (POST /api/messages/store/delivery)

```json
{
  "orderId": "orderId (required)",
  "content": "string (required)"
}
```

### Store to Admin (POST /api/messages/store/admin)

```json
{
  "content": "string (required)"
}
```

### Delivery to Admin (POST /api/messages/delivery/admin)

```json
{
  "content": "string (required)"
}
```

---

**Note:** All IDs (`userId`, `categoryId`, `productId`, `orderId`) are MongoDB ObjectIds as strings. All endpoints expect `Content-Type: application/json`.
