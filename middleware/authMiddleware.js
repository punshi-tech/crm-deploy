const jwt = require("jsonwebtoken");

module.exports = function authMiddleware(req, res, next) {
  const bearerToken = req.headers["authorization"];
  const token = bearerToken && bearerToken.split(" ")[1];
  if (!token)
    return res.status(403).json({ message: "No bearer token provided" });

  jwt.verify(token, process.env.ACCESS_SECRET_TOKEN, (err, user) => {
    if (err) {
      if (err.name === "TokenExpiredError")
        return res.status(401).json({ message: "Access token expired" });
      else return res.status(403).json({ message: "Invalid access token" });
    }
    req.user = user;
    console.log(user);
    next();
  });
};
