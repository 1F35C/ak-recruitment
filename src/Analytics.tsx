import { AgChartsReact } from 'ag-charts-react';
import * as agCharts from 'ag-charts-community';
import {
  AKData,
  Region,
  HistoricalNumericDataPoint,
  HistoricalAnnotatedNumericDataPoint,
  HistoricalAggregateDataPoint
} from './AKData';


type BannerDurationBarParams = {
  debutBannerDurationData: HistoricalAnnotatedNumericDataPoint[],
  nonDebutBannerDurationData: HistoricalNumericDataPoint[]
}
function BannerDurationBar(params: BannerDurationBarParams) {
  let options = {
    title: {
      text: 'Rotating Banner Duration'
    },
    series: [
      {
        data: params.debutBannerDurationData,
        type: 'scatter',
        xKey: 'time',
        yKey: 'value',
        yName: 'Debut',
        labelKey: 'label',
        marker: { shape: 'circle', size: 8, stroke: '#f03a5f', fill: '#f03a5f' }
      },
      {
        data: params.nonDebutBannerDurationData,
        type: 'scatter',
        xKey: 'time',
        yName: 'Normal',
        yKey: 'value',
        marker: { shape: 'cross', stroke: '#3488ce', fill: '#3488ce' }
      }
    ],
    axes: [
      {
        type: 'time',
        position: 'bottom'
      },
      {
        type: 'number',
        position: 'left'
      }
    ]

  }
  return (
    <AgChartsReact options={options} />
  );
}

type CertShopParams = BannerDurationBarParams & {
  certShop5StarDelayData: HistoricalNumericDataPoint[],
  certShop6StarDelayData: HistoricalNumericDataPoint[]
};
function CertShop(params: CertShopParams) {
  let certShopDelayOptions = {
    series: [
      {
        data: params.certShop6StarDelayData,
        xKey: 'time',
        yKey: 'value',
        yName: '6 Star'
      },
      {
        data: params.certShop5StarDelayData,
        xKey: 'time',
        yKey: 'value',
        yName: '5 Star'
      }
    ],
    title: {
      text: 'Days between Release and Certificate Shop Debut'
    },
    axes: [
      {
        type: 'time',
        position: 'bottom',
        tick: { count: agCharts.time.month.every(3) }
      },
      {
        type: 'number',
        position: 'left'
      }
    ]
  };

  return (
    <div className="section">
      <div className="title">
        Cert shop
      </div>
      <BannerDurationBar debutBannerDurationData={ params.debutBannerDurationData }
                         nonDebutBannerDurationData={ params.nonDebutBannerDurationData }/>
      <AgChartsReact options={certShopDelayOptions} />
      <div className="box">
      TODO: Featured operator wait histogram<br />
      TODO: Shop operator wait histogram
      </div>
    </div>
  );
}

type OperatorDemographyParams = {
  genderData: HistoricalAggregateDataPoint[],
  raceData: HistoricalAggregateDataPoint[],
  factionData: HistoricalAggregateDataPoint[]
};

function transformAggregateDataForPie(data: HistoricalAggregateDataPoint[], sliceLimit: number = 12) {
  if (data.length === 0) {
    return [];
  }
  let latestDataPoint = data[data.length - 1];
  var slices = Object.keys(latestDataPoint.data)
      .map((key) => { return { label: key, value: latestDataPoint.data[key] }})
      .sort((s1, s2) => { return s1.value < s2.value ? 1 : -1; });

  if (slices.length > sliceLimit) {
    let otherCount = slices.slice(sliceLimit).reduce((total, slice) => { return total + slice.value; }, 0);
    slices = slices.slice(0, sliceLimit).concat({ label: 'Other', value: otherCount });
  }
  return slices;
}

function transformAggregateDataForLineOption(dataPoints: HistoricalAggregateDataPoint[]) {
  let data = dataPoints.map((dp) => { return { ...dp.data, time: dp.time }; });
  let series = Object.keys(dataPoints[data.length - 1].data).map((key) => { return {xKey: 'time', yKey: key }; });
  let result = {
    data: data,
    series: series 
  };
  return result;
}

function OperatorDemography(params: OperatorDemographyParams) {
  let genderPieData = transformAggregateDataForPie(params.genderData);
  let genderPieOptions = {
    title: {
      text: 'Gender Distribution'
    },
    data: genderPieData,
    series: [
      {
        type: 'pie',
        angleKey: 'value',
        labelKey: 'label',
        innerRadiusOffset: -30
      }
    ]
  };

  let racePieData = transformAggregateDataForPie(params.raceData);
  let racePieOptions = {
    title: {
      text: 'Race Distribution'
    },
    data: racePieData,
    series: [
      {
        type: 'pie',
        angleKey: 'value',
        labelKey: 'label',
        innerRadiusOffset: -30
      }
    ]
  };

  let factionPieData = transformAggregateDataForPie(params.factionData);
  let factionPieOptions = {
    title: {
      text: 'Faction Distribution'
    },
    data: factionPieData,
    series: [
      {
        type: 'pie',
        angleKey: 'value',
        labelKey: 'label',
        innerRadiusOffset: -30
      }
    ]
  };

  let genderLineOptions = {
    ...transformAggregateDataForLineOption(params.genderData),
    title: {
      text: 'Number of Operators by Gender'
    },
    axes: [
      {
        type: 'time',
        position: 'bottom',
        tick: { count: agCharts.time.month.every(3) }
      },
      {
        type: 'number',
        position: 'left'
      }
    ]
  };

  return (
    <div className="section">
      <div className="title">
        Demographics 
      </div>
      <div className="columns is-desktop">
        <div className="column is-full-tablet is-one-third-desktop">
          <div className="box" style={{height: 500}}>
            <AgChartsReact options={genderPieOptions} />
          </div>
        </div>
        <div className="column is-full-tablet is-one-third-desktop">
          <div className="box" style={{height: 500}}>
            <AgChartsReact options={racePieOptions} />
          </div>
        </div>
        <div className="column is-full-tablet is-one-third-desktop">
          <div className="box" style={{height: 500}}>
            <AgChartsReact options={factionPieOptions} />
          </div>
        </div>
      </div>
      <div className="box" style={{height: 500}}>
        <AgChartsReact options={genderLineOptions} />
      </div>

    </div>
  );
}

type AnalyticsPageParams = {
  akdata: AKData
};
export function AnalyticsPage(params: AnalyticsPageParams) {
  return (
    <>
    <div className="section">
      <div className="title">
        Certificate Shop Debut
      </div>
      Last: Ceobe (Release date, Debut date)<br />
      Next: Bagpipe (Release date)
    </div>
    <CertShop debutBannerDurationData={ params.akdata.debutBannerDuration(Region.EN) }
              nonDebutBannerDurationData={ params.akdata.nonDebutBannerDuration(Region.EN) }
              certShop5StarDelayData={ params.akdata.certificateShop5StarDelay() }
              certShop6StarDelayData={ params.akdata.certificateShop6StarDelay() } />
    <div className="section">
      <div className="title">
        Operators that are overdue for certificate eshop
      </div>
    </div>
    <div className="section">
      <div className="title">
        Operators with Upcoming Skins
      </div>
    </div>
    <OperatorDemography genderData={ params.akdata.historicalGenderData() } raceData={ params.akdata.historicalRaceData() } factionData={ params.akdata.historicalFactionData() } />
    </>
  );
}
