/* eslint-disable no-extend-native */
import { _ } from 'meteor/underscore';

// https://stackoverflow.com/questions/6491463/accessing-nested-javascript-objects-with-string-key
Object.getByString = function (object, string) {
  let obj = object;
  let str = string;
  str = str.replace(/\[(\w+)\]/g, '.$1'); // cobjnvert indexes to properties
  str = str.replace(/^\./, '');           // strip keyFragments leading dot
  const keyFragments = str.split('.');
  for (let i = 0, n = keyFragments.length; i < n; ++i) {
    const key = keyFragments[i];
    if (key in obj) obj = obj[key];
    else return;
  }
  return obj;
};

Object.setByString = function (object, string, value) {
  let obj = object;
  let str = string;
  str = str.replace(/\[(\w+)\]/g, '.$1'); // cobjnvert indexes to properties
  str = str.replace(/^\./, '');           // strip keyFragments leading dot
  const keyFragments = str.split('.');
  for (let i = 0, n = keyFragments.length; i < n; ++i) {
    const key = keyFragments[i];
    if (i === n - 1) obj[key] = value;
    else {
      if (!(key in obj)) obj[key] = {};
      obj = obj[key];
    }
  }
};

String.prototype.forEachChar = function forEachChar(func) {
  for (let i = 0; i < this.length; i++) {
    func(this.charAt(i));
  }
};

String.prototype.capitalize = function capitalize() {
  return this.charAt(0).toUpperCase() + this.slice(1);
};

Number.prototype.round = function round(places) {
//  return Math.round((this * 100) + Number.EPSILON) / 100;
  return +(Math.round(this + 'e+' + places) + 'e-' + places);
};

_.isDefined = function (obj) { // underscore did not have this
  return obj !== undefined;
};
