/**
 * @module stb/ui/list
 * @author Stanislav Kalashnik <sk@infomir.eu>
 * @license GNU GENERAL PUBLIC LICENSE Version 3
 */

'use strict';

var Component = require('../component'),
	keys      = require('../keys');


/**
 * Mouse click event.
 *
 * @event module:stb/ui/list~List#click:item
 *
 * @type {Object}
 * @property {Element} $item clicked HTML item
 * @property {Event} event click event data
 */

/**
 * Base list implementation.
 *
 * @constructor
 * @extends Component
 *
 * @param {Object}  [config={}] init parameters (all inherited from the parent)
 * @param {Array}   [config.data=[]] component data to visualize
 * @param {number}  [config.size=5] amount of visible items on a page
 * @param {boolean} [config.cycle=true] allow or not to jump to the opposite side of a list when there is nowhere to go next
 *
 * @fires module:stb/ui/list~List#click:item
 */
function List ( config ) {
	// current execution context
	var self = this;

	/**
	 * Link to the currently focused DOM element.
	 *
	 * @type {Element}
	 */
	this.$focusItem = null;

	/**
	 * Position of the visible window to render.
	 *
	 * @type {number}
	 */
	this.indexView = null;

	/**
	 * Component data to visualize.
	 *
	 * @type {Array}
	 */
	this.data = [];

	this.type = this.TYPE_VERTICAL;

	/**
	 * Amount of visible items on a page.
	 *
	 * @type {number}
	 */
	this.size = 5;

	/**
	 * Allow or not to jump to the opposite side of a list when there is nowhere to go next.
	 *
	 * @type {boolean}
	 */
	this.cycle = false;

	// sanitize
	config = config || {};

	// parent init
	Component.call(this, config);

	// horizontal or vertical
	if ( config.type !== undefined ) {
		if ( DEBUG ) {
			if ( Number(config.type) !== config.type ) { throw 'config.type must be a number'; }
		}

		this.type = config.type;
	}

	// correct CSS class names
	this.$node.classList.add('list');

	if ( this.type === this.TYPE_HORIZONTAL ) {
		this.$node.classList.add('horizontal');
	}

	// component setup
	this.init(config);

	// navigation by keyboard
	this.addListener('keydown', function ( event ) {
		switch ( event.code ) {
			case keys.up:
			case keys.down:
			case keys.right:
			case keys.left:
			case keys.pageUp:
			case keys.pageDown:
			case keys.home:
			case keys.end:
				// cursor move only on arrow keys
				self.move(event.code);
				break;
			case keys.ok:
				// notify
				self.emit('click:item', {$item: self.$focusItem, event: event});
				break;
		}
	});

	// navigation by mouse
	this.$body.addEventListener('mousewheel', function ( event ) {
		// scrolling by Y axis
		if ( self.type === self.TYPE_VERTICAL && event.wheelDeltaY ) {
			self.move(event.wheelDeltaY > 0 ? keys.up : keys.down);
		}

		// scrolling by X axis
		if ( self.type === self.TYPE_HORIZONTAL && event.wheelDeltaX ) {
			self.move(event.wheelDeltaX > 0 ? keys.left : keys.right);
		}
	});
}


// inheritance
List.prototype = Object.create(Component.prototype);
List.prototype.constructor = List;


List.prototype.TYPE_VERTICAL   = 1;
List.prototype.TYPE_HORIZONTAL = 2;


/**
 * Fill the given item with data.
 *
 * @param {Element} $item item DOM link
 * @param {*} data associated with this item data
 */
List.prototype.renderItemDefault = function ( $item, data ) {
	$item.innerText = data.value;
};


/**
 * Method to build each list item content.
 * Can be redefined to provide custom rendering.
 *
 * @type {function}
 */
List.prototype.renderItem = List.prototype.renderItemDefault;


/**
 * Make all the data items identical.
 * Wrap to objects if necessary.
 *
 * @param {Array} data incoming array
 * @return {Array} reworked incoming data
 */
function normalize ( data ) {
	var i, item;

	// rows
	for ( i = 0; i < data.length; i++ ) {
		// cell value
		item = data[i];
		// primitive value
		if ( typeof item !== 'object' ) {
			// wrap
			item = data[i] = {
				value: data[i]
			};
		}

		if ( DEBUG ) {
			if ( !('value' in item) ) { throw 'field "value" is missing'; }
		}
	}

	return data;
}


