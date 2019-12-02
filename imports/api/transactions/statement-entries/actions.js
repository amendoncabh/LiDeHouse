import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { AutoForm } from 'meteor/aldeed:autoform';
import { Modal } from 'meteor/peppelg:bootstrap-3-modal';
import { TxCats } from '/imports/api/transactions/tx-cats/tx-cats.js';
import { currentUserHasPermission } from '/imports/ui_3/helpers/permissions.js';
import { StatementEntries } from './statement-entries.js';
import './methods.js';

StatementEntries.actions = {
  new: {
    name: 'new',
    icon: () => 'fa fa-plus',
    visible: () => currentUserHasPermission('statements.insert'),
    run() {
      Modal.show('Autoform_modal', {
        id: 'af.statementEntry.insert',
        collection: StatementEntries,
        type: 'method',
        meteormethod: 'statementEntries.insert',
      });
    },
  },
  view: {
    name: 'view',
    icon: () => 'fa fa-eye',
    visible: () => currentUserHasPermission('statements.inCommunity'),
    run(options, doc) {
      Modal.show('Autoform_modal', {
        id: 'af.statementEntry.view',
        collection: StatementEntries,
        doc,
        type: 'readonly',
      });
    },
  },
  edit: {
    name: 'edit',
    icon: () => 'fa fa-pencil',
    visible: () => currentUserHasPermission('statements.update'),
    run(options, doc) {
      Modal.show('Autoform_modal', {
        id: 'af.statementEntry.update',
        collection: StatementEntries,
        doc,
        type: 'method-update',
        meteormethod: 'statements.update',
        singleMethodArgument: true,
      });
    },
  },
  reconcile: {
    name: 'reconcile',
    icon: () => 'fa fa-external-link',
    color: (options) => 'danger',
    visible(options, doc) {
      if (!currentUserHasPermission('statements.reconcile')) return false;
      if (!doc || doc.isReconciled()) return false;
      return true;
    },
    run(options, doc) {
      Session.set('activeStatementEntryId', doc._id);
      Modal.show('Autoform_modal', {
        title: 'Reconciliation',
        description: 'Válasszon egyet a 3 lehetséges egyeztetési mód közül. A másik kettő mezőben kérjük ne adjon meg értéket.',
        id: 'af.statementEntry.reconcile',
        schema: StatementEntries.reconcileSchema,
        type: 'method',
        meteormethod: 'statementEntries.reconcile',
      });
    },
  },
};

//--------------------------------------------------------

AutoForm.addModalHooks('af.statementEntry.insert');
AutoForm.addModalHooks('af.statementEntry.update');
AutoForm.addModalHooks('af.statementEntry.reconcile');

AutoForm.addHooks('af.statementEntry.insert', {
  formToDoc(doc) {
    doc.communityId = Session.get('activeCommunityId');
    return doc;
  },
});

AutoForm.addHooks('af.statementEntry.reconcile', {
  formToDoc(doc) {
    doc._id = Session.get('activeStatementEntryId');
    return doc;
  },
});
