console.log('i am predict script');

var timeoutId = '';
var jobid = '';
var cols = ['#200BFE', '#CE3235'];
var jobhisSum = {};
var jobhis=[];
var vueObj = '';
var removeFuncLoad = 0;
var jobNum = 10;
var opt = {
    delay:{ show: 1000, hide: 1000 },
    trigger: 'manual'
}
var modelID='';
var method={};
var echart_opt;

var data_type = 'mut';
if(getQueryVariable('data_type')){
    if(
        getQueryVariable('data_type') == 'pri' || 
        getQueryVariable('data_type') == 'mut' || 
        getQueryVariable('data_type') == 'exp'
    ){
        data_type = getQueryVariable('data_type');
    }
}
var pri_id = '';
if(getQueryVariable('pri_id')){
    if(getQueryVariable('pri_id').match(/^\w{16}$/)){
        pri_id = getQueryVariable('pri_id');
    }
}

var demo_jobs = {
    'mut': {
        'jobhis': ["a5e92550c6674ddf", "a21c530ff78f8d17"],
        'compare' : 'a5e92550c6674ddf,a21c530ff78f8d17',
        'jobid' : 'a5e92550c6674ddf',
    },
    'exp': {
        'jobhis': ["5e4434cba401361d", "43895d6d681e6207"],
        'compare' :'5e4434cba401361d,43895d6d681e6207',
        'jobid' :'43895d6d681e6207',
    },
    'pri':{'jobhis':[], 'compare':'', 'jobid':''}
}

var survivaldata;
$(window).resize(function(){
    if(vueObj.jobid){
        drawSurvival(survivaldata);
    }
});

var lastinput;

var databaseSurvival = JSON.parse(JSON.parse($.ajax({async:false,type:"get",url:"https://www.adigger.cn:8002/pmht/getSurv/mut",datatype:'json',success:function(data){}}).responseText));
var stratas = databaseSurvival.data.map(x=>{return x[8]}).filter((x,i)=>{return databaseSurvival.data.map(x=>{return x[databaseSurvival.columns.indexOf('strata')]}).indexOf(x)==i});
var databaseSample = JSON.parse($.ajax({async:false,type:"get",url:"https://www.adigger.cn:8002/pmht/getExpSampleList",datatype:'json',success:function(data){}}).responseText);

function clearUpload(){
    vueObj.upload_prefix = '';
    vueObj.uploadPreview = '';
    vueObj.upload_expName_id = '';
}

function pri_init(){
    $('#pri_input').fileinput({
        showPreview: false,
        showUpload: false,
        uploadUrl: 'https://www.adigger.cn:8002/pmht/postFile_predict_pri',
    });
    $("#pri_input").on("filebatchselected", function(event, files) {
        $("#pri_input").fileinput("upload");
    });
    $("#pri_input").on("fileuploaded", function(event,data){
        if(data.response.message == 'success'){
            vueObj.pri_input_val = data.response.id;
        }else{
            vueObj.pri_input_val = '';
            $('#pri_input').fileinput('reset');
        }
    });
    if(getQueryVariable('pri_id')){
        if(getQueryVariable('pri_id').match(/^\w{16}$/)){
            pri_id = getQueryVariable('pri_id');
        }else{
            pri_id = '';
        }
    }else{
        pri_id = '';
    }
    vueObj.pri_id = pri_id;
    updatePriModel(pri_id);
}

function updatePriModel(pri_id){
    if(pri_id == ''){
        return;
    }
    vueObj.modelID='';
    vueObj.method = {};
    console.log("i am going to get model: "+pri_id);
    url = 'https://www.adigger.cn:8002/api/jobs/'+ pri_id +'?key=' + key;
    $.ajax(
        {
            type:"get",
            url:url,
            datatype:'json',
            success:function(data){
                console.log(data);
                url = "https://www.adigger.cn:8002/api/histories/" + history_Id + "/contents/" + data.outputs.outID.id + "/display?key=e8c93c4c91a74db2de422efb512ddf1e";
                $.ajax(
                    {
                        type:"get",
                        url:url,
                        success:function(data){
                            if(data.length == 35){
                                vueObj.modelID   = data;
                                method    = JSON.parse($.ajax({async:false,type:"get",url:"https://www.adigger.cn:8002/pmht/getSelect/"+data,datatype:'json',success:function(data){}}).responseText);
                                if(typeof(method.info.select) != 'undefined'){
                                    vueObj.method = method.info.select.filter((x)=>{return x.key=='Autogluon'})[0]
                                }
                            }else{
                                vueObj.modelID = '';
                            }
                        },
                        error:function(){
                            vueObj.modelID = '';
                        }
                    }
                );
            },
            error:function(){
                vueObj.modelID = '';
            }
        }
    );
}

