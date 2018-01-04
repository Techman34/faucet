
const maxRequestsPerDay = Meteor.settings.whitelist.maxRequestsPerDay;
const whiteListAddress  = Meteor.settings.whitelist.address;
const whiteListIP       = Meteor.settings.whitelist.ip;

let Requests = new Meteor.Collection("Requests");
Requests._ensureIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 });

async function canRequestTokens(ip, address) {
  if (whiteListIP.indexOf(ip) != -1) {
    return true
  }

  if (whiteListAddress.indexOf(address) != -1) {
    return true
  }
  
  const count = await Requests.find({
    $or: [{ ethereumAddress: address }, { ipAddress: ip }]
  }).count();

  return count <= maxRequestsPerDay
}

function logRequest(address, clientIP) {
  Requests.insert({
    createdAt: new Date(),
    ethereumAddress: address,
    ipAddress: clientIP
  });
}

export {
  canRequestTokens,
  logRequest
}
