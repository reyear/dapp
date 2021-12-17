var vueObj;
var demo_id = '82361638dabe9229';

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

function fileinput_init(obj){
    obj.fileinput({
        showPreview: false,
        showUpload: false,
        uploadUrl: 'http://10.1.13.100:8002/pmht/postFile',
    });
    obj.on("filebatchselected", function(event, files) {
        obj.fileinput("upload");
    });
    obj.on("fileuploaded", function(event,data){
        if(data.response.message == 'success'){
            vueObj.modeldata_input_val = data.response.id;
        }else{
            vueObj.modeldata_input_val = '';
            obj.fileinput('reset');
        }
    });
}

function checkNum(input, mod){
    var patt = /^\d+(\.\d+){0,1}$/;
    if(mod == 'part'){
        patt = /^[\d\.]+$/;
    }
    return patt.test(input);
}


$('#main').load('ts/train.html',function(){
    app_main=Vue.createApp({
        data(){
            return {
                jobid: '',
                cutoff_month: 36,
                modeldata_input_val: '',
                modelRes: {},
                demo_id: demo_id,
            }
        },
        methods:{
            checkNum(input, mod){
                if(!checkNum(input, mod)){
                    this.cutoff_month = '';
                }
            },
            submitModel(){
                url = "http://10.1.13.100:8002/api/tools?key=" + key;
                data_inf = this.modeldata_input_val+"|Autogluon|" + this.cutoff_month;
                data = {'history_id': history_Id, 'inputs':{ 'inf': data_inf }, 'tool_id':'aml_model'};
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
                this.jobid = submit_res.jobs[0].id;
                this.updateModelRes(this.jobid);
            },
            updateModelRes(jobid){
                if(jobid!=''){
                    url = 'http://10.1.13.100:8002/api/jobs/'+jobid+'?key=' + key;
                    res = JSON.parse($.ajax({async:false,type:"get",url:url,datatype:'json',success:function(data){}}).responseText);
                    if(res.state == 'ok'){
                        res.state = 'done';
                    }else if(res.state == 'new'){
                        res.state = 'submitted';
                    }
                    
                    this.modelRes.state = res.state;
                    this.modelRes.start = formatTimeStr(res.create_time);
                    this.modelRes.end   = formatTimeStr(res.update_time);
                    if(res.state == 'done'){
                        console.log(res);
                        this.showModelRes(jobid);
                    }else{
                        console.log(res);
                        setTimeout(()=>{this.updateModelRes(jobid);}, 5000);
                    }
                }
            },
            showModelRes(jobid){
                this.jobid = jobid;
                url = 'http://10.1.13.100:8002/api/jobs/'+jobid+'?key=' + key;
                res = JSON.parse($.ajax({async:false,type:"get",url:url,datatype:'json',success:function(data){}}).responseText);
                if(
                    typeof res != 'undefined' & 
                    typeof res.outputs.input != 'undefined' &
                    typeof res.outputs.input.id != 'undefined'
                ){
                    inputZip_url = 'http://10.1.13.100:8002/api/histories/'+ history_Id + '/contents/' + res.outputs.input.id +'/display?key=' + key;
                    this.modelRes.inputZip = inputZip_url;
                }else{
                    this.modelRes.inputZip = "#not_avaliable";
                }
                // 
                if(
                    typeof res != 'undefined' & 
                    typeof res.outputs.workinfo != 'undefined' &
                    typeof res.outputs.workinfo.id != 'undefined'
                ){
                    wf_url = 'http://10.1.13.100:8002/api/histories/'+ history_Id + '/contents/' + res.outputs.workinfo.id +'/display?key=' + key;
                    rres = JSON.parse($.ajax({async:false,type:"get",url:wf_url,datatype:'json',success:function(data){}}).responseText);
                    console.log(rres);
                    if(typeof rres.out == 'object'){
                        rres.out.map(x=>{
                            if(x.Parameters == 'Clinical Factor' | x.Parameters == 'Mutation Factor'){
                                _count = x.Values.split(':')[0];
                                _list = x.Values.split(':')[1];
                                console.log(_list);
                                this.modelRes[x.Parameters] = _list.split(',').map(x=>{return x.replace(/^exp_|cli_|mut_/,'')}).join(', ');
                            }else{
                                this.modelRes[x.Parameters] = x.Values;
                            }
                        });
                    }
                }
                if(
                    typeof res != 'undefined' & 
                    typeof res.outputs.pic != 'undefined' &
                    typeof res.outputs.pic.id != 'undefined'
                ){
                    var _url = 'http://10.1.13.100:8002/api/histories/'+ history_Id + '/contents/' + res.outputs.pic.id +'/display?key=' + key;
                    $('#modelRessvg').load(_url, function(){
                        if(typeof $("#modelRessvg svg").attr("width") != 'undefined'){
                            $("#modelRessvg svg").removeAttr("width");
                        }
                        if(typeof $("#modelRessvg svg").attr("height") != 'undefined'){
                            $("#modelRessvg svg").removeAttr("height");
                        }
                        $('#modelRessvg svg').css('width', '100%');
                        $('#modelRessvg svg').css('max-width', '500px');
                    });
                }
                // {"out": [{"Model evaluation": "Model Type", "Value": "Autogluon"}, {"Model evaluation": "Cutoff Month", "Value": "36Month"}, {"Model evaluation": "AUC", "Value": "0.762"}, {"Model evaluation": "Accuracy", "Value": "0.694"}, {"Model evaluation": "Precision", "Value": "0.731"}, {"Model evaluation": "Recall", "Value": "0.76"}, {"Model evaluation": "F1 Score", "Value": "0.744"}, {"Model evaluation": "Kappa", "Value": "0.363"}], "title": [{"text": "Model evaluation", "value": "Model evaluation"}, {"text": "Value", "value": "Value"}]}
                if(
                    typeof res != 'undefined' & 
                    typeof res.outputs.predict != 'undefined' &
                    typeof res.outputs.predict.id != 'undefined'
                ){
                    var _url = 'http://10.1.13.100:8002/api/histories/'+ history_Id + '/contents/' + res.outputs.predict.id +'/display?key=' + key;
                    var rres = JSON.parse($.ajax({async:false,type:"get",url:_url,datatype:'json',success:function(data){}}).responseText);
                    if(typeof rres.out != 'undefined'){
                        this.modelRes.predict = {};
                        rres.out.map(x=>{
                            if(x['Model evaluation'] != "Model Type" & x['Model evaluation'] != "Cutoff Month" ){
                                this.modelRes.predict[x['Model evaluation']] = x['Value']
                            }
                        })
                    }
                }
            },
            demo(){
                this.jobid = demo_id;
                this.updateModelRes(demo_id);
            }
        },
        mounted(){
            fileinput_init($('#modeldata_input'));
            vueObj = this;
        },
        watch:{
        }
    });
    app_main.mount('#main');
    $('.panel').on("mouseover", function(){$(this).css('border-color','#BBB')});
    $('.panel').on("mouseout", function(){$(this).css('border-color','#DDD')});
});

