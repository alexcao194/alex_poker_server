const User = require('../models/User');
const jwt = require('jsonwebtoken');
const Table = require('../pokergame/Table');
const Player = require('../pokergame/Player');
const {
  FETCH_LOBBY_INFO,
  RECEIVE_LOBBY_INFO,
  PLAYERS_UPDATED,
  JOIN_TABLE,
  TABLE_JOINED,
  TABLES_UPDATED,
  LEAVE_TABLE,
  TABLE_LEFT,
  FOLD,
  CHECK,
  CALL,
  RAISE,
  TABLE_MESSAGE,
  SIT_DOWN,
  REBUY,
  STAND_UP,
  SITTING_OUT,
  SITTING_IN,
  DISCONNECT,
  TABLE_UPDATED,
  WINNER,
} = require('../pokergame/actions');
const config = require('../config');

const tables = {
  
};



for(let i = 1; i <= 80; i++) {
  if(i >= 1 && i <= 8) {
    tables[i] = new Table(`n10${i}`, `Room ${i}`, 10000, 5, 0)
  } else if(i >= 9 && i <= 16) {
    tables[i] = new Table(`n20${i - 8}`, `Room ${i}`, 20000, 5, 0)
  } else if(i >= 17 && i <= 24) {
    tables[i] = new Table(`n50${i - 16}`, `Room ${i}`, 50000, 5, 0)
  } else if(i >= 25 && i <= 32) {
    tables[i] = new Table(`r10${i - 24}`, `Room ${i - 24}`, 10000, 5, 1)
  } else if(i >= 33 && i <= 40) {
    tables[i] = new Table(`r20${i - 32}`, `Room ${i - 24}`, 20000, 5, 1)
  } else if(i >= 41 && i <= 48) {
    tables[i] = new Table(`r50${i - 40}`, `Room ${i - 24}`, 50000, 5, 1)
  } else if(i >= 49 && i <= 56) {
    tables[i] = new Table(`rx0${i - 48}`, `Room ${i - 24}`, 100000, 5, 1)
  } else if(i >= 57 && i <= 64) {
    tables[i] = new Table(`v10${i - 56}`, `Room ${i - 56}`, 1000000, 5, 2)
  } else if(i >= 65 && i <= 72) {
    tables[i] = new Table(`v20${i - 64}`, `Room ${i - 64}`, 2000000, 5, 3)
  } else if(i >= 73 && i <= 80) {
    tables[i] = new Table(`v50${i - 72}`, `Room ${i - 64}`, 5000000, 5, 3)
  }
} 

function findTableById(id) {
  for(let i = 1; i <= 80; i++) {
    if(tables[i].id == id) {
      return tables[i];
    }
  }
}

const players = {};

function getCurrentPlayers() {
  return Object.values(players).map((player) => ({
    socketId: player.socketId,
    id: player.id,
    name: player.name,
  }));
}

function getCurrentPlayersNumber(table) {
  var cnt = 0;
  for(let i = 1; i <= 5; i++) {
    if(table.seats[i] != null) {
      cnt++;
    }
  }
  return cnt;
}

function getCurrentTable(id) {
  return Object.values(tables).filter(function(table) {
    return id == table.id
  }).map((table) => ({
    id: table.id,
    name: table.name,
    limit: table.limit,
    maxPlayers: table.maxPlayers,
    currentNumberPlayers: getCurrentPlayersNumber(table),
    smallBlind: table.minBet,
    bigBlind: table.minBet * 2,
    type: table.type,
    players: table.players,
    seats: table.seats,
    button: table.button,
    turn: table.turn,
    pot: table.pot,
    board: table.board,
    mainPot: table.mainPot,
    callAmount: table.callAmount,
    minBet: table.limit / 200,
    minRaise: table.minRaise,
    handOver: table.handOver,
    winMessages: table.winMessages,
    wentToShowdown: table.wentToShowdown,
    sidePots: table.sidePots,
  }))[0];
}

function getCurrentTables(type) {
  if(type != null) {
    return Object.values(tables).filter(function(table) {
      return type === table.type
    }).map((table) => ({
      id: table.id,
      name: table.name,
      limit: table.limit,
      maxPlayers: table.maxPlayers,
      currentNumberPlayers: getCurrentPlayersNumber(table),
      smallBlind: table.minBet,
      bigBlind: table.minBet * 2,
      type: table.type
    }));
  } else {
    return Object.values(tables).map((table) => ({
      id: table.id,
      name: table.name,
      limit: table.limit,
      maxPlayers: table.maxPlayers,
      currentNumberPlayers: getCurrentPlayersNumber(table),
      smallBlind: table.minBet,
      bigBlind: table.minBet * 2,
      type: table.type
    }));
  }
}

