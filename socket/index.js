import { Server, Socket } from "socket.io";

const io = new Server(8900, {
    cors: {
        origin: true,
    }
});

let users = []

const addUser = (userId, socketId) => {
    if (!users.some(user => user.userId === userId))
        users.push({ userId, socketId });
}
const removeUser = (socketId) => {
    users = users.filter(user => user.socketId !== socketId);
}

const getUser = (userId) => {
    const user = users.find(user => user.userId === userId);
    return user;
}



io.on("connection", (socket) => {
    console.log("A user connected");
    socket.on("addUser", ({ userId }) => {
        addUser(userId, socket.id);
        io.emit("getUsers", users);
    });


    // setup for chatting
    socket.on("send message", ({ conversationId, senderId, receiverId, message }) => {
        console.log("SNED MESSAGE", conversationId, senderId, receiverId, message);
        const receiver = getUser(receiverId);
        if (receiver)
            io.to(receiver.socketId).emit("get message", { conversationId, message });
        else
            console.log("Receiver is offline")
    });


    // setup for calling

    // Nhận data từ NGƯỜI GỌI, tìm kiếm NGƯỜI NHẬN và phát 'incoming call' đến NGƯỜI NHẬN
    socket.on("calling", ({ callerID, calleeID, video, conversationId }) => {
        console.log(callerID, "GỌI", calleeID);
        const callee = getUser(calleeID);
        if (callee) {
            console.log("PHÁT TÍN HIỆU TỚI", calleeID)
            io.to(callee.socketId).emit("incoming call", { callerID, video, conversationId })
        }
    })

    socket.on("accept video call", ({ calleePeerID, callerID }) => {
        const caller = getUser(callerID);
        console.log(callerID, "CHẤP NHẬN CUỘC GỌI", caller.socketId)
        io.to(caller.socketId).emit("accepted calling", { calleePeerID });
        console.log("Đã gửi", caller.userId)

    })

    socket.on("deny calling", ({ callerID }) => {
        console.log(callerID, "HỦY CUỘC GỌI")
        const caller = getUser(callerID)
        io.to(caller.socketId).emit("denied calling");

    })

    socket.on("end calling", ({ finisher, callerID, calleeID }) => {
        console.log("KẾT THÚC CUỘC GỌI caller = ", finisher)
        if (finisher !== callerID) {
            const caller = getUser(callerID)
            io.to(caller?.socketId).emit("ended calling", { finisher });
        }
        else {
            const callee = getUser(calleeID)
            io.to(callee?.socketId).emit("ended calling", { finisher });
        }
        // const callee = getUser(calleeID)
        // io.to(callee?.socketId).emit("ended calling", { finisher });
        // const caller = getUser(callerID)
        // io.to(caller?.socketId).emit("ended calling", { finisher });
    })

    // socket.on('join-room', (roomId, userId) => {
    //     socket.join(roomId);
    //     users[socket.id] = { roomId, userId };

    //     socket.to(roomId).broadcast.emit('user-connected', userId);

    //     socket.on('disconnect', () => {
    //         socket.to(roomId).broadcast.emit('user-disconnected', userId);
    //         delete users[socket.id];
    //     });

    //     socket.on('call-user', (data) => {
    //         socket.to(data.userToCall).emit('receive-call', { signal: data.signalData, from: data.from });
    //     });

    //     socket.on('answer-call', (data) => {
    //         socket.to(data.from).emit('call-accepted', data.signal);
    //     });
    // });

    socket.on("disconnect", () => {
        removeUser(socket.id);
        console.log("User disconnected", users);
        // io.emit("getUsers", users);
    });
});