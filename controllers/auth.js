const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const nodeMailer = require("nodemailer");
const sendgridTransport = require("nodemailer-sendgrid-transport");
const { validationResult } = require("express-validator/check");

const User = require("../models/user");

const transport = nodeMailer.createTransport(
  sendgridTransport({
    auth: {
      api_key:
        "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",
    },
  })
);

function checkErrorMessage(message) {
  if (message.length > 0) {
    return message[0];
  } else {
    return null;
  }
}

exports.getLogin = (req, res, next) => {
  let emailErrorMessage = req.flash("emailError");
  let passwordErrorMessage = req.flash("passwordError");
  emailErrorMessage = checkErrorMessage(emailErrorMessage);
  passwordErrorMessage = checkErrorMessage(passwordErrorMessage);
  res.render("auth/login", {
    path: "/login",
    pageTitle: "login",
    emailError: emailErrorMessage,
    passwordError: passwordErrorMessage,
    // isAuthenticated: false,
  });
};
exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        req.flash("emailError", "Invalid Email  ");
        return res.redirect("/login");
      }
      bcrypt
        .compare(password, user.password)
        .then((doMatch) => {
          if (doMatch) {
            req.session.user = user;
            req.session.isLoggedIn = true;
            return req.session.save((err) => {
              console.log(err);
              res.redirect("/");
            });
          }
          req.flash("passwordError", "invalid password");
          res.redirect("/login");
        })
        .catch((err) => {
          console.log(err);
          res.redirect("/login");
        });
    })
    .catch((err) => console.log(err));
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/");
  });
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  console.log(!password === confirmPassword);
  if (password !== confirmPassword) {
    req.flash(
      "passwordError",
      "Password And Confirm Password Need To Be Match "
    );
    return res.redirect("/signup");
  }
  const error = validationResult(req);
  if (!error.isEmpty()) {
    return res.status(442).res.render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      emailError: error.array(),

      // isAuthenticated: false,
    });
  }
  User.findOne({ email: email })
    .then((userDoc) => {
      if (userDoc) {
        req.flash(
          "emailError",
          "This Email Already Exist  Try With Another Email  "
        );
        return res.redirect("/signup");
      }
      return bcrypt
        .hash(password, 12)
        .then((hashPassword) => {
          const user = new User({
            email: email,
            password: hashPassword,
            cart: {
              items: [],
            },
          });
          return user.save();
        })
        .then((result) => {
          res.redirect("/login");
          return transport.sendMail({
            to: email,
            from: "sourav@shop.com",
            subject: "Sign up sucessfull",
            html: "<h1>You success fully signup to soura'v  shop Thank you for signed up with us </h1>",
          });
        })
        .catch((err) => {
          console.log(err);
        });
    })

    .catch((err) => {
      console.log(err);
    });
};

exports.getSignup = (req, res, next) => {
  let emailErrorMessage = req.flash("emailError");
  let passwordErrorMessage = req.flash("passwordError");
  passwordErrorMessage = checkErrorMessage(passwordErrorMessage);
  emailErrorMessage = checkErrorMessage(emailErrorMessage);
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    emailError: emailErrorMessage,
    passwordError: passwordErrorMessage,
    // isAuthenticated: false,
  });
};

exports.getReset = (req, res, next) => {
  let emailErrorMessage = req.flash("emailError");
  emailErrorMessage = checkErrorMessage(emailErrorMessage);
  res.render("auth/reset", {
    path: "/reset",
    pageTitle: "Reset Password",
    emailError: emailErrorMessage,

    // isAuthenticated: false,
  });
};
exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect("/reset");
    }
    const token = buffer.toString("hex");
    User.findOne({ email: req.body.email })
      .then((user) => {
        if (!user) {
          req.flash("emailError", "No Account Is Found With That Account  ");
          return res.redirect("/reset");
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save();
      })
      .then((result) => {
        res.redirect("/");
        transport.sendMail({
          to: req.body.email,
          from: "sourav@shop.com",
          subject: "Password Reset",
          html: `
               <p> You requested a password reset </p>
               <p>Click this <a href="http://localhost:3000/reset/${token}" >link</a>to set a new paassword .</p>  
               <p>Thank You to shop with Sourav's shop</p>  
          `,
        });
      })
      .catch((err) => {
        console.log(err);
      });
  });
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({
    resetToken: token,
    resetTokenExpiration: { $gt: Date.now() },
  })
    .then((user) => {
      res.render("auth/new-password", {
        path: "/new-password",
        pageTitle: "New Password",
        userId: user._id.toString(),
        passwordToken: token,

        // isAuthenticated: false,
      });
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const token = req.body.passwordToken;
  let resetUser;
  User.findOne({
    _id: userId,
    resetToken: token,
    resetTokenExpiration: { $gt: Date.now() },
  })
    .then((user) => {
      resetUser = user;
      return bcrypt.hash(newPassword, 12);
    })
    .then((hashPassword) => {
      resetUser.password = hashPassword;
      resetUser.resetToken = undefined;
      resetUser.resetTokenExpiration = undefined;
      return resetUser.save();
    })
    .then((result) => {
      res.redirect("/login");
    })
    .catch((err) => {
      console.log(err);
    });
};
