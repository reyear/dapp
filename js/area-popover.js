var getMapAreaBox = function (area) {
    // parse
    var ret = { left: 0, top: 0, width: 0, height: 0 };
    // console.log(area);
    var shape = area.attr('shape').toLowerCase(), coords = area.attr('coords').split(',');
    for (var len = coords.length, i = 0; i < len; i++) { coords[i] = parseInt(coords[i], 10); }
    // generate
    if (shape === 'rect' || shape === 'rectangle') {
        ret.left = Math.min(coords[0], coords[2]);
        ret.top = Math.min(coords[1], coords[3]);
        ret.width = Math.abs(coords[2] - coords[0]);
        ret.height = Math.abs(coords[3] - coords[1]);
    } else if (shape === 'circ' || shape === 'circle') {
        var radius = coords[2], x = coords[0], y = coords[1];
        ret.left = (x - radius);
        ret.top = (y - radius);
        ret.width = (radius * 2);
        ret.height = (radius * 2);
    } else if (shape === 'poly' || shape === 'polygon') {
        var x = [], y = [];
        for (var len = coords.length, i = 0; i < len; i++) {
            if (i % 2 === 0) {
                x.push(coords[i]);
            } else {
                y.push(coords[i]);
            }
        }
        ret.left = Math.min.apply(null, x);
        ret.top = Math.min.apply(null, y);
        ret.width = Math.max.apply(null, x) - ret.left;
        ret.height = Math.max.apply(null, y) - ret.top;
    }
    // fix
    var map = area.closest('map');
    if (map.length > 0) {
        var img = $('img[usemap~="#' + map.attr('name') + '"]');
        if (img.length === 0) { img = $('img[usemap~="#' + map.attr('id') + '"]'); }
        var pos = img.offset();
        if (pos) {
            ret.top += pos.top;
            ret.left += pos.left;
        }
    }
    // ret
    return ret;
};
var areaPopover = function(areabox){
    var place = areabox.attr('data-placement')
    var box=getMapAreaBox(areabox);
    console.log(box);
    console.log(place);
    switch(place){
        case 'top':
            var boxX=box.left+box.width/2-$('.popover').width()/2;
            var boxY=box.top-$('.popover').height()-14;
            $('.popover').offset({top:boxY,left:boxX});
            break;
        case 'left':
            var boxX=box.left-$('.popover').width()-15;
            var boxY=box.top+box.height/2-$('.popover').height()/2;
            $('.popover').offset({top:boxY,left:boxX});
            break;
        case 'bottom':
            var boxX=box.left+box.width/2-$('.popover').width()/2;
            var boxY=box.top+box.height+11;
            $('.popover').offset({top:boxY,left:boxX});
            break;
        case 'right':
            var boxX=box.left+box.width+11;
            var boxY=box.top+box.height/2-$('.popover').height()/2;
            $('.popover').offset({top:boxY,left:boxX});
            break;
    };
};
