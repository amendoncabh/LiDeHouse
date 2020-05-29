/* eslint-disable max-classes-per-file */
import { _ } from 'meteor/underscore';
import { Session } from 'meteor/session';
import { Mongo } from 'meteor/mongo';

import { __ } from '/imports/localization/i18n.js';
import { debugAssert, productionAssert } from '/imports/utils/assert.js';
import { getActiveCommunityId, getActiveCommunity } from '/imports/ui_3/lib/active-community.js';
import { Communities } from '/imports/api/communities/communities.js';
import { Parcels } from '/imports/api/parcels/parcels';
import { Parcelships } from '/imports/api/parcelships/parcelships.js';
import { Partners } from '/imports/api/partners/partners.js';
import { Memberships } from '/imports/api/memberships/memberships.js';
import { Accounts } from '/imports/api/transactions/accounts/accounts.js';
import { Transactions } from '/imports/api/transactions/transactions.js';
import { Txdefs } from '/imports/api/transactions/txdefs/txdefs.js';
import { Translator } from './translator.js';
import { Parser } from './parser.js';
import { Transformers } from './transformers.js';

// Multiple collections can be imported with one import command

export class ImportPhase {
  collection() {
    return Mongo.Collection.get(this.collectionName);
  }
  schema() {
    return this.collection().simpleSchema(this.schemaSelector);
  }
  translator() {
    const translator = new Translator(this.collection(), this.options, 'hu', this.dictionary);
    translator.phase = this;
    translator.conductor = this.conductor;
    return translator;
  }
  parser() {
    return new Parser(this.schema());
  }
  transformer() {
    return Transformers[this.collectionName]?.[this.options?.transformer || 'default']
      || (docs => docs.map(doc => Object.deepClone(doc)));
  }
}
ImportPhase.Instance = new ImportPhase();
ImportPhase.from = obj => { Object.setPrototypeOf(obj, ImportPhase.Instance); return obj; };

export class ImportConductor {
  init() {
    this.phases.forEach(p => { p.conductor = this; ImportPhase.from(p); });
    this.name = `${this.collectionName}#${this.format}`;
    this.phaseIndex = -1;
  }
  possibleColumnsListing() {
    const columns = [{ display: __('importColumnsInstructions') }];
    this.phases.forEach((phase, phaseIndex) => {
      const translator = phase.translator();
      columns.push({ name: phaseIndex, display: `${translator.__('_')} ${__('data')}`.toUpperCase() });
      _.each(phase.schema()._schema, (value, key) => {
        const split = key.split('.');
        if (_.contains(['Array', 'Object'], value.type.name)) return;
        if (value.autoform && (value.autoform.omit || value.autoform.readonly || _.contains(['hidden'], value.autoform.type))) return;
        if (_.contains(split, '$')) return;
        if (_.contains(split, 'activeTime')) return;
        if (_.contains(phase.omitFields, key)) return;
        if (!value.label) return;
        const name = translator.__(key);
        const example = translator.example(key, value);
        const display = `[${name}]${value.optional ? '' : '(*)'}: ${value.type.name} ${example}`;
        columns.push({ key, name, example, display });
      });
      _.each(phase.translator().dictionary, (value, key) => {
        if (value.depends) {
          const i = columns.findIndex(c => c.key === key);
          if (i >= 0) columns.splice(i, 1);
          value.depends.forEach(name => {
            if (columns.find(c => c.name === name)) return;
            const display = `[${name}](*)`;
            columns.push({ key: name, name, example: '', display });
          });
        }
      });
    });
    return columns;
  }
  possibleColumns() {
    return this.possibleColumnsListing().filter(c => c.key); // leave out the sperators, like "PARCELS DATA"
  }
  nextPhase() {
    this.phaseIndex += 1;
    const phase = this.phases[this.phaseIndex];
    return phase;
  }
  currentPhase() {
    const phase = this.phases[this.phaseIndex];
    return phase;
  }
}
ImportConductor.Instance = new ImportConductor();
ImportConductor.from = obj => { Object.setPrototypeOf(obj, ImportConductor.Instance); return obj; };

