import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { FlowRouter } from 'meteor/kadira:flow-router';
import { AccountsTemplates } from 'meteor/useraccounts:core';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { _ } from 'meteor/underscore';

import { onSuccess } from '/imports/ui_3/lib/errors.js';
import '/imports/ui_3/views/modals/autoform-modal.js';
import { Parcels } from '/imports/api/parcels/parcels.js';
import { setMeAsParcelOwner } from '/imports/api/parcels/actions.js';
import { Communities } from './communities.js';
import './methods.js';

Communities.actions = {
  new: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'new',
    icon: 'fa fa-plus',
    visible: user.hasPermission('communities.insert', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.community.insert',
        collection: Communities,
        type: 'method',
        meteormethod: 'communities.insert',
      });
    },
  }),
  view: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'view',
    icon: 'fa fa-eye',
    visible: user.hasPermission('communities.inCommunity', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.community.view',
        collection: Communities,
        doc,
        type: 'readonly',
      });
    },
  }),
  edit: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'edit',
    icon: 'fa fa-pencil',
    visible: user.hasPermission('communities.update', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.community.update',
        collection: Communities,
        doc,
        type: 'method-update',
        meteormethod: 'communities.update',
        singleMethodArgument: true,
      });
    },
  }),
  period: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'period',
    icon: 'fa fa-history',
    visible: user.hasPermission('communities.update', doc),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.community.update',
        collection: Communities,
        fields: ['activeTime'],
        doc,
        type: 'method-update',
        meteormethod: 'communities.updateActivePeriod',
        singleMethodArgument: true,
      });
    },
  }),
  join: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'join',
    icon: 'fa fa-suitcase',
    visible: doc.settings && doc.settings.joinable,
    run() {
      AccountsTemplates.forceLogin(function joinCommunity() {
        const communityId = doc._id;
        if (doc.status === 'sandbox') {   // Sandboxes have immediate (no questions asked) joining, with a fixed ownership share
          Meteor.call('parcels.insert',
            { communityId, category: '@property', approved: false, serial: 0, ref: 'auto', units: 100, type: 'flat' },
            onSuccess(res => setMeAsParcelOwner(res, communityId, onSuccess(r => FlowRouter.go('App home')),
            )),
          );
        } else {
          Modal.show('Autoform_modal', {
            title: 'pleaseSupplyParcelData',
            id: 'af.@property.insert.unapproved',
            schema: Parcels.simpleSchema({ category: '@property' }),
            doc: { communityId: doc._id },
            //        omitFields: ['serial'],
            type: 'method',
            meteormethod: 'parcels.insert',
          });
        }
      }, 'signup');
    },
  }),
  delete: (options, doc, user = Meteor.userOrNull()) => ({
    name: 'delete',
    icon: 'fa fa-trash',
    visible: user.hasPermission('communities.remove', doc),
    run() {
      Modal.confirmAndCall(Communities.methods.remove, { _id: doc._id }, {
        action: 'delete community',
        message: 'You should rather archive it',
      });
    },
  }),
};

//-----------------------------------------------

AutoForm.addModalHooks('af.community.insert');
AutoForm.addModalHooks('af.community.update');

AutoForm.addHooks('af.community.insert', {
  formToDoc(doc) {
    if (doc.settings.modules.length === Communities.availableModules.length) delete doc.settings.modules;
    return doc;
  },
});
