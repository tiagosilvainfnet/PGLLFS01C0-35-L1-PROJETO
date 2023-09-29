const chat1 = `
    <li class="message right appeared message-text">
        <div class="avatar"></div>
        <div class="text_wrapper">
            <div class="text">texto_aqui</div>
        </div>
    </li>
`;

const chat2 = `
    <li class="message left appeared message-text">
        <div class="avatar"></div>
        <div class="text_wrapper">
            <div class="text">texto_aqui</div>
        </div>
    </li>
`;

const messages = document.getElementById('messages');
const user = JSON.parse(window.localStorage.getItem("user"));
const chat_window = document.getElementById('chat_window');
const user_friend_name = document.getElementById('user_friend_name');
const datalistOptions = document.getElementById('datalistOptions');
const search = document.getElementById('search');
const notification = document.getElementById('notification');
const notifcationBadge = document.getElementById('notifcation-badge');
let friend = {};

const socket = io();

const getNotifcations = async () => {
    const response = await fetch(`${window.location.origin}/notifications?user_id=${user.id}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    })
    const json = await response.json();
    for(const notification of json.result){
        let li = ''
        const res = await getUserFriend(notification.user_sender);
        const name = res.name;

        if(notification.type === 'invite'){
            li = `<li><button class="dropdown-item" onclick="openModal(this, ${notification.user_sender}, ${notification.user_receptor})">Solicitação de amizade de ${name}</button></li>`
        }else{
            li = `<li><button class="dropdown-item" onclick=""loadChat(${notification.id}, ${data.user_sender}, null)"">Mensagem de ${name}</button></li>`
        }

        let chidrens = document.getElementById('notification').children;
        if(chidrens.length > 0){
            chidrens[chidrens.length - 1].insertAdjacentHTML('afterend', li);
        }else{
            notification.innerHTML = li;
        }
    }
}

const verifyNotifications = () => {
    const notifications = document.getElementById('notification').children;
    if(notifications.length > 0){
        notifcationBadge.style.display = 'block';
    }else{  
        notifcationBadge.style.display = 'none';
    }
}

const getUserFriend = async (id) => {
    const response = await fetch(`${window.location.origin}/friends/user?id=${id}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    })
    const json = await response.json();
    return json.result;
}

const loadChat = async (user_id, friend_id, friend_name) => {
    if(friend_name === null){
        const res = await getUserFriend(friend_id);
        friend_name = res.name;
    }

    friend = {
        id: friend_id,
        name: friend_name
    }

    user_friend_name.innerHTML = friend_name;

    const response = await fetch(`${window.location.origin}/chat?user_id=${user_id}&friend_id=${friend_id}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    })
    const json = await response.json();

    let lis = ''
    json.rows.forEach(async (chat) => {
        if(chat.user_sender === user.id){
            lis += chat1.replace('texto_aqui', chat.message);
        }else{
            lis += chat2.replace('texto_aqui', chat.message);
        }
    })

    messages.innerHTML = lis;
    document.getElementsByClassName('messages')[0].scrollTop = document.getElementsByClassName('messages')[0].scrollHeight;
    chat_window.style.display = 'block';
    verifyNotifications();
}

closeChat = () => {
    chat_window.style.display = 'none';
    messages.innerHTML = '';
}

const logout = () => {
    window.localStorage.clear();
    window.location.href = `${window.location.origin}/login`
}

const getFriends = async () => {
    // http://localhost:3000/friends?user_id=1
    const response = await fetch(`${window.location.origin}/friends?user_id=${user.id}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    });
    const json = await response.json();

    let lis = ''

    for(const friend of json.result){
        lis += `<li onclick="loadChat(${user.id}, ${friend.id}, '${friend.name}')" class="list-group-item">${friend.name}</li>`
    }

    document.getElementById('friends').innerHTML = lis;
}

const updateMessage = (type, message) => {
    let li = ''
    if(type === 1){
        li = chat1.replace('texto_aqui', message);
    }else{
        li = chat2.replace('texto_aqui', message);
    }
    const lis = document.getElementsByClassName('message-text');

    if(lis.length > 0){
        lis[lis.length - 1].insertAdjacentHTML('afterend', li);
    } else{
        messages.innerHTML = li;
    }
    
    
    document.getElementsByClassName('messages')[0].scrollTop = document.getElementsByClassName('messages')[0].scrollHeight;
}