export const Conductors = {
  parcels: {
    default(options) {
      return {
        collectionName: 'parcels',
        format: 'default',
        phases: [{
          collectionName: 'parcels',
          schemaSelector: { category: '@property' },
          options,
          dictionary: {
            communityId: { default: getActiveCommunityId() },
            category: { default: '@property' },
          },
        }],
      };
    },
    marina(options) {
      return {
        collectionName: 'parcels',
        format: 'marina',
        phases: [{
          collectionName: 'parcels',
          schemaSelector: { category: '@property' },
          options,
          dictionary: {
            communityId: { default: getActiveCommunityId() },
            category: { default: '@property' },
          },
        }, {
          collectionName: 'parcelships',
          options,
          dictionary: {
            communityId: { default: getActiveCommunityId() },
          },
        }, {
          collectionName: 'partners',
          options,
          dictionary: {
            communityId: { default: getActiveCommunityId() },
            relation: { default: ['member'] },
            idCard: { type: { default: 'natural' } },
          },
        }, {
          collectionName: 'memberships',
          schemaSelector: { role: 'owner' },
          options,
          dictionary: {
            communityId: { default: getActiveCommunityId() },
            role: { default: 'owner' },
          },
        }],
      };
    },
    ehaz(options) {
      return {
        collectionName: 'parcels',
        format: 'ehaz',
        phases: [{
          collectionName: 'parcels',
          schemaSelector: { category: '@property' },
          options,
          dictionary: {
            communityId: { default: getActiveCommunityId() },
            category: { default: '@property' },
            type: {
              flat: 'L',
              parking: 'P',
              storage: 'T',
              cellar: 'Q',
              attic: '?',
              shop: 'U',
              office: 'I',
              other: '-',
            },
          },
        }, {
          collectionName: 'partners',
          options,
          dictionary: {
            communityId: { default: getActiveCommunityId() },
            relation: { default: ['member'] },
            idCard: {
              type: {
                natural: 'T',
                legal: 'G',
                other: 'E',
              },
            },
          },
        }, {
          collectionName: 'partners',
          options,
          dictionary: {
            communityId: { default: getActiveCommunityId() },
            relation: { default: ['member'] },
          },
        }, {
          collectionName: 'partners',
          options,
          dictionary: {
            communityId: { default: getActiveCommunityId() },
            relation: { default: ['member'] },
          },
        }, {
          collectionName: 'partners',
          options,
          dictionary: {
            communityId: { default: getActiveCommunityId() },
            relation: { default: ['member'] },
          },
        }, {
          collectionName: 'memberships',
          schemaSelector: { role: 'owner' },
          options,
          dictionary: {
            communityId: { default: getActiveCommunityId() },
            role: { default: 'owner' },
//            parcelId: { formula: 'conductor.phases[1].docs[index].parcelId' },
//            partnerId: { formula: 'conductor.phases[2].docs[index].idCard.name' },
          },
        }],
      };
    },
  },
  memberships: {
    default(options) {
      return {
        collectionName: 'memberships',
        format: 'default',
        phases: [{
          collectionName: 'memberships',
          schemaSelector: { role: 'owner' },
          options,
          dictionary: {
            communityId: { default: getActiveCommunityId() },
            role: { default: 'owner' },
          },
        }, {
          collectionName: 'parcelships',
          options,
          dictionary: {
            communityId: { default: getActiveCommunityId() },
          },
        }],
      };
    },
  },
  partners: {
    default(options) {
      return {
        collectionName: 'partners',
        format: 'default',
        phases: [{
          collectionName: 'partners',
          options,
          dictionary: {
            communityId: { default: getActiveCommunityId() },
            relation: { default: ['member'] },
            idCard: { type: { default: 'natural' } },
          },
        }],
      };
    },
  },
  meters: {
    default(options) {
      return {
        collectionName: 'meters',
        format: 'default',
        phases: [{
          collectionName: 'meters',
          options,
          dictionary: {
            communityId: { default: getActiveCommunityId() },
          },
        }],
      };
    },
  },
  transactions: {
    marina(options) {
      return {
        collectionName: 'transactions',
        format: 'marina',
        phases: [{
          collectionName: 'partners',
          options,
          dictionary: {
            communityId: { default: getActiveCommunityId() },
            relation: { default: ['supplier'] },
            idCard: {
              type: { default: 'legal' },
  //            name: { label: 'Szállító neve adóigazgatási azonosító száma' }, -> columnMapping
            },
          },
        }, {
          collectionName: 'transactions',
          schemaSelector: { category: 'bill' },
          options: _.extend({}, options, { entity: 'bill' }),
          dictionary: {
            communityId: { default: getActiveCommunityId() },
            category: { default: 'bill' },
            relation: { default: Session.get('activePartnerRelation') },
            serialId: { formula: "'SZ/SZALL/IMP/' + index" },
            defId: { default: Txdefs.findOne({ communityId: Session.get('activeCommunityId'), category: 'bill', 'data.relation': Session.get('activePartnerRelation') })._id },
            partnerId: { formula: 'conductor.phases[0].docs[index].idCard.name' },
            deliveryDate: { formula: 'doc.deliveryDate || doc.issueDate' },
            dueDate: { formula: 'doc.dueDate || doc.issueDate' },
            title: { formula: 'doc.title || "---"' },
            debit: { default: [{ account: '`8' }] },
            credit: { default: [{ account: '`454' }] },
            status: { default: 'posted' },
            postedAt: { formula: 'doc.issueDate' },
          },
        }, {
          collectionName: 'transactions',
          schemaSelector: { category: 'payment' },
          options: _.extend({}, options, { entity: 'payment' }),
          dictionary: {
            communityId: { default: getActiveCommunityId() },
            category: { default: 'payment' },
            relation: { default: Session.get('activePartnerRelation') },
            serialId: { formula: "'FIZ/SZALL/IMP/' + index" },
            defId: { default: Txdefs.findOne({ communityId: Session.get('activeCommunityId'), category: 'payment', 'data.relation': Session.get('activePartnerRelation') })._id },
            partnerId: { formula: 'conductor.phases[0].docs[index].idCard.name' },
  //          valueDate: { label: 'A számla kiegyenlítésének időpontja' },
  //          valueDate: { formula: 'doc.paymentDate' },
  //          amount: { label: 'Számla összege' },
  //          amount: { label: 'A számla kiegyenlítésének összege' },
            debit: { default: [{ account: '`454' }] },
            credit: { default: [{ account: '`38' }] },
            status: { default: 'posted' },
            postedAt: { formula: 'doc.valueDate' },
          },
        }],
      };
    },
  },
  statementEntries: {
    default(options) {
      return {
        collectionName: 'statementEntries',
        format: 'default',
        phases: [{
          collectionName: 'statementEntries',
          options,
          dictionary: options.dictionary,
        }],
      };
    },
    'K&H'(options) {
      _.extend(options.dictionary, {
        ref: { label: 'Tranzakció azonosító' },
        refType: { label: 'Típus' },
        valueDate: { label: 'Könyvelés dátuma' },
        amount: { label: 'Összeg' },
        name: { label: 'Partner elnevezése' },
        note: { label: 'Közlemény' },
      });
      return {
        collectionName: 'statementEntries',
        format: 'K&H',
        phases: [{
          collectionName: 'statementEntries',
          options,
          dictionary: options.dictionary,
        }],
      };
    },
    'OTP'(options) {
      _.extend(options.dictionary, {
        ref: { label: 'Banki tranzakció azonosító' },
        refType: { label: 'Forgalom típusa' },
        time: { label: 'Tranzakció időpontja' },
        valueDate: { label: 'Értéknap' },
        amount: { label: 'Összeg' },
        name: { label: 'Ellenoldali név' },
        contraBAN: { label: 'Ellenoldali számlaszám' },
        note: { label: 'Közlemény' },
//            serial: { label: '' },
      });
      return {
        collectionName: 'statementEntries',
        format: 'OTP',
        phases: [{
          collectionName: 'statementEntries',
          options,
          dictionary: options.dictionary,
        }],
      };
    },
    'CR'(options) {
      _.extend(options.dictionary, {
        ref: { label: 'Sorszám' },
        refType: { depends: ['Bevétel', 'Kiadás'], formula: "(doc['Bevétel'] && 'Bevétel') || (doc['Kiadás'] && 'Kiadás')" },
        valueDate: { label: 'Dátum' },
        amount: { depends: ['Bevétel', 'Kiadás'], formula: "doc['Bevétel'] || (doc['Kiadás'] * -1)" },
        name: { label: 'Név' },
        note: { label: 'Bizonylatszám (1)' },
      });
      return {
        collectionName: 'statementEntries',
        format: 'CR',
        phases: [{
          collectionName: 'statementEntries',
          options,
          dictionary: options.dictionary,
        }],
      };
    },
  },
};

export function getConductor(collection, options) {
  const conductorRaw = Conductors[collection._name]?.[options.format](options);
  const phases = conductorRaw.phases;
  phases.forEach(p => delete p.options.collection);
  const conductor = ImportConductor.from(conductorRaw);
  conductor.init();
  return conductor;
}
