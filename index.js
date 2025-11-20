const express = require('express')
const { createServer } = require('http')
const { Server } = require("socket.io")

const PORT = process.env.PORT || 3000

const app = express()
const server = createServer(app)
const io = new Server(server, {
    cors: {
        origin: "*"
    }
})

app.get("/", (req, res) => 
    res.send("Hello Universe")
)

const rooms = {}

io.on('connection', (socket) => {
    console.log("Socket connected: ", socket.id)

    socket.on('join-room', ({roomId, role}) => {
        socket.join(roomId)
        socket.data.roomId = roomId
        socket.data.role = role

        if(role === 'sharer') {
            // Initialize empty object if not exists
            rooms[roomId] = rooms[roomId] || {}
            rooms[roomId].sharer = socket.id
            console.log(`Room ${roomId}, sharer: ${socket.id}`)
        }
        
        socket.to(roomId).emit("peer-joined", {socketId: socket.id, role})
    })

    socket.on('signal', ({to, data}) => {
        if(to) io.to(to).emit('signal', {from: socket.id, data})

        else {
            const roomId = socket.data.roomId
            if(roomId) socket.to(roomId).emit('signal', {from: socket.id, data})
        }
    })

    socket.on('disconnect', () => {
        const roomId = socket.id
        if(roomId) {
            socket.to(roomId).emit("peer-left", {socketId: socket.id})
            // If he was the host clean the room
            if(rooms[roomId] && rooms[roomId].sharer === socket.id) {
                delete rooms[roomId].sharer
            }
        }
        console.log('Socket disconnected: ', socket.id)
    })
})

server.listen(PORT, () => {
    console.log(`Server running on: http://localhost:${PORT}`)
})