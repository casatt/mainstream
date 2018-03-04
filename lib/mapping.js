/* @flow */

import winston from 'winston';

export const keywords: Set<string> = new Set();
const users: Set<Object> = new Set();
const userKeywordMap: WeakMap<Object, Set<string>> = new WeakMap();

const isKeywordTracked = (keyword: string) => keywords.has(keyword);

const getKeywordsOfUser = (user: Object) =>
  userKeywordMap.get(user) || new Set();

const isKeywordTrackedByUser = (keyword: string, user: Object) => {
  getKeywordsOfUser(user).has(keyword);
};

const isKeywordTrackedByAnyUser = (keyword: string) =>
  Array.from(users).some(user => isKeywordTrackedByUser(keyword, user));

const removeKeywordIfObsolete = (keyword: string) => {
  if (isKeywordTrackedByAnyUser(keyword)) {
    return;
  }
  keywords.delete(keyword);
  winston.info(`Untrack keyword: ${keyword}`);
};

export const track = (keyword: string, user: Object) => {
  if (!keyword) {
    userKeywordMap.set(user, new Set());
    return false;
  }
  // Add to individual user
  users.add(user);
  getKeywordsOfUser(user).add(keyword);
  if (!isKeywordTracked(keyword)) {
    // Add to global list
    keywords.add(keyword);
    winston.info(`Track keyword: ${keyword}`);
    return true;
  }
  return false;
};

export const untrack = (keyword: string, user: Object) => {
  if (!keyword) {
    // Remove the user
    userKeywordMap.delete(user);
    users.delete(user);

    // Check if the users keywords are still needed
    getKeywordsOfUser(user).forEach(removeKeywordIfObsolete);
    return false;
  }
  // Remove individual
  getKeywordsOfUser(user).delete(keyword);

  // Remove global
  removeKeywordIfObsolete(keyword);

  return true;
};

export const getMatchingKeywords = (tweet: Object) =>
  Array.from(keywords).filter(keyword =>
    tweet.text.toLowerCase().includes(keyword)
  );

export const getSubscribedUsers = (matchingKeywords: Array<string>) =>
  Array.from(users).filter(user =>
    matchingKeywords.some(keyword => isKeywordTrackedByUser(keyword, user))
  );
