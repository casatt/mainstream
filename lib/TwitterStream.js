/* @flow */

import EventEmitter from 'events';
import Twit from 'twit';
import winston from 'winston';
import { keywords } from './mapping';

export default class TwitterStream extends EventEmitter {
  stream: any;
  twitter: Twit;

  constructor() {
    super();

    const {
      TWITTER_CONSUMER_KEY,
      TWITTER_CONSUMER_SECRET,
      TWITTER_TOKEN,
      TWITTER_TOKEN_SECRET
    } = process.env;

    if (
      !TWITTER_CONSUMER_KEY ||
      !TWITTER_CONSUMER_SECRET ||
      !TWITTER_TOKEN ||
      !TWITTER_TOKEN_SECRET
    ) {
      throw new Error('Twitter API credentials are missing.');
    }

    this.twitter = new Twit({
      consumer_key: TWITTER_CONSUMER_KEY,
      consumer_secret: TWITTER_CONSUMER_SECRET,
      access_token: TWITTER_TOKEN,
      access_token_secret: TWITTER_TOKEN_SECRET,
      timeout_ms: 60 * 1000
    });
  }

  update() {
    if (this.stream) {
      this.stream.stop();
      this.stream = null;
    }
    if (!keywords.size) {
      return;
    }
    this.stream = this.twitter.stream('statuses/filter', {
      track: Array.from(keywords)
    });

    this.stream.on('connect', () => {
      winston.log('connect');
    });

    this.stream.on('connected', () => {
      winston.log('connected');
    });

    this.stream.on('disconnect', () => {
      winston.log('disconnect');
    });

    this.stream.on('reconnect', () => {
      winston.log('reconnect');
    });

    this.stream.on('error', winston.error);

    this.stream.on('warning', winston.warn);

    this.stream.on('tweet', tweet => this.emit('tweet', tweet));
  }

  async getGlobalTrends() {
    return this.getTrendsForWoeid(1);
  }

  async getLocalTrends(lat: string, long: string) {
    const woeid = await this.getClosedWoeidByGeoCoordinates(lat, long);
    return this.getTrendsForWoeid(woeid);
  }

  async getClosedWoeidByGeoCoordinates(lat: string, long: string) {
    return new Promise((resolve, reject) => {
      this.twitter.get('trends/closest', { lat, long }, (err, places) => {
        if (err) {
          reject(err);
        }
        resolve(places[0].woeid);
      });
    });
  }

  async getTrendsForWoeid(woeid: number) {
    return new Promise((resolve, reject) => {
      this.twitter.get('trends/place', { id: woeid }, (err, data) => {
        if (err) {
          reject(err);
        }
        resolve(data[0].trends.map(({ name }) => name));
      });
    });
  }
}
