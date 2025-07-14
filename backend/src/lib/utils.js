import jwt from "jsonwebtoken";

export const GenerateJwt = (userId, res) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

  res.cookie("jwt", token, {
    httpOnly: true, // prevent XSS attacks
    secure: process.env.NODE_ENV !== "development",
    sameSite: "strict", // prevent CSRF attacks
    maxAge: 24 * 60 * 60 * 1000, // 1 day in milliseconds
  });

  return token;
};
