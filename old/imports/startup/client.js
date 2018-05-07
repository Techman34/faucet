
import '/imports/ui/dashboard';
import { Session } from "meteor/session";

const publicKey = Meteor.settings.public.captcha.publicKey;

Meteor.startup(function() {  
  reCAPTCHA.config({
      publickey: publicKey,
  });
});

Router.route('/', function() {
  this.render('dashboard')
})

Router.route('/:address', function() {
  Session.set('address', Router.current().params.address)
  this.render('dashboard')
})
