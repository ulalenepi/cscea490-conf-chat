let localUser = { username: '', password: '', fullName: '' };
let peers = {}; // For storing peer connections
let dataChannels = {}; // For storing data channels
let conferenceParticipants = [];

// Login Form Submission
document.getElementById('loginForm').addEventListener('submit', function (event) {
    event.preventDefault();
    loginUser();
});

function loginUser() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const userData = JSON.parse(localStorage.getItem(username));

    if (userData && userData.password === password) {
        localUser = userData;
        console.log('Login successful:', localUser);
        showChat();
        deliverOfflineMessages(); // Deliver any offline messages
    } else {
        console.error('Invalid login attempt:', username);
        document.getElementById('error').innerText = 'Invalid username or password!';
    }
}

// Show Chat Page
function showChat() {
    document.getElementById('login').style.display = 'none';
    document.getElementById('chat').style.display = 'block';
    document.getElementById('user').innerText = localUser.username;
    loadFriends();
}

// Change Password
function changePassword(newPassword) {
    if (!newPassword) {
        alert('Password cannot be empty!');
        return;
    }
    localUser.password = newPassword;
    localStorage.setItem(localUser.username, JSON.stringify(localUser));
    console.log('Password updated for:', localUser.username);
    alert('Password updated successfully!');
}

// Load Friends
function loadFriends() {
    let friendsList = JSON.parse(localStorage.getItem(localUser.username + '_friends') || '[]');

    const friendsListContainer = document.getElementById('friendsList');
    friendsListContainer.innerHTML = ''; // Clear previous list
    friendsList.forEach(friend => {
        let friendItem = document.createElement('div');
        friendItem.innerText = friend;
        friendsListContainer.appendChild(friendItem);
    });
    console.log('Friends loaded:', friendsList);
}

// Search Friends
function searchFriend(name) {
    let allUsers = Object.keys(localStorage).filter(key => !key.includes('_friends') && !key.includes('_messages'));
    let matchingUsers = allUsers.filter(userKey => {
        let userData = JSON.parse(localStorage.getItem(userKey));
        return userData.fullName && userData.fullName.includes(name);
    });

    console.log('Search results for', name, ':', matchingUsers);
    return matchingUsers;
}

// Send Friend Request
function sendFriendRequest(friendUsername) {
    if (!localStorage.getItem(friendUsername)) {
        alert('User not found!');
        console.error('Friend request failed: User does not exist');
        return;
    }

    const friendRequests = JSON.parse(localStorage.getItem(friendUsername + '_friendRequests') || '[]');
    if (!friendRequests.includes(localUser.username)) {
        friendRequests.push(localUser.username);
        localStorage.setItem(friendUsername + '_friendRequests', JSON.stringify(friendRequests));
        console.log('Friend request sent to:', friendUsername);
        alert('Friend request sent!');
    } else {
        console.warn('Friend request already sent to:', friendUsername);
        alert('Friend request already sent!');
    }
}

// Accept Friend Request
function acceptFriendRequest(friendUsername) {
    const friendRequests = JSON.parse(localStorage.getItem(localUser.username + '_friendRequests') || '[]');
    if (friendRequests.includes(friendUsername)) {
        // Remove from friend requests
        const updatedRequests = friendRequests.filter(request => request !== friendUsername);
        localStorage.setItem(localUser.username + '_friendRequests', JSON.stringify(updatedRequests));

        // Add to friends list
        let friends = JSON.parse(localStorage.getItem(localUser.username + '_friends') || '[]');
        if (!friends.includes(friendUsername)) {
            friends.push(friendUsername);
            localStorage.setItem(localUser.username + '_friends', JSON.stringify(friends));
        }

        let friendData = JSON.parse(localStorage.getItem(friendUsername + '_friends') || '[]');
        if (!friendData.includes(localUser.username)) {
            friendData.push(localUser.username);
            localStorage.setItem(friendUsername + '_friends', JSON.stringify(friendData));
        }

        console.log('Friend request accepted between:', localUser.username, 'and', friendUsername);
        alert('Friend request accepted!');
        loadFriends();
    } else {
        console.error('No friend request from:', friendUsername);
        alert('Friend request not found!');
    }
}