/**
 * Init or re-init of the component inner structures and HTML.
 *
 * @param {Object} [config={}] init parameters (subset of constructor config params)
 */
List.prototype.init = function ( config ) {
	var self     = this,
		currSize = this.$body.children.length,
		/**
		 * Item mouse click handler.
		 *
		 * @param {Event} event click event data
		 *
		 * @this Element
		 *
		 * @fires module:stb/ui/list~List#click:item
		 */
		onClick  = function ( event ) {
			if ( this.data !== undefined ) {
				self.focusItem(this);
				// notify
				self.emit('click:item', {$item: this, event: event});
			}
		},
		item, i;

	if ( DEBUG ) {
		if ( typeof config !== 'object' ) { throw 'wrong config type'; }
	}

	// apply cycle behaviour
	if ( config.cycle !== undefined ) { this.cycle = config.cycle; }

	// apply list of items
	if ( config.data !== undefined ) {
		if ( DEBUG ) {
			if ( !Array.isArray(config.data) ) { throw 'wrong config.data type'; }
		}

		// prepare user data
		this.data = normalize(config.data);
	}

	// custom render method
	if ( config.render !== undefined ) {
		if ( DEBUG ) {
			if ( typeof config.render !== 'function' ) { throw 'wrong config.render type'; }
		}

		this.renderItem = config.render;
	}

	// list items amount on page
	if ( config.size !== undefined ) {
		if ( DEBUG ) {
			if ( Number(config.size) !== config.size ) { throw 'config.size must be a number'; }
			if ( config.size <= 0 ) { throw 'config.size should be positive'; }
		}

		this.size = config.size;
	}

	// geometry has changed or initial draw
	if ( this.size !== currSize ) {
		// non-empty list
		if ( currSize > 0 ) {
			// clear old items
			this.$body.innerText = null;
		}

		// create new items
		for ( i = 0; i < this.size; i++ ) {
			item = document.createElement('div');
			item.index = i;
			item.className = 'item';

			item.addEventListener('click', onClick);
			this.$body.appendChild(item);
		}
	}

	this.renderView(0);
};


/**
 * Draw the visible window.
 *
 * @param {number} index start position to render
 *
 * @return {boolean} operation status
 */
List.prototype.renderView = function ( index ) {
	var $item, i, itemData;

	if ( DEBUG ) {
		if ( Number(index) !== index ) { throw 'index must be a number'; }
		if ( index < 0 ) { throw 'index should be more than zero'; }
		if ( index >= this.data.length ) { throw 'index should be less than data size'; }
	}

	// has the view window position changed
	if ( this.indexView !== index ) {
		// sync global pointer
		this.indexView = index;

		// rebuild all visible items
		for ( i = 0; i < this.size; i++ ) {
			// shortcuts
			$item    = this.$body.children[i];
			itemData = this.data[index];

			// real item or stub
			if ( itemData !== undefined ) {
				// correct inner data/index and render
				$item.data  = itemData;
				$item.index = index;
				this.renderItem($item, itemData);
			} else {
				// nothing to render
				$item.data = $item.index = undefined;
				$item.innerHTML = '&nbsp;';
			}
			index++;
		}

		// full rebuild
		return true;
	}

	// nothing was done
	return false;
};


/**
 * Jump to the opposite side.
 *
 * @event module:stb/ui/list~List#cycle
 *
 * @type {Object}
 * @property {number} direction key code initiator of movement
 */

/**
 * Attempt to go beyond the edge of the list.
 *
 * @event module:stb/ui/list~List#overflow
 *
 * @type {Object}
 * @property {number} direction key code initiator of movement
 */


/**
 * Move focus to the given direction.
 *
 * @param {number} direction arrow key code
 */
