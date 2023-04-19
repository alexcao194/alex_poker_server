const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const config = require('../config');

const User = require('../models/User');

// @route   GET api/auth
// @desc    Get user by token
// @access  Private
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if(user) {
      return res.status(200).json(
        {
          'message' : 'get-profile-successful',
          user
        }
      );
    } else {
      return res.status(200).json(
        {
          'message' : `user-not-found`,
          user
        }
      );
    }
  } catch (err) {
    console.error(err.message);
    return res.status(200).json(
      {'message' : 'internal-server-error'}
    );
  }
};

// @route   POST api/auth
// @desc    Authenticate user & get token
// @access  Public
exports.login = async (req, res) => {
  console.log(1)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(200).json({
      'message' : errors.array()[0]['msg']
    });
  }
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(200).json({message : "invalid-credentials"});
    }
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(200).json({message : "invalid-credentials"});
    }

    const payload = {
      user: {
        id: user.id,
      },
    };
    jwt.sign(
      payload,
      config.JWT_SECRET,
      { expiresIn: config.JWT_TOKEN_EXPIRES_IN },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          'token' : token,
          'message' : 'login-successful'
         });
      },
    );
  } catch (err) {
    console.error(err.message);
    return res.status(200).json({message : "internal-server-error"});
  }
};
