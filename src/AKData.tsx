import { unixTimeDeltaToDays, TimeUnit } from './util';
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
  race: string;
  headhunting: boolean;
  recruitment: boolean;
  limited: boolean;
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

export type HistoricalAggregateDataPoint = {
  time: Date,
  data: { [id: string]: number }
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
    let sorted = Object.values(this._operators)
      .filter(op => !op.limited && op.rarity === 6)
      .sort((op1, op2) => {
        return (op1[region].released > op2[region].released) ? 1 : -1;
      });
    let latestIdx = indexOfLatestShopOperator(sorted, region);
    let operators = sorted.slice(latestIdx - before, latestIdx + 1 + after);
    let predictions = operators.map((op, idx) => {
      return operators[before][region].shop[0].start + (idx - before) * 3 * TimeUnit.BANNER;
    });
    return [operators, predictions];
  }

  debutBannerDuration(region: Region): HistoricalAnnotatedNumericDataPoint[] {
    let banners = this._banners[region].filter((b) => b.isRotating && b.shopDebut6Star.length > 0);
    return banners.map((b) => {
      return {
        time: new Date(b.start),
        value: unixTimeDeltaToDays(b.end - b.start),
        label: b.shopDebut6Star[0]
      }
    });
  }

  nonDebutBannerDuration(region: Region): HistoricalNumericDataPoint[] {
    let banners = this._banners[region].filter((b) => b.isRotating && b.shopDebut6Star.length === 0);
    return banners.map((b) => {
      return {
        time: new Date(b.start),
        value: unixTimeDeltaToDays(b.end - b.start),
      }
    });
  }

  certificateShop5StarDelay(): HistoricalNumericDataPoint[] {
    let operators = Object.values(this._operators)
        .filter((op) => {
          return op.EN.shop.length > 0 && op.rarity === 5;
        })
        .sort((op1, op2) => {
          return op1.EN.shop[0].start > op2.EN.shop[0].start ? 1 : -1;
        });
    return operators.map((op) => {
      return {
        time: new Date(op.EN.shop[0].start),
        value: unixTimeDeltaToDays(op.EN.shop[0].start - op.EN.released)
      };
    });
  }

  certificateShop6StarDelay(): HistoricalNumericDataPoint[] {
    let operators = Object.values(this._operators)
        .filter((op) => {
          return op.EN.shop.length > 0 && op.rarity === 6;
        })
        .sort((op1, op2) => {
          return op1.EN.shop[0].start > op2.EN.shop[0].start ? 1 : -1;
        });
    return operators.map((op) => {
      return {
        time: new Date(op.EN.shop[0].start),
        value: unixTimeDeltaToDays(op.EN.shop[0].start - op.EN.released)
      };
    });
  }

  historicalGenderData(): HistoricalAggregateDataPoint[] {
    return this.historicalAggregateData((op) => { return op.gender });
  }

  historicalRaceData(): HistoricalAggregateDataPoint[] {
    return this.historicalAggregateData((op) => { return op.race });
  }

  historicalFactionData(): HistoricalAggregateDataPoint[] {
    return this.historicalAggregateData((op) => { return op.faction });
  }

  historicalAggregateData(func: (op: Operator) => string): HistoricalAggregateDataPoint[] {
    let operators = Object.values(this._operators).sort((op1, op2) => {
      return op1.EN.released > op2.EN.released ? 1 : -1;
    });
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
}

const IMAGES: { [id: string]: { [id: string]: string } } = require('./images.json');

export function getImage(context: string, value: string): string {
  if (context in IMAGES && value in IMAGES[context]) {
    return IMAGES[context][value];
  }
  throw new Error("Image could not be found");
}

