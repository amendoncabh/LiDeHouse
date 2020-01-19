import { Meteor } from 'meteor/meteor';
import { TAPi18n } from 'meteor/tap:i18n';
import { FlowRouterHelpers } from 'meteor/arillo:flow-router-helpers';
import { moment } from 'meteor/momentjs:moment';
import { Communities } from '/imports/api/communities/communities.js';
import { Topics } from '/imports/api/topics/topics.js';
import '/imports/api/users/users.js';

export const Vote_closes_Email = {
  path: 'email/vote-closes-email.html',    // Relative to the 'private' dir.
  // scss: 'email/style.css',             // Mail specific SCSS.

  helpers: {
  },

  route: {
    path: '/vote-closes-email/:uid/:cid/:tid',
    data: params => ({
      type: 'Notifications',
      user: Meteor.users.findOne(params.uid),
      community: Communities.findOne(params.cid),
      topics: Topics.find({ _id: params.tid }).fetch(),
      alertColor: 'alert-warning',
    }),
  },
};