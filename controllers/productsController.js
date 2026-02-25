const fs = require("fs");
const imagekit = require("../config/imagekit");
const multer = require("multer");
const { response } = require("express");
const upload = multer({ dist: "uploads/" });

const uploadMainImage = async (file) => {
  // console.log(imgBuffer);
  const uploaded = await imagekit.upload({
    file: file.buffer,
    fileName: file.originalname,
    folder: "/product_main_image",
  });
  // console.log("uploaded", uploaded);
  return uploaded.url;
};

const uploadGalleryImages = async (files) => {
  const uploadedUrls = [];
  for (const file of files) {
    const uploaded = await imagekit.upload({
      file: file.buffer,
      fileName: file.originalname,
      folder: "/product_gallery",
    });
    uploadedUrls.push(uploaded.url);
  }
  return uploadedUrls;
};

exports.addProduct = async (req, res) => {
  try {
    // الصورة الأساسية = ملف واحد (mainImage)
    const mainImage = req.files["mainImage"]?.[0];
    // صور المعرض (gallery) = عدة ملفات
    const galleryImages = req.files["galleryImages"];
    // console.log("gallery images", galleryImages);

    const {
      product_name,
      category_id,
      info,
      base_price,
      current_price,
      price_edited_by,
    } = req.body;

    if (!mainImage) {
      return res
        .status(400)
        .json({ message: "Main product image is required." });
    }

    if (!galleryImages) {
      return res
        .status(400)
        .json({ message: "Gallery product images are required." });
    }

    // رفع الصورة الأساسية
    const mainImageUrl = await uploadMainImage(mainImage);
    // console.log("main image url", mainImageUrl);

    // حفظ المنتج في قاعدة البيانات
    const [result] = await db.query(
      `INSERT INTO products 
        (product_name, product_image, category_id, info, base_price, current_price, price_edited_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        product_name,
        mainImageUrl,
        category_id,
        info,
        base_price,
        current_price || null,
        price_edited_by,
      ]
    );

    const productId = result.insertId;

    // رفع صور المعرض وحفظها في جدول product_gallery
    if (galleryImages.length > 0) {
      const galleryUrls = await uploadGalleryImages(galleryImages);
      for (const url of galleryUrls) {
        await db.query(
          "INSERT INTO product_gallery (product_id, image_path) VALUES (?, ?)",
          [productId, url]
        );
      }
    }

    res.status(201).json({
      message: "✅ Product created successfully",
      productId,
      main_image: mainImageUrl,
    });
  } catch (error) {
    console.error("Error adding product:", error);
    res.status(500).json({ message: `Internal server error ${error}` });
  }
};

// get (ALL/ Speciefic) Products 
exports.getProducts = async (req, res) => {
  console.log("new request arrived")
  const {
    search,
    category,
    sort_by,
    sort_order,
    items_per_page = 12,
    current_page = 1,
  } = req.query;

  try {
    // 🧩 القاعدة الأساسية مع JOIN لجلب اسم الفئة
    let query = `
      SELECT 
        p.*, 
        c.category
      FROM products AS p
      JOIN product_categories AS c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    // searching on (product name, product info)
    if (search) {
      query += " AND (p.product_name LIKE ? OR p.info LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    // 🏷️ الفئة
    if (category) {
      query += " AND p.category_id = ?";
      params.push(category);
    }

    // 🔽 الترتيب
    if (sort_by) {
      const validColumns = ["product_name", "base_price", "id"];
      const column = validColumns.includes(sort_by) ? sort_by : "id";
      const order =
        sort_order && sort_order.toUpperCase() === "DESC" ? "DESC" : "ASC";
      query += ` ORDER BY p.${column} ${order}`;
    }

    // 🧮 العدد الكلي
    const [allRows] = await db.query(query, params);
    const totalItems = allRows.length;
    const totalPages = Math.ceil(totalItems / items_per_page);

    // 📄 pagination
    const offset = (current_page - 1) * items_per_page;
    query += " LIMIT ? OFFSET ?";
    params.push(Number(items_per_page), offset);

    // 🚀 تنفيذ الاستعلام الرئيسي
    const [products] = await db.query(query, params);

    // 🖼️ جلب الصور لكل منتج من جدول product_gallery
    const productIds = products.map((p) => p.id);
    let galleryMap = {};

    if (productIds.length > 0) {
      const [galleryRows] = await db.query(
        `SELECT product_id, image_path FROM product_gallery WHERE product_id IN (?)`,
        [productIds]
      );

      // بناء خريطة الصور حسب product_id
      galleryMap = galleryRows.reduce((acc, row) => {
        if (!acc[row.product_id]) acc[row.product_id] = [];
        acc[row.product_id].push(row.image_path);
        return acc;
      }, {});
    }

    // 📦 دمج الصور مع المنتجات
    const productsWithGallery = products.map((p) => ({
      ...p,
      gallery: galleryMap[p.id] || [],
    }));

    // ✅ النتيجة النهائية
    return res.status(200).json({
      products: productsWithGallery,
      pager: {
        current_page: Number(current_page),
        total_pages: totalPages,
        total_items: totalItems,
        items_per_page: Number(items_per_page),
      },
    });
  } catch (err) {
    console.error("❌ Database error:", err);
    return res.status(500).json({ message: "Database error" });
  }
};

// Delete Product
exports.deleteProduct = async (req, res) => {
  try {
    const userRole = req.user.role;
    // delete is allowed only for sellermen and admins
    if (userRole === 1 || userRole === 2) {
      const id = Number(req.params.id);
      const [rows] = await db.query("select * from products where id = ?", [
        id,
      ]);
      if (rows.length === 0) {
        return res.status(404).json({ message: "Product Not Found" });
      }
      await db.query("DELETE FROM products WHERE id = ?", [id]);
      return res
        .status(200)
        .json({ message: "Product Deleted", product: rows[0] });
    }
    return res.status(403).json({
      message: "Forbidden: Your role is not allowed to delete products",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Edit Product
exports.editProduct = async (req, res) => {
  try {
    const userRole = req.user.role;

    // فقط المدير أو البائع يستطيع التعديل
    if (userRole !== 1 && userRole !== 2) {
      return res
        .status(403)
        .json({ message: "Forbidden: Your role cannot edit products" });
    }

    const id = Number(req.params.id);
    const [existing] = await db.query("SELECT * FROM products WHERE id = ?", [
      id,
    ]);

    if (existing.length === 0) {
      return res.status(404).json({ message: "Product Not Found" });
    }

    const fields = req.body;
    const updates = [];
    const values = [];

    // 🔹 تعديل البيانات النصية أولاً
    for (let key in fields) {
      if (fields[key] !== undefined && fields[key] !== null) {
        updates.push(`${key} = ?`);
        values.push(fields[key]);
      }
    }

    // 🔹 إذا تم رفع صورة رئيسية جديدة
    if (req.files && req.files.mainImage && req.files.mainImage[0]) {
      const mainImageUrl = await uploadMainImage(req.files.mainImage[0]);
      updates.push("product_image = ?");
      values.push(mainImageUrl);
    }

    // 🔹 إذا تم رفع صور جديدة للمعرض
    if (
      req.files &&
      req.files.galleryImages &&
      req.files.galleryImages.length > 0
    ) {
      const galleryUrls = await uploadGalleryImages(req.files.galleryImages);

      // أولاً نحذف الصور القديمة من جدول المعرض (إن وجد)
      await db.query("DELETE FROM product_gallery WHERE product_id = ?", [id]);

      // ثم نضيف الصور الجديدة
      for (const url of galleryUrls) {
        await db.query(
          "INSERT INTO product_gallery (product_id, image_path) VALUES (?, ?)",
          [id, url]
        );
      }
    }

    // 🔹 تنفيذ التحديث الرئيسي
    if (updates.length > 0) {
      values.push(id);
      const sql = `UPDATE products SET ${updates.join(", ")} WHERE id = ?`;
      await db.query(sql, values);
    }

    // 🔹 تسجيل الموظف الذي غيّر السعر (إن وجد)
    if (fields.current_price) {
      const [employee] = await db.query(
        "SELECT * FROM employees WHERE username = ?",
        [req.user.username]
      );
      await db.query("UPDATE products SET price_edited_by = ? WHERE id = ?", [
        employee[0].id,
        id,
      ]);
    }

    return res.status(200).json({
      message: "Product edited successfully",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Database error" });
  }
};


// New Route ((((((((((((In MAlaysia))))))))))))
// Get Products By Id
// exports.getProductById = async (req, res) => {
//   try {
//     const id = Number(req.params.id)

//     const [result] = await db.query(
//       `
//       SELECT 
//         p.*,
//         c.category,
//         g.id AS gallery_id,
//         g.image_path
//       FROM products AS p
//       JOIN product_categories AS c 
//         ON p.category_id = c.id
//       LEFT JOIN product_gallery AS g 
//         ON g.product_id = p.id
//       WHERE p.id = ?;
//     `,
//       [id]
//     )
//     if (result[0].length === 0) {
//       return res.status(404).json({
//         message: `Product With ID ${id} Not Found`
//       })
//     }

//     return res.status(200).json(result[0]) // نرجع المنتج نفسه وليس مصفوفة

//   } catch (err) {
//     return res.status(500).json({ message: "Database error" })
//   }
// }

// After Adding Gallery Images
exports.getProductById = async (req, res) => {
  try {
    const id = req.params.id;

    const [rows] = await db.query(`
      SELECT 
        p.*,
        c.category,
        g.image_path
      FROM products p
      JOIN product_categories c 
        ON p.category_id = c.id
      LEFT JOIN product_gallery g 
        ON g.product_id = p.id
      WHERE p.id = ?;
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    // 🟢 نبني object واحد
    const product = {
      id: rows[0].id,
      product_name: rows[0].product_name,
      product_image: rows[0].product_image,
      category: rows[0].category,
      info: rows[0].info,
      base_price: rows[0].base_price,
      current_price: rows[0].current_price,
      created_at: rows[0].created_at,
      gallery: []
    };

    // 🟢 نجمع الصور داخل array
    rows.forEach(row => {
      if (row.image_path) {
        product.gallery.push(row.image_path);
      }
    });

    return res.status(200).json(product);

  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Database error" });
  }
};
