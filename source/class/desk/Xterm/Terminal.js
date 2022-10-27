/**
 * A web terminal
 */

qx.Class.define("desk.Xterm.Terminal", 
{
	extend : qx.ui.container.Composite,

	/**
	* Constructor
	* @param options {Object} options
	*/
	construct : function ( options ) {

		options = options || {};
		this.base(arguments);
		this.setLayout( new qx.ui.layout.HBox() );

		this.__rand = Math.floor( 100000000 * Math.random());

		if ( options.standalone ) {

			const win = new qx.ui.window.Window();

			win.set( {
				layout : new qx.ui.layout.HBox(),
				width : 739,
				height : 456,
				contentPadding : 0,
				caption : 'Terminal'
			} );

			win.add( this, {flex : 1} );
			win.open();
			win.center();
			win.addListener( 'close', this.dispose, this );

			win.addListener( 'mouseup', function () {

				this.__term && this.__term.focus();

			}, this);

		}

		this.__html = new qx.ui.embed.Html();
		this.__html.setHtml( '<div style="width: 100%; height: 100%" id = "' + this.__rand + '"></div>' );
		this.__html.addListenerOnce( 'appear', this.__onAppear, this );
		this.add( this.__html, { flex : 1 } );
	},

	destruct : function () {
		this.__term.dispose();
		this.__socket.removeEventListener('message', this.__term._getMessage);
		this.__socket.disconnect();
		this.__term = 0;
	},

	members : {

		__socket : null,
		__term : null,
		__html : null,
		__nCols : null,
		__nRows : null,
		__rand : null,

		__getSocket : function ( namespace ) {

			const socket = desk.Actions.getInstance().getSocket().io.nsps[ namespace ];
			return  socket ? socket : require('socket.io-client')( namespace, {path : desk.FileSystem.getBaseURL() + 'socket.io'} );

		},

		__onAppear : async function () {

			let socket = this.__getSocket( '/xterm' );

			if ( !socket.connected ) {

				await new Promise( res => socket.once( 'connect', res ) );

			}

			this.__getSocket( '/xterm' ).emit(
				'newTerminal', { name : '' + this.__rand } );

			socket = this.__socket = this.__getSocket( '/xterm' + this.__rand );
			const container = document.getElementById( '' + this.__rand );
			const term = this.__term = new ( require( 'xterm' ).Terminal ) ( { csursorBlink : true } );
			term._getMessage = term.write.bind( term );
			socket.addEventListener( 'message', term._getMessage );
			term.onData( socket.send.bind( socket ) );
			const fit = require ( "xterm-addon-fit" ).FitAddon;
			const fitAddon = this.__fitAddon = new fit();
			term.loadAddon(fitAddon);
			term.open( container );
			fitAddon.fit();
			this.__resize();
			setTimeout( term.focus.bind( term ), 1 );
			this.addListener( 'appear', this.__resize, this );

			this.addListener( 'resize', function () {

				if ( this.__html.isVisible() ) this.__resize();

			}, this );
		},

		__resize : async function () {

			await new Promise ( res => setTimeout( res, 2 ) );
			this.__fitAddon.fit();
			const nCols = this.__term.cols;
			const nRows = this.__term.rows;

			if ( ( this.__nCols == nCols ) && ( this.__nRows === nRows) )
				return;

			this.__nCols = nCols;
			this.__nRows = nRows;
			this.debug('resize : ', nCols, nRows);
			this.__socket.emit( "resize", { nCols, nRows } );
			this.__term.focus();

		}

	}
});