const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
/*
Roles: 
[1] = Adminstrator
[2] = Sales Person
[3] = Marketing Specialist
[4] = Customer Support
[5] = Accountant
*/

exports.employeeRegister = async (req, res) => {
  try {
    const { username, password, email, fname, lname, phone_number, role } =
      req.body;
    const requiredFields = {
      username,
      password,
      email,
      fname,
      lname,
      phone_number,
      role,
    };
    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value)
        return res.status(400).json({ message: `${key} is required` });
    }

    const [existing] = await db.query(
      "SELECT username, email, fname, lname, phone_number FROM employees WHERE username=? OR email=? OR (fname=? AND lname=?) OR phone_number=?",
      [username, email, fname, lname, phone_number]
    );

    if (existing.length > 0) {
      const user = existing[0];
      if (user.username === username)
        return res
          .status(409)
          .json({ message: `Username '${username}' already exists` });
      if (user.email === email)
        return res
          .status(409)
          .json({ message: `Email '${email}' already exists` });
      if (user.fname === fname && user.lname === lname)
        return res
          .status(409)
          .json({ message: `Full Name '${fname} ${lname}' already exists` });
      if (user.phone_number === phone_number)
        return res
          .status(409)
          .json({ message: `Phone Number '${phone_number}' already exists` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO employees (username, password, email, fname, lname, phone_number, role_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [username, hashedPassword, email, fname, lname, phone_number, role]
    );

    res.status(201).json({ message: "User added successfully" });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ message: `${err}` });
  }
};

