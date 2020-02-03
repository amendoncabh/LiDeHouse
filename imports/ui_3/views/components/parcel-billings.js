import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';
import { TAPi18n } from 'meteor/tap:i18n';
import { datatables_i18n } from 'meteor/ephemer:reactive-datatables';
import { __ } from '/imports/localization/i18n.js';

import { ParcelBillings } from '/imports/api/transactions/parcel-billings/parcel-billings.js';
import '/imports/api/transactions/parcel-billings/methods.js';
import { parcelBillingColumns } from '/imports/api/transactions/parcel-billings/tables.js';
import { allParcelBillingActions } from '/imports/api/transactions/parcel-billings/actions.js';
import { actionHandlers } from '/imports/ui_3/views/blocks/action-buttons.js';
import '/imports/ui_3/views/components/active-archive-tabs.js';
import '/imports/ui_3/views/blocks/simple-reactive-datatable.js';
import './parcel-billings.html';

Template.Parcel_billings.viewmodel({
  onCreated(instance) {
    instance.autorun(() => {
      instance.subscribe('parcels.inCommunity', { communityId: this.communityId() }); // needed for the group options
    });
  },
  communityId() {
    return Session.get('activeCommunityId');
  },
  tableContent() {
    return {
      collection: 'parcelBillings',
      options() {
        return () => Object.create({
          columns: parcelBillingColumns(),
          tableClasses: 'display',
          language: datatables_i18n[TAPi18n.getLanguage()],
          lengthMenu: [[5, 10, 50, -1], [5, 10, 50, __('all')]],
          pageLength: 10,
        });
      },
    };
  },
});


Template.Parcel_billings.events(
  actionHandlers(ParcelBillings, 'new')
);