function uniqueArr(array) {
	var n = [];
	for (var i = 0; i < array.length; i++) {
		if (array.indexOf(array[i]) == i){
			n.push(array[i]);
		}
	}
	return n;
}

function drawSurvival(data, divid="res_svg"){
    console.log(data);
    if(vueObj.job_state != 'done'){
        return;
    }
    $('#' + divid).html('');
    var echartID = 'echartID' + Math.round(Math.random()*1000);
    $('#' + divid).append('<div id="' + echartID  + '"></div>');
    var myChart = echarts.init(document.getElementById(echartID));
    var series = [];
    series = series.concat(data.columns.map((x,i)=>{
        return {
                'name':x, 'type':'line', 
                'color':cols[i], 'lineStyle':{'color':cols[i]},'xAxisIndex':0,
                'data':data.data.map(
                    y=>{
                        return Math.round(y[i]*1000)/10 }
                ), 
            }
        }
    ));
    
    var mortalityData = {
        columns:data.columns,
        index:  data.index.slice(10),
        data :  survivaldata.data.slice(10).map((d,i)=>{h=survivaldata.data[i]; return([h[0]-d[0], h[1]-d[1]])}),
    }

    series = series.concat(data.columns.map((x,i)=>{
        return {
                'name':x, 'type':'line', 
                'color':cols[i], 'lineStyle':{'color':cols[i]},
                'xAxisIndex':2,
                'yAxisIndex':1,
                'data':mortalityData.data.map(
                    y=>{
                        return Math.round(y[i]*100000)/1000 }
                ), 
            }
        }
    ));

    for(x in stratas){
        var dataset = stratas[x];
        series.push({
            name: dataset,
            type: 'line',
            step: 'start',
            symbol: 'none',
            xAxisIndex: 1,
            lineStyle: {
                width: 5,
                opacity: 0.3,
            },
            data: databaseSurvival.data.filter(x=>{return x[databaseSurvival.columns.indexOf('strata')] == dataset}).map(x=>{return([x[databaseSurvival.columns.indexOf('time')], 100*x[databaseSurvival.columns.indexOf('surv')]])})
        });
    }

    series.push({
        type: 'line',
        markLine: {
            symbol: ['none', 'none'],
            label: {show: false},
            xAxisIndex: 0,
            data: data.index.map((x,i)=>{return [x,i]}).filter(x=>{return x[0] % 12 == 0}).map(x=>{return {  'xAxis': x[1] }})
        },
        xAxisIndex: 0,
        yAxisIndex: 0,
    });

    tipFmt = '<strong>Month:</strong> {b0}<br /> <span class="dengkuan" style="color:' + cols[0]  + '"><strong>{a0}:</strong> {c0}%</span><br />';
    tipFmt += '<span>' + jobhisSum[data.columns[0]] + '</span><br />'
    if(data.columns.length==2){
        tipFmt = tipFmt + '<span class="dengkuan" style="color:' + cols[1] + '"><strong>{a1}:</strong> {c1}%</span><br />';
        tipFmt += '<span>' + jobhisSum[data.columns[1]] + '</span>'
    }

    echart_opt = {
        legend:[
            {
                selectedMode: false,
                data: data.columns,
                y: '7%', x:'center',
                orient: 'horizontal',
                align: 'auto',
            },
            {
                selectedMode: true,
                data: stratas,
                y: '12%', x:'right',
                orient: 'vertical',
                align: 'right',
            },
        ],
        tooltip: {
            trigger: 'axis',
            formatter: tipFmt
        },
        xAxis: [
            {
                name: 'Months',
                nameLocation: 'middle',
                nameGap: 25,
                data: data.index.map(x=>{return Math.round(x*100)/100;}),
                axisLabel: {interval:function(idx,val){
                    if(val % 6 == 0){
                        return true;
                    }else{
                        return false;
                    }
                }},
                gridIndex: 0
            },
            {
                show: false,
                type: 'value',
                min: 0,
                max: 60,
                gridIndex: 0
            },
        ],
        yAxis: [
            {
                name: 'Survival probability(%)',
                nameLocation: 'end',
                nameTextStyle: {align: 'left', fontWeight: 'bold'},
                nameGap: 0,
                min:0,
                max:100,
                gridIndex: 0, 
            },
        ],
        series: series,
    };
    echart_opt.grid = [
        { left: '7%', top: '7%',  width: '80%', height: '50%' },
        { left: '7%', top: '65%', width: '80%', height: '20%' }
    ];
    echart_opt.xAxis[0].show = false;
    echart_opt.xAxis.push({
        name: 'Months',
        nameLocation: 'middle',
        nameGap: 25,
        data: mortalityData.index.map(x=>{return Math.round(x*100)/100;}),
        axisLabel: {interval:function(idx,val){
            if(val % 6 == 0){
                return true;
            }else{
                return false;
            }
        }},
        gridIndex: 1
    });
    echart_opt.yAxis.push({
        gridIndex:1, min:0,
        name: 'Mortality rate(%) / 10 days',
        nameLocation: 'end',
        nameTextStyle: {align: 'left', fontWeight: 'bold'},
        nameGap: 0,
    });

    myChart.setOption(echart_opt, true);
}

