import winston from 'winston';

export const keywords = new Set();
const users = new Set();
const userKeywordMap = new WeakMap();

const isKeywordTracked = keyword => keywords.has(keyword);
const isKeywordTrackedByUser = (keyword, user) =>
  userKeywordMap.get(user).has(keyword);
const isKeywordTrackedByAnyUser = keyword =>
  Array.from(users).some(user => isKeywordTrackedByUser(keyword, user));

export const track = (keyword, user) => {
  if (!keyword) {
    userKeywordMap.set(user, new Set());
    return false;
  }
  // Add to individual user
  users.add(user);
  userKeywordMap.get(user).add(keyword);
  if (!isKeywordTracked(keyword)) {
    // Add to global list
    keywords.add(keyword);
    winston.info(`Track keyword: ${keyword}`);
    return true;
  }
  return false;
};

export const untrack = (keyword, user) => {
  if (!keyword) {
    // Remove the user
    userKeywordMap.delete(user);
    users.delete(user);
    return false;
  }
  // Remove individual
  userKeywordMap.get(user).delete(keyword);

  if (!isKeywordTrackedByAnyUser(keyword)) {
    // Remove global
    keywords.delete(keyword);
    winston.info(`Untrack keyword: ${keyword}`);
    return true;
  }
  return false;
};

export const getMatchingKeywords = tweet =>
  Array.from(keywords).filter(keyword =>
    tweet.text.toLowerCase().includes(keyword)
  );

export const getSubscribedUsers = matchingKeywords =>
  Array.from(users).filter(user =>
    matchingKeywords.some(keyword => isKeywordTrackedByUser(keyword, user))
  );
