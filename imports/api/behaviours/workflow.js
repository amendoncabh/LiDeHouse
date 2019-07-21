import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { SimpleSchema } from 'meteor/aldeed:simple-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';
import { _ } from 'meteor/underscore';

import { noUpdate } from '/imports/utils/autoform.js';
import { checkExists, checkPermissions } from '/imports/api/method-checks.js';

// Workflows are tied to topics for now...
import { Topics } from '/imports/api/topics/topics.js';
import { Comments } from '/imports/api/comments/comments.js';
import { updateMyLastSeen } from '/imports/api/users/methods.js';

const schema = new SimpleSchema({
  status: { type: String, autoform: { omit: true } }, /* needs to be checked against the workflow rules */
  closed: { type: Boolean, autoform: { omit: true }, autoValue() {
    const status = this.field('status').value;
    if (!status) return undefined; // don't touch
    if (status === 'closed') return true;
    else return false;
  } },
  closesAt: { type: Date, optional: true, autoform: _.extend({ omit: true }, noUpdate) },
});

const helpers = {
  statusObject(statusName) {
    return this.workflow()[statusName || this.status].obj;
  },
  possibleStartStatuses() {
    const statuses = this.workflow().start;
    return _.pluck(statuses, 'name');
  },
  possibleNextStatuses() {
    const statuses = this.workflow()[this.status].next;
    return _.pluck(statuses, 'name');
  },
};

export const defaultWorkflow = {
  statusValues: ['opened', 'closed', 'deleted'],
  start: [{ name: 'opened' }],
  opened: { next: [{ name: 'closed' }, { name: 'deleted' }] },
  closed: { next: [{ name: 'deleted' }] },
  deleted: { next: [] },
};

function checkStatusStartAllowed(topic, status) {
  if (!_.contains(topic.possibleStartStatuses(), status)) {
    throw new Meteor.Error('err_permissionDenied', `Topic ${topic._id} cannot start in ${status}`, topic.toString());
  }
}

function checkStatusChangeAllowed(topic, statusTo) {
  if (!_.contains(topic.possibleNextStatuses(), statusTo)) {
    throw new Meteor.Error('err_permissionDenied', `Topic ${topic._id} cannot move from ${topic.status} into status ${statusTo}`, topic.toString());
  }
}

const statusChange = new ValidatedMethod({
  name: 'statusChange',
  validate: Comments.simpleSchema().validator({ clean: true }),
  run(event) {
    const topic = checkExists(Topics, event.topicId);
    const category = topic.category;
    const workflow = topic.workflow();
    // checkPermissions(this.userId, `${category}.${event.type}.${topic.status}.leave`, topic.communityId);
    checkPermissions(this.userId, `${category}.statusChangeTo.${event.status}.enter`, topic.communityId);
    checkStatusChangeAllowed(topic, event.status);

    const onLeave = workflow[topic.status].obj.onLeave;
    if (onLeave) onLeave(event, topic);

    const topicModifier = {};
    topicModifier.status = event.status;
    const statusObject = Topics.categories[category].statuses[event.status];
    if (statusObject.data) {
      statusObject.data.forEach(key => topicModifier[`${category}.${key}`] = event.data[key]);
    }
    const updateResult = Topics.update(event.topicId, { $set: topicModifier });

    const insertResult = Comments.insert(event);

    const newTopic = Topics.findOne(event.topicId);
    const onEnter = workflow[event.status].obj.onEnter;
    if (onEnter) onEnter(event, newTopic);

    updateMyLastSeen._execute({ userId: this.userId },
      { topicId: topic._id, lastSeenInfo: { timestamp: newTopic.createdAt } },
    );

    return insertResult;
  },
});

const hooks = {
  before: {
    insert(userId, doc) {
      checkStatusStartAllowed(Topics._transform(doc), doc.status);
    },
  },
};

export function Workflow(workflow = defaultWorkflow) {
  _.extend(helpers, {
    workflow() {
      return workflow;
    },
  });

  return {
    schema, helpers, methods: { statusChange }, hooks,
  };
}
