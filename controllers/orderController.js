// to calculate price (here we should use localStorage in forntend)
// in frontend we should send object that has array named (cart) that contains objects
// each object has the product id and quantity

const priceCalculation = function (rows, cart) {
  const result = rows.map((product) => {
    // إيجاد الكمية من cart
    const item = cart.find((c) => c.id === product.id);
    const quantity = item ? item.quantity : 1;

    const total_price = Number(product.price) * quantity;

    return {
      id: product.id,
      product_name: product.product_name,
      product_image: product.product_image,
      unit_price: Number(product.price),
      quantity,
      total_price,
    };
  });

  // 🧾 حساب السعر الإجمالي لكل العربة
  const cartTotal = result.reduce((sum, p) => sum + p.total_price, 0);
  return {
    result: result,
    cartTotal: cartTotal,
  };
};

exports.previewCart = async (req, res) => {
  try {
    const { cart } = req.body;

    if (!Array.isArray(cart)) {
      return res.status(400).json({ message: "request body invalid" });
    } else if (cart.length === 0) {
      return res.status(400).json({ message: "No Products Selected" });
    }

    // جمع الـ IDs من الـ cart
    const productIds = cart.map((ele) => ele.id);

    // جلب المنتجات من قاعدة البيانات
    const [rows] = await db.query(
      `SELECT id, product_image, product_name, COALESCE(current_price, base_price) AS price
        FROM products
        WHERE id IN (${productIds.join(",")})`
    );

    // التحقق من المنتجات غير الموجودة
    const existingIds = rows.map((ele) => ele.id);
    const notExistingProductIds = productIds.filter(
      (id) => !existingIds.includes(id)
    );

    if (notExistingProductIds.length > 0) {
      return res.status(400).json({
        message: `Products with id(s) ${notExistingProductIds.join(
          ", "
        )} are no longer existing`,
      });
    }
    const { result, cartTotal } = priceCalculation(rows, cart);
    console.log(cartTotal)
    // 🧮 حساب السعر النهائي لكل منتج
    return res.status(200).json({
      products: result,
      total_cart_price: cartTotal,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

exports.addOrder = async (req, res) => {
  try {
    const { cart, address, cardNumber, cvvNumber } = req.body;
    const { id, username } = req.user;

    if (!Array.isArray(cart)) {
      return res.status(400).json({ message: "request body invalid" });
    } else if (cart.length === 0) {
      return res.status(400).json({ message: "no products selected" });
    }

    if (!address) {
      return res.status(400).json({ message: "Address Required" });
    }

    const productIds = cart.map((ele) => {
      return ele.id;
    });

    const [rows] =
      await db.query(`select id, product_name, COALESCE(current_price, base_price) AS price
        FROM products
        WHERE id IN (${productIds.join(",")})`);

    const existingIds = rows.map((ele) => {
      return ele.id;
    });
    const notExistingIds = productIds.filter((ele) => {
      return !existingIds.includes(ele);
    });

    if (notExistingIds.length > 0) {
      return res.status(400).json({
        message: `Products with id(s) ${notExistingIds.join(
          ", "
        )} are no longer existing`,
      });
    }

    const [cardCheck] = await db.query(
      "select * from payment_cards where card_number = ? and cvv = ?",
      [cardNumber, cvvNumber]
    );

    if (cardCheck.length === 0) {
      return res.status(401).json({ message: "Card Credentials Invalid" });
    }

    if (cardCheck[0].client_id !== id) {
      return res
        .status(403)
        .json({ message: "This card doesn't belong to you" });
    }

    // Not Important
    const [clientExistance] = await db.query(
      "select * from clients where id=? and username = ?",
      [id, username]
    );
    if (clientExistance.length === 0) {
      return res.status(401).json({ message: "Unauthorized User" });
    }

    const { result, cartTotal } = priceCalculation(rows, cart);

    const cardBalance = cardCheck[0].balance;
    const cardId = cardCheck[0].id;

    const [all_client_orders] = await db.query(
      "select total_price from orders where client_id = ? and card_id = ? and status = ?",
      [id, cardId, "pending"]
    );

    let allOrdersPrice = 0;

    for (const orderPrice of all_client_orders) {
      allOrdersPrice += Number(orderPrice.total_price);
    }

    console.log("all orders price", all_client_orders);
    console.log(allOrdersPrice);

    if (Number(cardBalance) < cartTotal) {
      return res
        .status(400)
        .json({ message: "You Don't Have Enough Money For This Purchase" });
    }

    if (allOrdersPrice + cartTotal > cardBalance) {
      return res.status(400).json({
        message: "You Dont Have Enough Money",
        pending_orders_price: allOrdersPrice,
        newOrderPrice: cartTotal,
        card_total: cardBalance,
      });
    }
    const addOrder = await db.query(
      "insert into orders (client_id, card_id, total_price, address) values (?, ?, ?, ?)",
      [id, cardId, cartTotal, address]
    );

    const orderId = addOrder[0].insertId;
    console.log(result);

    for (const item of result) {
      await db.query(
        "INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES (?, ?, ?, ?)",
        [orderId, item.id, item.quantity, item.total_price]
      );
    }

    return res.status(200).json({
      message:
        "Payment success You Can Check Your Orders List To Follow The Order Status",
      products: result,
      total_cart_price: cartTotal,
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getOrders = async (req, res) => {
  try {
    const userRole = req.user.role;
    const clientOrEmployeeId = req.user.id;

    // 🧑‍💼 Salesperson
    if (userRole === 2) {
      const [rows] = await db.query(
        "SELECT * FROM orders WHERE assigned_to = ? OR assigned_to IS NULL",
        [clientOrEmployeeId]
      );
      return res.status(200).json({ orders: rows });
    } else if (typeof userRole === "number" && userRole !== 2) {
      return res
        .status(400)
        .json({ message: "This Employee Role Cannot Get Orders" });
    }

    // 👤 Client
    if (!userRole) {
      const [orders] = await db.query(
        "SELECT * FROM orders WHERE client_id = ?",
        [clientOrEmployeeId]
      );

      if (orders.length === 0) {
        return res.status(400).json({ message: "No Orders Created" });
      }

      // 🔹 استخراج جميع معرفات الطلبات
      const ordersIds = orders.map((o) => o.id);
      const ordersPlaceholders = ordersIds.map(() => "?").join(", ");

      // 🔹 جلب جميع عناصر الطلبات
      const [order_items] = await db.query(
        `SELECT * FROM order_items WHERE order_id IN (${ordersPlaceholders})`,
        ordersIds
      );

      // 🔹 استخراج جميع product_ids لجلب تفاصيلها دفعة واحدة
      const productIds = [
        ...new Set(order_items.map((item) => item.product_id)),
      ];

      let products = [];
      if (productIds.length > 0) {
        const productPlaceholders = productIds.map(() => "?").join(", ");
        const [productRows] = await db.query(
          `SELECT id, product_name, product_image, COALESCE(current_price, base_price) AS price FROM products WHERE id IN (${productPlaceholders})`,
          productIds
        );
        products = productRows;
      }

      // 🔹 دمج تفاصيل المنتج داخل كل عنصر
      const orderItemsWithProducts = order_items.map((item) => {
        const product = products.find((p) => p.id === item.product_id);
        return {
          ...item,
          product: product
            ? {
              id: product.id,
              name: product.product_name,
              price: product.price,
              image: product.product_image,
            }
            : null, // في حال لم يُعثر على المنتج
        };
      });

      // 🔹 ربط العناصر مع الطلبات
      const ordersWithItems = orders.map((order) => {
        const items = orderItemsWithProducts.filter(
          (item) => item.order_id === order.id
        );
        return { ...order, items };
      });

      return res.status(200).json({ orders: ordersWithItems });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// New Order Tracking Using (Get Connection And RollBack)
exports.trackingOrder = async (req, res) => {
  let connection;

  try {
    const { id: employeeId, role } = req.user;
    const { id: orderId, status } = req.body;

    if (role !== 2) {
      return res
        .status(403)
        .json({ message: "This employee role cannot edit orders" });
    }

    // أخذ الاتصال الطبيعي (بدون Transaction) لفحص الطلب
    const [rows] = await db.query("SELECT * FROM orders WHERE id = ?", [
      orderId,
    ]);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ message: `Order with id ${orderId} not found` });
    }

    const order = rows[0];

    // -------------------------------------------------------------
    // ============= ١) الانتقال من pending → in_progress ==========
    // -------------------------------------------------------------
    if (status === "in_progress" && order.status === "pending") {
      const cardId = order.card_id;

      // جلب بيانات البطاقة
      const [cardRows] = await db.query(
        "SELECT balance FROM payment_cards WHERE id = ?",
        [cardId]
      );

      if (cardRows.length === 0) {
        return res.status(404).json({ message: "Card not found" });
      }

      const balance = Number(cardRows[0].balance);
      const total_price = Number(order.total_price);

      // التأكد من وجود رصيد كافٍ
      if (balance < total_price) {
        return res.status(400).json({ message: "Insufficient card balance" });
      }

      // 🔥 هنا نبدأ Transaction لأن العمليات حساسة
      connection = await db.getConnection();
      await connection.beginTransaction();

      // 1) تسجيل عملية purchase
      await connection.query(
        "INSERT INTO card_transactions (card_id, transaction_type, amount, performed_by, order_id) VALUES (?, ?, ?, ?, ?)",
        [cardId, "purchase", total_price, employeeId, orderId]
      );

      // 2) خصم الرصيد
      const newBalance = balance - total_price;
      await connection.query(
        "UPDATE payment_cards SET balance = ? WHERE id = ?",
        [newBalance, cardId]
      );

      // 3) تحديث حالة الطلب + الموظف الذي نفذ العملية
      await connection.query(
        "UPDATE orders SET status = ?, assigned_to = ? WHERE id = ?",
        ["in_progress", employeeId, orderId]
      );

      await connection.commit(); // ✔ نجاح
    }

    // -------------------------------------------------------------
    // =========== ٢) الانتقال من in_progress → delivered ==========
    // -------------------------------------------------------------
    else if (status === "delivered" && order.status === "in_progress") {
      if (employeeId !== order.assigned_to) {
        return res
          .status(400)
          .json({ message: "Only same employee can update the order" });
      }

      await db.query("UPDATE orders SET status = ? WHERE id = ?", [
        "delivered",
        orderId,
      ]);
    }

    // -------------------------------------------------------------
    // =============== ٣) الانتقال من delivered → closed ===========
    // -------------------------------------------------------------
    else if (status === "closed" && order.status === "delivered") {
      if (employeeId !== order.assigned_to) {
        return res
          .status(400)
          .json({ message: "Only same employee can update the order" });
      }

      await db.query("UPDATE orders SET status = ? WHERE id = ?", [
        "closed",
        orderId,
      ]);
    }

    // -------------------------------------------------------------
    // ======================== انتقال خاطئ ========================
    // -------------------------------------------------------------
    else {
      return res.status(400).json({ message: "Operation cannot be completed" });
    }

    // جلب الطلب بعد التحديث
    const [updatedOrder] = await db.query("SELECT * FROM orders WHERE id = ?", [
      orderId,
    ]);

    return res.status(200).json({ order: updatedOrder[0] });
  } catch (err) {
    // في حال حدوث خطأ أثناء transaction
    if (connection) {
      await connection.rollback();
    }

    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  } finally {
    if (connection) connection.release();
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    console.log(req.params)
    const clientId = req.user.id;
    const { id: orderID } = req.params;

    console.log(orderID)

    // إذا لم يكن للمستخدم دور، فهو عميل
    if (req.user.role === undefined) {
      const [orderRow] = await db.query(
        "SELECT * FROM orders WHERE id = ? AND client_id = ?",
        [orderID, clientId]
      );

      console.log(orderRow)

      // تحقق من وجود الطلب فعلاً
      if (orderRow.length === 0) {
        return res
          .status(400)
          .json({ message: "This order doesn't belong to you" });
      }

      const orderStatus = orderRow[0].status;

      // لا يمكن الحذف في هذه الحالات
      if (
        orderStatus === "in_progress" ||
        orderStatus === "delivered" ||
        orderStatus === "closed"
      ) {
        return res.status(400).json({
          message: `This order cannot be deleted because its status is (${orderStatus})`,
        });
      }

      // حذف الطلب
      await db.query("DELETE FROM orders WHERE id = ? AND client_id = ?", [
        orderID,
        clientId,
      ]);

      return res
        .status(200)
        .json({ message: `Order with ID ${orderID} successfully deleted` });
    }

    // إذا كان موظفًا
    else {
      return res
        .status(400)
        .json({ message: "Employees cannot delete orders" });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