exports.employeeLogin = async (req, res) => {
  console.log("logging");
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res
        .status(400)
        .json({ message: "username and password are required" });

    const [rows] = await db.query(
      "SELECT id, username, password, role_id FROM employees WHERE username=?",
      [username]
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "User not found" });

    const user = rows[0];
    const isMatched = await bcrypt.compare(password, user.password);
    if (!isMatched)
      return res.status(401).json({ message: "Invalid user credentials" });

    const role = user.role_id;
    const id = user.id;

    const [refreshRows] = await db.query(
      "SELECT refresh_token FROM employees WHERE username = ?",
      [username]
    );

    if (refreshRows.length > 0 && refreshRows[0].refresh_token !== null) {
      await db.query(
        "UPDATE employees SET refresh_token = NULL WHERE username = ?",
        [username]
      );
    }
    const refreshToken = jwt.sign(
      { username, role },
      process.env.REFRESH_SECRET_TOKEN,
      { expiresIn: "7d" }
    );

    // تخزين التوكين الجديد في قاعدة البيانات
    await db.query(
      "UPDATE employees SET refresh_token = ? WHERE username = ?",
      [refreshToken, username]
    );

    const accessToken = jwt.sign(
      { id, username, role },
      process.env.ACCESS_SECRET_TOKEN,
      { expiresIn: "1m" }
    );
    res.status(200).json({
      message: "User logged in successfully",
      username,
      role,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.log(`Internal server error ${err}`);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.clientRegister = async (req, res) => {
  try {
    const { username, password, email, fname, lname, phone_number, address } =
      req.body;
    const requiredFields = {
      username,
      password,
      email,
      fname,
      lname,
      phone_number,
    };
    for (const [key, value] of Object.entries(requiredFields)) {
      if (!value)
        return res.status(400).json({ message: `${key} is required` });
    }

    const [existing] = await db.query(
      "SELECT username, email, fname, lname, phone_number FROM clients WHERE username=? OR email=? OR (fname=? AND lname=?) OR phone_number=?",
      [username, email, fname, lname, phone_number]
    );

    if (existing.length > 0) {
      const user = existing[0];
      if (user.username === username)
        return res
          .status(409)
          .json({ message: `Username '${username}' already exists` });
      if (user.email === email)
        return res
          .status(409)
          .json({ message: `Email '${email}' already exists` });
      if (user.fname === fname && user.lname === lname)
        return res
          .status(409)
          .json({ message: `Full Name '${fname} ${lname}' already exists` });
      if (user.phone_number === phone_number)
        return res
          .status(409)
          .json({ message: `Phone Number '${phone_number}' already exists` });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.query(
      "INSERT INTO clients (username, password, email, fname, lname, phone_number, address) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [username, hashedPassword, email, fname, lname, phone_number, address]
    );

    res.status(201).json({ message: "User added successfully" });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ message: `${err}` });
  }
};

// exports.clientLogin = async (req, res) => {
//   try {
//     const { username, password } = req.body;
//     if (!username || !password)
//       return res
//         .status(400)
//         .json({ message: "username and password are required" });

//     const [rows] = await db.query(
//       "SELECT id, username, password FROM clients WHERE username=?",
//       [username]
//     );
//     if (rows.length === 0)
//       return res.status(404).json({ message: "User not found" });

//     const user = rows[0];
//     const isMatched = await bcrypt.compare(password, user.password);
//     if (!isMatched)
//       return res.status(401).json({ message: "Invalid user credentials" });

//     const [refreshRows] = await db.query(
//       "SELECT refresh_token FROM clients WHERE username = ?",
//       [username]
//     );

//     if (refreshRows.length > 0 && refreshRows[0].refresh_token !== null) {
//       await db.query(
//         "UPDATE clients SET refresh_token = NULL WHERE username = ?",
//         [username]
//       );
//     }
//     const refreshToken = jwt.sign(
//       { username },
//       process.env.REFRESH_SECRET_TOKEN,
//       { expiresIn: "7d" }
//     );

//     // تخزين التوكين الجديد في قاعدة البيانات
//     await db.query("UPDATE clients SET refresh_token = ? WHERE username = ?", [
//       refreshToken,
//       username,
//     ]);

//     const accessToken = jwt.sign(
//       {
//         id: user.id,
//         username,
//       },
//       process.env.ACCESS_SECRET_TOKEN,
//       { expiresIn: "1m" }
//     );
//     res.status(200).json({
//       message: "User logged in successfully",
//       username,
//       accessToken,
//       refreshToken,
//     });
//   } catch (err) {
//     console.log(`Internal server error ${err}`);
//     res.status(500).json({ message: "Internal Server Error" });
//   }
// };

exports.clientLogin = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res
        .status(400)
        .json({ message: "username and password are required" });

    // const [rows] = await db.query(
    //   "SELECT id, username, password, fname, lname, email, phone_number, address, created_at  FROM clients WHERE username=?",
    //   [username]
    // );

    const [rows] = await db.query(
      "SELECT c.id, c.username, c.password, c.fname, c.lname, c.email, c.phone_number, c.address, c.created_at as client_created_at, p.card_number, p.cvv, p.is_active, p.balance, p.created_at as card_created_at FROM clients c LEFT JOIN payment_cards p ON c.id = p.client_id WHERE c.username = ?",
      [username]
    );

    if (rows.length === 0)
      return res.status(404).json({ message: "User not found" });

    const user = rows[0];
    const isMatched = await bcrypt.compare(password, user.password);
    if (!isMatched)
      return res.status(401).json({ message: "Invalid user credentials" });

    const [refreshRows] = await db.query(
      "SELECT refresh_token FROM clients WHERE username = ?",
      [username]
    );

    if (refreshRows.length > 0 && refreshRows[0].refresh_token !== null) {
      await db.query(
        "UPDATE clients SET refresh_token = NULL WHERE username = ?",
        [username]
      );
    }
    const refreshToken = jwt.sign(
      { username },
      process.env.REFRESH_SECRET_TOKEN,
      { expiresIn: "7d" }
    );

    // تخزين التوكين الجديد في قاعدة البيانات
    await db.query("UPDATE clients SET refresh_token = ? WHERE username = ?", [
      refreshToken,
      username,
    ]);

    const accessToken = jwt.sign(
      {
        id: user.id,
        username,
      },
      process.env.ACCESS_SECRET_TOKEN,
      { expiresIn: "1m" }
    );

    res.status(200).json({
      // message: "User logged in successfully",
      id: user.id,
      username,
      fname: user.fname,
      lname: user.lname,
      email: user.email,
      phone_number: user.phone_number,
      address: user.address,
      client_created_at: user.client_created_at,
      card_number: user.card_number,
      cvv: user.cvv,
      balance: user.balance,
      is_active: user.is_active,
      card_created_at: user.card_created_at,
      accessToken,
      refreshToken,
    });
  } catch (err) {
    console.log(`Internal server error ${err}`);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.refreshTokenFunction = async (req, res) => {
  const refreshToken = req.headers["authorization"].split(" ")[1];
  if (!refreshToken)
    return res.status(400).json({ message: "No refresh token provided" });

  try {
    // البحث في جدول العملاء
    const [clientRows] = await db.query(
      "SELECT id, username FROM clients WHERE refresh_token = ?",
      [refreshToken]
    );

    // البحث في جدول الموظفين إن لم يكن في العملاء
    const [employeeRows] = await db.query(
      "SELECT id, username, role_id FROM employees WHERE refresh_token = ?",
      [refreshToken]
    );

    let newAccessToken;

    if (clientRows.length > 0) {
      newAccessToken = jwt.sign(
        {
          id: clientRows[0].id,
          username: clientRows[0].username,
        },
        process.env.ACCESS_SECRET_TOKEN,
        { expiresIn: "15m" }
      );
    } else if (employeeRows.length > 0) {
      newAccessToken = jwt.sign(
        {
          id: employeeRows[0].id,
          username: employeeRows[0].username,
          role: employeeRows[0].role_id,
        },
        process.env.ACCESS_SECRET_TOKEN,
        { expiresIn: "15m" }
      );
    } else {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    res.json({
      accessToken: newAccessToken,
    });
  } catch (err) {
    console.error("Error refreshing token:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
