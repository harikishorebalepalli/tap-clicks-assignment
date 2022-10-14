const csvtojson = require('csvtojson');
const express = require('express');
const ftp = require('basic-ftp');

/** Express settings */
const app = express();

app.listen(3000);

app.set('view engine','ejs');

app.get('/creatives',(req,res)=>{
    res.render('home',{'data' : creativeData, 'title': 'Creatives Data'})
});

app.get('/orders',(req,res)=>{
    res.render('home',{'data' : orderData, 'title': 'Orders Data'})
});

app.get('/campaigns',(req,res)=>{
    res.render('home',{'data' : campaignData, 'title': 'Campaigns Data'})
});


/** properties initialisation */
const fileName1 = "downloaded/Yashi_2016-05-09.csv";
const fileName2 = "downloaded/Yashi_2016-05-10.csv";
var creativeData = [];
var orderData = [];
var campaignData = [];


/** function to download files from ftp server and initialise grouping and processing of data */
(async () => {
    const client = new ftp.Client();
    client.ftp.verbose = true
    try {
        await client.access({
            host: "ftp.tapclicks.com",
            user: "ftp_integration_test",
            password: "6k0Sb#EXT6jw",
            secure: true
        })
        await client.downloadToDir('downloaded','data_files');
    }
    catch(err) {
        console.log(err);
    }
    client.close();

    groupData();
})();


/** funtion to group the json data base on date, campaign, orders */
var groupData = async() => {
    try{
        let data1 = await csvtojson().fromFile(fileName1);
        let data2 = await csvtojson().fromFile(fileName2);

        let dataSet = data1.concat(data2);

        groups = ['Date','Campaign ID','Order ID'];
        grouped = {};
    
        dataSet.forEach(function (a) {
            groups.reduce(function (o, g, i) {                            
                o[a[g]] = o[a[g]] || (i + 1 === groups.length ? [] : {}); 
                return o[a[g]];                                           
            }, grouped).push(a);
        });
    
        // console.log(JSON.stringify(grouped, 0, 4)); 
    
        processData(grouped, sum);  
    }
    catch(err){
        console.log(err);
    }
};


/** function to  process the grouped data to populate the required tables */
var processData = (grouped, aggregateFun) => {
    Object.keys(grouped).forEach((dateGroup) => {
        var campaigns = grouped[dateGroup];
        Object.keys(campaigns).forEach((CampaignGroup)=>{
            var orders = campaigns[CampaignGroup];
            var campaignOrders = [];
            Object.keys(orders).forEach((orderGroup) => {
                    var order = orders[orderGroup];
                    order.forEach((data)=> {
                        var obj = {};
                        obj['id'] = data['Creative ID'];
                        obj['log_date'] = data['Date'];
                        obj['impression_count'] = data['Impressions'];
                        obj['click_count'] = data['Clicks'];
                        obj['25viewed_count'] = data['25% Viewed'];
                        obj['50viewed_count'] = data['50% Viewed'];
                        obj['75viewed_count'] = data['75% Viewed'];
                        obj['100viewed_count'] = data['100% Viewed'];
                        creativeData.push(obj);
                    });
                    var obj = {};
                    obj['id'] = orderGroup;
                    obj['log_date'] = dateGroup;
                    obj['impression_count'] = aggregateFun(order.map((row) => row['Impressions']).map(Number));
                    obj['click_count'] = aggregateFun(order.map((row) => row['Clicks']).map(Number));
                    obj['25viewed_count'] = aggregateFun(order.map((row) => row['25% Viewed']).map(Number));
                    obj['50viewed_count'] = aggregateFun(order.map((row) => row['50% Viewed']).map(Number));
                    obj['75viewed_count'] = aggregateFun(order.map((row) => row['75% Viewed']).map(Number));
                    obj['100viewed_count'] = aggregateFun(order.map((row) => row['100% Viewed']).map(Number));
                    campaignOrders.push(obj);
            });
            orderData.push(...campaignOrders);
            var campaignObj = {};
            campaignObj['id'] = CampaignGroup;
            campaignObj['log_date'] = dateGroup;
            campaignObj['impression_count'] = aggregateFun(campaignOrders.map((row) => row['impression_count']).map(Number));
            campaignObj['click_count'] = aggregateFun(campaignOrders.map((row) => row['click_count']).map(Number));
            campaignObj['25viewed_count'] = aggregateFun(campaignOrders.map((row) => row['25viewed_count']).map(Number));
            campaignObj['50viewed_count'] = aggregateFun(campaignOrders.map((row) => row['50viewed_count']).map(Number));
            campaignObj['75viewed_count'] = aggregateFun(campaignOrders.map((row) => row['75viewed_count']).map(Number));
            campaignObj['100viewed_count'] = aggregateFun(campaignOrders.map((row) => row['100viewed_count']).map(Number));
            campaignData.push(campaignObj)

        });
    })       
}


/** Aggregate function defintions */
var sum = (arr) => arr.reduce((a, b) => a + b, 0);
var mean = (arr) => {
    var total = sum(arr);
    return total/arr.length;
};
var median = (arr) => {
    const sorted = Array.from(arr).sort((a, b) => a - b);
    const middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return (sorted[middle - 1] + sorted[middle]) / 2;
    }
    return sorted[middle];
}
var max = (arr) => Math.max.apply(null, arr);
var min = (arr) => Math.min.apply(null, arr);