List.prototype.move = function ( direction ) {
	//switch ( direction ) {
	//	case keys.up:
	//
	//		break;
	//	case keys.down:
	//
	//		break;
	//	case keys.right:
	//
	//		break;
	//	case keys.left:
	//
	//		break;
	//}
	//
	//return;

	if ( (direction === keys.up && this.type === this.TYPE_VERTICAL) || (direction === keys.left && this.type === this.TYPE_HORIZONTAL) ) {
		// still can go backward
		if ( this.$focusItem && this.$focusItem.index > 0 ) {
			if ( this.$focusItem === this.$body.firstChild ) {
				this.renderView(this.indexView - 1);
			} else {
				this.focusItem(this.$focusItem.previousSibling);
			}
		} else {
			// already at the beginning
			if ( this.cycle ) {
				// jump to the end of the list
				this.move(keys.end);
				// notify
				this.emit('cycle', {direction: direction});
			} else {
				// notify
				this.emit('overflow', {direction: direction});
			}
		}
	}
	if ( (direction === keys.down && this.type === this.TYPE_VERTICAL) || (direction === keys.right && this.type === this.TYPE_HORIZONTAL) ) {
		// still can go forward
		if ( this.$focusItem && this.$focusItem.index < this.data.length - 1 ) {
			if ( this.$focusItem === this.$body.lastChild ) {
				this.renderView(this.indexView + 1);
			} else {
				this.focusItem(this.$focusItem.nextSibling);
			}
		} else {
			// already at the beginning
			if ( this.cycle ) {
				// jump to the beginning of the list
				this.move(keys.home);
				// notify
				this.emit('cycle', {direction: direction});
			} else {
				// notify
				this.emit('overflow', {direction: direction});
			}
		}
	}

	if ( direction === keys.pageUp ) {
		// determine jump size
		if ( this.indexView < this.size ) {
			// first page
			this.renderView(0);
		} else {
			// second page and further
			this.renderView(this.indexView - this.size + 1);
		}

		this.focusItem(this.$body.firstChild);
	}

	if ( direction === keys.pageDown ) {
		// data is bigger then one page
		if ( this.data.length > this.size ) {
			// determine jump size
			if ( this.indexView > this.data.length - this.size * 2 ) {
				// last page
				this.renderView(this.data.length - this.size);
			} else {
				// before the last page
				this.renderView(this.indexView + this.size - 1);
			}
			this.focusItem(this.$body.lastChild);
		} else {
			// not the last item on the page
			this.focusItem(this.$body.children[this.data.length - 1]);
		}
	}

	if ( direction === keys.home ) {
		this.renderView(0);
		this.focusItem(this.$body.firstChild);
	}

	if ( direction === keys.end ) {
		// data is bigger then one page
		if ( this.data.length > this.size ) {
			this.renderView(this.data.length - this.size);
			this.focusItem(this.$body.lastChild);
		} else {
			// not the last item on the page
			this.focusItem(this.$body.children[this.data.length - 1]);
		}
	}
};


/**
 * Highlight the given DOM element as focused.
 * Remove focus from the previously focused item and generate associated event.
 *
 * @param {Node|Element} $item element to focus
 *
 * @return {boolean} operation status
 *
 * @fires module:stb/ui/list~List#focus:item
 * @fires module:stb/ui/list~List#blur:item
 */
List.prototype.focusItem = function ( $item ) {
	var $prev = this.$focusItem;

	// different element
	if ( $item !== undefined && $prev !== $item ) {
		if ( DEBUG ) {
			if ( !($item instanceof Element) ) { throw 'wrong $item type'; }
			if ( $item.parentNode !== this.$body ) { throw 'wrong $item parent element'; }
		}

		// some item is focused already
		if ( $prev !== null ) {
			if ( DEBUG ) {
				if ( !($prev instanceof Element) ) { throw 'wrong $prev type'; }
			}

			// style
			$prev.classList.remove('focus');

			/**
			 * Remove focus from an element.
			 *
			 * @event module:stb/ui/list~List#blur:item
			 *
			 * @type {Object}
			 * @property {Element} $item previously focused HTML element
			 */
			this.emit('blur:item', {$item: $prev});
		}
		// reassign
		this.$focusItem = $item;

		this.$focusItem.data = this.data[this.$focusItem.index];

		// correct CSS
		$item.classList.add('focus');

		/**
		 * Set focus to an element.
		 *
		 * @event module:stb/ui/list~List#focus:item
		 *
		 * @type {Object}
		 * @property {Element} $prev old/previous focused HTML element
		 * @property {Element} $curr new/current focused HTML element
		 */
		this.emit('focus:item', {$prev: $prev, $curr: $item});

		return true;
	}

	// nothing was done
	return false;
};


// public export
module.exports = List;
