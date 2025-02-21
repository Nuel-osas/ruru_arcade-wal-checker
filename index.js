import { SuiClient } from '@mysten/sui/client';

const main = async () => {
    const jsonClient = new SuiClient({
        url: 'https://fullnode.mainnet.sui.io:443',
    });

    try {
        const resp = await jsonClient.queryTransactionBlocks({
            filter: {
                MoveFunction: {
                    package: "0x98af8b8fde88f3c4bdf0fcedcf9afee7d10f66d480b74fb5a3a2e23dc7f5a564",
                    module: "distribution",
                    function: "distribute",
                }
            },
            options: {
                showEffects: true,
                showObjectChanges: true,
                showInput: true,
            },
            limit: 1,
        });

        console.log('Transaction Query Response:', JSON.stringify(resp, null, 2));
    } catch (error) {
        console.error('Error querying transaction blocks:', error);
    }
};

main();
