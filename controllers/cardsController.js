// Generate Card Number and CVV Number
const cardCredentialsGenerator = function () {
  const timestamp = Date.now().toString().slice(-6); // last 6 digits
  const randomPart = Math.floor(Math.random() * 10 ** 10)
    .toString()
    .padStart(10, "0"); // guaranteed 10 digits as string

  const cardNumber = randomPart + timestamp; // string length 16 guaranteed

  //allow CVV with leading zeros (e.g. "0073")
  const cvv = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");

  return { cardNumber, cvv }; // return strings to preserve leading zeros
};

// Generate new card
exports.generateCard = async (req, res) => {
  const conn = await db.getConnection();
  await conn.beginTransaction();
  try {
    const userRole = req.user.role;
    const employeeId = req.user.id;
    const { clientUsername, balance } = req.body;
    const amount = Number(balance);

    if (userRole !== 5) {
      return res
        .status(400)
        .json({ message: "This User Is Not An Accountant" });
    }

    const [clientExistanceCheck] = await conn.query(
      "SELECT id FROM clients WHERE username = ?",
      [clientUsername]
    );

    if (clientExistanceCheck.length === 0) {
      return res.status(404).json({
        message: `Client ${clientUsername} Does Not Exist`,
      });
    }

    const clientId = clientExistanceCheck[0].id;

    const [cardExistanceCheck] = await conn.query(
      "SELECT id FROM payment_cards WHERE client_id = ?",
      [clientId]
    );

    if (cardExistanceCheck.length > 0) {
      return res.status(200).json({
        message: `User ${clientUsername} already has a card`,
      });
    }

    let unique = false;
    let credentials;

    while (!unique) {
      credentials = cardCredentialsGenerator();
      const [existing] = await conn.query(
        "SELECT id FROM payment_cards WHERE card_number = ? LIMIT 1",
        [credentials.cardNumber]
      );
      if (existing.length === 0) unique = true;
    }

    const [result] = await conn.query(
      "INSERT INTO payment_cards (client_id, card_number, cvv, balance) VALUES (?, ?, ?, ?)",
      [clientId, credentials.cardNumber, credentials.cvv, amount]
    );

    const cardId = result.insertId;

    await conn.query(
      "INSERT INTO card_transactions (card_id, transaction_type, amount, performed_by) VALUES (?, ?, ?, ?)",
      [cardId, "create", amount, employeeId]
    );

    await conn.commit();
    conn.release();

    return res.status(200).json({
      clientUsername,
      employeeId,
      cardNumber: credentials.cardNumber,
      cvv: credentials.cvv,
      balance: amount,
    });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.log(err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Charge An Existing Card
exports.chargeCard = async (req, res) => {
  const conn = await db.getConnection();
  await conn.beginTransaction();
  try {
    const { clientUsername, cardNumber, cvvNumber, balance } = req.body;
    const userRole = req.user.role;
    const employeeId = req.user.id;
    const amount = Number(balance);

    if (userRole !== 5) {
      return res
        .status(400)
        .json({ message: "This user is not an accountant" });
    }

    const [clientRows] = await conn.query(
      "SELECT id FROM clients WHERE username = ?",
      [clientUsername]
    );

    if (clientRows.length === 0) {
      return res.status(404).json({
        message: `Client ${clientUsername} does not exist`,
      });
    }

    const clientId = clientRows[0].id;

    const [cardRows] = await conn.query(
      "SELECT id, client_id, balance FROM payment_cards WHERE card_number = ? AND cvv = ?",
      [cardNumber, cvvNumber]
    );

    if (cardRows.length === 0) {
      return res.status(404).json({ message: "Invalid card number or CVV" });
    }

    const card = cardRows[0];

    if (card.client_id !== clientId) {
      return res.status(403).json({
        message: "This card does not belong to the specified client",
      });
    }

    const current = Number(card.balance);
    const newBalance = current + amount;

    await conn.query(
      "INSERT INTO card_transactions (card_id, transaction_type, amount, performed_by) VALUES (?, ?, ?, ?)",
      [card.id, "topup", amount, employeeId]
    );

    await conn.query("UPDATE payment_cards SET balance = ? WHERE id = ?", [
      newBalance,
      card.id,
    ]);

    await conn.commit();
    conn.release();

    return res.status(200).json({
      message: `Card ${cardNumber} recharged successfully with amount ${amount}`,
      newBalance,
    });
  } catch (err) {
    await conn.rollback();
    conn.release();
    console.error("ChargeCard error:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
