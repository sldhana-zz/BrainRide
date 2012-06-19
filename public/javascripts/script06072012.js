var BrainRide = {
	Views : {},
	Routes : {},
	Collections : {},
	Models : {},
	Utilities : {},
	application : null,
	player : null,
	library : null,
	searcher : null,

	init : function() {
		this.application = new BrainRide.Routes.Application();
		Backbone.history.start();
	}
}

BrainRide.Views.Header = Backbone.View.extend({
	id : 'content',
	_template : _.template($('#searchTemplate').html()),

	render : function() {
		$(this.el).html(this._template);
		return this;
	},

	events : {
		'click #termSearch' : 'getSearchTerm',
		'click #search' : 'showSearch',
		'click #previousResults' : 'paginatePrevious',
		'click #nextResults' : 'paginateNext',
		'click #myCards' : 'getSavedCards'
	},

	getSearchTerm : function(e) {
		var searchTerm = $('#term').val();
		if(searchTerm) {
			this.currentSearchTerm = searchTerm;
			//store current search term so we don't have to get it from the DOM when paginating
			BrainRide.paginator.set('paginateDirection', BrainRide.Constants.pagination.DEFAULT);
			this.query(searchTerm);
			e.preventDefault();
		}
	},

	query : function(searchTerm) {
		var self = this;
		BrainRide.searcher.fetch({
			params : {
				query : searchTerm,
				paginateDirection : BrainRide.paginator.get('paginateDirection')
			},

			success : function(data) {
				self.renderCollection({
					data: data,
					personalCollection: false
				});

			},
			error : function(data) {
			}
		});
	},

	paginatePrevious : function() {
		BrainRide.paginator.set('paginateDirection', BrainRide.Constants.pagination.PREVIOUS);
		this.query(this.currentSearchTerm);
	},

	paginateNext : function() {
		BrainRide.paginator.set('paginateDirection', BrainRide.Constants.pagination.NEXT);
		this.query(this.currentSearchTerm);
	},

	showSearch : function() {
		var isVisible = BrainRide.Utilities.isVisible('#searchBar');
		if(!isVisible) {
			$.mobile.silentScroll(0);
		}
		return false;
	},

	getSavedCards : function() {
		var self = this;
		BrainRide.library.fetch({
			success : function(data) {
				self.renderCollection({
					data: data,
					personalCollection: true
				})
			},
			error : function(data) {

			}
		});
	},

	renderCollection : function(options) {
		$('#results').empty();
		$('#noResults').empty();

		var personalCollection = options.personalCollection;
		var data = options.data;
		
		if(data.models.length !== 0) {
			//this one renders the data
			new BrainRide.Views.CardSets({
				el : $('ul', this.el),
				model : data.models,
				personalCollection : personalCollection
			});
			
			//jquery's method to show the styles
			$('#results').listview('refresh');
			
			//hide pager because we want to show all results
			if(personalCollection){
				$('#pager').addClass('ui-screen-hidden');
			}	
		} 
		else {
			new BrainRide.Views.NoResults();
		}
	}
});

BrainRide.Views.NoResults = Backbone.View.extend({
	el : '#noResults',
	_template : _.template($('#noResultsTemplate').html()),

	initialize : function() {
		this.render();
	},
	
	render : function() {
		$(this.el).html(this._template);
		$('#content #pager').addClass('ui-screen-hidden');
		return this;
	}
});

BrainRide.Views.CardSets = Backbone.View.extend({
	tagName : 'ul',

	initialize : function(options) {
		options || ( options = {});
		//want to pass this flag to show delete button
		this.personalCollection = typeof (options.personalCollection) === 'undefined' ? false : options.personalCollection;
		this.render();
	},

	render : function() {
		$(this.el).empty();

		//var html = '';
		var self = this;
		var els = [];

		_.each(this.model, function(item) {
			var rowView = new BrainRide.Views.CardSetItem({
				model : item,
				personalCollection : self.personalCollection
			});
			els.push(rowView.el);
		});

		$(this.el).append(els);
		$('#content #pager').removeClass('ui-screen-hidden');

		this.setupPagination();
		return this;
	},

	setupPagination : function() {
		var paginationConstants = BrainRide.Constants.pagination;
		if(BrainRide.paginator.get('paginateDirection') === paginationConstants.NEXT) {
			$('#previousResults').removeClass('ui-disabled');
		} else if(BrainRide.paginator.get('paginateDirection') === paginationConstants.PREVIOUS) {
			$('#nextResults').removeClass('ui-disabled');
		}

		if(BrainRide.paginator.get('currentPagination') === BrainRide.paginator.get('totalPages')) {
			$('#nextResults').addClass('ui-disabled');
		} else if(BrainRide.paginator.get('currentPagination') === 1) {
			$('#previousResults').addClass('ui-disabled');
		}
	}
});