function getQueryVariable(variable)
{
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i=0;i<vars.length;i++) {
        var pair = vars[i].split("=");
        if(pair[0] == variable){return pair[1];}
    }
    return(false);
}

if(getQueryVariable('jobid')){
    jobid = getQueryVariable('jobid');
}

function setCookie(cname,cvalue,exdays,dbtype){
    var d = new Date();
    d.setTime(d.getTime()+(exdays*24*60*60*1000));
    var expires = "expires="+d.toGMTString();
    document.cookie = cname+"_"+dbtype+"="+JSON.stringify( cvalue  )+"; "+expires;
}

function getCookie(cname,dbtype){
    var name = cname+ "_" + dbtype + "=";
    var ca = document.cookie.split(';');
    for(var i=0; i<ca.length; i++) {
        var c = ca[i].trim();
        if (c.indexOf(name)==0) { 
            jsonstr = c.substring(name.length,c.length);
            if(jsonstr != ''){
                return JSON.parse(jsonstr);
            }
        }
    }
    return [];
}

function formatTimeStr(datastr){
    Date.prototype.pattern=function(fmt) {
        var o = {         
            "M+" : this.getMonth()+1,
            "d+" : this.getDate(),
            "h+" : this.getHours()%12 == 0 ? 12 : this.getHours()%12, 
            "H+" : this.getHours(), 
            "m+" : this.getMinutes(),
            "s+" : this.getSeconds(),
            "q+" : Math.floor((this.getMonth()+3)/3), 
            "S" : this.getMilliseconds() 
        };         
        var week = {         
            "0" : "/u65e5",         
            "1" : "/u4e00",         
            "2" : "/u4e8c",         
            "3" : "/u4e09",         
            "4" : "/u56db",         
            "5" : "/u4e94",         
            "6" : "/u516d"        
        };         
        if(/(y+)/.test(fmt)){         
            fmt=fmt.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length));         
        }         
        if(/(E+)/.test(fmt)){         
            fmt=fmt.replace(RegExp.$1, ((RegExp.$1.length>1) ? (RegExp.$1.length>2 ? "/u661f/u671f" : "/u5468") : "")+week[this.getDay()+""]);         
        }         
        for(var k in o){         
            if(new RegExp("("+ k +")").test(fmt)){         
                fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length)));         
            }         
        }         
        return fmt;         
    };
    date=new Date(datastr.replace('T',' ') + ' GMT+0000');
    return date.pattern("yyyy-MM-dd HH:mm:ss");
}

