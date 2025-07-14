# Order and Delivery Flow

This document describes the full order and delivery workflow, including all relevant API endpoints and example JSON payloads.

---

## 1. Order Placement

**Endpoint:**
`POST /api/orders`

**Request JSON:**

```json
{
  "products": [
    { "product": "PRODUCT_ID_1", "quantity": 2 },
    { "product": "PRODUCT_ID_2", "quantity": 1 }
  ]
}
```

**Response JSON (example):**

```json
{
  "_id": "ORDER_ID",
  "store": "STORE_USER_ID",
  "products": [
    { "product": "PRODUCT_ID_1", "quantity": 2, "price": 10.99 },
    { "product": "PRODUCT_ID_2", "quantity": 1, "price": 5.50 }
  ],
  "total": 27.48,
  "status": "pending",
  "orderId": "ORD-2024-001"
}
```

---

## 2. Admin Assigns Delivery Guy

**Endpoint:**
`PUT /api/orders/:id/assign`

**Request JSON:**

```json
{
  "deliveryGuyId": "DELIVERY_USER_ID"
}
```

**Response JSON (example):**

```json
{
  "_id": "ORDER_ID",
  "assignedTo": "DELIVERY_USER_ID",
  "status": "waiting_for_delivery"
  // ...other order fields
}
```

**Notification Created (in DB):**

```json
{
  "user": "DELIVERY_USER_ID",
  "type": "order_assigned",
  "data": {
    "orderId": "ORDER_ID",
    "store": "STORE_USER_ID"
  }
}
```

---

## 3. Delivery Guy Receives Notification

**Endpoint:**
`GET /api/auth/notifications`

**Response JSON (example):**

```json
[
  {
    "type": "order_assigned",
    "data": {
      "orderId": "ORDER_ID",
      "store": "STORE_USER_ID"
    },
    "read": false,
    "timestamp": "2024-06-01T12:00:00Z"
  }
  // ...other notifications
]
```

---

## 4. Delivery Guy Confirms Receipt ("Got the Order")

**Endpoint:**
`PUT /api/orders/:id/got`

**Request JSON:**
_(No body needed, just authentication as the delivery guy)_

**Response JSON (example):**

```json
{
  "_id": "ORDER_ID",
  "assignedTo": "DELIVERY_USER_ID",
  "status": "delivering"
  // ...other order fields
}
```

---

## 5. Delivery Guy Marks as Delivered

**Endpoint:**
`PUT /api/orders/:id/deliverystatus`

**Request JSON:**

```json
{
  "status": "delivered"
}
```

**Response JSON (example):**

```json
{
  "_id": "ORDER_ID",
  "status": "delivered"
  // ...other order fields
}
```

---

## Summary Table

| Step                        | Endpoint                           | Request JSON Example                                   | Response/Notification Example                   |
| --------------------------- | ---------------------------------- | ------------------------------------------------------ | ----------------------------------------------- |
| Place Order                 | POST /api/orders                   | `{ "products": [{ "product": "...", "quantity": 2 }]}` | Order object with status "pending"              |
| Assign Delivery Guy         | PUT /api/orders/:id/assign         | `{ "deliveryGuyId": "..." }`                           | Order object with status "waiting_for_delivery" |
| Delivery Guy Notification   | GET /api/auth/notifications        | —                                                      | Notification object with orderId                |
| Delivery Guy Confirms "Got" | PUT /api/orders/:id/got            | —                                                      | Order object with status "delivering"           |
| Mark as Delivered           | PUT /api/orders/:id/deliverystatus | `{ "status": "delivered" }`                            | Order object with status "delivered"            |
