var Scene = (function(Layer, Materials, Canvas){

	function Offset(argX, argY){
		this.x = argX;
		this.y = argY;
	}

	var View = (function(){
		var View = function(xArg, yArg, widthArg, heightArg){
			this.Offset = new Offset(xArg, yArg);
			this.width = widthArg;
			this.height = heightArg;
			this.zoomLevel = 1;
		};

		View.prototype = {
			constructor: View,
			x: function(newX){
				if(typeof newX === 'undefined'){
					return this.Offset.x;
				} else {
					this.Offset.x += newX;
				}
			},
			y: function(newY){
				if(typeof newY === 'undefined'){
					return this.Offset.y;
				} else {
					this.Offset.y += newY;
				}
			},
			zoom: function(newZoom){
				if(typeof newZoom === 'undefined'){
					return this.zoomLevel;
				} else {
					varZoomIncrement = (1/10) * newZoom;
					this.zoomLevel += varZoomIncrement;
					//this.x(-this.x()/25*varZoomIncrement);
					//this.y(-this.x()/25*varZoomIncrement);
					if(this.zoomLevel === 0){
						if(newZoom > 0){	// prevent divide by zero, its a good thing
							this.zoomLevel = (1/100);
						} else {
							this.zoomLevel = -(1/100);
						}
					}
				}
			}
		}

		return View;

	})(Offset);

	var Scene = function(map, argSize) {
		this.initialize(map, argSize);
	};

	Scene.prototype = {

		constructor: Scene,

		reloadMap: function(){
			viewBackup = this.view;
			this.initialize(this.map, this.blocksize);
			this.view = viewBackup;
		},
		initialize: function(map, argSize){
			this.map = 				map;
			this.blocksize = 		argSize;

			this.defaultMapElement = 'Clipping';

			this.view = new View( 0, 0, CanvasTag.offsetWidth, CanvasTag.offsetHeight );

			this.Parallax = 	[];
			this.Background = 	[];
			this.Main = 		[];
			this.Character = 	[];
			this.Npc = 			[];
			this.Foreground = 	[];
			this.Clipping = 	[];

			this.layersObject = {
				Parallax: 		this.Parallax,
				Background: 	this.Background,
				Main: 			this.Main,
				Character:  	this.Character,
				Npc: 			this.Npc,
				Foreground: 	this.Foreground,
				Clipping: 		this.Clipping
			};

			this.performance = {
				graphics: performance.now(),
				drawCorrect: 1,
				drawFps: 60
			};

			this.debugging = {
				active: true,
				guides: true
			}

			this.mapGen();
		},

		addLayer: function(newLayer, destination){
			if(this.layersObject[destination] instanceof Array){
				this.layersObject[destination][this.layersObject[destination].length] = newLayer;
				this.sortLayers();
			}
		},

		getLayer: function(layer, arrayPos) {
			if(typeof arrayPos === 'undefined'){
				return this.layersObject[layer];
			} else {
				return this.layersObject[layer][arrayPos];
			}
			
		},

		sublayerCount: function(argType){
			return this.layersObject[argType].length;
		},

		eachLayer: function(funcToCall, flags, args){
			var defaults = {
				includeNpcs: true,
				includeCharacter: true
			};

			var options = {};

			if(typeof flags !== 'undefined'){
				options.includeNpcs = flags.includeNpcs;
				options.includeCharacter = flags.includeCharacter;
			} else {
				options = defaults;
			}

			for (var i = 0, len = this.layersArray.length; i < len; i++){
				// execute if we're on char layer and including chars, 
				// OR we're on npc layer and including npcs
				// OR we're not on the npc layer and not on the char later at all (what a mouthful)
				if(    ( options.includeCharacters && this.layersArray[i] === this.layersObject['character'] )
					|| ( options.includeNpcs 		 && this.layersArray[i] === this.layersObject['npc'] )
					|| ( this.layersArray[i] !== this.layersObject['character'] && this.layersArray[i] !== this.layersObject['npc'] ) ){

					if(this.layersArray[i] instanceof Array){
						// if the element is an array of layers instead of a single layer, iterate through
						for(var k = 0, len2 = this.layersArray[i].length; k < len2; k++){
							funcToCall.call(this.layersArray[i][k], args);
						}
					} else if( this.layersArray[i] !== null ){
						// otherwise deal with single layer
						funcToCall.call(this.layersArray[i], args);
					}
				}
			}

			// Now is the time to go back through and process which tile connections and blocking optimizations must be made
		},

		addNpc: function(newNpc){
			this.Npc[this.Npc.length] = newNpc;
		},

		getNpc: function(arrayPos){
			return this.Npc[arrayPos];
		},

		eachNpc: function(funcToCall){
			for (var i = 0, len = this.layersObject['npc'].length; i < len; i++){
				funcToCall.call(npc[i]);
			}
		},

		draw: function(){
			that = this;

			Canvas.fillStyle = "#7ADAE1";
			Canvas.fillRect(0, 0, 1000, 600);

			var drawDelta = performance.now()-this.performance.graphics;
			this.performance.graphics = performance.now(); 
			this.performance.drawFps = this.performance.drawFps * (49/50) + (1000/drawDelta) * (1/50);
			if(this.performance.drawFps > 1000) this.performance.drawFps = 60; // sanity check (check for infinity)

			this.eachLayer(function(drawView){
				this.draw(drawView);
			}, undefined, this.view);

			

			if(this.debugging.guides){
				Canvas.beginPath();

				Canvas.moveTo(
					0 + this.view.Offset.x, 
					0 + this.view.Offset.y
				);

				Canvas.lineTo(
					800, 
					0 + this.view.Offset.y
				);

				Canvas.moveTo(
					0 + this.view.Offset.x, 
					0 + this.view.Offset.y
				);

				Canvas.lineTo(
					0 + this.view.Offset.x, 
					600
				);
			}

			Canvas.stroke();
			
			Canvas.fillStyle = "#000000";
			Canvas.font = "20px Calibri";
			Canvas.fillText(Math.round(this.performance.drawFps), 750, 25);
		},

		// player: function(newCharacter){
		// 	if(typeof newCharacter === 'undefined'){
		// 		return this.layersObject['Character'];
		// 	} else {
		// 		this.layersObject['Character'] = newCharacter;
		// 	}
		// },

		getLayersObject: function(){
			return this.layersObject;
		},

		getLayersArray: function(){
			return this.layersArray;
		},

		getBlocksize: function(){
			return this.blocksize;
		},

		sortLayers: function(){
			for(var i = 0, len = this.layersArray.length; i < len; i++){
				this.layersArray[i].sort(function(layer1, layer2){
		   			return layer1.priority() > layer2.priority();
		   		});
			}
		},
		mapGen: function(){
			console.log("Logging map-file to scene conversion time...");
			var conversionTime = performance.now();

			this.layersArray = [ this.Parallax, this.Background, this.Main, this.Character, this.Npc, this.Foreground, this.Clipping ];

			var mapArray; // individual array for each layer
			var clippingArray = []; // one array for whole map

			for(var currLayer = 0; currLayer < map.length; currLayer++){
				
				mapArray = [];

				console.log("Adding new layer '" + map[currLayer].layer + "' with priority " + map[currLayer].priority);
				var newLayer = new Layer(map[currLayer].priority, map[currLayer].layer, this.blocksize);

				for(var eCount = 0; eCount < map[currLayer].elements.length; eCount++){

					var tempE = map[currLayer].elements[eCount];
					var newType, newWidth, newHeight;

					newType = 	(typeof tempE.type   !== 'undefined') ? tempE.type 	  : this.defaultMapElement;
					newWidth = 	(typeof tempE.width  !== 'undefined') ? tempE.width   : this.blocksize;
					newHeight = (typeof tempE.height !== 'undefined') ? tempE.height  : this.blocksize;

					var newTile = new Materials.createTile(newType, tempE.x, tempE.y, this.blocksize, this.blocksize);

					if ( newTile.clips() ){
						if( ! (clippingArray[ tempE.x ] instanceof Array) ){
							clippingArray[ tempE.x ] = [];
						}
						clippingArray[ tempE.x ][ tempE.y ] = new Materials.createTile("Clipping", tempE.x, tempE.y, this.blocksize, this.blocksize);
					}

					if( ! (mapArray[ tempE.x ] instanceof Array) ){
						mapArray[ tempE.x ] = [];
					}

					mapArray[ tempE.x ][ tempE.y ] = newTile;

				}

				for( var x = 0; x < mapArray.length; x++){
					if( mapArray[ x ] !== undefined ){
						for( var y = 0; y < mapArray[ x ].length; y++){
							if( mapArray[ x ][ y ] !== undefined){
								var mapTile = mapArray[ x ][ y ];
								if( mapArray[ mapTile.xTile() ][ mapTile.yTile() + 1 ] !== undefined 
									&& mapArray[ mapTile.xTile() ][ mapTile.yTile() + 1 ].type === mapTile.type ){
									mapTile.score(8);
								} 

								if( mapArray[ mapTile.xTile() - 1 ] !== undefined 
									&& mapArray[ mapTile.xTile() - 1 ][ mapTile.yTile() ] !== undefined 
									&& mapArray[ mapTile.xTile() - 1 ][ mapTile.yTile() ].type === mapTile.type ){
									mapTile.score(2);
								} 

								if( mapArray[ mapTile.xTile() ][ mapTile.yTile() - 1 ] !== undefined 
									&& mapArray[ mapTile.xTile() ][ mapTile.yTile() - 1 ].type === mapTile.type ){
									mapTile.score(1);
								} 
								
								if( mapArray[ mapTile.xTile() + 1 ] !== undefined 
									&& mapArray[ mapTile.xTile() + 1 ][ mapTile.yTile() ] !== undefined 
									&& mapArray[ mapTile.xTile() + 1 ][ mapTile.yTile() ].type === mapTile.type ){
									mapTile.score(4);
								}

								mapTile.setImage( mapTile.tileset.get( mapTile.score() ) );
								newLayer.add( mapTile );
							}
						}

					}
					
				}

				this.addLayer(newLayer, map[currLayer].layer);

			}

			// time to optimize the clipping layer, which resides in clippingArray;

			for( var x = 0; x < clippingArray.length; x++){
				if( clippingArray[ x ] !== undefined ){
					for( var y = 0; y < clippingArray[ x ].length; y++){
						if( clippingArray[ x ][ y ] !== undefined){
							var clipTile = clippingArray[ x ][ y ];
							if( typeof clipTile.type !== 'undefined'){
								var newX = x + Math.floor(clipTile.w() / this.blocksize);
								if(    clippingArray[ newX ] !== undefined 
									&& clippingArray[ newX ][ y ] !== undefined 
									&& clippingArray[ newX ][ y ].type === clipTile.type ){

									clipTile.w( clipTile.w() + clippingArray[ newX ][ y ].w() );
									clippingArray[ newX ][ y ] = undefined;
									y--;

								}
							}
						}
					}
				}
			}

			for( var x = 0; x < clippingArray.length; x++){
				if( clippingArray[ x ] !== undefined ){
					for( var y = 0; y < clippingArray[ x ].length; y++){
						if( clippingArray[ x ][ y ] !== undefined){
							var clipTile = clippingArray[ x ][ y ];
							if( typeof clipTile.type !== 'undefined'){
								var newY = y + Math.floor(clipTile.h() / this.blocksize);
								if(    clippingArray[ x ] !== undefined 
									&& clippingArray[ x ][ newY ] !== undefined 
									&& clippingArray[ x ][ newY ].type === clipTile.type
									&& clippingArray[ x ][ newY ].w() === clipTile.w() ){

									clipTile.h( clipTile.h() + clippingArray[ x ][ newY ].h() );
									clippingArray[ x ][ newY ] = undefined;
									y--;

								}
							}
						}
					}
				}
			}

			var clippingLayer = new Layer(0, "Clipping", this.blocksize);

			for( var x = 0; x < clippingArray.length; x++){
				if( clippingArray[ x ] !== undefined ){
					for( var y = 0; y < clippingArray[ x ].length; y++){
						if( clippingArray[ x ][ y ] !== undefined){
							var clipTile = clippingArray[ x ][ y ];
							clippingLayer.add(clipTile);
						}
					}
				}
			}

			this.addLayer(clippingLayer, "Clipping");

			this.addLayer(new Layer(0, "Character", this.blocksize), "Character");

			conversionTime = performance.now() - conversionTime;

			console.log("Map generation took " + conversionTime.toFixed(3) + "ms.");
		},
		mapify: function(){
			var newMap = [];
			var conversionTime = performance.now();

			this.eachLayer(function(){
				if(this.getType() === "Clipping") return;
				var elementsList = [];

				this.eachTile(function(){
					elementsList[elementsList.length] = {
						type: this.getType(),
						x: this.xTile(),
						y: this.yTile()
					}
				});

				newMap[newMap.length] = {
					layer: this.getType(),
					priority: this.priority(),
					elements: elementsList
				}

			});

			conversionTime = performance.now() - conversionTime;

			console.log("Mapify took " + conversionTime.toFixed(3) + "ms.");

			return newMap;
		},
		mapString: function(){
			return "map = " + JSON.stringify(this.mapify()) + ";";
		}

	};

	return Scene;

})(Layer, Materials, Canvas);