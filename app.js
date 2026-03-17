const express = require("express");
const app = express();
const path = require("path");
const methodOverride = require("method-override");
const db = require("./db");

// middleware
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(__dirname + "/public"));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// HOME
app.get("/", (req, res) => {
    res.render("index");
});

// VIEW ALL VENDORS
app.get("/vendors", (req, res) => {
    db.query("SELECT * FROM vendors", (err, results) => {
        if (err) return res.send(err);
        res.render("vendors/index", { vendors: results });
    });
});

// SHOW FORM
app.get("/vendors/new", (req, res) => {
    res.render("vendors/new");
});

// ADD VENDOR
app.post("/vendors", (req, res) => {
    const { name, contact, email, address } = req.body;

    const sql = "INSERT INTO vendors (name, contact, email, address) VALUES (?, ?, ?, ?)";

    db.query(sql, [name, contact, email, address], (err) => {
        if (err) return res.send(err);
        res.redirect("/vendors");
    });
});

// DELETE VENDOR
app.delete("/vendors/:id", (req, res) => {
    const { id } = req.params;

    db.query("DELETE FROM vendors WHERE vendor_id = ?", [id], (err) => {
        if (err) return res.send(err);
        res.redirect("/vendors");
    });
});

// SERVER
app.listen(3000, () => {
    console.log("Server running on port 3000");
});

// VIEW PRODUCTS (WITH JOIN)
app.get("/products", (req, res) => {
    const sql = `
        SELECT products.*, vendors.name AS vendor_name
        FROM products
        JOIN vendors ON products.vendor_id = vendors.vendor_id
    `;

    db.query(sql, (err, results) => {
        if (err) return res.send(err);
        res.render("products/index", { products: results });
    });
});

// SHOW FORM (WITH VENDORS DROPDOWN)
app.get("/products/new", (req, res) => {
    db.query("SELECT * FROM vendors", (err, vendors) => {
        if (err) return res.send(err);
        res.render("products/new", { vendors });
    });
});

// ADD PRODUCT
app.post("/products", (req, res) => {
    const { product_name, price, stock, vendor_id } = req.body;

    const sql = `
        INSERT INTO products (product_name, price, stock, vendor_id)
        VALUES (?, ?, ?, ?)
    `;

    db.query(sql, [product_name, price, stock, vendor_id], (err) => {
        if (err) return res.send(err);
        res.redirect("/products");
    });
});

app.get("/orders", (req, res) => {
    const sql = `
        SELECT orders.*, vendors.name AS vendor_name
        FROM orders
        JOIN vendors ON orders.vendor_id = vendors.vendor_id
    `;

    db.query(sql, (err, results) => {
        if (err) return res.send(err);
        res.render("orders/index", { orders: results });
    });
});

app.get("/orders/new", (req, res) => {
    db.query("SELECT * FROM vendors", (err, vendors) => {
        if (err) return res.send(err);

        db.query("SELECT * FROM products", (err, products) => {
            if (err) return res.send(err);

            res.render("orders/new", { vendors, products });
        });
    });
});

app.post("/orders", (req, res) => {
    let { vendor_id, products } = req.body;

    // ❌ No product selected
    if (!products) {
        return res.send("Please select at least one product");
    }

    // ✅ Ensure array
    if (!Array.isArray(products)) {
        products = [products];
    }

    const orderSql = "INSERT INTO orders (vendor_id, order_date) VALUES (?, CURDATE())";

    db.query(orderSql, [vendor_id], (err, result) => {
        if (err) return res.send(err);

        const order_id = result.insertId;

        for (let i = 0; i < products.length; i++) {
            const product_id = products[i];

            // ✅ THIS IS THE LINE YOU ASKED ABOUT
            const quantity = req.body[`quantity_${product_id}`] || 1;

            const detailSql = `
                INSERT INTO order_details (order_id, product_id, quantity, unit_price)
                VALUES (?, ?, ?, (SELECT price FROM products WHERE product_id = ?))
            `;

            db.query(detailSql, [order_id, product_id, quantity, product_id]);
        }

        res.redirect("/orders");
    });
});

app.get("/payments", (req, res) => {
    const sql = `
        SELECT payments.*, orders.order_id, vendors.name AS vendor_name
        FROM payments
        JOIN orders ON payments.order_id = orders.order_id
        JOIN vendors ON orders.vendor_id = vendors.vendor_id
    `;

    db.query(sql, (err, results) => {
        if (err) return res.send(err);
        res.render("payments/index", { payments: results });
    });
});

app.get("/payments/new", (req, res) => {
    db.query(`
        SELECT orders.order_id, vendors.name AS vendor_name
        FROM orders
        JOIN vendors ON orders.vendor_id = vendors.vendor_id
    `, (err, orders) => {
        if (err) return res.send(err);
        res.render("payments/new", { orders });
    });
});

app.post("/payments", (req, res) => {
    const { order_id, amount, payment_method } = req.body;

    const sql = `
        INSERT INTO payments (order_id, amount, payment_date, payment_method, status)
        VALUES (?, ?, CURDATE(), ?, 'Completed')
    `;

    db.query(sql, [order_id, amount, payment_method], (err) => {
        if (err) return res.send(err);
        res.redirect("/payments");
    });
});

