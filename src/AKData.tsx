import { unixTimeDeltaToDays, TimeUnit, getQuarter } from './util';

const PUBLIC_URL = '/ak-headhunting';

export enum Region {
  EN = "EN",
  CN = "CN"
}

export type ReleaseInfo = {
  released: number;
  featured: BannerInfo[];
  shop: BannerInfo[];
}

export type Operator = {
  name: string;
  class: string;
  rarity: number;
  gender: string;
  height: number;
  race: string;
  headhunting: boolean;
  recruitment: boolean;
  limited: boolean;
  event: boolean;
  faction: string;
  subfaction: string;
  release_date_en: number;
  EN: ReleaseInfo;
  CN: ReleaseInfo;
}

export type OperatorDict = { [id: string]: Operator }

type BannerInfo = {
  start: number,
  end: number,
  title: string,
  featured: string[],
  shop: string[],
  isLimited: boolean,
  shopDebut6Star: string[],
  shopDebut5Star: string[],
  isEvent: boolean,
  isRotating: boolean
}

type BannerDict = { [key in Region]: BannerInfo[] };


type DataJsonFormat = {
  operators: OperatorDict,
  banners: BannerDict
}

export type HistoricalNumericDataPoint = {
  time: Date,
  value: number
}

export type HistoricalAnnotatedNumericDataPoint = HistoricalNumericDataPoint & {
  label: string | null
}

export type AggregateData = { [id: string]: number }

export type AggregateData2D = { [id: string]: AggregateData }

export type HistogramDatum = { value: number }

export type PeriodicAggregateData = {
  period: string,
  data: AggregateData
}

export type HistoricalAggregateDataPoint = {
  time: Date,
  data: AggregateData
}

function indexOfLatestShopOperator(operators: Operator[], region: Region): number {
  if (operators.length <= 1) {
    throw new Error('Operator count sus');
  }

  for (let idx = operators.length - 1; idx >= 0; --idx) {
    if (operators[idx][region].shop.length > 0) {
      return idx;
    }
  }
  return -1;
}

export class AKData {
  _operators: OperatorDict = {};
  _sortedOperators: Operator[];
  _banners: BannerDict = {
    [Region.EN]: [],
    [Region.CN]: []
  };
  
  constructor() {
    if (AKData._instance !== null) {
      throw new Error("Constructor not available for singleton");
    }

    let data: DataJsonFormat = require('./data.json');
    this._operators = data.operators;
    this._sortedOperators = Object.values(this._operators)
        .sort((op1, op2) => {
          return op1.EN.released > op2.EN.released ? 1 : -1;
        });
    this._banners = data.banners;
    AKData._instance = this;
  }

  static _instance: AKData | null = null;
  static getInstance(): AKData {
    if (AKData._instance === null) {
      AKData._instance = new AKData();
    }
    return AKData._instance;
  }

  operators(): OperatorDict {
    return this._operators;
  }
  
  banners(region: Region): BannerInfo[] {
    return this._banners[region];
  }

  recentAndUpcomingShopOperators(before: number, after: number, region: Region): [Operator[], number[]] {
    let sixStars = this._sortedOperators.filter(op => !op.limited && op.rarity === 6)
    let latestIdx = indexOfLatestShopOperator(sixStars, region);
    let operators = sixStars.slice(latestIdx - before, latestIdx + 1 + after);
    let predictions = operators.map((op, idx) => {
      return operators[before][region].shop[0].start + (idx - before) * 3 * TimeUnit.BANNER;
    });
    return [operators, predictions];
  }

  debutBannerDuration(region: Region): HistoricalAnnotatedNumericDataPoint[] {
    let banners = this._banners[region].filter(b => b.isRotating && b.shopDebut6Star.length > 0);
    return banners.map(b => {
      return {
        time: new Date(b.start),
        value: unixTimeDeltaToDays(b.end - b.start),
        label: b.shopDebut6Star[0]
      }
    });
  }

  nonDebutBannerDuration(region: Region): HistoricalNumericDataPoint[] {
    let banners = this._banners[region].filter(b => b.isRotating && b.shopDebut6Star.length === 0);
    return banners.map(b => {
      return {
        time: new Date(b.start),
        value: unixTimeDeltaToDays(b.end - b.start),
      }
    });
  }

  certificateShop5StarDelay(): HistoricalNumericDataPoint[] {
    let operators = Object.values(this._operators)
        .filter(op => op.EN.shop.length > 0 && op.rarity === 5)
        .sort((op1, op2) => {
          return op1.EN.shop[0].start > op2.EN.shop[0].start ? 1 : -1;
        });
    return operators.map(op => {
      return {
        time: new Date(op.EN.shop[0].start),
        value: unixTimeDeltaToDays(op.EN.shop[0].start - op.EN.released)
      };
    });
  }

