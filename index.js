var AWS = require('aws-sdk');
var moment = require('moment');
var moment_round = require('moment-round');


function getMetricValue(data, metricName, defaultVal) {
    if (data.MetricResults !== undefined && data.MetricResults.length > 0) {
        var e = data.MetricResults[0];
        if (e.Collections !== undefined && e.Collections.length > 0) {
            var results = e.Collections.filter(m => m.Metric.Name === metricName).map(m => m.Value);
            return results.length > 0 ? results[0] : defaultVal;
        }
    }
    return defaultVal;
}
function getCurrentMetricData(connect, instanceId, queueARN) {
    return new Promise((resolve, reject) => {
        var params = {
            CurrentMetrics: [ /* required */
                {
                    Name: "AGENTS_AVAILABLE",
                    Unit: "COUNT"
                },
                {
                    Name: "AGENTS_STAFFED",
                    Unit: "COUNT"
                },
                {
                    Name: "CONTACTS_IN_QUEUE",
                    Unit: "COUNT"
                }
                /* more items */
            ],
            Filters: { /* required */
                Channels: [
                    "VOICE"
                    /* more items */
                ],
                Queues: [
                    queueARN
                    /* more items */
                ]
            },
            InstanceId: instanceId, /* required */
            Groupings: [
                "QUEUE",
                /* more items */
            ],
            MaxResults: '20',
            NextToken: null
        };
        connect.getCurrentMetricData(params, function (err, data) {
            if (err) {
                reject(err);
            }
            else {
                resolve(data);
            }
        });
    });
}


function getMetricData(connect, instanceId, queueARN) {
    return new Promise((resolve, reject) => {
        var start = moment().startOf('minute').subtract(30, "minutes").round(5, 'minutes').toDate();   // 30 minutes ago, must be multiple by 5
        var end = moment().startOf('minute').round(5, 'minutes').toDate();
        console.log("start= " + start);
        console.log("end = " + end);
        var params = {
            EndTime: end,
            Filters: { /* required */
                Channels: [
                    "VOICE"
                    /* more items */
                ],
                Queues: [
                    queueARN
                    /* more items */
                ]
            },
            HistoricalMetrics: [ /* required */
                {
                    Name: "CONTACTS_QUEUED",
                    Statistic: "SUM",
                    Unit: "COUNT"
                },
                {
                    Name: "CONTACTS_ABANDONED",
                    Statistic: "SUM",
                    Unit: "COUNT"
                }, , {
                    Name: "CONTACTS_HANDLED",
                    Statistic: "SUM",
                    Unit: "COUNT"
                }, {
                    Name: "HANDLE_TIME",
                    Statistic: "AVG",
                    Unit: "SECONDS"
                }
            ],
            InstanceId: instanceId, /* required */
            StartTime: start, /* required */
            Groupings: [
                "QUEUE",
                /* more items */
            ],
            MaxResults: '10',
            NextToken: ''
        };
        connect.getMetricData(params, function (err, data) {
            if (err) {
                reject(err);
            }
            else {
                resolve(data);
            }
        });
    });
}

function getEWT(instanceId, queueARN, options) {
    return new Promise((resolve, reject) => {
        var connect = new AWS.Connect(options);
        getCurrentMetricData(connect, instanceId, queueARN).then(function (data) {
            console.log(JSON.stringify(data, null, 2));
            var agentAvailable = getMetricValue(data, 'AGENTS_AVAILABLE', 0);
            var agentStaffed = getMetricValue(data, 'AGENTS_STAFFED', 0);
            var contactInQueue = getMetricValue(data, 'CONTACTS_IN_QUEUE', 0);
            if (agentAvailable > 0 && contactInQueue === 0) {
                resolve(0);
            } else if (agentStaffed == 0) {
                resolve(-1);
            } else {
                getMetricData(connect, instanceId, queueARN).then(function (data) {
                    console.log(JSON.stringify(data, null, 2));
                    var avgHandleTime = getMetricValue(data, 'HANDLE_TIME', 0);
                    var contactQueued = getMetricValue(data, 'CONTACTS_QUEUED', 0);
                    var contactAbandoned = getMetricValue(data, 'CONTACTS_ABANDONED', 0);
                    var contactHandled = getMetricValue(data, 'CONTACTS_HANDLED', 0);
                    //ABN = https://www.callcentrehelper.com/how-to-measure-call-abandon-rate-75869.htm
                    //ABN = (Number of Calls Offered – Number of Calls of Handled)  /  Number of Calls Offered
                    //ABN =  (contactQueued - contactHandled) / contactQueued
                    //ABN =  (contactAbandoned) / contactQueued
                    //EWT1 = (AHT * PiQ / AA) * (1 - ABN)  //https://developer.mypurecloud.com/api/rest/v2/routing/estimatedwaittime.html
                    var abn = contactAbandoned / contactQueued;
                    var ewt = (avgHandleTime * (contactInQueue + 1) / agentStaffed) * (1 - abn);
                    resolve(Math.ceil(ewt));
                }).catch(function (err) {
                    reject(err);
                });
            }
        }).catch(function (err) {
            reject(err);
        });

    });
}
var instanceId = 'arn:aws:connect:ap-southeast-2:171147132640:instance/985bbe6c-e6a8-4efd-8e16-4e72e9a0fe81';
var queueARN = 'arn:aws:connect:ap-southeast-2:171147132640:instance/985bbe6c-e6a8-4efd-8e16-4e72e9a0fe81/queue/3f1c99c2-7e3f-4428-99d2-a2a31d2a8eb3';

getEWT(instanceId, queueARN, { region: "ap-southeast-2" }).then(function (data) {
    console.log('EWT=' + data);
}).catch(function (err) {
    console.log(err, err.stack);
})