BrainRide.Views.CardSetItem = Backbone.View.extend({
	tagName : 'li',
	_template : _.template($('#cardsTemplate').html()),

	initialize : function(options) {
		options || ( options = {});
		this.personalCollection = typeof (options.personalCollection) === 'undefined' ? false : options.personalCollection;

		//update view when this event happens
		this.model.bind('destroy', this.remove, this);

		this.render();
	},
	events : {
		'click .cardSet' : 'getCardSet',
		'click .remove' : 'removeCardSet'
	},

	render : function() {
		$(this.el).html(this._template(this.model.toJSON()));
		if(this.personalCollection) {
			new BrainRide.Views.RemoveCardSetItem({
				el : this.$el,
				model : this.model
			});
		}

		return this;
	},
	
	getCardSet : function() {
		var flashCards = new BrainRide.Collections.FlashCards({
			id : this.model.get('card_set_id'),
		});

		BrainRide.player.set('title', this.model.get('title'));
		BrainRide.player.set('currentCardSetId', this.model.get('card_set_id'));
		BrainRide.player.set('model', this.model);
		var self = this;

		flashCards.fetch({
			success : function(data) {
				BrainRide.player.set('collection', flashCards);
			},
			error : function(data) {
				console.log(data);
			}
		});
	},

	removeCardSet : function() {
		this.model.remove();
	}
});

BrainRide.Views.RemoveCardSetItem = Backbone.View.extend({
	_template : _.template($('#removeCardTemplate').html()),

	initialize : function(options) {
		this.render();
	},

	render : function() {
		$(this.el).append(this._template(this.model.toJSON()));
		return this;
	},
});


BrainRide.Views.FlashCardPlayer = Backbone.View.extend({
	tagName : 'div',
	id : 'player',

	_template : _.template($('#playerTemplate').html()),

	initialize : function(options) {
		options || ( options = {});
		this.render();
	},
	events : {
		'click #previous' : 'getPreviousCard',
		'click #next' : 'getNextCard',
		'click #back' : 'showSearchResults',
		'click #add' : 'addToLibrary',
	},

	render : function() {
		$('#' + this.id).remove();
		$(this.el).html(this._template(this.options));
		return this;
	},
	
	getPreviousCard : function() {
		var hasNoPrevious = BrainRide.player.previousFlashCard();
		if(hasNoPrevious) {
			$('#previous').addClass('ui-disabled');
		} else {
			$('#next').removeClass('ui-disabled');
		}
	},
	
	getNextCard : function() {
		var hasNoNext = BrainRide.player.nextFlashCard();
		if(hasNoNext) {
			$('#next').addClass('ui-disabled');
		} else {
			$('#previous').removeClass('ui-disabled');
		}
	},
	
	showSearchResults : function() {
		$.mobile.changePage($('#content'), {
			reverse : true
		});
		$('.ui-page-active').removeClass('ui-page-active');
		$('#content').addClass('ui-page-active').show();
	},
	
	addToLibrary : function() {
		//i just want to save the attributes in local storage, if I pass the model, it automatically calls tries to call the server, that
		//is why I am just passing the attributes
		var id = this.model.get('card_set_id');
		if(BrainRide.library.where({
			card_set_id : id
		}).length === 0) {
			console.log("added");
			BrainRide.library.create(this.model.attributes);
		} else {
			console.log("bah");
		}
	}
});

