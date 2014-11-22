function loadRooms() {
	$('#room-list').html("");
	try {
		window.relay.getCurrentRoom( function (currentRoom) {
			addRoom(currentRoom);
			$('#btn_' + currentRoom).addClass('current');
			window.relay.getAllRooms(function (allRooms) {
				for (i in allRooms) {
					if (allRooms[i] !== currentRoom) {
						addRoom(allRooms[i]);
					}
				}
			});
			getUsers(currentRoom);
		});
	} catch(err) {
		console.log(err);
	}
}
function addRoom(room) {
	$('#room-list').append(
	    $('<li>').attr({
	    	'class': 'room-btn col-sm-4',
	    	'id': 'btn_' + room
	    }).append(
	        $('<a>').attr('href','#').append(room)
		)
	);
	$('#btn_' + room).click( function() {
	    console.log("Switched to " + room);
	    relay.switchRoom(room);
	    loadRooms();
	})
}
function getUsers(room) {
	$('#room-users').html("");
	window.relay.getUsername(function (currentUser) {
		addUser(currentUser);
		$('#user_' + currentUser).addClass('current');
		window.relay.getAllUsers(function (allUsers) {
			for (i in allUsers) {
				if (allUsers[i] !== currentUser) {
					addUser(allUsers[i]);
				}
			}
		});
	});
}
function addUser(user) {
	$('#room-users').append(
	    $('<li>').attr({
	    	'class': 'user',
	    	'id': 'user_' + user
	    }).append(
	    	$('<a>').html(user)
	    )
	);
}

$(document).ready(function () {
	$(window).bind('relayLoaded', function(e) {
		loadRooms();
		var refreshCount = setInterval( function() { //reload users every 10 sec
			loadRooms();
		}, 10000);

		$('#room-manager-tab').click( function () {
	    	$('#room-manager-menu').slideToggle();
	    	$('#room-manager-icon').toggleClass('glyphicon-chevron-down');
	    	$('#room-manager-icon').toggleClass('glyphicon-chevron-up');
	    });
		$('#roomNameSubmit').click( function () {
	    	roomName = $('#roomName').val();
	    	if (roomName !== "") {
	    		$('#roomName').val("")
	    		relay.switchRoom(roomName);
	    		loadRooms();
	    	}
	    });
	    $('#userNameSubmit').click( function () {
	    	userName = $('#userName').val();
	    	if (userName !== "") {
	    		$('#userName').val("")
	    		relay.setUsername(userName);
	    		$('#room-users .current a').html(userName);
	    	}
	    });
	    $(window).keydown(function(event){
		    if(event.keyCode == 13) {  //if enter key is clicked
		    	event.preventDefault();
		    	if ($('#roomName').is(':focus')) {
		    		$('#roomNameSubmit').click();
		    	} else if ($('#userName').is(':focus')) {
		    		$('#userNameSubmit').click();
		    	}
		    	return false;
		    }
		});
	});
});