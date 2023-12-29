const mongoose = require('mongoose')
const User = require('../dbmodels/user');

const listUser = async () => {
  const list = await User.find()
                         .select("-authKey -__v");
      return list;
};

module.exports = {
  listUser
};