document.getElementById('form-chat').addEventListener('submit', function(event) {
    event.preventDefault();

    const message_input = document.getElementById('message_input');
    const message = message_input.value;

    sendMessageSocket(message);
    updateMessage(1, message);

    message_input.value = '';
});

const searchUser = async (element) => {
    if(element.value.length > 4){
        const response = await fetch(`http://localhost:3000/search?q=${encodeURIComponent(element.value)}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })
        const json = await response.json();
        
        let lis = ''

        for(const friend of json.result){
            lis += `<li onclick="sendInvite(${user.id}, ${friend.id})">${friend.name}</li>`
        }

        datalistOptions.innerHTML = lis;
    }
}

const sendInvite = async (user_id, friend_id) => {
    await fetch(`http://localhost:3000/friends/send-invite`, {
        method: 'POST',
        body: JSON.stringify({
            user_id: user_id,
            friend_id: friend_id
        }),
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    })
    
    socket.emit('SEND_NOTIFICATION', {
        user_id: user_id,
        friend_id: friend_id,
        status: 0,
        type: 'invite'
    });
    alert("Convite enviado com sucesso!")
}

const sendMessageSocket = (message) => {
    socket.emit('SEND_MESSAGE', {
        user_sender: user.id,
        user_receptor: friend.id,
        message: message
    });
}

const changeInvite = async (user_sender, user_receptor, status) => {
    await fetch(`http://localhost:3000/friends/response-invite`, {
        method: 'POST',
        body: JSON.stringify({
            user_id: user_sender,
            friend_id: user_receptor,
            status: status
        }),
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    })

    if(status === 1){
        socket.emit('SEND_UPDATE_CHAT', {
            user_id: user_sender,
            friend_id: user_receptor,
        });
    }
}

const openModal = (element, user_sender, user_receptor) => {
    const confirm = window.confirm("Aceitar solicitação de amizade?");
    if(confirm){
        changeInvite(user_sender, user_receptor, 1);
    }else{
        changeInvite(user_sender, user_receptor, 0);
    }
    element.remove();
    verifyNotifications();
}

const updateChat = async (friend_id) => {
    const friend = await getUserFriend(friend_id);
    const li = `<li onclick="loadChat(${user.id}, ${friend.id}, '${friend.name}')" class="list-group-item">${friend.name}</li>`;

    const lis = document.getElementById('friends').children;
    if(lis.length > 0){
        lis[lis.length - 1].insertAdjacentHTML('afterend', li);
    }else{
        document.getElementById('friends').innerHTML = li;
    }
}

const ouvirMessage = () => {
    const socket = io();

    socket.on('RECEIVE_MESSAGE', function(data){
        if(data.user_sender === friend.id){
            updateMessage(2, data.message);
        }
    });

    socket.on('RECEIVE_UPDATE_CHAT', function(data){
        if(data.user_sender === user.id){
            updateChat(data.user_receptor)
        }
        
        if(data.user_receptor === user.id){
            updateChat(data.user_sender)
        }
    });

    socket.on('RECEIVE_NOTIFICATION', async function(data){
        if(data.user_sender !== user.id && data.user_receptor === user.id){
            notifcationBadge.style.display = 'block';
            const res = await getUserFriend(data.user_sender);
            const name = res.name;

            let li = ''

            if(data.type === 'invite'){
                li = `<li><button class="dropdown-item" onclick="openModal(this, ${data.user_sender}, ${data.user_receptor})">Solicitação de amizade de ${name}</button></li>`
            }else{
                li = `<li><button class="dropdown-item" onclick=""loadChat(${user.id}, ${data.user_sender}, null)"">Mensagem de ${name}</button></li>`
            }
            let chidrens = document.getElementById('notification').children;
            if(chidrens.length > 0){
                chidrens[chidrens.length - 1].insertAdjacentHTML('afterend', li);
            }else{
                notification.innerHTML = li;
            }
        }
    });
}

// TODO: Salvar as notificações
// TODO: Buscar somente não amigos e não eu
// TODO: Fazer uma timeline

ouvirMessage();
getFriends();
getNotifcations();