BrainRide.Views.Card = Backbone.View.extend({
	el : '#card',
	tagName : 'div',
	_template : _.template($('#cardTemplate').html()),


	initialize : function() {
		this.render();
	},
	
	render : function() {
		$(this.el).html(this._template(this.model.toJSON()));
		$(this.el).trigger('create')
		return this;
	}
})

BrainRide.Models.FlashCardPlayer = Backbone.Model.extend({
	defaults : {
		'currentCardIndex' : 0,
		'currentCardSetId' : 0
	},

	initialize : function() {
		var self = this;

		this.bind('change:collection', function() {
			//need to reset the current card index to 0 when a collection changes
			self.set('currentCardIndex', 0);
			self.collection = self.get('collection');
			self.showPlayer(self.get('title'));
		});
	},
	
	showPlayer : function(title) {
		var playerView = new BrainRide.Views.FlashCardPlayer({
			title : title,
			model : this.get('model')
		});
		BrainRide.application.showView(playerView);
		this.showCard();
	},
	
	showCard : function() {
		var flashCard = this.collection.at(this.get('currentCardIndex'));
		var cardView = new BrainRide.Views.Card({
			model : flashCard
		});
	},
	
	currentFlashCard : function() {
		return this.get('currentCardIndex');
	},

	previousFlashCard : function() {
		var currentFlashCardIndex = parseInt(this.get('currentCardIndex'), 10);
		if(currentFlashCardIndex <= 0) {
			return -1;
		}
		currentFlashCardIndex = currentFlashCardIndex - 1;
		this.set({
			'currentCardIndex' : currentFlashCardIndex
		});
		this.showCard();

		return currentFlashCardIndex === 0;
	},
	
	nextFlashCard : function() {
		var currentFlashCardIndex = parseInt(this.get('currentCardIndex'), 10);
		if(currentFlashCardIndex >= this.collection.length - 1) {
			return -1;
		}
		currentFlashCardIndex = currentFlashCardIndex + 1;
		this.set({
			'currentCardIndex' : currentFlashCardIndex
		});
		this.showCard();

		return currentFlashCardIndex === this.collection.length - 1;
	}
});

BrainRide.Models.CardSet = Backbone.Model.extend({
	urlRoot : '/cardSet/',

	defaults : {
		card_set_id : 0,
		description : '',
		flashcard_count : 0,
		title : ''
	},

	initialize : function(options) {
		options || ( options = {});
		this.id = options.id;
	},

	url : function() {
		return this.urlRoot + this.id
	},

	remove : function() {
		this.destroy();
	}
});

BrainRide.Models.FlashCard = Backbone.Model.extend({
	defaults : {
		card_id : 0,
		question : '',
		answer : ''
	}
});

BrainRide.Models.SearchPaginator = Backbone.Model.extend({
	defaults : {
		'totalCar' : 0,
		'currentPagination' : 0,
		'totalItemsPerPage' : 10,
		'totalPages' : 0,
	}
});

BrainRide.Collections.FlashCardsLibrary = Backbone.Collection.extend({
	model : BrainRide.Models.CardSet,
	localStorage : new Store('BrainRideLibrary')
});

BrainRide.Collections.FlashCards = Backbone.Collection.extend({
	model : BrainRide.Models.FlashCard,
	urlRoot : '/cardSet/',

	initialize : function(options) {
		options || ( options = {});
		this.id = options.id;
	},
	url : function() {
		return this.urlRoot + this.id;
	}
});

/*
BrainRide.Collections.CardSets = Backbone.Collection.extend({
	model : BrainRide.Models.CardSet
});
*/