// Send Message
function sendMessage() {
    const message = document.getElementById('messageInput').value;
    if (message) {
        console.log('Sending message:', message);
        for (let peerId in peers) {
            dataChannels[peerId].send(message); // Send message to all connected peers
        }
        storeOfflineMessages(message);
        document.getElementById('messageInput').value = ''; // Clear the input
    } else {
        console.warn('Message cannot be empty');
        alert('Message cannot be empty!');
    }
}

// Store Offline Messages
function storeOfflineMessages(message) {
    const messagesKey = localUser.username + '_messages';
    let messages = JSON.parse(localStorage.getItem(messagesKey) || '[]');
    messages.push({ sender: localUser.username, message });
    localStorage.setItem(messagesKey, JSON.stringify(messages));
    console.log('Offline message stored:', message);
}

// Deliver Offline Messages
function deliverOfflineMessages() {
    const messagesKey = localUser.username + '_messages';
    let messages = JSON.parse(localStorage.getItem(messagesKey) || '[]');

    messages.forEach(({ sender, message }) => {
        const messageDiv = document.createElement('div');
        messageDiv.innerText = `${sender}: ${message}`;
        document.getElementById('messages').appendChild(messageDiv);
    });

    console.log('Delivered offline messages:', messages);
    localStorage.removeItem(messagesKey); // Clear delivered messages
}

// Create Conference
function createConference() {
    console.log('Creating conference...');
    const peerConnection = new RTCPeerConnection();
    const dataChannel = peerConnection.createDataChannel('conference');
    dataChannel.onmessage = event => {
        const messageDiv = document.createElement('div');
        messageDiv.innerText = event.data;
        document.getElementById('conferenceMessages').appendChild(messageDiv);
    };

    dataChannel.onopen = () => {
        console.log('Conference connection established');
    };

    peers[localUser.username] = peerConnection;
    dataChannels[localUser.username] = dataChannel;
    conferenceParticipants.push(localUser.username);
    showConference();
}

// Add Participant to Conference
function addParticipant() {
    const newParticipant = prompt('Enter participant username:');
    if (newParticipant) {
        if (!localStorage.getItem(newParticipant)) {
            alert('Participant not found!');
            console.error('Participant does not exist:', newParticipant);
            return;
        }

        console.log('Adding participant to conference:', newParticipant);
        const peerConnection = new RTCPeerConnection();
        const dataChannel = peerConnection.createDataChannel('conference');
        dataChannel.onmessage = event => {
            const messageDiv = document.createElement('div');
            messageDiv.innerText = event.data;
            document.getElementById('conferenceMessages').appendChild(messageDiv);
        };

        dataChannel.onopen = () => {
            console.log('New participant connected:', newParticipant);
        };

        peers[newParticipant] = peerConnection;
        dataChannels[newParticipant] = dataChannel;
        conferenceParticipants.push(newParticipant);
    }
}

// Leave Conference
function leaveConference() {
    console.log('Leaving conference...');
    peers[localUser.username]?.close();
    delete peers[localUser.username];
    delete dataChannels[localUser.username];
    conferenceParticipants = conferenceParticipants.filter(participant => participant !== localUser.username);
    showChat();
}

// Show Conference
function showConference() {
    document.getElementById('chat').style.display = 'none';
    document.getElementById('conference').style.display = 'block';
}

// Logout
function logout() {
    console.log('Logging out user:', localUser.username);
    localUser = { username: '', password: '', fullName: '' };
    document.getElementById('chat').style.display = 'none';
    document.getElementById('login').style.display = 'block';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}
