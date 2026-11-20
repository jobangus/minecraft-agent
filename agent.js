const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')


const LOCALHOST = '127.0.0.1';
const PORTNUMBER = 64646;

const bot = mineflayer.createBot({
    host: LOCALHOST, // Minecraft server IP
    port: PORTNUMBER,
    username: 'woodbot', 
    auth: 'offline',
    version: '1.21.11'
});

bot.loadPlugin(pathfinder);


// spawn 
bot.once('spawn', async () => {
    console.log(`{bot.username} has spawned in the Minecraft world!`);
    console.log('position: ', bot.entity.position);

   try {
        await bot.waitForChunksToLoad()

        const log = findNearbyLog(bot)

        if (log === null) {
            console.log('No nearby logs found.')
            return
        }
        // 1. move 
        await moveNearBlock(bot, log)
        console.log('Arrived near the log.')
        // 2. dig
        await digBlock(bot, log)
        await bot.waitForTicks(10)

        const droppedLog = findDroppedLog(bot)

        if (droppedLog !== null) {
            await moveToDroppedItem(bot, droppedLog)
            await bot.waitForTicks(10)
        }



        console.log('Logs in inventory:', countLogs(bot))

    } catch (error) {
        console.error('Task failed:', error.message)
    }




});

async function moveToDroppedItem(bot, entity) {
    const { x, y, z } = entity.position

    await bot.pathfinder.goto(
        new goals.GoalBlock(
            Math.floor(x),
            Math.floor(y),
            Math.floor(z)
        )
    )
}

function findNearbyLog(bot, maxDistance = 32) {
    return bot.findBlock({
        matching: isLog,
        maxDistance
    })
}

function findDroppedLog(bot) {
    return bot.nearestEntity(entity => {
        const item = entity.getDroppedItem()
        return item !== null && item.name.endsWith('_log')
    })
}


function countLogs(bot) {
    return bot.inventory.items()
        .filter(item => item.name.endsWith('_log'))
        .reduce((total, item) => total + item.count, 0)
}

function isLog(block) {
    return block.name.endsWith('_log')
}

async function moveNearBlock(bot, block) {
    const movements = new Movements(bot)
    movements.canDig = false
    bot.pathfinder.setMovements(movements)

    const { x, y, z } = block.position
    await bot.pathfinder.goto(new goals.GoalNear(x, y, z, 2))
}

async function digBlock(bot, block) {
    const currentBlock = bot.blockAt(block.position)
    if (!currentBlock || !isLog(currentBlock)) {
        throw new Error('The specified block is not a log or does not exist anymore.')
    }

    if (!bot.canDigBlock(currentBlock)) {
        throw new Error('Cannot dig the specified block.')
    }

    await bot.dig(currentBlock);
};  



bot.on('kicked', (reason) => {
    console.log(`Bot was kicked from the server. Reason: ${reason}`);
});

bot.on('error', (err) => {
    console.error(`An error occurred: ${err}`);
});
bot.on('end', () => {
    console.log('Bot has disconnected from the server.');
});