const init = (socket, io) => {
  socket.on('disconnect', () => {
    for(let i = 1; i <= 80; i++) {
      tables[i].removePlayer(socket.id);
    }
  })
  socket.on(FETCH_LOBBY_INFO, async ({token, type}) => {
    let user;

    jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
      if (err) console.log(err);
      else {
        user = decoded.user;
      }
    });

    if (user) {
      const found = Object.values(players).find((player) => {
        return player.id == user.id;
      });

      if (found) {
        delete players[found.socketId];
        Object.values(tables).map((table) => {
          table.removePlayer(found.socketId);
          broadcastToTable(table);
        });
      }

      user = await User.findById(user.id).select('-password');

      players[socket.id] = new Player(
        socket.id,
        user._id,
        user.name,
        user.chipsAmount,
      );

      socket.emit(RECEIVE_LOBBY_INFO, {
        tables: getCurrentTables(type),
        players: getCurrentPlayers(),
        socketId: socket.id,
      });
      socket.broadcast.emit(PLAYERS_UPDATED, getCurrentPlayers());
    }
  });

  socket.on(JOIN_TABLE, ({tableId}) => {
    const table = findTableById(tableId);

    const player = players[socket.id];
    for(let i = 1; i <= 80; i++) {
      tables[i].removePlayer(socket.id)
    }
    table.addPlayer(player);
    
 
    socket.emit(TABLE_JOINED, { table: getCurrentTable(tableId) });
    socket.broadcast.emit(TABLES_UPDATED, { tables: getCurrentTables(table.type), tableId });

    if (
      findTableById(tableId).players &&
      findTableById(tableId).players.length > 0 &&
      player
    ) {
      let message = `${player.name} joined the table.`;
      broadcastToTable(table, message);
    }
  });

  socket.on(LEAVE_TABLE, ({tableId}) => {
    console.log(tableId)
    const table = findTableById(tableId);
    const player = players[socket.id];
    const seat = Object.values(table.seats).find(
      (seat) => seat && seat.player.socketId === socket.id,
    );
 
    if (seat && player) {
      updatePlayerBankroll(player, seat.stack);
    }

    table.removePlayer(socket.id);

    socket.broadcast.emit(TABLES_UPDATED, {tables : getCurrentTables()});
    socket.emit(TABLE_LEFT, { tables: getCurrentTables(), tableId });

    if (
      findTableById(tableId).players &&
      findTableById(tableId).players.length > 0 &&
      player
    ) {
      let message = `${player.name} left the table.`;
      broadcastToTable(table, message);
    }

    if (table.activePlayers().length === 1) {
      clearForOnePlayer(table);
    }
  });

  socket.on(FOLD, ({tableId}) => {
    let table = findTableById(tableId);
    let res = table.handleFold(socket.id);
    res && broadcastToTable(table, res.message);
    res && changeTurnAndBroadcast(table, res.seatId);
  });

  socket.on(CHECK, ({tableId}) => {
    let table = findTableById(tableId);
    let res = table.handleCheck(socket.id);
    res && broadcastToTable(table, res.message);
    res && changeTurnAndBroadcast(table, res.seatId);
  });

  socket.on(CALL, ({tableId}) => {
    let table = findTableById(tableId);
    let res = table.handleCall(socket.id);
    res && broadcastToTable(table, res.message);
    res && changeTurnAndBroadcast(table, res.seatId);
  });

  socket.on(RAISE, ({ tableId, amount }) => {
    let table = findTableById(tableId);
    let res = table.handleRaise(socket.id, amount);
    res && broadcastToTable(table, res.message);
    res && changeTurnAndBroadcast(table, res.seatId);
  });

  socket.on(TABLE_MESSAGE, ({ message, from, tableId }) => {
    let table = findTableById(tableId);
    broadcastToTable(table, message, from);
  }); 

  socket.on(SIT_DOWN, ({ tableId, seatId, amount }) => {
    const table = findTableById(tableId);
    const player = players[socket.id];
    table.standPlayer(socket.id) 

    if (player) {
      table.sitPlayer(player, seatId, amount);
      let message = `${player.name} sat down in Seat ${seatId}`;

      updatePlayerBankroll(player, -amount);

      broadcastToTable(table, message);
      if (table.activePlayers().length === 2) {
        initNewHand(table);
      }
      socket.broadcast.emit(TABLES_UPDATED, {tables : getCurrentTables()});
    }
  });

  socket.on(REBUY, ({ tableId, seatId, amount }) => {
    const table = findTableById(tableId);
    const player = players[socket.id];

    table.rebuyPlayer(seatId, amount);
    updatePlayerBankroll(player, -amount);

    broadcastToTable(table);
  });

  socket.on(STAND_UP, ({tableId}) => {
    const table = findTableById(tableId);
    const player = players[socket.id];
    const seat = Object.values(table.seats).find(
      (seat) => seat && seat.player.socketId === socket.id,
    );

    let message = '';
    if (seat) {
      updatePlayerBankroll(player, seat.stack);
      message = `${player.name} left the table`;
    }

    table.standPlayer(socket.id);

    broadcastToTable(table, message);
    if (table.activePlayers().length === 1) {
      clearForOnePlayer(table);
    }
  });

  socket.on(SITTING_OUT, ({ tableId, seatId }) => {
    const table = findTableById(tableId);
    const seat = table.seats[seatId];
    seat.sittingOut = true;

    broadcastToTable(table);
  });

  socket.on(SITTING_IN, ({ tableId, seatId }) => {
    const table = findTableById(tableId);
    const seat = table.seats[seatId];
    seat.sittingOut = false;

    broadcastToTable(table);
    if (table.handOver && table.activePlayers().length === 2) {
      initNewHand(table);
    }
  });

  socket.on(DISCONNECT, () => {
    const seat = findSeatBySocketId(socket.id);
    if (seat) {
      updatePlayerBankroll(seat.player, seat.stack);
    }

    delete players[socket.id];
    removeFromTables(socket.id);

    socket.broadcast.emit(TABLES_UPDATED, getCurrentTables());
    socket.broadcast.emit(PLAYERS_UPDATED, getCurrentPlayers());
  });

  async function updatePlayerBankroll(player, amount) {
    const user = await User.findById(player.id);
    user.chipsAmount += amount;
    await user.save();

    players[socket.id].bankroll += amount;
    io.to(socket.id).emit(PLAYERS_UPDATED, getCurrentPlayers());
  }

  function findSeatBySocketId(socketId) {
    let foundSeat = null;
    Object.values(tables).forEach((table) => {
      Object.values(table.seats).forEach((seat) => {
        if (seat && seat.player.socketId === socketId) {
          foundSeat = seat;
        }
      });
    });
    return foundSeat;
  }

  function removeFromTables(socketId) {
    for (let i = 0; i < Object.keys(tables).length; i++) {
      tables[Object.keys(tables)[i]].removePlayer(socketId);
    }
  }

  function broadcastToTable(table, message = null, from = null) {
    for (let i = 0; i < table.players.length; i++) {
      let socketId = table.players[i].socketId;
      let tableCopy = hideOpponentCards(table, socketId);
      io.to(socketId).emit(TABLE_UPDATED, {
        table: getCurrentTable(tableCopy.id),
        message,
        from,
      });
    }
  }

  function changeTurnAndBroadcast(table, seatId) {
    setTimeout(() => {
      table.changeTurn(seatId);
      broadcastToTable(table);

      if (table.handOver) {
        initNewHand(table);
      }
    }, 1000);
  }

  function initNewHand(table) {
    if (table.activePlayers().length > 1) {
      broadcastToTable(table, '---New hand starting in 5 seconds---');
    }
    setTimeout(() => {
      table.clearWinMessages();
      table.startHand();
      broadcastToTable(table, '--- New hand started ---');
    }, 5000);
  }

  function clearForOnePlayer(table) {
    table.clearWinMessages();
    setTimeout(() => {
      table.clearSeatHands();
      table.resetBoardAndPot();
      broadcastToTable(table, 'Waiting for more players');
    }, 5000);
  }

  function hideOpponentCards(table, socketId) {
    let tableCopy = JSON.parse(JSON.stringify(table));
    let hiddenCard = { suit: 'hidden', rank: 'hidden' };
    let hiddenHand = [hiddenCard, hiddenCard];

    for (let i = 1; i <= tableCopy.maxPlayers; i++) {
      let seat = tableCopy.seats[i];
      if (
        seat &&
        seat.hand.length > 0 &&
        seat.player.socketId !== socketId &&
        !(seat.lastAction === WINNER && tableCopy.wentToShowdown)
      ) {
        seat.hand = hiddenHand;
      }
    }
    return tableCopy; 
  }
};

module.exports = { init };
