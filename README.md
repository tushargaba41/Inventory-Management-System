# Inventory and Data Management System

A RESTful backend for managing a store or warehouse product catalogue, built with **Node.js, Express.js, MongoDB, Mongoose and dotenv**.

## Features

- Product schema with field-level validation (Mongoose)
- Full CRUD for products
- Filtering, sorting and pagination on the product list
- Stock increment / decrement (restock and sale) with protection against negative stock
- Low-stock alert report (aggregation)
- Category-wise inventory summary (aggregation)
- Validation middleware and centralized error handling
- MongoDB connection configured through `.env`

## Project Structure

```
inventory-system/
├── config/db.js                   # MongoDB connection
├── controllers/productController.js
├── middleware/
│   ├── errorHandler.js            # 404 + central error handler
│   ├── validateObjectId.js        # checks :id is a valid ObjectId
│   └── validateProduct.js         # checks request body
├── models/Product.js              # Mongoose schema + validation
├── routes/productRoutes.js
├── utils/                         # AppError, asyncHandler
├── seed.js                        # optional sample data (12 products)
├── server.js                      # app entry point
├── .env / .env.example
└── package.json
```

## Setup

### 1. Prerequisites
- Node.js 18 or newer
- MongoDB running locally (MongoDB Community Server), **or** a free MongoDB Atlas cluster
- Postman

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment variables
The `.env` file is already included. Edit it if needed:
```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/inventory_db
```
Using MongoDB Atlas? Replace `MONGO_URI` with your Atlas connection string.

### 4. (Optional) Load sample data
```bash
npm run seed
```
This inserts 12 products across 5 categories (Furniture, Electronics, Apparel, Stationery, Grocery). 12 products with the default page size of 10 gives you exactly 2 pages, and several items are below their reorder level, so every API has something to show.

### 5. Start the server
```bash
npm start          # normal
npm run dev        # auto-restart on file changes (Node 18.11+)
```
You should see:
```
MongoDB connected: 127.0.0.1/inventory_db
Server running on http://localhost:5000
```

## Product Fields

| Field | Type | Rules |
|---|---|---|
| name | String | required, 2-100 chars |
| sku | String | required, unique, uppercase letters/numbers/hyphens |
| category | String | required |
| price | Number | required, >= 0 |
| quantity | Number | required, whole number, >= 0 |
| reorderLevel | Number | optional, whole number >= 0, default 10 |
| supplier | String | optional, default "Unknown" |

Every response also includes `_id`, `id`, `createdAt`, `updatedAt` and a calculated `stockValue` (price x quantity).

## API Endpoints

| Method | URL | Purpose |
|---|---|---|
| POST | /api/products | Create product |
| GET | /api/products | List (filter, sort, paginate) |
| GET | /api/products/:id | Get one product |
| PUT | /api/products/:id | Update product details |
| PATCH | /api/products/:id/stock | Increase / decrease stock |
| DELETE | /api/products/:id | Delete product |
| GET | /api/products/low-stock | Low-stock alert report |
| GET | /api/products/summary | Category-wise summary |

## Testing in Postman (step by step)

Base URL: `http://localhost:5000`

For every POST / PUT / PATCH request: open the **Body** tab, choose **raw**, and set the type dropdown to **JSON**.

### 1. Create a product
- **POST** `http://localhost:5000/api/products`
- Body:
```json
{
  "name": "Gel Pen Pack of 15",
  "sku": "STNY-PN-713",
  "category": "Stationery",
  "price": 120,
  "quantity": 40,
  "reorderLevel": 20,
  "supplier": "Cello Pens"
}
```
- Expected: **201 Created** with the product, including `stockValue: 4800`.
- **Copy the `_id`** from the response. You'll use it below as `PRODUCT_ID`.

### 2. Get all products
- **GET** `http://localhost:5000/api/products`
- Expected: **200 OK** with `total`, `page`, `totalPages`, `count` and a `products` array (10 per page by default).

