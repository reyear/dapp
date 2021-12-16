$('#main').load('ts/home.html', function(){
    $('.panel').on("mouseover", function(){$(this).css('border-color','#BBB')});
    $('.panel').on("mouseout", function(){$(this).css('border-color','#DDD')});

	$('img#workflow').maphilight({
		fillColor:'00FF00',
		strokeColor: '999999',
		fillOpacity: 0,
		alwaysOn: true,
	});
	$('#workflow_map area').on('mouseenter',function(){
		$('img#workflow').maphilight({
			fillColor:'00FFFF',
			strokeColor: '999999',
			fillOpacity: 0.1,
		});
	});
	$('#workflow_map area').on('mouseout',function(){
		$('img#workflow').maphilight({
			fillColor:'0000FF',
			strokeColor: '999999',
			fillOpacity: 0,
			alwaysOn: true,
		});
	});
    $('#workflow_map area').popover();
    $('.areaClass').hover(function(){areaPopover($(this));});
});