  certificateShop6StarDelay(): HistoricalNumericDataPoint[] {
    let operators = Object.values(this._operators)
        .filter(op => op.EN.shop.length > 0 && op.rarity === 6)
        .sort((op1, op2) => {
          return op1.EN.shop[0].start > op2.EN.shop[0].start ? 1 : -1;
        });
    return operators.map(op => {
      return {
        time: new Date(op.EN.shop[0].start),
        value: unixTimeDeltaToDays(op.EN.shop[0].start - op.EN.released)
      };
    });
  }

  globalReleaseDelayData(): HistoricalAggregateDataPoint[] {
    return this._sortedOperators.map(op => {
      return {
        time: new Date(op.EN.released),
        data: { value: unixTimeDeltaToDays(op.EN.released - op.CN.released) }
      };
    });
  }

  quarterlyOperatorReleaseData(): PeriodicAggregateData[] {
    let lastReleased = null;
    let result: PeriodicAggregateData[] = [];
    for (let idx = 1; idx < this._sortedOperators.length; ++idx) {
      const operator = this._sortedOperators[idx];
      if (operator.EN.released === this._sortedOperators[0].EN.released) {
        continue;
      }
      const quarter = getQuarter(operator.EN.released);
      if (lastReleased === null || quarter !== lastReleased) {
        result.push({
          'period': quarter,
          'data': {
            'event': 0,
            'limited': 0,
            'standard': 0
          }
        });
        lastReleased = quarter;
      }
      if (operator.event) {
        console.log(operator);
        result[result.length - 1]['data']['event']++;
      } else if (operator.limited) {
        result[result.length - 1]['data']['limited']++;
      } else if (operator.headhunting) {
        result[result.length - 1]['data']['standard']++;
      }
    }
    return result;
  }

  historicalGenderData(): HistoricalAggregateDataPoint[] {
    return this.historicalAggregateData(op => op.gender);
  }

  heightData(): HistogramDatum[] {
    return Object.values(this._operators).filter(op => op.height).map(op => {
      return { value: op.height };
    });
  }

  raceData(): AggregateData {
    return this.aggregateData(op => op.race);
  }

  factionData(): AggregateData {
    return this.aggregateData(op => op.faction);
  }
  
  classData(): HistoricalAggregateDataPoint[] {
    return this.historicalAggregateData(op => op.class);
  }

  classRarityData(): AggregateData2D {
    return this.aggregateData2D(op => op.class, op => op.rarity.toString());
  }

  rarityData(): HistoricalAggregateDataPoint[] {
    return this.historicalAggregateData(op => op.rarity.toString());
  }

  rarityGenderData(): AggregateData2D {
    return this.aggregateData2D(op => op.rarity.toString(), op => op.gender);
  }

  classGenderData(): AggregateData2D {
    return this.aggregateData2D(op => op.class, op => op.gender);
  }

  historicalAggregateData(func: (op: Operator) => string): HistoricalAggregateDataPoint[] {
    let operators = this._sortedOperators;

    let result: HistoricalAggregateDataPoint[] = [{
      time: new Date(operators[0].EN.released),
      data: { [func(operators[0])] : 1 }
    }];

    let lastReleased = operators[0].EN.released;
    for (let idx = 1; idx < operators.length; ++idx) {
      if (operators[idx].EN.released !== lastReleased) {
        result.push({
          time: new Date(operators[idx].EN.released),
          data: { ...result[result.length - 1].data }
        });
        lastReleased = operators[idx].EN.released;
      }
      let key = func(operators[idx]);
      if (key in result[result.length - 1].data) {
        result[result.length - 1].data[key] += 1;
      } else {
        result[result.length - 1].data[key] = 1;
      }
    }
    return result;
  }

  aggregateData(func: (op: Operator) => string): AggregateData {
    let result: AggregateData = {}
    Object.values(this._operators).forEach(op => {
      let key = func(op);
      if (key in result) {
        result[key]++;
      } else {
        result[key] = 1;
      }
    });
    return result;
  }

  aggregateData2D(func1: (op: Operator) => string, func2: (op: Operator) => string): AggregateData2D {
    let result: AggregateData2D = {};
    Object.values(this._operators).forEach(op => {
      let key1 = func1(op);
      if (! (key1 in result)) {
        result[key1] = {};
      }
      let key2 = func2(op);
      if (key2 in result[key1]) {
        result[key1][key2]++;
      } else {
        result[key1][key2] = 1;
      }
    });
    return result;
  }
}

const IMAGES: { [id: string]: { [id: string]: string } } = require('./images.json');

export function getImage(context: string, value: string): string {
  if (context in IMAGES && value in IMAGES[context]) {
    if (window.location.href.toLowerCase().includes('localhost')) {
      return IMAGES[context][value];
    } else {
      return PUBLIC_URL + IMAGES[context][value];
    }
  }
  throw new Error("Image could not be found");
}