### 3. Filtering, sorting and pagination
Add these in Postman's **Params** tab (or type them in the URL):

| Try this URL | What it does |
|---|---|
| `/api/products?page=2` | second page |
| `/api/products?page=1&limit=5` | 5 items per page |
| `/api/products?category=Electronics` | only Electronics |
| `/api/products?supplier=IKEA India` | only that supplier |
| `/api/products?search=table` | name contains "table" |
| `/api/products?minPrice=500&maxPrice=3000` | price range |
| `/api/products?inStock=true` | quantity > 0 |
| `/api/products?sort=price` | cheapest first |
| `/api/products?sort=-price` | most expensive first |
| `/api/products?category=Electronics&sort=-price&limit=2` | combined |

### 4. Get a single product
- **GET** `http://localhost:5000/api/products/PRODUCT_ID`
- Expected: **200 OK**.

### 5. Update product details
- **PUT** `http://localhost:5000/api/products/PRODUCT_ID`
- Body (send only what you want to change):
```json
{ "name": "Gel Pen Pack of 15", "sku": "STNY-PN-713", "category": "Stationery", "price": 140, "quantity": 60 }
```
- Expected: **200 OK**, `price: 140`, `quantity: 60`, `stockValue: 8400`. Fields you didn't send (`reorderLevel`, `supplier`) stay unchanged.

### 6. Stock adjustment (restock / sale)
- **PATCH** `http://localhost:5000/api/products/PRODUCT_ID/stock`
- Restock 10 units: `{ "change": 10 }`
- Sell 5 units: `{ "change": -5 }`
- Expected: **200 OK** with `"message": "Stock updated"` and the updated product.
- Try selling more than you have (e.g. `{ "change": -9999 }`) -> **400** "Insufficient stock".

### 7. Low-stock alert report
- **GET** `http://localhost:5000/api/products/low-stock`
- Expected: **200 OK** with `count` and `lowStockItems` (products where `quantity <= reorderLevel`, lowest stock first, each with a `shortBy` value).
- To see a change: use the stock PATCH to drop a product below its reorder level, then call this again.

### 8. Category-wise inventory summary
- **GET** `http://localhost:5000/api/products/summary`
- Expected: **200 OK** with `categories` and a `summary` array. Each entry has `_id` (the category), `totalItems`, `totalQuantity`, `totalStockValue` and `avgPrice`.

### 9. Delete a product
- **DELETE** `http://localhost:5000/api/products/PRODUCT_ID`
- Expected: **200 OK**, `{ "message": "Product deleted", "id": "..." }`
- Calling the same GET again now returns **404**.

## Testing Error Handling

| Test | Request | Expected |
|---|---|---|
| Missing fields | POST `/api/products` with body `{ "name": "Pen" }` | 400, lists missing fields |
| Negative price | POST with `"price": -5` | 400 "Price cannot be negative" |
| Price as text | POST with `"price": "abc"` | 400 "price must be a number" |
| Duplicate SKU | POST the same `sku` twice | 409 duplicate value |
| Invalid id | GET `/api/products/123` | 400 "Invalid product id" |
| Unknown id | GET `/api/products/000000000000000000000000` | 404 "Product not found" |
| Unknown route | GET `/api/xyz` | 404 "Route not found" |
| Bad sort | GET `/api/products?sort=color` | 400 lists allowed fields |
| Bad stock change | PATCH stock with `{ "change": 0 }` | 400 |
| Broken JSON | send `{ "name": ` | 400 "Invalid JSON" |

All errors use one format:
```json
{ "success": false, "message": "Validation failed", "errors": ["Price cannot be negative"] }
```

## Troubleshooting

- **`MongoDB connection failed`**: MongoDB isn't running. Start the MongoDB service (or check your Atlas connection string and IP allow-list).
- **`Cannot find module 'express'`**: run `npm install`.
- **Port already in use**: change `PORT` in `.env`.
- **`/low-stock` or `/summary` return "Invalid product id"**: those routes must be declared before `/:id` in `routes/productRoutes.js` (they already are).