BrainRide.Collections.Search = Backbone.Collection.extend({
	model : BrainRide.Models.CardSet,
	urlRoot : '/search/',
	totalItemPerPage : 10,
	previousTerm : '',
	currentPagination : 1,

	initialize : function() {
		BrainRide.paginator = new BrainRide.Models.SearchPaginator();
	},

	fetch : function(options) {
		options || ( options = {});
		this.query = options.params.query;

		//this.paginateDirection = options.params.paginateDirection;
		BrainRide.paginator.set('paginateDirection', options.params.paginateDirection);

		//call Backbone's own fetch
		//Backbone.Collection.prototype.fetch.call(this, options);
		Backbone.Collection.prototype.fetch.call(this, options);
	},

	//override url function to pass search param, also figure out current pagination
	url : function() {
		var paginateDirection = BrainRide.paginator.get('paginateDirection');
		var currentPagination = BrainRide.paginator.get('currentPagination');
		var totalPages = BrainRide.paginator.get('totalPages');
		var paginationConstants = BrainRide.Constants.pagination;

		switch(paginateDirection) {
			case paginationConstants.NEXT:
				if(currentPagination < totalPages) {
					BrainRide.paginator.set('currentPagination', currentPagination + 1);
					//this.currentPagination = this.currentPagination + 1;
					//$('#previousResults').removeClass('ui-disabled');
				}
				break;
			case paginationConstants.PREVIOUS:
				if(currentPagination > 1) {
					//this.currentPagination = this.currentPagination - 1;
					BrainRide.paginator.set('currentPagination', currentPagination - 1);
					//$('#nextResults').removeClass('ui-disabled');

				}
				break;
			case paginationConstants.DEFAULT:
				//this.currentPagination = 1;
				BrainRide.paginator.set('currentPagination', 1);
				break

		}
		//return this.urlRoot + this.query + '/' + this.currentPagination;
		return this.urlRoot + this.query + '/' + BrainRide.paginator.get('currentPagination');
	},
	//override the usual parse because I want to pass extra information like the total queries, etc
	parse : function(data) {
		if(data.length === 0) {
			this.numberOfItems = 0;
			this.totalPages = 0;
			return [];
		}

		//this.numberOfItems = data.meta.total_found;
		BrainRide.paginator.set('numberOfItems', data.meta.total_found);
		//this.totalPages = Math.ceil(this.numberOfItems / this.totalItemPerPage);
		BrainRide.paginator.set('totalPages', Math.ceil(BrainRide.paginator.get('numberOfItems') / BrainRide.paginator.get('totalItemsPerPage')));

		var cardSets = _(data.sets).map(function(d) {
			var cardSet = {};
			cardSet.author = d.author;
			cardSet.author_id = d.author_id;
			cardSet.card_set_id = d.card_set_id;
			cardSet.creation_date = d.creation_date;
			cardSet.description = d.description;
			cardSet.flashcard_count = d.flashcard_count;
			cardSet.save_count = d.save_count;
			cardSet.tags = d.tags;
			cardSet.title = d.title;
			return cardSet;
		});

		//customize return because view should be taking care of pagination
		return cardSets;
	}
});

BrainRide.Utilities = {
	isVisible : function(elem) {
		var docViewTop = $(window).scrollTop();
		var docViewBottom = docViewTop + $(window).height();

		var elemTop = $(elem).offset().top;
		var elemBottom = elemTop + $(elem).height();
		console.log(docViewTop, docViewBottom, elemTop, elemBottom);
		//return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
		return docViewTop < 35;
		//return ((docViewTop < elemTop) && (docViewBottom > elemBottom))
	}
}

BrainRide.Constants = {
	pagination : {
		DEFAULT : 'DEFAULT',
		NEXT : 'NEXT',
		PREVIOUS : 'PREVIOUS'
	},
	collectionType : {
		LIBRARY : 'LIBRARY'
	}
}

Backbone.View.prototype.close = function() {
	if(this.beforeClose) {
		this.beforeClose();
	}
	this.remove();
	this.unbind();
}

BrainRide.Routes.Application = Backbone.Router.extend({
	routes : {
		'cardSet/:id' : 'cardSetDetails'
	},

	initialize : function() {
		this.showView(new BrainRide.Views.Header());

		BrainRide.searcher = new BrainRide.Collections.Search();
		BrainRide.library = new BrainRide.Collections.FlashCardsLibrary();
		BrainRide.player = new BrainRide.Models.FlashCardPlayer()

		//getting data stored in local storage
		BrainRide.library.fetch();
	},

	showView : function(page) {
		$(page.el).attr('data-role', 'page');
		page.render();
		$('body').append($(page.el));

		var transition = $.mobile.defaultPageTransition;
		$.mobile.changePage($(page.el), {
			changeHash : false,
			transition : transition
		});
	}
})

$(document).ready(function() {
	BrainRide.init();
});
