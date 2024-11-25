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
        showChat();
        deliverOfflineMessages(); // Deliver any offline messages
    } else {
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
    localUser.password = newPassword;
    localStorage.setItem(localUser.username, JSON.stringify(localUser));
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
}

// Search Friends
function searchFriend(name) {
    let allUsers = Object.keys(localStorage).filter(key => !key.includes('_friends') && !key.includes('_messages'));
    let matchingUsers = allUsers.filter(userKey => {
        let userData = JSON.parse(localStorage.getItem(userKey));
        return userData.fullName && userData.fullName.includes(name);
    });

    return matchingUsers;
}

// Send Friend Request
function sendFriendRequest(friendUsername) {
    const friendRequests = JSON.parse(localStorage.getItem(friendUsername + '_friendRequests') || '[]');
    if (!friendRequests.includes(localUser.username)) {
        friendRequests.push(localUser.username);
        localStorage.setItem(friendUsername + '_friendRequests', JSON.stringify(friendRequests));
        alert('Friend request sent!');
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

        alert('Friend request accepted!');
        loadFriends();
    }
}

// Send Message
function sendMessage() {
    const message = document.getElementById('messageInput').value;
    if (message) {
        for (let peerId in peers) {
            dataChannels[peerId].send(message); // Send message to all connected peers
        }
        storeOfflineMessages(message);
        document.getElementById('messageInput').value = ''; // Clear the input
    }
}

// Store Offline Messages
function storeOfflineMessages(message) {
    const messagesKey = localUser.username + '_messages';
    let messages = JSON.parse(localStorage.getItem(messagesKey) || '[]');
    messages.push({ sender: localUser.username, message });
    localStorage.setItem(messagesKey, JSON.stringify(messages));
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

    localStorage.removeItem(messagesKey); // Clear delivered messages
}

// Create Conference
function createConference() {
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
        const peerConnection = new RTCPeerConnection();
        const dataChannel = peerConnection.createDataChannel('conference');
        dataChannel.onmessage = event => {
            const messageDiv = document.createElement('div');
            messageDiv.innerText = event.data;
            document.getElementById('conferenceMessages').appendChild(messageDiv);
        };

        dataChannel.onopen = () => {
            console.log('New participant connected');
        };

        peers[newParticipant] = peerConnection;
        dataChannels[newParticipant] = dataChannel;
        conferenceParticipants.push(newParticipant);
    }
}

// Leave Conference
function leaveConference() {
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
    localUser = { username: '', password: '', fullName: '' };
    document.getElementById('chat').style.display = 'none';
    document.getElementById('login').style.display = 'block';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}
