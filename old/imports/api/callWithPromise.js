
//Meteor Blogpost Boilplate
const callWithPromise = (method, ...args) => {
  return new Promise((resolve, reject) => {
    Meteor.call(method, ...args, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
};

export default callWithPromise;
