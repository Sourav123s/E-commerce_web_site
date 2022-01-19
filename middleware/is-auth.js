module.exports = (req, res, next) => {
  if (!req.session.isLoggedIn) {
    console.log("i am here");
    return res.redirect("/login");
  }
  next();
};