function loadSample(sample){
    if(sample.match('upload$')){
        $('#close_modal_fileinput').click();
    }else{
        $('#close_modal').click();
    }
    vueObj.expLoadState = 'loading';
    setTimeout(function() {
        vueObj.loadExp(sample);
    },1000);
}

$('#main').load('ts/predict.html', function(){
    mutgene     = JSON.parse($.ajax({async:false,type:"get",url:"https://www.adigger.cn:8002/pmht/getMutSelect/pre",datatype:'json',success:function(data){}}).responseText);
    var jobhis = [];
    app_main=Vue.createApp({
        data(){
            return {
                'datatype':
                {
                    label: 'Data Type',
                    select: data_type,
                    values: [
                        {'label':'Mutation', 'value': 'mut'}, 
                        {'label':'Gene Expression', 'value': 'exp'},
                        {'label':'Private Model', 'value':'pri'}
                    ],
                },
                'method': {},
                'mutgene': mutgene,
                'checkedVal': true,
                'Gender': 'Male',
                'Age': 60,
                'hideother': false,
                'mutgene_show': '',
                'nagene_show': '',
                'jobid': jobid,
                'job_start': '-',
                'job_end': '-',
                'job_state': '-',
                'predictTable': [{}],
                'submitState': true,
                'jobhis': jobhis,
                'overviewtext': '',
                'jobhisSum': {},
                'compare':[],
                'factor':{},
                'factordef':{},
                'expName': '',
                'databaseSample': databaseSample,
                'databaseSelect': 'All databases',
                'expLoadState': 'done',
                'expModify': {},
                'upload_expName': 'test',
                'upload_prefix': '',
                'upload_expName_id': '',
                'uploadPreview': '',
                'tips_offon': false,
                'demo_jobs': demo_jobs,
                'pri_id': '',
                'pri_input_val': '',
                'modelID': '',
            };
        },
        methods: {
            replace(obj='May be is loading?', aa, bb){
                return obj.replaceAll(aa,bb);
            },
            change_mutgene(e){
                n = e.target.name ;
                v = e.target.value;
                i = mutgene.map((x,i)=>{return [i,x.label]}).filter(x=>{return x[1]==n})[0][0];
                mutgene[i].select = v;
                this.mutgene_show = mutgene.filter(x=>{return x.select == 'present'}).map(x=>{return x.label }).join(", ");
                this.nagene_show = mutgene.filter(x=>{return x.select == 'N/A'}).map(x=>{return x.label }).join(", ");
                this.submitState=false;
            },
            subPredict(){
                mutmap = {'present':1, 'absense':0, 'N/A':-1};
                if(this.datatype.select == 'mut'){
                    data_inf = [
                        [
                            this.datatype.select, 
                            this.method.key,
                            this.Age
                        ].join('|'), 
                        ['Female', 'Male'].indexOf(this.Gender)
                    ].concat(mutgene.map(x=>{return mutmap[x.select]})).join();
                }else if(this.datatype.select == 'exp'){
                    data_inf = [
                        this.datatype.select,
                        this.method.key,
                        [
                            this.Age, 
                            this.expName,
                            Object.keys(this.expModify).map(x=>{return x+':'+this.expModify[x]})
                        ].join(',')
                    ].join('|');
                }else if(this.datatype.select == 'pri'){
                    data_inf = [
                        this.modelID, 
                        this.method.key,
                        this.pri_input_val
                    ].join('|');
                }
                url = "https://www.adigger.cn:8002/api/tools?key=" + key;
                data = {'history_id': history_Id, 'inputs':{ 'inf': data_inf }, 'tool_id':'aml_predict'};
                submit_res  = JSON.parse(
                    $.ajax(
                        {
                            async:false,
                            type:"post", 
                            url:url, 
                            data: JSON.stringify(data),
                            contentType: 'application/json',
                            datatype:'json',
                            success:function(data){}
                        }
                    ).responseText
                );
                jobid=submit_res.jobs[0].id;
                this.jobid = jobid;
                // this.intVar();
                jobhis = getCookie('jobhis', this.datatype.select);
                if(jobhis.indexOf(jobid) == -1){
                    jobhis.unshift(jobid);
                    jobhis=jobhis.slice(0,jobNum);
                    setCookie('jobhis', jobhis, 3, this.datatype.select);
                }
                this.jobhis = getCookie('jobhis', this.datatype.select);
            }, 
            updateRes(jobid){
                this.intVar();
                if(jobid == ''){
                    return;
                }
                if(jobid.match(',')){
                    this.compare = jobid.split(',');
                    return;
                }
                this.compare = [jobid];
                jobhis = getCookie('jobhis', this.datatype.select);
                if(jobhis.indexOf(jobid) == -1){
                    jobhis.unshift(jobid);
                    jobhis=jobhis.slice(0,jobNum);
                    setCookie('jobhis', jobhis, 3, this.datatype.select);
                }
                this.jobhis = getCookie('jobhis', this.datatype.select);
                this.jobid = jobid; 
                url = 'https://www.adigger.cn:8002/api/jobs/'+jobid+'?key=' + key;
                res = JSON.parse($.ajax({async:false,type:"get",url:url,datatype:'json',success:function(data){}}).responseText);
                if(res.state == 'ok'){
                    res.state = 'done';
                }
                this.job_start = formatTimeStr(res.create_time);
                this.job_state = res.state;
                this.job_end   = formatTimeStr(res.update_time);
                if(res.state == 'done'){
                    if(res.state == 'done' && res.exit_code > 0){
                        res.state = 'error';
                        this.job_state = 'error';
                        this.job_end   = formatTimeStr(res.update_time) + ' ( ' + this.job_state  + ' )';
                        // show error
                        var postResUrl = "https://www.adigger.cn:8002/api/datasets/" + res.outputs.postRes.id + "?key=e8c93c4c91a74db2de422efb512ddf1e";
                        _tmp = JSON.parse($.ajax({async:false,type:"get",url:postResUrl,datatype:'json',success:function(data){}}).responseText);
                        $('#res_svg').html("<pre>"+_tmp.misc_info+"</pre>");
                    }else{
                        this.job_end   = formatTimeStr(res.update_time) + ' ( ' + this.job_state  + ' )';
                        var postResUrl = "https://www.adigger.cn:8002/api/histories/" + history_Id + "/contents/" + res.outputs.postRes.id + "/display?key=e8c93c4c91a74db2de422efb512ddf1e";
                        _tmp = JSON.parse($.ajax({async:false,type:"get",url:postResUrl,datatype:'json',success:function(data){}}).responseText);
                        _tmp.columns = [jobid];
                        survivaldata = _tmp;
                        url = "https://www.adigger.cn:8002/api/histories/" + history_Id + "/contents/" + res.outputs.predict.id + "/display?key=e8c93c4c91a74db2de422efb512ddf1e";
                        res = JSON.parse($.ajax({async:false,type:"get",url:url,datatype:'json',success:function(data){}}).responseText).out;
                        this.predictTable = res;
                        this.updateHisSummary();
                        drawSurvival(survivaldata);
                    }
                }else{
                    setTimeout(()=>{this.updateRes(jobid);}, 5000);
                }
            },
            showCompare(jobids){
                this.predictTable = [];
                tmps = [];
                for(j in jobids.split(',')){
                    url = 'https://www.adigger.cn:8002/api/jobs/'+ jobids.split(',')[j] +'?key=' + key;
                    res = JSON.parse($.ajax({async:false,type:"get",url:url,datatype:'json',success:function(data){}}).responseText);
                    url = "https://www.adigger.cn:8002/api/histories/" + history_Id + "/contents/" + res.outputs.predict.id + "/display?key=e8c93c4c91a74db2de422efb512ddf1e";
                    res_table = JSON.parse($.ajax({async:false,type:"get",url:url,datatype:'json',success:function(data){}}).responseText).out;
                    this.predictTable.push(res_table[0]);
                    url = "https://www.adigger.cn:8002/api/histories/" + history_Id + "/contents/" + res.outputs.postRes.id + "/display?key=e8c93c4c91a74db2de422efb512ddf1e";
                    res = JSON.parse($.ajax({async:false,type:"get",url:url,datatype:'json',success:function(data){}}).responseText);
                    tmps.push(res);
                    jobhis = getCookie('jobhis', this.datatype.select);
                    if(jobhis.indexOf(jobids.split(',')[j]) == -1){
                        jobhis.unshift(jobids.split(',')[j]);
                        jobhis=jobhis.slice(0,jobNum);
                        setCookie('jobhis', jobhis, 3, this.datatype.select);
                    }
                    this.jobhis = getCookie('jobhis', this.datatype.select);
                }
                var data = {'columns': jobids.split(','), 'index': tmps[0].index, 'data': tmps[0].data.map((x,i)=>{return tmps.map(y=>{return y.data[i][0]})})};
                this.job_state = 'done';
                survivaldata = data;
                drawSurvival(survivaldata);
                this.updateHisSummary();
            },
            intVar(){
                this.job_start = '-';
                this.job_end = '-';
                this.job_state = '-';
                this.predictTable = [{}];
                this.submitState = true;
                this.compare = [];
                this.updateHisSummary();
                $('#res_svg').html('');
                if(this.datatype.select == 'exp'){
                    this.expinit();
                }
            },
            getCookie(id, dbtype){
                return getCookie(id, dbtype);
            },
            removeJobhis(id){
                var jobhis =  getCookie('jobhis', this.datatype.select);
                jobhis = jobhis.filter(x=>{return x!=id});
                setCookie('jobhis', jobhis, 3, this.datatype.select);
                this.compare = this.compare.filter((x)=>{ x != id})
                this.jobhis = getCookie('jobhis', this.datatype.select);
            },
            demo(){
                if(this.datatype.select=='mut' || this.datatype.select=='exp'){
                    var jobhis = uniqueArr(this.jobhis.concat(demo_jobs[this.datatype.select].jobhis));
                    setCookie('jobhis', jobhis, 3, this.datatype.select);
                    this.jobhis = getCookie('jobhis', this.datatype.select);
                    this.jobid = demo_jobs[this.datatype.select].jobid;
                }
            },
            demoVS(){
                if(this.datatype.select=='mut' || this.datatype.select=='exp'){
                    var jobhis = uniqueArr(this.jobhis.concat(demo_jobs[this.datatype.select].jobhis));
                    setCookie('jobhis', jobhis, 3, this.datatype.select);
                    this.jobhis = getCookie('jobhis', this.datatype.select);
                    this.jobid = demo_jobs[this.datatype.select].compare;
                }
            },
            updateHisSummary(){
                for(var i in this.jobhis){
                    if(!(this.jobhis[i] in this.jobhisSum)){
                        url = 'https://www.adigger.cn:8002/api/jobs/'+this.jobhis[i]+'?key=' + key;
                        res = JSON.parse($.ajax({async:false,type:"get",url:url,datatype:'json',success:function(data){}}).responseText);
                        url = "https://www.adigger.cn:8002/api/histories/" + history_Id + "/contents/" + res.outputs.workinfo.id + "/display?key=e8c93c4c91a74db2de422efb512ddf1e";
                        $.ajax({
                            async:false,type:"get",url:url,datatype:'json',
                            success: (data)=>{
                                if(data == ''){
                                }else{
                                    res = JSON.parse(data);
                                    var inputSum = '...';
                                    if('inputSum' in res){
                                        inputSum = res.inputSum;
                                        if(inputSum.split('/').length>=3){
                                            inputSum = inputSum.split('/').slice(0,2).concat(inputSum.split('/').slice(2,).map((x)=>{return x.replace(/\:(\d)/, ':+$1')})).join('/');
                                        }
                                    }
                                    this.jobhisSum[this.jobhis[i]] = inputSum;
                                }
                            }
                        });
                    }
                }
                jobhisSum = this.jobhisSum;
            },
            setCompare(x){
                this.compare.push(x);
            },
            checkCompare(x){
                if(this.compare.indexOf(x) == -1){
                    this.compare.push(x);
                }else{
                    this.compare = this.compare.filter(xx=>{return xx!=x})
                }
            },
            setSlider(x,y){
                $('input[tag="'+x+'"]').slider('setValue', y);
                this.factor[x] = y;
                this.fetchModify();
            },
            loadExp(input){
                if(input != ''){
                    this.expName = input;
                    this.expLoadState = 'loading';
                    var factor_showlist = JSON.parse($.ajax({async:false,type:"get",url:"https://www.adigger.cn:8002/pmht/getExpSelect/default",datatype:'json',success:function(data){}}).responseText);
                    var factor_load = JSON.parse($.ajax({async:false,type:"get",url:"https://www.adigger.cn:8002/pmht/getExpSelect/"+input,datatype:'json',success:function(data){}}).responseText);
                    for (var key in factor_showlist) {
                        this.factordef[key] = Math.round(factor_load[key]*10)/10;
                        this.factor[key]    = Math.round(factor_load[key]*10)/10;
                    }
                    this.expModify={};
                }else{
                }
                var that = this;
                if(Object.keys(this.factor).indexOf('cli_age') > -1 ){
                    this.Age = this.factor.cli_age;
                }
                this.$nextTick(function(){
                    $('.sliders .sliderinput').slider();
                    $('.sliders .sliderinput').on("slideStop", function(slideEvt){
                        that.factor[$(this).attr('tag')] = slideEvt.value;
                        that.fetchModify();
                    });
                    $('.slidershow').on("input",function(){
                        $(this).parent().children('.sliderbar').children('input').slider('setValue', $(this).val());
                        that.fetchModify();
                    });
                    $('.slidershow').each(function(){
                        $(this).parent().children('.sliderbar').children('input').slider('setValue', $(this).val());
                    })
                    this.expLoadState = 'loaded';
                }); 
            },
            expinit(){
                // vueObj = this;
                this.loadExp('');
                this.$nextTick(function(){
                    $('[data-trigger="hover"]').popover();
                    $('#myModal').on('shown.bs.modal', function () {
                        $('#table').bootstrapTable(
                            {
                                columns:[
                                    {
                                        field: 'sampleID',
                                        formatter:function(value, row, index){
                                            return value+"&nbsp;<button class='btn btn-info btn-sm' onclick='loadSample(\""+value+"\")'>Load <span class='glyphicon glyphicon-save'></span></button>";
                                        }
                                    },
                                ],
                                showFooter: false,
                                onPostBody: function (data) {
                                    $('#totalrows').html($('#table').bootstrapTable('getOptions').totalRows + ' samples');
                                }
                            }
                        );
                    });
                    $('#uploadModal').off('shown.bs.modal').on('shown.bs.modal', function () {
                        $("#input-id").fileinput({
                            uploadUrl: 'https://www.adigger.cn:8002/pmht/postFile_predict',
                            showCaption: false,
                            showBrowse: false,
                            showPreview: true,
                            showUpload: false,
                            showCancel: false,
                            browseOnZoneClick: true,
                            showAjaxErrorDetails: false,
                            maxFileCount: 1,
                            autoReplace: true,
                            showUploadedThumbs: true,
                            uploadExtraData: function(previewId, index) {
                                var obj = {};
                                obj.expName = vueObj.upload_expName;
                                return obj;
                            },
                        });
                        $("#input-id").on("filebatchselected", function(event, files) {
                            lastinput = $("#input-id").fileinput("upload");
                        });
                        $("#input-id").on("fileuploaded", function(event,data){
                            $('.file-preview-thumbnails').children().last().prevAll().remove();
                            vueObj.upload_expName_id = data.response.id;
                            if (data.response.message != ''){
                                vueObj.uploadPreview = data.response.message;
                                if(removeFuncLoad == 0){
                                    $('#uploadModal').on('click', '.kv-file-remove', ()=>{clearUpload();});
                                    $('#uploadModal').on('click', '.fileinput-remove', ()=>{clearUpload();});
                                    removeFuncLoad = 1;
                                }
                            }
                        });
                        $('#input-id').on('fileuploaderror',function(event, data, msg){
                            vueObj.upload_expName_id = '';
                            $('.file-preview-thumbnails').children().last().prevAll().remove();
                            clearUpload();
                        });
                        $('.upload_tips').popover(opt).popover('show');
                        $('.popover').on('click', function(){$(this).prev().popover('hide');})
                    });
                });
            },
            fetchModify(){
                var modify = {};
                for(x in Object.keys(this.factor)){
                    kk = Object.keys(this.factor)[x];
                    if(this.factor[kk] != this.factordef[kk]){
                        modify[kk.replace(/^exp_/,'')] = Math.round(this.factor[kk]*10 - this.factordef[kk]*10)/10;
                    }
                }
                this.expModify = modify;
            },
        },
        mounted(){
            vueObj = this;
            if(this.datatype.select == 'exp'){
                this.expinit();
                this.loadExp('none');
            }
            this.jobhis = getCookie('jobhis', this.datatype.select)
            // this.demoVS();
            pri_init();

            method    = JSON.parse($.ajax({async:false,type:"get",url:"https://www.adigger.cn:8002/pmht/getSelect/"+ this.datatype.select,datatype:'json',success:function(data){}}).responseText);
            if(typeof(method.info.select) != 'undefined'){
                vueObj.method = method.info.select.filter((x)=>{return x.key=='Autogluon'})[0]
            }else{
                vueObj.method = {};
            }
        },
        watch:{
            'datatype.select':{
                handler: function(val, oldVal){
                    console.log('datatype changed !!!');
                    this.submitState = false;
                    if(val == 'exp'){
                        this.expinit();
                        this.loadExp('none');
                    }
                    vueObj.tips_offon = false;
                    vueObj.jobhis = getCookie('jobhis', vueObj.datatype.select);
                    vueObj.compare = [];
                    vueObj.jobid = '';
                    this.$nextTick(function(){
                        if(val == 'pri'){
                            pri_init();
                        }
                    });
                    method    = JSON.parse($.ajax({async:false,type:"get",url:"https://www.adigger.cn:8002/pmht/getSelect/"+val,datatype:'json',success:function(data){}}).responseText);
                    if(typeof(method.info.select) != 'undefined'){
                        vueObj.method = method.info.select.filter((x)=>{return x.key=='Autogluon'})[0]
                    }else{
                        vueObj.method = {};
                    }
                },
            },
            'Gender':{
                handler: function(val, oldVal){
                    this.submitState = false;
                },
            },
            'Age':{
                handler: function(val, oldVal){
                    if(val != 60){
                        this.submitState = false;
                    }
                },
            },
            'compare':{
                handler: function(){
                    if(this.compare.length == 2){
                        this.jobid = this.compare.join(',');
                        this.showCompare(this.jobid);
                    }else if(this.compare.length <= 1){
                        this.jobid = this.compare.join(',');
                    }
                },
                deep: true
            }, 
            'jobid':{
                handler: function(){
                    if(this.jobid.match(/\s/)){
                        this.jobid = this.jobid.replace(/\s/g,'');
                    }
                    if(this.jobid.match(/,$/)){
                        this.jobid = this.jobid.replace(/,$/,'');
                    }
                    if(this.jobid != '' & (this.jobid.length==16 | this.jobid.length==33)){
                        this.updateRes(this.jobid);
                    }else{
                        this.intVar();
                    }
                },
            },
            'jobhis':{
                handler: function(){
                    $('[data-trigger="hover"]').popover();
                },
                deep: true
            },
            'tips_offon':{
                handler: function(val){
                    if(val){
                        $('.tip_step').popover(opt).popover('show');
                        $('.popover').on('click', function(){$(this).prev().popover('hide');})
                    }else{
                        $('.tip_step').popover(opt).popover('hide');
                    }
                },
            },
            'pri_id':{
                handler: function(val){
                    if(val.match(/^\w{16}$/)){
                        updatePriModel(val);
                    }
                },
            },
        },
    });
    app_main.mount('#main').updateRes(jobid);
    $('.ready_tips').popover(opt).popover('show');
    $('.ready_tips').next().addClass("ready_tips_bub");
    $('.ready_tips').on('click',function(){$(this).popover(opt).popover('hide');});

    setTimeout(()=>{
	    $('.ready_tips_bub').fadeOut(1000);
    },3000);
    $('.panel').on("mouseover", function(){$(this).css('border-color','#BBB')});
    $('.panel').on("mouseout", function(){$(this).css('border-color','#DDD')});
});

$('.sliders input').slider();

